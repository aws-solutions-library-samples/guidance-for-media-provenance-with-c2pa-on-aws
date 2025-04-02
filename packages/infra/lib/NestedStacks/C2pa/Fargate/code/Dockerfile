FROM --platform=linux/amd64 rust

# Fix repository and GPG issues
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get update -o Acquire::Check-Valid-Until=false && \
    apt-get install -y gnupg2 apt-transport-https ca-certificates

# Copy function code
COPY . .

# Install Python and other dependencies
RUN apt-get update
RUN apt-get install -y curl python3 python3-pip software-properties-common

RUN python3 --version

# Install Python dependencies
RUN pip3 install -r requirements.txt --break-system-packages

# Install C2PA CLI
RUN cargo install c2patool --version=0.9.12

# Set the CMD to your handler
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]
