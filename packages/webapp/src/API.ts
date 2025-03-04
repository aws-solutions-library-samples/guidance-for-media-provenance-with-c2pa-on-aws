/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type CreateManifest = {
  computeType?: string | null,
  newTitle?: string | null,
  imageS3?: string | null,
  jsonS3?: string | null,
  ingredientsUpload?: Array< string | null > | null,
};

export type ReadFile = {
  assetS3?: string | null,
};

export type CreateManifestMutationVariables = {
  input: CreateManifest,
};

export type CreateManifestMutation = {
  createManifest?: string | null,
};

export type ReadFileQueryVariables = {
  input: ReadFile,
};

export type ReadFileQuery = {
  readFile?: string | null,
};
