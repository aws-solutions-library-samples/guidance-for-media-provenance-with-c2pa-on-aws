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

export type CreateFMP4Manifest = {
  computeType?: string | null,
  newTitle?: string | null,
  initFile?: string | null,
  fragmentsPattern?: string | null,
  manifestFile?: string | null,
};

export type CreateManifestMutationVariables = {
  input: CreateManifest,
};

export type CreateManifestMutation = {
  createManifest?: string | null,
};

export type CreateFMP4ManifestMutationVariables = {
  input: CreateFMP4Manifest,
};

export type CreateFMP4ManifestMutation = {
  createFMP4Manifest?: string | null,
};

export type ConvertMP4ToFMP4 = {
  computeType?: string | null,
  newTitle?: string | null,
  mp4FileS3?: string | null,
  mp4FileName?: string | null,
  mp4FileType?: string | null,
  mp4FileBase64?: string | null,
};

export type ConvertMP4ToFMP4MutationVariables = {
  input: ConvertMP4ToFMP4,
};

export type ConvertMP4ToFMP4Mutation = {
  convertMP4ToFMP4?: string | null,
};

export type ReadFileQueryVariables = {
};

export type ReadFileQuery = {
  readFile?: string | null,
};
