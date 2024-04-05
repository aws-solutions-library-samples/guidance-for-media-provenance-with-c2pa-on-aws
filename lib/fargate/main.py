import os
import uuid
import c2pa
import json
import boto3
import subprocess
from typing import Any
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
######################### Health Check #################################
########################################################################
@app.get("/")
def read_root():
    return {"Welcome": "Welcome to the FastAPI on Fargate"}


########################################################################
############################ /c2pa #####################################
########################################################################
class C2paEvent(BaseModel):
    # The presigned asset url to perform c2pa on
    presigned_asset_url: str
    # Optional. The json value if you choose to directly add it to your request
    assertions_json: Any | None = None
    # Optional. A presigned asset referencing the json file with assertions
    presigned_assertions_json: str | None = None
    # Optional. If there's a parent to incorporate into the process
    presigned_parent_c2pa: str | None = None


@app.post("/c2pa")
async def process_c2pa(event: C2paEvent):
    print(event)

    # Create the working directory if it doesn't exist
    print(f"{datetime.now()}: Creating c2pa folder -> {os.listdir()}")
    directory_path = Path("c2pa")
    directory_path.mkdir(parents=True, exist_ok=True)
    print(f"{datetime.now()}: c2pa folder created -> {os.listdir()}")

    # Download the asset (Required)
    presigned_asset_url = event.presigned_asset_url
    file_name = urlparse(presigned_asset_url).path.split("/")[-1]
    file_name_no_extension = splitext(file_name)[0]
    file_location = f"c2pa/{str(uuid.uuid4())[:8]}-{file_name}"
    # Garbage collect all files under temp c2pa folder
    garbage_collect_folder(f"c2pa/*{file_name.split('.')[0]}*")

    start_download = datetime.now()
    print(f"{start_download}: Downloading presigned_asset_url")
    request.urlretrieve(presigned_asset_url, file_location)
    end_download = datetime.now()
    print(
        f"{end_download}: Asset downloaded into c2pa {(end_download-start_download).total_seconds()} seconds -> {os.listdir('c2pa')}"
    )

    # Start to setup our CLI call
    args = [
        "c2patool",
        file_location,
        "--output",
        file_location,
        "--sidecar",
        "--detailed",
        "--force",
    ]

    # Ensure we have been given some assertions, but not both params
    if (
        event.assertions_json is not None
        and event.presigned_assertions_json is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Please supply in the body request one of assertions_json or presigned_assertions_json, but not both",
        )
    # If assertions_json exists
    elif event.assertions_json is not None:
        print(f"{datetime.now()}: assertions_json detected")
        args += ["--config", json.dumps(event.assertions_json)]
    # If presigned_assertions_json exists
    elif event.presigned_assertions_json is not None:
        print(f"{datetime.now()}: presigned_assertions_json detected, downloading")
        assertion_location = f"c2pa/assertions-{str(uuid.uuid4())[:8]}-{file_name}.json"
        request.urlretrieve(event.presigned_assertions_json, assertion_location)
        print(
            f"{datetime.now()}: Assertions downloaded into assertions.json -> {os.listdir()}"
        )
        args += ["--manifest", assertion_location]
    else:
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail="Invalid or missing either assertions_json or presigned_assertions_json in the body",
        )

    # Check to see if a parent is detected
    if event.presigned_parent_c2pa is not None:
        parent_name = urlparse(event.presigned_parent_c2pa).path.split("/")[-1]
        parent_location = (
            f"c2pa/parent-{str(uuid.uuid4())[:8]}-{file_name}-{parent_name}"
        )
        print(f"{datetime.now()}: presigned_parent_c2pa detected: {parent_location}")
        request.urlretrieve(event.presigned_parent_c2pa, parent_location)
        print(f"{datetime.now()}: parent downloaded into c2pa -> {os.listdir('c2pa')}")
        args += ["--parent", parent_location]

    # Load the Certificate
    cert_value = secretsmanager.get_secret_value(SecretId=certificate)
    cert = cert_value["SecretString"]
    os.environ["C2PA_SIGN_CERT"] = cert

    # Load the Private Key
    prv_key_value = secretsmanager.get_secret_value(SecretId=private_key)
    prv_key = prv_key_value["SecretString"]
    os.environ["C2PA_PRIVATE_KEY"] = prv_key

    # Execute the hash and produce the sidecar
    start_hash = datetime.now()
    print(f"{start_hash}: Executing c2pa command: {' '.join(args)}")
    hash = subprocess.run(args, capture_output=True)
    end_hash = datetime.now()
    print(
        f"{datetime.now()}: Sidecar outputted to c2pa folder {(end_hash-start_hash).total_seconds()} seconds: {os.listdir('c2pa')}"
    )
    hash_json = f"c2pa/c2pa-{str(uuid.uuid4())[:8]}-{file_name}.json"
    with open(hash_json, "w") as f:
        json.dump(json.loads(hash.stdout), f, indent=2)

    s3.upload_file(
        hash_json,
        output_bucket,
        f"{file_name_no_extension}/c2patool.json",
    )
    c2patool_json = s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": output_bucket,
            "Key": f"{file_name_no_extension}/c2patool.json",
        },
    )

    # Upload the New Sidecar
    start_upload = datetime.now()
    print(f"{start_upload}: Uploading c2pa sidecar")
    s3.upload_file(
        f"{splitext(file_location)[0]}.c2pa",
        output_bucket,
        f"{file_name_no_extension}/{file_name_no_extension}.c2pa",
    )
    end_upload = datetime.now()
    print(
        f"{end_upload}: sidecar upload complete {(end_upload-start_upload).total_seconds()}"
    )
    sidecar = s3.generate_presigned_url(
        "get_object",
        Params={
            "Bucket": output_bucket,
            "Key": f"{file_name_no_extension}/{file_name_no_extension}.c2pa",
        },
    )
    print(f"{datetime.now()}: presigned URL created")
    garbage_collect_folder(f"c2pa/*{splitext(file_name)[0]}*")

    return {"sidecar": sidecar, "c2patool_json": c2patool_json}


