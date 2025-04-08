import os
import io
import c2pa
import json
import glob
import boto3
import tempfile
import mimetypes

from urllib import request
from os.path import splitext
from datetime import datetime
from urllib.parse import urlparse
from utils import (
    run_c2pa_command_for_fmp4,
)

from pydantic import BaseModel
from typing import List

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.event_handler import LambdaFunctionUrlResolver
from aws_lambda_powertools.event_handler.exceptions import ServiceError



tracer = Tracer()
logger = Logger(level="DEBUG")
app = LambdaFunctionUrlResolver(enable_validation=True)

s3 = boto3.client("s3")
secretsmanager = boto3.client("secretsmanager")

input_bucket = os.environ["input_bucket"]
output_bucket = os.environ["output_bucket"]
certificate = os.environ["certificate"]
private_key = os.environ["private_key"]



class SignFileEvent(BaseModel):
    new_title: str
    asset_url: str
    assertions_json_url: str
    ingredients_url: List[str] | None = None

@app.post("/sign_file")
def sign_file(signFileEvent: SignFileEvent):
    new_title = signFileEvent.new_title
    asset_url = signFileEvent.asset_url
    assertions_json_url = signFileEvent.assertions_json_url
    assertions_json = json.loads(request.urlopen(assertions_json_url).read())
    ingredients_url = signFileEvent.ingredients_url

    filename = urlparse(asset_url).path.split("/").pop()
    filename_no_extension, extension = splitext(filename)

    manifest_json = json.dumps(
        {
            "title": new_title,
            "assertions": [
                {
                    "label": "stds.schema-org.CreativeWork",
                    "data": {
                        "@context": "http://schema.org/",
                        "@type": "CreativeWork",
                        "author": [{"@type": "Person", "name": "AWS C2PA Guidance"}],
                    },
                    "kind": "Json",
                },
                *assertions_json,
            ],
            "thumbnail": {"format": extension[1:], "identifier": "thumbnail"},
            "claim_generator_info": [{"name": "c2pa-python", "version": "0.6.1"}],
        }
    )
    builder = c2pa.Builder(manifest_json)

    # Add New Image Thumbnail
    thumbnail = request.urlopen(asset_url)
    builder.add_resource("thumbnail", thumbnail)
    logger.info("Thumbnail added")

    # Add Ingredients
    if ingredients_url:
        for ingredient in ingredients_url:
            ingredient_path = urlparse(ingredient).path
            ingredient_filename = ingredient_path.split("/").pop()
            ingredient_no_extension, ingredient_extension = splitext(ingredient_filename)
            ingredient_json = {
                "title": ingredient_filename,
                "relationship": "parentOf",
                "thumbnail": {
                    "identifier": ingredient_path,
                    "format": ingredient_extension[1:],
                },
            }
            ingredient_thumbnail = request.urlopen(ingredient)
            builder.add_resource(ingredient_path, ingredient_thumbnail)

            ingredient_data = io.BytesIO(request.urlopen(ingredient).read())
            builder.add_ingredient(ingredient_json, ingredient_extension[1:], ingredient_data)

            logger.info(f"Ingredient added: {ingredient_filename}")

    # Load the Key
    prv_key_value = secretsmanager.get_secret_value(SecretId=private_key)
    key = prv_key_value["SecretString"].encode("utf-8")

    def private_sign(data: bytes) -> bytes:
        return c2pa.sign_ps256(data, key)

    # Load the Certificate
    cert_value = secretsmanager.get_secret_value(SecretId=certificate)
    cert = cert_value["SecretString"].encode("utf-8")

    signer = c2pa.create_signer(
        private_sign, c2pa.SigningAlg.PS256, cert, "http://timestamp.digicert.com"
    )
    logger.info("Signer added")

    # Sign
    asset = io.BytesIO(request.urlopen(asset_url).read())
    result = io.BytesIO(b"")
    builder.sign(signer, extension[1:], asset, result)
    logger.info("Signing complete")

    with open(f"/tmp/{filename}", "wb") as f:
        f.write(result.getbuffer())

    content_type, _ = mimetypes.guess_type(filename)
    s3.upload_file(
        f"/tmp/{filename}",
        output_bucket,
        f"{filename_no_extension}/{filename}",
        ExtraArgs={"ContentType": content_type},
    )

    manifest = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": output_bucket, "Key": f"{filename_no_extension}/{filename}"},
    )

    return {"manifest": manifest}

