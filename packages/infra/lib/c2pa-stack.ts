import * as cdk from "aws-cdk-lib";

import { Authentication } from "./NestedStacks/Authentication/Authentication";
import { Network } from "./NestedStacks/Network/Network";
import { Storage } from "./NestedStacks/Storage/Storage";

import { SecretsManager } from "./NestedStacks/C2pa/SecretsManager/SecretsManager";
import { Lambda } from "./NestedStacks/C2pa/Lambda/Lambda";
import { Fargate } from "./NestedStacks/C2pa/Fargate/Fargate";

import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { AppSync } from "./NestedStacks/AppSync/AppSync";
import { Amplify } from "./NestedStacks/Amplify/Amplify";

export class C2paStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    NagSuppressions.addStackSuppressions(this, [
      {
        id: "AwsSolutions-IAM4",
        reason:
          "Lambda execution policy for custom resources created by higher level CDK constructs",
        appliesTo: [
          "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
        ],
      },
    ]);

    /********************************************************************/
    /**************************** Storage *******************************/
    /********************************************************************/

    const storageStack = new Storage(this, "Storage");

    /********************************************************************/
    /************************* Authentication ***************************/
    /********************************************************************/

    const authStack = new Authentication(this, "Authentication", {
      uiStorageBucket: storageStack.uiStorageBucket,
    });

    /********************************************************************/
    /**************************** Network *******************************/
    /********************************************************************/

    const networkStack = new Network(this, "Network");

    /********************************************************************/
    /****************************** C2PA ********************************/
    /********************************************************************/

    const { certificate, private_key } = new SecretsManager(this, "Secrets");

    const { fnUrl } = new Lambda(this, "C2PA Lambda", {
      backendStorageBucket: storageStack.backendStorageBucket,
      vpc: networkStack.vpc,
      certificate,
      private_key,
    });
    const { alb } = new Fargate(this, "C2PA Fargate", {
      serverAccessLogsBucket: storageStack.serverAccessLogsBucket,
      backendStorageBucket: storageStack.backendStorageBucket,
      vpc: networkStack.vpc,
      certificate,
      private_key,
    });

    /********************************************************************/
    /**************************** AppSync *******************************/
    /********************************************************************/

    const apiStack = new AppSync(this, "AppSync", {
      uiStorageBucket: storageStack.uiStorageBucket,
      userPool: authStack.userPool,
      vpc: networkStack.vpc,
      fnUrl,
      alb,
    });

    /********************************************************************/
    /**************************** Amplify *******************************/
    /********************************************************************/

    new Amplify(this, "Amplify App", {
      amplifyStagingBucket: storageStack.amplifyStagingBucket,
      cpArtifactBucket: storageStack.cpArtifactBucket,
      uiStorageBucket: storageStack.uiStorageBucket,
      userPoolClient: authStack.userPoolClient,
      identityPool: authStack.identityPool,
      graphqlApi: apiStack.graphqlApi,
      userPool: authStack.userPool,
    });

    /********************************************************************/
    /**************************** Outputs *******************************/
    /********************************************************************/

    new cdk.CfnOutput(this, "VITE_USERPOOLID", {
      value: authStack.userPool.userPoolId,
    });
    new cdk.CfnOutput(this, "VITE_USERPOOLCLIENTID", {
      value: authStack.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, "VITE_IDENTITYPOOLID", {
      value: authStack.identityPool.identityPoolId,
    });
    new cdk.CfnOutput(this, "VITE_APPSYNCAPI", {
      value: apiStack.graphqlApi.graphqlUrl,
    });
    new cdk.CfnOutput(this, "VITE_REGION", {
      value: this.region,
    });
    new cdk.CfnOutput(this, "VITE_FRONTENDSTORAGEBUCKET", {
      value: storageStack.uiStorageBucket.bucketName,
    });
  }
}
