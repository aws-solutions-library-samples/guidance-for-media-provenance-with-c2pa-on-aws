from fastapi.responses import PlainTextResponse
from fastapi import Request

import subprocess
import datetime
import glob
import sys
import os


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> PlainTextResponse:
    """
    This middleware will log all unhandled exceptions.
    Unhandled exceptions are all exceptions that are not HTTPExceptions or RequestValidationErrors.
    """
    print("Our custom unhandled_exception_handler was called")
    host = getattr(getattr(request, "client", None), "host", None)
    port = getattr(getattr(request, "client", None), "port", None)
    url = (
        f"{request.url.path}?{request.query_params}"
        if request.query_params
        else request.url.path
    )
    exception_type, exception_value, exception_traceback = sys.exc_info()
    exception_name = getattr(exception_type, "__name__", None)
    print(
        f'{host}:{port} - "{request.method} {url}" 500 Internal Server Error <{exception_name}: {exception_value}>'
    )
    return PlainTextResponse(str(exc), status_code=500)


def garbage_collect_folder(pattern):
    print(f"{datetime.datetime.now()}: Cleaning up pattern {pattern}")
    files = glob.glob(pattern)
    for f in files:
        os.remove(f)
    print(f"{datetime.datetime.now()}: Finished!")


def run_c2pa_command_for_fmp4(init_file, fragments_glob, output_dir, manifest_file):
    """
    Run c2patool command for fragmented MP4 files with manifest
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Build command exactly as specified
    # Use full path to c2patool to avoid PATH issues
    c2patool_path = "/usr/local/bin/c2patool"
    
    # Check if c2patool exists and has execute permissions
    if not os.path.exists(c2patool_path):
        print(f"ERROR: {c2patool_path} does not exist")
        return False, f"{c2patool_path} does not exist"
    
    if not os.access(c2patool_path, os.X_OK):
        print(f"ERROR: {c2patool_path} is not executable")
        # Try to fix permissions
        try:
            os.chmod(c2patool_path, 0o755)
            print(f"Fixed permissions for {c2patool_path}")
        except Exception as e:
            print(f"Failed to fix permissions: {str(e)}")
            return False, f"Failed to fix permissions for {c2patool_path}: {str(e)}"
    
    command = [
        c2patool_path,
        "-m",
        manifest_file,
        "-o",
        output_dir,
        init_file,
        "fragment",
        "--fragments_glob",
        fragments_glob,
    ]

    # Print command being executed
    print("\n" + "=" * 50)
    print("Executing command:")
    print(f"{' '.join(command)}")
    print("=" * 50 + "\n")

    # Run command and capture output in real-time
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        universal_newlines=True,
    )

    # Store the complete output
    full_output = []

    # Print and store output in real-time
    for line in process.stdout:
        print(line, end="")  # Print in real-time
        full_output.append(line)

    # Wait for process to complete and get return code
    return_code = process.wait()

    # Join all output lines
    output = "".join(full_output)

    if return_code != 0:
        error_message = (
            f"Command failed with return code {return_code}\nOutput:\n{output}"
        )
        print(f"ERROR: {error_message}")
        return False, error_message

    return True, output
