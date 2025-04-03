# AWS Fargate + Application Load Balancer (Internal)

When deploying this project, a new AWS CloudFormation stack named C2PaStack will be created. You can locate the internal Application Load Balancer (ALB) endpoint by navigating to the Outputs tab of this CloudFormation stack. There, you'll find a link similar to the one shown below.

```
C2PaStack.FastAPIServiceLoadBalancerDNSxxxxx = internal-C2PaSt-FastA-xxxxx-xxxxx.xx-xxxx-x.elb.amazonaws.com
```

> Replace the 'x' characters in the link with the corresponding values from your account, and use this modified link when sending cURL requests.

### Example use cases

Here are some example request payloads that you can send to the endpoint.

##### 1. Json assertions no previous manifest

```json
{
    "presigned_asset_url": <Presigned URL>,
    "assertions_json": {
        "claim_generator": "python_test/0.1",
        "assertions": [
            {
                "label": "c2pa.training-mining",
                "data": {
                    "entries": {
                        "c2pa.ai_generative_training": {
                            "use": "notAllowed"
                        },
                        "c2pa.ai_inference": {
                            "use": "notAllowed"
                        },
                        "c2pa.ai_training": {
                            "use": "notAllowed"
                        },
                        "c2pa.data_mining": {
                            "use": "notAllowed"
                        }
                    }
                }
            }
        ]
    }
}
```

##### 2. presigned Json assertions no previous manifest

```json
{
    "presigned_asset_url": <Presigned URL>,
    "presigned_assertions_json": <Presigned URL>
}
```

### Fragmented C2PA use cases

In order to invoke the Fragmented C2PA file, you may execute the following:

```bash
curl -X POST "<YOUR_ALB_ENDPOINT>/sign_fmp4" \
    -H "Content-Type: application/json" \
    -d '{
        "s3_bucket": "XXXXXXXXXXXXXXXX",
        "init_file": "your-init-file.mp4",
        "fragments_pattern": "your-fragment-pattern",
        "manifest_file": "your-manifest.json"
    }'
```

> - s3_bucket: The S3 bucket name where your files are stored
> - init_file: The initialization segment of the fragmented MP4
> - fragments_pattern: Pattern matching the fragment files (uses glob pattern)
> - manifest_file: JSON file containing C2PA manifest data

To use this command:

Replace the values with your specific files:

```bash
curl -X POST "xxxxxxxx-xxxxxx-xxxxx-xxxxxxxx-xxxxxxxx.us-east-1.elb.amazonaws.com/sign_fmp4" \
    -H "Content-Type: application/json" \
    -d '{
        "s3_bucket": "c2pa-data",
        "init_file": "xxxx_dashinit.mp4",
        "fragments_pattern": "xxxxdash[1-2].m4s",
        "manifest_file": "sample.json",
        "output_prefix": "output"
    }'
```
