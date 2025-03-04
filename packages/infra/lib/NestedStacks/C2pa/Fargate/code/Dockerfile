FROM --platform=linux/amd64 rust

# Copy function code
COPY . .

# Install Python
RUN apt update

RUN apt -y install python3
RUN python3 --version

RUN apt -y install software-properties-common

RUN apt -y install python3-pip
RUN pip3 install -r requirements.txt --break-system-packages

# Instal C2PA CLI
# RUN cargo install c2patool

# Set the CMD to your handler (could also be done as a parameter override outside of the Dockerfile)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "80"]
