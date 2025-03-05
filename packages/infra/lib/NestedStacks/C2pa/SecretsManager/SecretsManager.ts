import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";

import * as cdk from "aws-cdk-lib";
import * as path from "path";

import { Construct } from "constructs";
import { readFileSync } from "fs";
import { NagSuppressions } from "cdk-nag";

export class SecretsManager extends Construct {
  readonly certificate: secretsmanager.Secret;
  readonly private_key: secretsmanager.Secret;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const stack = cdk.Stack.of(this);

    /************************************************************************/
    /************************* Certificate **********************************/
    /************************************************************************/

    const cert_val = readFileSync(path.join(__dirname, "ps256.pub"), "utf-8");

    this.certificate = new secretsmanager.Secret(this, "C2PA Certificate", {
      secretName: `${stack.stackName}-C2PA-Certificate`,
      secretStringValue: cdk.SecretValue.unsafePlainText(cert_val),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /************************************************************************/
    /************************* Private Key **********************************/
    /************************************************************************/

    const prv_key_val = readFileSync(
      path.join(__dirname, "ps256.pem"),
      "utf-8"
    );

    this.private_key = new secretsmanager.Secret(this, "C2PA Private Key", {
      secretName: `${stack.stackName}-C2PA-Private-Key`,
      secretStringValue: cdk.SecretValue.unsafePlainText(prv_key_val),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    NagSuppressions.addResourceSuppressions(
      [this.certificate, this.private_key],
      [
        {
          id: "AwsSolutions-SMG4",
          reason:
            "Certifictate and key when launched use the public sample unless changed. Fixed and publicly available",
        },
      ]
    );
  }
}
