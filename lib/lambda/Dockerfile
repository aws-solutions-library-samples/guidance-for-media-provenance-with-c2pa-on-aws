FROM --platform=linux/amd64 public.ecr.aws/lambda/python:3.12

# Copy requirements.txt
COPY . ${LAMBDA_TASK_ROOT}

# Install the specified packages
RUN pip install -r requirements.txt

# Move c2patool to the binary layer
RUN mkdir -p "/opt/bin/"
RUN mv "c2patool_linux_v0.7.0" "/opt/bin"

RUN chmod +x "/opt/bin/c2patool_linux_v0.7.0"

CMD [ "lambda.handler" ]