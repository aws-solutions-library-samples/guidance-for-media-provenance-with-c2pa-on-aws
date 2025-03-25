import os
import sys
import glob
import datetime
import subprocess

from fastapi import Request
from fastapi.responses import PlainTextResponse

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

def run_c2pa_command(init_file="test_files/init.mp4", fragments_glob="fragment[1-2].m4s", output_dir="output_test_files", manifest_file="test2.json"):
    """
    Run c2patool command for fragmented MP4 files with manifest
    """
    try:
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Build command exactly as specified
        command = [
            "c2patool",
            "-m", manifest_file,
            "-o", output_dir,
            init_file,
            "fragment",
            "--fragments_glob", fragments_glob
        ]
        
        # Print command being executed
        print("\n" + "="*50)
        print("Executing command:")
        print(f"{' '.join(command)}")
        print("="*50 + "\n")
        
        # Run command and capture output in real-time
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            universal_newlines=True
        )
        
        # Store the complete output
        full_output = []
        
        # Print and store output in real-time
        for line in process.stdout:
            print(line, end='')  # Print in real-time
            full_output.append(line)
        
        # Wait for process to complete and get return code
        return_code = process.wait()
        
        # Join all output lines
        output = ''.join(full_output)
        
        if return_code != 0:
            error_message = f"Command failed with return code {return_code}\nOutput:\n{output}"
            print(f"ERROR: {error_message}")
            return False, error_message
            
        return True, output
        
    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        print(f"ERROR: {error_message}")
        return False, error_message


