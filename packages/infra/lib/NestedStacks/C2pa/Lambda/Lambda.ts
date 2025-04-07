import * as cdk from "aws-cdk-lib";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as python from "@aws-cdk/aws-lambda-python-alpha";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

import * as path from "path";

import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

interface LambdaProps {
  backendStorageBucket: s3.Bucket;
  uiStorageBucket: s3.Bucket;
  certificate: secretsmanager.Secret;
  private_key: secretsmanager.Secret;
  vpc: ec2.Vpc;
}

export class Lambda extends Construct {
  public readonly fnUrl: lambda.FunctionUrl;

  constructor(
    scope: Construct,
    id: string,
    { certificate, private_key, backendStorageBucket, uiStorageBucket, vpc }: LambdaProps
  ) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    /************************************************************************/
    /*************************** C2PA Lambda ********************************/
    /************************************************************************/

    const c2paLambdaRuntime = lambda.Runtime.PYTHON_3_13;

    const lambdaC2pa = new lambda.DockerImageFunction(this, "C2PA Lambda", {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, "code"), {
        platform: cdk.aws_ecr_assets.Platform.LINUX_AMD64,
      }),
      functionName: `${stack.stackName}-c2pa-lambda`,
      timeout: cdk.Duration.minutes(1),
      vpc,
      environment: {
        output_bucket: backendStorageBucket.bucketName,
        input_bucket: uiStorageBucket.bucketName,
        certificate: certificate.secretName,
        private_key: private_key.secretName,
      },
      /************************ Compute & Memory Allocation *************************/
      // https://docs.aws.amazon.com/lambda/latest/operatorguide/computing-power.html
      memorySize: 10240,
      ephemeralStorageSize: cdk.Size.mebibytes(10240),
    });
    this.fnUrl = lambdaC2pa.addFunctionUrl();
    backendStorageBucket.grantReadWrite(lambdaC2pa);
    uiStorageBucket.grantReadWrite(lambdaC2pa);
    certificate.grantRead(lambdaC2pa);
    private_key.grantRead(lambdaC2pa);

    NagSuppressions.addResourceSuppressions(
      lambdaC2pa,
      [
        {
          id: "AwsSolutions-L1",
          reason:
            "Using Python 3.13 for compatibility with specific dependencies and layers",
        },
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Wildcards are granted due to L2 methods .grantReadWrite .grantRead",
        },
      ],
      true
    );
  }
}
