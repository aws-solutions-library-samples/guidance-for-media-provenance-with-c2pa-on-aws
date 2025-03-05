import os
import io
import uuid
import c2pa
import json
import boto3
import mimetypes
import subprocess
from typing import Any, List
from pathlib import Path
from urllib import request
from os.path import splitext
from datetime import datetime
from pydantic import BaseModel
from urllib.parse import urlparse
from utils import unhandled_exception_handler, garbage_collect_folder

from fastapi import FastAPI, HTTPException, status

s3 = boto3.client("s3")
secretsmanager = boto3.client("secretsmanager")

output_bucket = os.environ["output_bucket"]
certificate = os.environ["certificate"]
private_key = os.environ["private_key"]

# FastAPI setup
app = FastAPI()
app.add_exception_handler(Exception, unhandled_exception_handler)


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
    print(signFileEvent)

    # Create the working directory if it doesn't exist
    print(f"Creating c2pa folder -> {os.listdir()}")
    directory_path = Path("c2pa")
    directory_path.mkdir(parents=True, exist_ok=True)
    print(f"c2pa folder created -> {os.listdir()}")

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
