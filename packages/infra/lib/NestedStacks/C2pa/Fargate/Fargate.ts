import * as cdk from "aws-cdk-lib";

import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as alb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";

import * as path from "path";

import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

export interface FargateProps {
  serverAccessLogsBucket: s3.Bucket;
  backendStorageBucket: s3.Bucket;
  certificate: secretsmanager.Secret;
  private_key: secretsmanager.Secret;
  vpc: ec2.Vpc;
}

export class Fargate extends Construct {
  public readonly alb: alb.ApplicationLoadBalancer;

  constructor(
    scope: Construct,
    id: string,
    {
      serverAccessLogsBucket,
      backendStorageBucket,
      certificate,
      private_key,
      vpc,
    }: FargateProps
  ) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    const cluster = new ecs.Cluster(this, "Cluster", {
      clusterName: stack.stackName,
      containerInsights: true,
      vpc,
    });

    const fastApi = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "Fast API Service",
      {
        serviceName: "C2PA-Service",
        cluster,
        /************************ Compute & Memory Allocation ***************************/
        // https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html#fargate-tasks-size
        cpu: 2048,
        memoryLimitMiB: 8192,
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset(path.join(__dirname, "code")),
          environment: {
            output_bucket: backendStorageBucket.bucketName,
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
        resources: [
          backendStorageBucket.bucketArn,
          `${backendStorageBucket.bucketArn}/*`,
        ],
      })
    );
    fastApi.taskDefinition.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    this.alb = fastApi.loadBalancer;
    this.alb.logAccessLogs(serverAccessLogsBucket);

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
  }
}
