#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { C2PaStack } from "../lib/c2pa-stack";
import { AwsSolutionsChecks } from "cdk-nag";

const app = new cdk.App();
new C2PaStack(app, "C2PaStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
cdk.Aspects.of(app).add(new AwsSolutionsChecks());
