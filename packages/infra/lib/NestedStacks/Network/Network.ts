import * as ec2 from "aws-cdk-lib/aws-ec2";

import { Construct } from "constructs";

export class Network extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.vpc = new ec2.Vpc(this, "VPC", {
      maxAzs: 2,
      flowLogs: {
        VPCFlowLogs: {},
      },
    });
  }
}
