import * as cdk from "aws-cdk-lib";

import * as cognito from "aws-cdk-lib/aws-cognito";
import * as s3 from "aws-cdk-lib/aws-s3";

import {
  IdentityPool,
  UserPoolAuthenticationProvider,
} from "@aws-cdk/aws-cognito-identitypool-alpha";

import { Construct } from "constructs";
import { NagSuppressions } from "cdk-nag";

interface IAuthentication {
  uiStorageBucket: s3.Bucket;
}

/**
 * Manage users
 * @constructor
 * @param {string} scope - The construct's parent or owner.
 * @param {string} id - An identifier that must be unique within the scope.
 */
export class Authentication extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly identityPool: IdentityPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: IAuthentication) {
    super(scope, id);

    const { uiStorageBucket } = props;

    const stack = cdk.Stack.of(this);

    /************************************************************************/
    /*************************** User Pool **********************************/
    /************************************************************************/

    this.userPool = new cognito.UserPool(this, "UserPool", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      featurePlan: cognito.FeaturePlan.PLUS,
      signInAliases: { email: true },
      userPoolName: stack.stackName,
      selfSignUpEnabled: false,
      passwordPolicy: {
        minLength: 8,
        requireDigits: true,
        requireSymbols: true,
        requireUppercase: true,
      },
    });

    /************************************************************************/
    /*************************** User Client ********************************/
    /************************************************************************/

    this.userPoolClient = new cognito.UserPoolClient(this, "UserPool Client", {
      userPool: this.userPool,
      disableOAuth: true,
    });

    /************************************************************************/
    /*************************** User Client ********************************/
    /************************************************************************/

    this.identityPool = new IdentityPool(this, "Identity Pool", {
      identityPoolName: stack.stackName,
      authenticationProviders: {
        userPools: [
          new UserPoolAuthenticationProvider({
            userPool: this.userPool,
            userPoolClient: this.userPoolClient,
          }),
        ],
      },
    });
    uiStorageBucket.grantReadWrite(this.identityPool.authenticatedRole);

    NagSuppressions.addResourceSuppressions(
      this.userPool,
      [
        {
          id: "AwsSolutions-COG3",
          reason:
            "Leveraging UserPool feature plan plus in favour of depreciated AdvancedSecurityMode set to ENFORCED.",
        },
      ],
      true
    );

    NagSuppressions.addResourceSuppressions(
      this.identityPool.authenticatedRole,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "Granting wildcard access for this role to interact in read and writing to this bucket",
        },
      ],
      true
    );
  }
}
