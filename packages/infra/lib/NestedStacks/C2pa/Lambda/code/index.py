import os
import io
import c2pa
import json
import glob
import boto3
import mimetypes
from urllib import request
from os.path import splitext
from datetime import datetime
from urllib.parse import urlparse

from typing import List, Optional, Any
from pydantic import BaseModel, Field

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.event_handler import LambdaFunctionUrlResolver

tracer = Tracer()
logger = Logger(level="DEBUG")
app = LambdaFunctionUrlResolver(enable_validation=True)

s3 = boto3.client("s3")
secretsmanager = boto3.client("secretsmanager")

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

        ingredient = io.BytesIO(request.urlopen(ingredient).read())
        builder.add_ingredient(ingredient_json, ingredient_extension[1:], ingredient)

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


class ReadFileEvent(BaseModel):
    asset_url: str
    return_type: str


@app.post("/read_file")
def read_file(readFileEvent: ReadFileEvent):
    asset_url = readFileEvent.asset_url
    return_type = readFileEvent.return_type

    filename = urlparse(asset_url).path.split("/").pop()
    filename_no_extension, extension = splitext(filename)

    reader = c2pa.Reader(extension[1:], io.BytesIO(request.urlopen(asset_url).read()))
    match return_type:
        case "json":
            return json.loads(reader.json())
        case "presigned_url":
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
        case _:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail='return_type is invalid. Must be either "json" or "presigned_url"',
            )


@logger.inject_lambda_context(
    correlation_id_path=correlation_paths.LAMBDA_FUNCTION_URL, log_event=True
)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    files = glob.glob("/tmp/*")
    for file in files:
        os.remove(file)

    return app.resolve(event, context)
