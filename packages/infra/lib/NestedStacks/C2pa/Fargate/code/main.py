from utils import (
    run_c2pa_command_for_fmp4,
    garbage_collect_folder,
    unhandled_exception_handler,
)
from fastapi import FastAPI, HTTPException, status
from urllib.parse import urlparse
from pydantic import BaseModel
from datetime import datetime
from os.path import splitext
from urllib import request
from pathlib import Path
from typing import List

import mimetypes
import tempfile
import logging
import boto3
import c2pa
import json
import os
import io

secretsmanager = boto3.client("secretsmanager")
s3 = boto3.client("s3")

output_bucket = os.environ["output_bucket"]
certificate = os.environ["certificate"]
private_key = os.environ["private_key"]

# FastAPI setup
app = FastAPI()
app.add_exception_handler(Exception, unhandled_exception_handler)

logger = logging.getLogger(__name__)


########################################################################
########################### Health Check ###############################
########################################################################
@app.get("/")
def read_root():
    return {"Welcome": "to FastAPI on Fargate"}


########################################################################
############################ /sign_file ################################
########################################################################
class SignFileEvent(BaseModel):
    new_title: str
    asset_url: str
    assertions_json_url: str
    ingredients_url: List[str] | None = None


@app.post("/sign_file")
async def sign_file(signFileEvent: SignFileEvent):
    directory_path = Path("c2pa")
    directory_path.mkdir(parents=True, exist_ok=True)

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
    print("Thumbnail added")

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

        print(f"Ingredient added: {ingredient_filename}")

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
    print("Signer added")

    # Sign
    asset = io.BytesIO(request.urlopen(asset_url).read())
    result = io.BytesIO(b"")
    builder.sign(signer, extension[1:], asset, result)
    print("Signing complete")

    with open(f"c2pa/{filename}", "wb") as f:
        f.write(result.getbuffer())

    content_type, _ = mimetypes.guess_type(filename)
    s3.upload_file(
        f"c2pa/{filename}",
        output_bucket,
        f"{filename_no_extension}/{filename}",
        ExtraArgs={"ContentType": content_type},
    )

    manifest = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": output_bucket, "Key": f"{filename_no_extension}/{filename}"},
    )

    garbage_collect_folder(f"c2pa/*{filename_no_extension}*")

    return {"manifest": manifest}


########################################################################
############################ /sign_fmp4 ################################
########################################################################
class SignFmp4Event(BaseModel):
    new_title: str
    init_file: str
    fragments_pattern: str
    manifest_file: str


@app.post("/sign_fmp4")
async def sign_fmp4(request: SignFmp4Event):
    with tempfile.TemporaryDirectory() as temp_dir:
        init_filename = os.path.basename(urlparse(request.init_file).path)
        init_file_path = os.path.join(temp_dir, init_filename)
        logger.info(f"Downloading init file: {request.init_file}")        
        print("starting download")

        with open(init_file_path, "wb") as f:
            init_config = urlparse(request.init_file)
            print(init_config)
            s3.download_fileobj(init_config.netloc, init_config.path.lstrip("/"), f)

        # List fragments
        logger.info("Listing fragments...")
        paginator = s3.get_paginator("list_objects_v2")
        fragments = []
        fragments_config = urlparse(request.fragments_pattern)

        for page in paginator.paginate(
            Bucket=fragments_config.netloc,
            Prefix=os.path.dirname(fragments_config.path.lstrip("/")),
        ):
            if "Contents" in page:
                for obj in page["Contents"]:
                    if obj["Key"].endswith(".m4s"):  # Only process .m4s files
                        fragment_path = os.path.join(
                            temp_dir, os.path.basename(obj["Key"])
                        )
                        with open(fragment_path, "wb") as f:
                            s3.download_fileobj(fragments_config.netloc, obj["Key"], f)
                        fragments.append(fragment_path)

        fragments.sort()  # Ensure fragments are in order

        # Download manifest file
        manifest_path = os.path.join(temp_dir, "manifest.json")
        with open(manifest_path, "wb") as f:
            manifest_config = urlparse(request.manifest_file)
            s3.download_fileobj(
                manifest_config.netloc, manifest_config.path.lstrip("/"), f
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
            raise HTTPException(
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

        mpd_file_path = next(
            (f for f in fragments if f.endswith(".mpd")),
            None
        )
        if mpd_file_path:
            logger.info(f"Uploading DASH Manifest file: {mpd_file_path}")
            mpd_filename = os.path.basename(urlparse(mpd_file_path).path)
            s3.upload_file(
                os.path.join(temp_dir, mpd_file_path),
                output_bucket,
                f"fragments/processed/{request.new_title}/{mpd_filename}",
            )



        return {"saved_location": f"s3://{output_bucket}/fragments/processed/{request.new_title}/"}

########################################################################
########################## /read_c2pa ##################################
########################################################################
class ReadFileEvent(BaseModel):
    asset_url: str
    return_type: str

@app.post("/read_file")
async def read_file(readFileEvent: ReadFileEvent):
    print(readFileEvent)

    # Create the working directory if it doesn't exist
    print(f"Creating c2pa folder -> {os.listdir()}")
    directory_path = Path("c2pa")
    directory_path.mkdir(parents=True, exist_ok=True)
    print(f"c2pa folder created -> {os.listdir()}")

    asset_url = readFileEvent.asset_url
    return_type = readFileEvent.return_type

    filename = urlparse(asset_url).path.split("/").pop()
    filename_no_extension, extension = splitext(filename)

    reader = c2pa.Reader(extension[1:], io.BytesIO(request.urlopen(asset_url).read()))
    match return_type:
        case "json":
            return json.loads(reader.json())
        case "presigned_url":
            with open("c2pa/manifest.json", "w") as f:
                json.dump(json.loads(reader.json()), f, indent=2)
                print(f"Downloading asset_url")

            # Upload the manifest json
            print(f"{datetime.now()}: Uploading manifest json...")
            s3.upload_file(
                "c2pa/manifest.json",
                output_bucket,
                f"{filename_no_extension}/read_c2pa.json",
            )
            print("Manifest upload complete")
            presigned_url = s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": output_bucket,
                    "Key": f"{filename_no_extension}/read_c2pa.json",
                },
            )
            print(f"Presigned URL created")

            return {"presigned_url": presigned_url}
        case _:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail='return_type is invalid. Must be either "json" or "presigned_url"',
            )