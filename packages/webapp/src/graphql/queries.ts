/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const readFile = /* GraphQL */ `query ReadFile($input: ReadFile!) {
  readFile(input: $input)
}
` as GeneratedQuery<APITypes.ReadFileQueryVariables, APITypes.ReadFileQuery>;
