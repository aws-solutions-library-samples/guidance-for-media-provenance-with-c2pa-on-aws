import { ResourcesConfig } from "aws-amplify";

export const awsconfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolClientId: import.meta.env.VITE_USERPOOLCLIENTID,
      identityPoolId: import.meta.env.VITE_IDENTITYPOOLID,
      userPoolId: import.meta.env.VITE_USERPOOLID,
    },
  },

  API: {
    GraphQL: {
      endpoint: import.meta.env.VITE_APPSYNCAPI,
      defaultAuthMode: "userPool",
    },
  },

  Storage: {
    S3: {
      region: import.meta.env.VITE_REGION,
      bucket: import.meta.env.VITE_FRONTENDSTORAGEBUCKET,
    },
  },
};
