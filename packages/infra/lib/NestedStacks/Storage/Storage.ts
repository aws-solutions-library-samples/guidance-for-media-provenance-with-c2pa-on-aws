import * as cdk from "aws-cdk-lib";

import * as s3 from "aws-cdk-lib/aws-s3";

import { Construct } from "constructs";

/**
 * Storage resources
 * @constructor
 * @param {string} scope - The construct's parent or owner.
 * @param {string} id - An identifier that must be unique within the scope.
 */
export class Storage extends Construct {
  public readonly serverAccessLogsBucket: s3.Bucket;
  public readonly backendStorageBucket: s3.Bucket;
  public readonly amplifyStagingBucket: s3.Bucket;
  public readonly cpArtifactBucket: s3.Bucket;
  public readonly uiStorageBucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const bucketPrefix = `${cdk.Stack.of(this).stackName.toLowerCase()}-${
      cdk.Stack.of(this).account
    }-${cdk.Stack.of(this).region}`;

    /************************************************************************/
    /******************************** S3 ************************************/
    /************************************************************************/

    this.serverAccessLogsBucket = new s3.Bucket(this, "Access Bucket", {
      bucketName: `${bucketPrefix}-access-logs`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    this.amplifyStagingBucket = new s3.Bucket(this, "Amplify Staging Bucket", {
      serverAccessLogsBucket: this.serverAccessLogsBucket,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      bucketName: `${bucketPrefix}-amplify-staging`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      lifecycleRules: [
        {
          enabled: true,
          expiration: cdk.Duration.days(10),
        },
      ],
    });

    this.uiStorageBucket = new s3.Bucket(this, "Frontend Bucket", {
      serverAccessLogsBucket: this.serverAccessLogsBucket,
      bucketName: `${bucketPrefix}-frontend-storage`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
      lifecycleRules: [
        {
          enabled: true,
          prefix: "editedAssets",
          expiration: cdk.Duration.days(1),
        },
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.HEAD,
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });

    this.backendStorageBucket = new s3.Bucket(this, "Backend Bucket", {
      serverAccessLogsBucket: this.serverAccessLogsBucket,
      bucketName: `${bucketPrefix}-backend-storage`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    this.cpArtifactBucket = new s3.Bucket(
      this,
      "CodePipeline Artifact Bucket",
      {
        serverAccessLogsBucket: this.serverAccessLogsBucket,
        bucketName: `${bucketPrefix}-cp-artifact`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        enforceSSL: true,
      }
    );
  }
}
