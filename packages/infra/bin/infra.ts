#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { C2paStack } from "../lib/c2pa-stack";
import { AwsSolutionsChecks } from "cdk-nag";

const app = new cdk.App();
new C2paStack(app, "C2paStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description:
    "Content Provenance Tracking Guidance (SO9524) - A solution for tracking content provenance using C2PA standard",
});

cdk.Aspects.of(app).add(new AwsSolutionsChecks());
