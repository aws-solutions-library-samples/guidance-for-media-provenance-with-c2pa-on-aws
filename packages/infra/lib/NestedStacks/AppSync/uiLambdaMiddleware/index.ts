import { injectLambdaContext } from "@aws-lambda-powertools/logger/middleware";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpRequest } from "@smithy/protocol-http";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command, 
  CopyObjectCommand 
} from "@aws-sdk/client-s3";

import middy from "@middy/core";

const s3Client = new S3Client({});

const logger = new Logger({ logLevel: "DEBUG" });

interface ICreateManifest {
  imageS3: any;
  jsonS3: any;
  ingredientsUpload: any;
  computeType: any;
  newTitle: any;
}
const createManifest = async ({
  imageS3,
  jsonS3,
  ingredientsUpload,
  computeType,
  newTitle,
}: ICreateManifest) => {
  const asset_url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.uiStorageBucket,
      Key: imageS3,
    })
  );

  const assertions_json_url = await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: process.env.uiStorageBucket,
      Key: jsonS3,
    })
  );

  const ingredients_url = await Promise.all(
    ingredientsUpload.map(async (item: string) => {
      const url = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: process.env.uiStorageBucket,
          Key: item,
        })
      );

      return url;
    })
  );

  switch (computeType) {
    case "lambda":
      const url = new URL(process.env.LambdaFnURL!);
      const payload = {
        new_title: newTitle,
        asset_url,
        assertions_json_url,
        ingredients_url,
      };

      const request = new HttpRequest({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: url.hostname,
        },
        hostname: url.hostname,
        path: "/sign_file",
        body: JSON.stringify(payload),
      });

      const signedRequest = await new SignatureV4({
        credentials: defaultProvider(),
        region: process.env.AWS_DEFAULT_REGION,
        service: "lambda",
        sha256: Sha256,
      }).sign(request);

      const signfileResponse = await fetch(
        `${url.origin}/sign_file`,
        signedRequest
      );

      if (!signfileResponse.ok) throw new Error(signfileResponse.statusText);

      const { manifest } = await signfileResponse.json();

      const newImage = await fetch(manifest);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.uiStorageBucket,
          Key: `complete/assets/${newTitle}`,
          Body: await newImage.arrayBuffer(),
          ContentType: newImage.headers.get("Content-Type"),
        })
      );

      return { manifest: `complete/assets/${newTitle}` };
    case "fargate":
      const fargateUrl = new URL(`http://${process.env.FargateALB}`);
      const fargatePayload = {
        new_title: newTitle,
        asset_url,
        assertions_json_url,
        ingredients_url,
      };

      const fargateRequest = new HttpRequest({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: fargateUrl.hostname,
        },
        hostname: fargateUrl.hostname,
        path: "/sign_file",
        body: JSON.stringify(fargatePayload),
      });

      const fargateResponse = await fetch(
        `${fargateUrl.origin}/sign_file`,
        fargateRequest
      );

      if (!fargateResponse.ok) throw new Error(fargateResponse.statusText);

      const fargateManifest = await fargateResponse.json();

      const fargateNewImage = await fetch(fargateManifest.manifest);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.uiStorageBucket,
          Key: `complete/assets/${newTitle}`,
          Body: await fargateNewImage.arrayBuffer(),
          ContentType: fargateNewImage.headers.get("Content-Type"),
        })
      );

      return { manifest: `complete/assets/${newTitle}` };
    default:
      throw new Error(`Invalid compute type: ${computeType}`);
  }
};

