import * as path from "path";
import * as cdk from "aws-cdk-lib";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

import { readFileSync } from "fs";
import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

export class C2PaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    NagSuppressions.addStackSuppressions(this, [
      {
        id: "AwsSolutions-IAM4",
        reason:
          "Lambda execution policy for custom resources created by higher level CDK constructs",
        appliesTo: [
          "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        ],
      },
    ]);

    /************************************************************************/
    /************************ S3 ********************************************/
    /************************************************************************/

    // Server Access Logs
    const serverLogs = new s3.Bucket(this, "Server Logs", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    // Output Bucket
    const outputBucket = new s3.Bucket(this, "Output Bucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      serverAccessLogsBucket: serverLogs,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    /************************************************************************/
    /************************ Certificate ***********************************/
    /************************************************************************/

    const cert_val = readFileSync(
      path.join(__dirname, "public_creds", "es256_certs.pem"),
      "utf-8"
    );
    const certificate = new secretsmanager.Secret(this, "C2PA Certificate", {
      secretStringValue: cdk.SecretValue.unsafePlainText(cert_val),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /************************************************************************/
    /************************ Private Key ***********************************/
    /************************************************************************/

    const prv_key_val = readFileSync(
      path.join(__dirname, "public_creds", "es256_private.key"),
      "utf-8"
    );
    const private_key = new secretsmanager.Secret(this, "C2PA Private Key", {
      secretStringValue: cdk.SecretValue.unsafePlainText(prv_key_val),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    NagSuppressions.addResourceSuppressions(
      [certificate, private_key],
      [
        {
          id: "AwsSolutions-SMG4",
          reason:
            "Certifictate and key when launched use the public sample unless changed. Fixed and publicly available",
        },
      ]
    );

    /************************************************************************/
    /************************ C2PA Lambda ***********************************/
    /************************************************************************/

    const lambdaC2pa = new lambda.DockerImageFunction(this, "C2PA Lambda", {
      code: lambda.DockerImageCode.fromImageAsset(
        path.join(__dirname, "lambda"),
        {
          cmd: ["lambda.handler"],
        }
      ),
      /************************ Compute & Memory Allocation ***************************/
      // https://docs.aws.amazon.com/lambda/latest/operatorguide/computing-power.html
      memorySize: 10240,
      ephemeralStorageSize: cdk.Size.mebibytes(10240),
      environment: {
        output_bucket: outputBucket.bucketName,
        certificate: certificate.secretName,
        private_key: private_key.secretName,
      },
      timeout: cdk.Duration.minutes(15),
    });
    const fnUrl = lambdaC2pa.addFunctionUrl();
    outputBucket.grantReadWrite(lambdaC2pa);
    certificate.grantRead(lambdaC2pa);
    private_key.grantRead(lambdaC2pa);

    NagSuppressions.addResourceSuppressions(
      lambdaC2pa,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Wildcards are granted due to L2 methods .grantReadWrite .grantRead",
        },
      ],
      true
    );

    /************************************************************************/
    /************************ VPC *******************************************/
    /************************************************************************/

    const vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 2,
      flowLogs: {
        VPCFlowLogs: {},
      },
    });
    
    /************************************************************************/
    /************************ Cluster ***************************************/
    /************************************************************************/

    const cluster = new ecs.Cluster(this, "Cluster", {
      vpc,
      containerInsights: true,
    });

    /************************************************************************/
    /************************ Fargate Application ***************************/
    /************************************************************************/

    const fastApi = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "Fast API Service",
      {
        cluster,
        /************************ Compute & Memory Allocation ***************************/
        // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html#fargate-tasks-size
        cpu: 2048,
        memoryLimitMiB: 8192,
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset(path.join(__dirname, "fargate")),
          environment: {
            output_bucket: outputBucket.bucketName,
            certificate: certificate.secretName,
            private_key: private_key.secretName,
          },
        },
        publicLoadBalancer: false,
      }
    );
    fastApi.taskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement({
        actions: ["secretsmanager:GetSecretValue"],
        resources: [certificate.secretArn, private_key.secretArn],
      })
    );
    fastApi.taskDefinition.addToTaskRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject"],
        resources: [outputBucket.bucketArn, `${outputBucket.bucketArn}/*`],
      })
    );
    fastApi.taskDefinition.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    fastApi.loadBalancer.logAccessLogs(serverLogs);

    NagSuppressions.addResourceSuppressions(
      fastApi,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Bucket requires wildcard to allow container interact with all objects",
        },
        {
          id: "AwsSolutions-EC23",
          reason:
            "Load Balancer is not public facing. It's an internal load balancer, meaning it can only be invoked from those within it's VPC",
        },
        {
          id: "AwsSolutions-ECS2",
          reason:
            "Env variables notify the container resources items such as s3 output bucket name, and secret names.",
        },
      ],
      true
    );

    new cdk.CfnOutput(this, "LambdaFnURL", {
      value: fnUrl.url,
    });
  }
}
