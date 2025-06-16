/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const createManifest = /* GraphQL */ `mutation CreateManifest($input: CreateManifest!) {
  createManifest(input: $input)
}
` as GeneratedMutation<
  APITypes.CreateManifestMutationVariables,
  APITypes.CreateManifestMutation
>;
export const createFMP4Manifest = /* GraphQL */ `mutation CreateFMP4Manifest($input: CreateFMP4Manifest!) {
  createFMP4Manifest(input: $input)
}
` as GeneratedMutation<
  APITypes.CreateFMP4ManifestMutationVariables,
  APITypes.CreateFMP4ManifestMutation
>;