########################################################################
########################## /read_c2pa ##################################
########################################################################
class C2paReadEvent(BaseModel):
    # The presigned URL to read and return as json
    presigned_c2pa_url: str
    # Return types are json or presigned_url
    return_type: str


@app.post("/read_c2pa")
async def read_c2pa(event: C2paReadEvent):
    print(event)

    # Create the working directory if it doesn't exist
    print(f"{datetime.now()}: Creating read_c2pa folder -> {os.listdir()}")
    directory_path = Path("read_c2pa")
    directory_path.mkdir(parents=True, exist_ok=True)
    print(f"{datetime.now()}: read_c2pa folder created -> {os.listdir()}")

    # Download the asset (Required)
    presigned_c2pa_url = event.presigned_c2pa_url
    file_name = urlparse(presigned_c2pa_url).path.split("/")[-1]
    file_name_no_extension = file_name[:-5]

    if file_name[-5:] != ".c2pa":
        raise HTTPException(
            status_code=status.HTTP_412_PRECONDITION_FAILED,
            detail=f"presigned_c2pa_url is an invalid file type. File type must be a .c2pa file not {file_name}",
        )
    shortuuid = str(uuid.uuid4())[:8]
    file_location = f"read_c2pa/{shortuuid}-{file_name}"

    # Garbage collect all files under temp c2pa folder
    garbage_collect_folder(f"read_c2pa/*{file_name_no_extension}*")

    print(f"{datetime.now()}: Downloading presigned_c2pa_url")
    request.urlretrieve(presigned_c2pa_url, file_location)
    print(
        f"{datetime.now()}: .c2pa downloaded into read_c2pa -> {os.listdir('read_c2pa')}"
    )

    # Read the contents
    print(f"{datetime.now()}: Commencing read")
    match event.return_type:
        case "json":
            json_store = c2pa.read_file(file_location, None)
            print(f"{datetime.now()}: Finished reading .c2pa")
            garbage_collect_folder(f"read_c2pa/*{file_name_no_extension}*")

            return json.loads(json_store)
        case "presigned_url":
            with open(f"read_c2pa/{file_name}.json", "w") as f:
                json_store = c2pa.read_file(file_location, None)
                json.dump(json.loads(json_store), f, indent=2)
                print(f"{datetime.now()}: Finished reading .c2pa")

            # Upload the c2pa json
            print(f"{datetime.now()}: Uploading c2pa json")
            s3.upload_file(
                f"read_c2pa/{file_name}.json",
                output_bucket,
                f"{file_name_no_extension}/read_c2pa.json",
            )
            print(f"{datetime.now()}: c2pa json upload complete")
            presigned_url = s3.generate_presigned_url(
                "get_object",
                Params={
                    "Bucket": output_bucket,
                    "Key": f"{file_name_no_extension}/read_c2pa.json",
                },
            )
            print(f"{datetime.now()}: presigned URL created")
            garbage_collect_folder(f"read_c2pa/*{file_name_no_extension}*")

            return {"presigned_url": presigned_url}
        case _:
            raise HTTPException(
                status_code=status.HTTP_412_PRECONDITION_FAILED,
                detail="presigned_c2pa_url is an invalid file type. File type must be a .c2pa, file not {file_name}",
            )
