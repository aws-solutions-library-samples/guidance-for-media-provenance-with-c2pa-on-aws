# Build stage
FROM public.ecr.aws/lambda/python:3.13 AS builder

# Install system dependencies
RUN microdnf update -y && \
    microdnf install -y --setopt=install_weak_deps=0 --best \
    tar \
    gzip \
    curl-minimal \
    gcc \
    openssl-devel \
    libffi-devel \
    python3-devel \
    make \
    git \
    perl-core \
    && microdnf clean all

# Install Rust
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Python packages
COPY requirements.txt .
RUN pip install --upgrade pip && \
    # Install everything except c2pa-python first
    grep -v "c2pa-python" requirements.txt | pip install --target /python --no-cache-dir -r /dev/stdin && \
    # Install c2pa-python separately with additional environment variables
    OPENSSL_DIR=/usr/local/ssl \
    OPENSSL_INCLUDE_DIR=/usr/include \
    OPENSSL_LIB_DIR=/usr/lib64 \
    pip install --target /python --no-cache-dir c2pa-python==0.6.1

# Final stage
FROM public.ecr.aws/lambda/python:3.13

# Copy Python packages
COPY --from=builder /python ${LAMBDA_TASK_ROOT}

# Copy c2patool
COPY c2patool-v0.9.12-linux.tar.gz ${LAMBDA_TASK_ROOT}/
RUN microdnf install -y --setopt=install_weak_deps=0 --best \
    tar \
    gzip && \
    tar xf ${LAMBDA_TASK_ROOT}/c2patool-v0.9.12-linux.tar.gz && \
    mv c2patool /usr/local/bin/ && \
    rm ${LAMBDA_TASK_ROOT}/c2patool-v0.9.12-linux.tar.gz && \
    chmod +x /usr/local/bin/c2patool && \
    microdnf clean all

# Copy lambda function code
COPY index.py ${LAMBDA_TASK_ROOT}/
COPY utils.py ${LAMBDA_TASK_ROOT}/

# The AWS Lambda base image already has the runtime interface client
# We just need to ensure our code is in the right location and the handler is set correctly

# The AWS Lambda Python base image looks for the handler at /var/task/[handler_file].[handler_function]
# So we need to make sure our handler is at /var/task/index.py with a function named handler

# Set the Python path to include our code
ENV PYTHONPATH="/var/task"

# Set the handler
CMD [ "index.handler" ]