class SignFmp4Event(BaseModel):
    new_title: str
    init_file: str
    fragments_pattern: str
    manifest_file: str

@app.post("/sign_fmp4")
def sign_fmp4(request: SignFmp4Event):
    with tempfile.TemporaryDirectory() as temp_dir:
        init_file_path = os.path.join(temp_dir, "init.mp4")
        logger.info(f"Downloading init file: {request.init_file}")
        print("starting download")

        # Instead of directly accessing S3, use HTTP URLs
        # The URLs should be pre-signed URLs or publicly accessible
        try:
            with open(init_file_path, "wb") as f:
                # Check if it's an HTTP URL
                if request.init_file.startswith("http"):
                    logger.info(f"Downloading from HTTP URL: {request.init_file}")
                    response = request.urlopen(request.init_file)
                    f.write(response.read())
                # Check if it's an S3 URL that we need to convert to HTTP
                elif request.init_file.startswith("s3://"):
                    init_config = urlparse(request.init_file)
                    bucket_name = init_config.netloc
                    object_key = init_config.path.lstrip("/")
                    
                    # Check if this is one of our buckets (which we have permission to access)
                    if bucket_name == input_bucket:
                        logger.info(f"Downloading from bucket: {bucket_name}/{object_key}")
                        s3.download_fileobj(bucket_name, object_key, f)
                    else:
                        # For other buckets, we need a pre-signed URL or public access
                        logger.error(f"Access denied to bucket: {bucket_name}")
                        raise ServiceError(
                            status_code=403, 
                            detail=f"Access denied to bucket: {bucket_name}. Please provide an HTTP URL or use one of the allowed buckets."
                        )
                else:
                    logger.error(f"Unsupported URL scheme: {request.init_file}")
                    raise ServiceError(
                        status_code=400, 
                        detail=f"Unsupported URL scheme. Use HTTP URLs or s3://{output_bucket}/... URLs."
                    )
        except Exception as e:
            logger.exception(f"Error downloading init file: {str(e)}")
            raise ServiceError(
                status_code=500, 
                detail=f"Error downloading init file: {str(e)}"
            )

        # Process fragments
        logger.info("Processing fragments...")
        fragments = []
        
        # Handle fragments pattern
        try:
            fragments_config = urlparse(request.fragments_pattern)
            
            # Check if it's an HTTP URL pattern
            if request.fragments_pattern.startswith("http"):
                logger.error("HTTP URL patterns for fragments are not supported")
                raise ServiceError(
                    status_code=400, 
                    detail="HTTP URL patterns for fragments are not supported. Use s3:// URLs with the output bucket."
                )
            # Check if it's an S3 URL pattern
            elif request.fragments_pattern.startswith("s3://"):
                bucket_name = fragments_config.netloc
                prefix = os.path.dirname(fragments_config.path.lstrip("/"))
                
                # Check if this is one of our buckets (which we have permission to access)
                if bucket_name == output_bucket or bucket_name == input_bucket:
                    logger.info(f"Listing fragments from bucket: {bucket_name}/{prefix}")
                    paginator = s3.get_paginator("list_objects_v2")
                    
                    for page in paginator.paginate(
                        Bucket=bucket_name,
                        Prefix=prefix,
                    ):
                        if "Contents" in page:
                            for obj in page["Contents"]:
                                if obj["Key"].endswith(".m4s"):  # Only process .m4s files
                                    fragment_path = os.path.join(
                                        temp_dir, os.path.basename(obj["Key"])
                                    )
                                    logger.info(f"Downloading fragment: {obj['Key']}")
                                    with open(fragment_path, "wb") as f:
                                        s3.download_fileobj(bucket_name, obj["Key"], f)
                                    fragments.append(fragment_path)
                else:
                    # For other buckets, we need a pre-signed URL or public access
                    logger.error(f"Access denied to bucket: {bucket_name}")
                    raise ServiceError(
                        status_code=403, 
                        detail=f"Access denied to bucket: {bucket_name}. Please use one of the allowed buckets."
                    )
            else:
                logger.error(f"Unsupported URL scheme: {request.fragments_pattern}")
                raise ServiceError(
                    status_code=400, 
                    detail=f"Unsupported URL scheme. Use s3://{output_bucket}/... URLs for fragments."
                )
                
            fragments.sort()  # Ensure fragments are in order
            logger.info(f"Downloaded {len(fragments)} fragments")
            
            if len(fragments) == 0:
                logger.warning("No fragments found!")
                raise ServiceError(
                    status_code=404, 
                    detail="No fragments found matching the pattern."
                )
        except Exception as e:
            if isinstance(e, ServiceError):
                raise e
            logger.exception(f"Error processing fragments: {str(e)}")
            raise ServiceError(
                status_code=500, 
                detail=f"Error processing fragments: {str(e)}"
            )

        # Download manifest file
        manifest_path = os.path.join(temp_dir, "manifest.json")
        
        try:
            # Check if it's an HTTP URL
            if request.manifest_file.startswith("http"):
                logger.info(f"Downloading manifest from HTTP URL: {request.manifest_file}")
                response = request.urlopen(request.manifest_file)
                with open(manifest_path, "wb") as f:
                    f.write(response.read())
            # Check if it's an S3 URL
            elif request.manifest_file.startswith("s3://"):
                manifest_config = urlparse(request.manifest_file)
                manifest_bucket = manifest_config.netloc
                manifest_key = manifest_config.path.lstrip("/")
                
                # Check if this is one of our buckets (which we have permission to access)
                if manifest_bucket == output_bucket or manifest_bucket == input_bucket:
                    logger.info(f"Downloading manifest from bucket: {manifest_bucket}/{manifest_key}")
                    with open(manifest_path, "wb") as f:
                        s3.download_fileobj(manifest_bucket, manifest_key, f)
                else:
                    # For other buckets, we need a pre-signed URL or public access
                    logger.error(f"Access denied to bucket: {manifest_bucket}")
                    raise ServiceError(
                        status_code=403, 
                        detail=f"Access denied to bucket: {manifest_bucket}. Please provide an HTTP URL or use one of the allowed buckets."
                    )
            else:
                logger.error(f"Unsupported URL scheme: {request.manifest_file}")
                raise ServiceError(
                    status_code=400, 
                    detail=f"Unsupported URL scheme. Use HTTP URLs or s3://{output_bucket}/... URLs."
                )
        except Exception as e:
            if isinstance(e, ServiceError):
                raise e
            logger.exception(f"Error downloading manifest file: {str(e)}")
            raise ServiceError(
                status_code=500, 
                detail=f"Error downloading manifest file: {str(e)}"
            )

        # Create output directory
        output_dir = os.path.join(temp_dir, "output")
        os.makedirs(output_dir, exist_ok=True)

        print(os.listdir(temp_dir))

        # Run c2pa command
        success, output = run_c2pa_command_for_fmp4(
            init_file=init_file_path,
            fragments_glob=f"{temp_dir}/*.m4s",
            output_dir=output_dir,
            manifest_file=manifest_path,
        )

        if not success:
            raise ServiceError(
                status_code=500, detail=f"C2PA signing failed: {output}"
            )

        print(os.listdir(output_dir))

        output_folder = os.path.join(output_dir, temp_dir.split("/").pop())

        for root, _, files in os.walk(output_folder):
            for file in files:
                s3.upload_file(
                    os.path.join(output_folder, file),
                    output_bucket,
                    f"fragments/processed/{request.new_title}/{file}",
                )

        # manifest = s3.generate_presigned_url(
        #     "get_object",
        #     Params={
        #         "Bucket": output_bucket,
        #         "Key": output_key,
        #     },
        # )

        return {"saved_location": f"s3://{output_bucket}/fragments/processed/{request.new_title}/"}