interface ICreatefMP4Manifest {
  newTitle: string;
  computeType: string;
  initFile: string;
  fragmentsPattern: string;
  manifestFile: string;
}
const createFmp4Manifest = async ({
  computeType,
  newTitle,
  initFile,
  fragmentsPattern,
  manifestFile,
}: ICreatefMP4Manifest) => {
  switch (computeType) {
    case "lambda":
      const url = new URL(process.env.LambdaFnURL!);
      const payload = {
        new_title: newTitle,
        init_file: initFile,
        fragments_pattern: fragmentsPattern,
        manifest_file: manifestFile,
      };

      const request = new HttpRequest({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: url.hostname,
        },
        hostname: url.hostname,
        path: "/sign_fmp4",
        body: JSON.stringify(payload),
      });

      const signedRequest = await new SignatureV4({
        credentials: defaultProvider(),
        region: process.env.AWS_DEFAULT_REGION,
        service: "lambda",
        sha256: Sha256,
      }).sign(request);

      const signfileResponse = await fetch(
        `${url.origin}/sign_fmp4`,
        signedRequest
      );

      if (!signfileResponse.ok) throw new Error(signfileResponse.statusText);

      // Get the response from the Lambda function
      const response = await signfileResponse.json();
      const savedLocation = response.saved_location;
      const s3Key = savedLocation.split("s3://")[1];
      const s3Bucket = s3Key.split("/")[0];
      const s3Path = s3Key.split("/").slice(1).join("/");
      
      try {
        const copyResult = await copyFolderBetweenBuckets(
          s3Bucket,
          process.env.uiStorageBucket!,
          s3Path,
          `fragments/completed/${newTitle}/`
        );
        console.log("Copy folder result:", copyResult); 
        if (copyResult && copyResult.message) {
            console.log("Copy folder message:", copyResult.message);
        }
      } catch (error) {
        console.log("Error during copy folder operation:", error);
      }

      // Log the response for debugging
      console.log("Lambda response:", JSON.stringify(response, null, 2));

      return response;
    case "fargate":
      const fargateUrl = new URL(`http://${process.env.FargateALB}`);
      const fargatePayload = {
        new_title: newTitle,
        init_file: initFile,
        fragments_pattern: fragmentsPattern,
        manifest_file: manifestFile,
      };

      const fargateRequest = new HttpRequest({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: fargateUrl.hostname,
        },
        hostname: fargateUrl.hostname,
        path: "/sign_fmp4",
        body: JSON.stringify(fargatePayload),
      });

      const fargateResponse = await fetch(
        `${fargateUrl.origin}/sign_fmp4`,
        fargateRequest
      );

      if (!fargateResponse.ok) throw new Error(fargateResponse.statusText);

      const fargateManifest = await fargateResponse.json();
      const fargateSavedLocation = fargateManifest.saved_location;
      const fargateS3Key = fargateSavedLocation.split("s3://")[1];
      const fargateS3Bucket = fargateS3Key.split("/")[0];
      const fargateS3Path = fargateS3Key.split("/").slice(1).join("/");
      
      try {
        const copyResult = await copyFolderBetweenBuckets(
          fargateS3Bucket,
          process.env.uiStorageBucket!,
          fargateS3Path,
          `fragments/completed/${newTitle}/`
        );
        console.log("Copy folder result:", copyResult); 
        if (copyResult && copyResult.message) {
            console.log("Copy folder message:", copyResult.message);
        }
      } catch (error) {
        console.log("Error during copy folder operation:", error);
      }


      return fargateManifest;
    default:
      throw new Error(`Invalid compute type: ${computeType}`);
  }
};

const lambdaHandler = async (event: {
  arguments: { input: any };
  info: { fieldName: string };
}) => {
  switch (event.info.fieldName) {
    case "createManifest":
      return await createManifest(event.arguments.input);
    case "createFMP4Manifest":
      return await createFmp4Manifest(event.arguments.input);
    default:
      throw new Error(`Invalid GraphQL Path: ${event.info.fieldName}`);
  }
};

export const handler = middy(lambdaHandler).use(
  injectLambdaContext(logger, { logEvent: true })
);


const copyFolderBetweenBuckets = async (
  sourceBucket: string, 
  destinationBucket: string, 
  sourcePrefix: string,
  destinationPrefix: string
) => {  
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: sourceBucket,
      Prefix: sourcePrefix
    });

    const listedObjects = await s3Client.send(listCommand);

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      throw new Error(`object not found ${sourceBucket}/${sourcePrefix}`);
    }

    const copyPromises = listedObjects.Contents.map(async (object) => {
      if (!object.Key) return;
      const relativePath = object.Key.slice(sourcePrefix.length);
      const destinationKey = `${destinationPrefix}${relativePath}`;

      const copyCommand = new CopyObjectCommand({
        CopySource: `${sourceBucket}/${object.Key}`,
        Bucket: destinationBucket,
        Key: destinationKey
      });

      return s3Client.send(copyCommand);
    });

    await Promise.all(copyPromises);
    
    return {
      success: true,
      message: `${listedObjects.Contents.length} files were copied from ${sourcePrefix} to ${destinationPrefix}`
    };

  } catch (error) {
    console.log('Error Copying:', error);
    throw error;
  }
};