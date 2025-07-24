ARG ARCHITECTURE=amd64
FROM --platform=linux/${ARCHITECTURE} rust

# Copy function code
COPY . .

# Install Python and other dependencies
RUN apt update
RUN apt -y install python3 python3-pip software-properties-common

RUN python3 --version

# Install Python dependencies
RUN pip3 install -r requirements.txt --break-system-packages

# Install C2PA CLI
RUN cargo install c2patool --version=0.9.12

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]