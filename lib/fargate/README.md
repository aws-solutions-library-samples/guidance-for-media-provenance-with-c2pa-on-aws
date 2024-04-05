# AWS Fargate + Application Load Balancer (Internal)

When deploying this project, a new AWS CloudFormation stack named C2PaStack will be created. You can locate the internal Application Load Balancer (ALB) endpoint by navigating to the Outputs tab of this CloudFormation stack. There, you'll find a link similar to the one shown below.

```
C2PaStack.FastAPIServiceLoadBalancerDNSxxxxx = internal-C2PaSt-FastA-xxxxx-xxxxx.xx-xxxx-x.elb.amazonaws.com
```

> Replace the 'x' characters in the link with the corresponding values from your account, and use this modified link when sending cURL requests.

### Example use cases

Here are some example request payloads that you can send to the endpoint.

##### 1. Json assertions no previous manifest

```
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

```
{
    "presigned_asset_url": <Presigned URL>,
    "presigned_assertions_json": <Presigned URL>
}
```
