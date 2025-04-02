import * as path from "path";
import * as cdk from "aws-cdk-lib";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";

import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

/**
 * Interface for the AppSync construct.
 */
interface AppSyncProps {
  alb: elb.ApplicationLoadBalancer;
  userPool: cognito.UserPool;
  uiStorageBucket: s3.Bucket;
  fnUrl: lambda.FunctionUrl;
  vpc: ec2.Vpc;
}

/**
 * This construct creates an API interface using GraphQL to connect
 *
 * @constructor
 * @param {string} scope - The construct's parent or owner.
 * @param {string} id - An identifier that must be unique within the scope.
 * @param {Object} AppSyncProps - Props for the construct.
 */
export class AppSync extends Construct {
  public readonly graphqlApi: appsync.GraphqlApi;

  constructor(
    scope: Construct,
    id: string,
    { userPool, fnUrl, uiStorageBucket, alb, vpc }: AppSyncProps
  ) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    /**********************************************************************/
    /**************************** AppSync *********************************/
    /**********************************************************************/

    this.graphqlApi = new appsync.GraphqlApi(this, "Frontend API", {
      name: stack.stackName,
      definition: appsync.Definition.fromFile(
        path.join(__dirname, "../../../../webapp/schema.graphql")
      ),

      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: { userPool },
        },
      },

      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
    });

    NagSuppressions.addResourceSuppressionsByPath(
      stack,
      `/${stack.stackName}/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource`,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Log Config on the API requires a wildcard ability to perform actions logs:DeleteRetentionPolicy and logs:PutRetentionPolicy",
        },
      ]
    );

    NagSuppressions.addResourceSuppressions(
      this.graphqlApi,
      [
        {
          id: "AwsSolutions-IAM4",
          reason:
            "AppSync uses AWS managed policies to log to Amazon CloudWatch",
          appliesTo: [
            "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSAppSyncPushToCloudWatchLogs",
          ],
        },
      ],
      true
    );

    const uiLambdaMiddleware = new nodejs.NodejsFunction(
      this,
      "UI Lambda Middleware",
      {
        functionName: `${stack.stackName}-ui-middleware`,
        entry: path.join(__dirname, "uiLambdaMiddleware", "index.ts"),
        runtime: lambda.Runtime.NODEJS_22_X,
        timeout: cdk.Duration.minutes(1),
        vpc,
        environment: {
          LambdaFnURL: fnUrl.url,
          FargateALB: alb.loadBalancerDnsName,
          uiStorageBucket: uiStorageBucket.bucketName,
        },
        bundling: {
          format: nodejs.OutputFormat.ESM,
          externalModules: ["@aws-*"],
          nodeModules: [
            "@smithy/signature-v4",
            "@smithy/protocol-http",
            "@middy/core",
          ],
        },
        layers: [
          lambda.LayerVersion.fromLayerVersionArn(
            this,
            "Powertools for AWS Lambda (TypeScript)",
            `arn:aws:lambda:${stack.region}:094274105915:layer:AWSLambdaPowertoolsTypeScriptV2:13`
          ),
        ],
      }
    );
    fnUrl.grantInvokeUrl(uiLambdaMiddleware);
    uiStorageBucket.grantReadWrite(uiLambdaMiddleware);

    NagSuppressions.addResourceSuppressions(
      uiLambdaMiddleware,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Wildcard permissions are granted to this lambda so that it can access all asset to sign.",
        },
      ],
      true
    );

    const lambdaDs = this.graphqlApi.addLambdaDataSource(
      "Lambda DataSource",
      uiLambdaMiddleware
    );
    const appsyncFn = new appsync.AppsyncFunction(this, "Lambda Resolver", {
      name: "LambdaResolver",
      dataSource: lambdaDs,
      api: this.graphqlApi,
    });

    NagSuppressions.addResourceSuppressions(
      lambdaDs,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Lambda datasource requires a wildcard to access all versions of the sign file function.",
        },
      ],
      true
    );

    this.graphqlApi.createResolver("Create Manifest", {
      typeName: "Mutation",
      fieldName: "createManifest",
      pipelineConfig: [appsyncFn],
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromInline(pipelineCode),
    });

    this.graphqlApi.createResolver("Create fMP4 Manifest", {
      typeName: "Mutation",
      fieldName: "createFMP4Manifest",
      pipelineConfig: [appsyncFn],
      runtime: appsync.FunctionRuntime.JS_1_0_0,
      code: appsync.Code.fromInline(pipelineCode),
    });
  }
}

const pipelineCode = `
import { util } from "@aws-appsync/utils";

export const request = () => {
  return {};
};

export const response = (ctx) => {
  const { error, result } = ctx;
  if (error) {
    return util.appendError(error.message, error.type, result);
  }
  return ctx.prev.result;
};`;
