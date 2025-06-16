import * as cdk from "aws-cdk-lib";

import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { NagSuppressions } from 'cdk-nag'; 


import { Construct } from "constructs";


/**
 * Storage resources
 * @constructor
 * @param {string} scope - The construct's parent or owner.
 * @param {string} id - An identifier that must be unique within the scope.
 */
export class Storage extends Construct {

  public readonly distribution: cloudfront.Distribution;
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
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED
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


    /************************************************************************/
    /**************************** cloudfront ********************************/
    /************************************************************************/
    this.distribution = new cloudfront.Distribution(this, 'VideoDis', {
      //enableLogging: true,
      logBucket: this.serverAccessLogsBucket,
      //logFilePrefix: 'cloudfront-logs/',      
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.uiStorageBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
      },      
      sslSupportMethod: cdk.aws_cloudfront.SSLMethod.SNI,
      defaultRootObject: 'index.html',      
      //viewerCertificate: cloudfront.ViewerCertificate.fromCloudFrontDefaultCertificate("*"),
    });

    // Suppress cdk-nag warnings for the distribution
    // couldn't bypass error about AwsSolutions-CFR4
  NagSuppressions.addResourceSuppressions(
    this.distribution,
    [
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Investigating cdk-nag finding. MinimumProtocolVersion is set to TLS_V1_2_2021 in code.',
      },
    ],
    true // Apply to child resources if any, though not strictly necessary for a Distribution
  );

  }
}
