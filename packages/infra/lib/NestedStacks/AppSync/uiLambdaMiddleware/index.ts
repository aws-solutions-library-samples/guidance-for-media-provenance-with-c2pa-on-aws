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

      return JSON.stringify({ manifest: `complete/assets/${newTitle}` });
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

      return JSON.stringify({ manifest: `complete/assets/${newTitle}` });
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

interface IConvertMP4ToFMP4 {
  newTitle: string;
  computeType: string;
  mp4FileS3?: string;
  mp4FileName?: string;
  mp4FileType?: string;
  mp4FileBase64?: string;
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
      
      // Log the response for debugging
      console.log("Lambda response:", JSON.stringify(response, null, 2));
      
      // The Lambda function now returns more information
      const { manifest, manifest_key, files } = response;
      
      try {
        // Try to fetch the manifest URL to verify it works
        const manifestResponse = await fetch(manifest);
        
        if (!manifestResponse.ok) {
          throw new Error(`Failed to fetch manifest: ${manifestResponse.statusText}`);
        }
        
        // The frontend expects a JSON string, not an object
        // We need to stringify the result
        return JSON.stringify({ 
          manifest: manifest_key,
          files: files || []
        });
      } catch (error: any) {
        console.error("Error fetching manifest:", error);
        throw new Error(`Failed to process FMP4 manifest: ${error.message || 'Unknown error'}`);
      }
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

      const fargateNewImage = await fetch(fargateManifest.manifest);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.uiStorageBucket,
          Key: `fragments/assets/${newTitle}`,
          Body: await fargateNewImage.arrayBuffer(),
          ContentType: fargateNewImage.headers.get("Content-Type"),
        })
      );

      return JSON.stringify({ manifest: `fragments/assets/${newTitle}` });
    default:
      throw new Error(`Invalid compute type: ${computeType}`);
  }
};

const convertMP4ToFMP4 = async ({
  //computeType,
  newTitle,
  mp4FileS3,
  mp4FileName,
  mp4FileType,
  mp4FileBase64,
}: IConvertMP4ToFMP4) => {
  //switch (computeType) {
    // case "lambda":
    //   const url = new URL(process.env.LambdaFnURL!);
    //   const payload = {
    //     new_title: newTitle,
    //     mp4_file_s3: mp4FileS3,
    //     mp4_file_name: mp4FileName,
    //     mp4_file_type: mp4FileType,
    //     mp4_file_base64: mp4FileBase64,
    //   };

    //   const request = new HttpRequest({
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Host: url.hostname,
    //     },
    //     hostname: url.hostname,
    //     path: "/convert_mp4",
    //     body: JSON.stringify(payload),
    //   });

    //   const signedRequest = await new SignatureV4({
    //     credentials: defaultProvider(),
    //     region: process.env.AWS_DEFAULT_REGION,
    //     service: "lambda",
    //     sha256: Sha256,
    //   }).sign(request);

    //   const convertResponse = await fetch(
    //     `${url.origin}/convert_mp4`,
    //     signedRequest
    //   );

    //   if (!convertResponse.ok) throw new Error(convertResponse.statusText);

    //   // Get the response from the Lambda function
    //   const response = await convertResponse.json();
      
    //   // Log the response for debugging
    //   console.log("Lambda response:", JSON.stringify(response, null, 2));
      
    //   // The Lambda function returns the MPD URL and other information
    //   const { mpd_url, mpd_key, files } = response;
      
    //   // The frontend expects a JSON string, not an object
    //   return JSON.stringify({ 
    //     mpdUrl: mpd_url,
    //     mpdKey: mpd_key,
    //     files: files || []
    //   });
      
    //case "fargate":
      const fargateUrl = new URL(`http://${process.env.FargateALB}`);
      const fargatePayload = {
        new_title: newTitle,
        mp4_file_s3: mp4FileS3,
        mp4_file_name: mp4FileName,
        mp4_file_type: mp4FileType,
        mp4_file_base64: mp4FileBase64,
      };

      const fargateRequest = new HttpRequest({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Host: fargateUrl.hostname,
        },
        hostname: fargateUrl.hostname,
        path: "/convert_mp4",
        body: JSON.stringify(fargatePayload),
      });

      const fargateResponse = await fetch(
        `${fargateUrl.origin}/convert_mp4`,
        fargateRequest
      );

      if (!fargateResponse.ok) throw new Error(fargateResponse.statusText);

      const fargateResult = await fargateResponse.json();
      
      return JSON.stringify({ 
        mpdUrl: fargateResult.mpd_url,
        mpdKey: fargateResult.mpd_key,
        files: fargateResult.files || []
      });
    /*
    default:
      throw new Error(`Invalid compute type: ${computeType}`);
    */
  //}
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