class ReadFileEvent(BaseModel):
    asset_url: str
    return_type: str

@app.post("/read_file")
def read_file(readFileEvent: ReadFileEvent):
    asset_url = readFileEvent.asset_url
    return_type = readFileEvent.return_type
    
    try:
        # Parse the URL
        url_config = urlparse(asset_url)
        filename = url_config.path.split("/").pop()
        filename_no_extension, extension = splitext(filename)
        
        # Get the file content
        if asset_url.startswith("http"):
            logger.info(f"Reading from HTTP URL: {asset_url}")
            file_content = io.BytesIO(request.urlopen(asset_url).read())
        elif asset_url.startswith("s3://"):
            bucket_name = url_config.netloc
            object_key = url_config.path.lstrip("/")
            
            # Check if this is one of our buckets (which we have permission to access)
            if bucket_name == output_bucket or bucket_name == input_bucket:
                logger.info(f"Reading from bucket: {bucket_name}/{object_key}")
                file_content = io.BytesIO()
                s3.download_fileobj(bucket_name, object_key, file_content)
                file_content.seek(0)  # Reset position to beginning of file
            else:
                # For other buckets, we need a pre-signed URL or public access
                logger.error(f"Access denied to bucket: {bucket_name}")
                raise ServiceError(
                    status_code=403, 
                    detail=f"Access denied to bucket: {bucket_name}. Please provide an HTTP URL or use one of the allowed buckets."
                )
        else:
            logger.error(f"Unsupported URL scheme: {asset_url}")
            raise ServiceError(
                status_code=400, 
                detail=f"Unsupported URL scheme. Use HTTP URLs or s3://{output_bucket}/... URLs."
            )
            
        # Read the C2PA data
        reader = c2pa.Reader(extension[1:], file_content)
        
        # Process based on return type
        if return_type == "json":
            return json.loads(reader.json())
        elif return_type == "presigned_url":
            with open("/tmp/manifest.json", "w") as f:
                json.dump(json.loads(reader.json()), f, indent=2)
                logger.info(f"{datetime.now()}: Downloading asset_url")

            # Upload the manifest json
            logger.info(f"{datetime.now()}: Uploading manifest json...")
            s3.upload_file(
                "/tmp/manifest.json",
                output_bucket,
                f"{filename_no_extension}/read_c2pa.json",
            )
            logger.info(f"{datetime.now()}: manifest upload complete")
            presigned_url = s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": output_bucket,
                    "Key": f"{filename_no_extension}/read_c2pa.json",
                },
            )
            logger.info(f"{datetime.now()}: presigned URL created")

            return {"presigned_url": presigned_url}
        else:
            raise ServiceError(
                status_code=400,
                detail=f"Unsupported return_type: {return_type}. Use 'json' or 'presigned_url'."
            )
    except ServiceError as e:
        # Re-raise service errors
        raise e
    except Exception as e:
        logger.exception(f"Error reading file: {str(e)}")
        raise ServiceError(
            status_code=500,
            detail=f"Error reading file: {str(e)}"
        )


@logger.inject_lambda_context(
    correlation_id_path=correlation_paths.LAMBDA_FUNCTION_URL, log_event=True
)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    # Log the event for debugging
    logger.info("Lambda handler invoked")
    logger.info(f"Event: {json.dumps(event)}")
    
    # Clean up temporary files
    files = glob.glob("/tmp/*")
    for file in files:
        os.remove(file)

    try:
        # Resolve the request using the Lambda Function URL resolver
        return app.resolve(event, context)
    except ServiceError as e:
        logger.error(f"Service error: {e.message}")
        return {
            "statusCode": e.status_code,
            "body": json.dumps({"error": e.message})
        }
    except Exception as e:
        logger.exception("Unhandled exception")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
