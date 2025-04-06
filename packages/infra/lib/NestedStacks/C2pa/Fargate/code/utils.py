from fastapi.responses import PlainTextResponse
from fastapi import Request

import subprocess
import datetime
import glob
import sys
import os
import shutil


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


def run_mp4box_conversion(input_file, output_dir):
    """
    Convert an MP4 file to a fragmented MP4 using MP4Box
    
    Args:
        input_file: Path to the input MP4 file
        output_dir: Directory to store the output files
        
    Returns:
        tuple: (success, output_message, mpd_file_path)
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get the base filename without extension
    base_name = os.path.basename(input_file).rsplit('.', 1)[0]
    output_base = os.path.join(output_dir, base_name)
    
    # c command to fragment the MP4 file and create DASH content
    # -dash 4000: Create DASH segments of 4 seconds
    # -frag 4000: Create fragments of 4 seconds
    # -rap: Force segments to start with random access points
    # -segment-name segment_%s: Name the segments with a pattern
    # -out output.mpd: Output MPD file
    command = [
        "MP4Box",
        "-dash", "4000",
        "-frag", "4000",
        "-rap",
        "-segment-name", f"{base_name}_segment_%s",
        "-out", f"{output_base}.mpd",
        input_file
    ]
    
    # Print command being executed
    print("\n" + "=" * 50)
    print("Executing MP4Box command:")
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
        error_message = f"MP4Box command failed with return code {return_code}\nOutput:\n{output}"
        print(f"ERROR: {error_message}")
        return False, error_message, None
    
    # Check if the MPD file was created
    mpd_file = f"{output_base}.mpd"
    if not os.path.exists(mpd_file):
        error_message = f"MP4Box command completed but MPD file was not created\nOutput:\n{output}"
        print(f"ERROR: {error_message}")
        return False, error_message, None
    
    return True, output, mpd_file


def run_c2pa_command_for_fmp4(init_file, fragments_glob, output_dir, manifest_file):
    """
    Run c2patool command for fragmented MP4 files with manifest
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)

    # Build command exactly as specified
    command = [
        "c2patool",
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
