/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Container,
  FormField,
  Input,
  KeyValuePairs,
  SegmentedControl,
  SpaceBetween,
  StatusIndicator,
} from "@cloudscape-design/components";
import {
  Control,
  Controller,
  UseFormGetValues,
  useWatch,
} from "react-hook-form";

import { UseMutationResult } from "@tanstack/react-query";
import { FormValues } from "./EditAsset";
import { capitalize, compact, values } from "lodash";
import { useEffect } from "react";

interface IReviewAndSubmit {
  photoEditorHook: any;
  control: Control<FormValues>;
  getValues: UseFormGetValues<FormValues>;
  createNewManifest: UseMutationResult<
    {
      response: any;
    },
    Error,
    any,
    unknown
  >;
}

export const ReviewAndSubmit = ({
  control,
  getValues,
  photoEditorHook,
  createNewManifest,
}: IReviewAndSubmit) => {
  const ingredients = useWatch({
    control,
    name: "ingredients",
  });
  const assertions = getValues("assertions");

  const { canvasRef, applyFilter } = photoEditorHook;

  useEffect(() => {
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container>
      <SpaceBetween size="s">
        <KeyValuePairs
          items={[
            {
              label: "Ingredient Title",
              value: ingredients[0].value?.split("/").pop(),
            },
          ]}
        />
        <FormField
          description="What name would you like to save this asset as. If you provide a pre-exising name it will overwrite that asset."
          label="New Title"
        >
          <Controller
            control={control}
            defaultValue={ingredients[0].value?.split("/").pop()}
            name="newTitle"
            render={({ field: { onChange, value } }) => (
              <Input
                value={value}
                disabled={createNewManifest.isPending}
                onChange={(event) => onChange(event.detail.value)}
              />
            )}
          />
        </FormField>
        <Container>
          <canvas
            style={{
              width: "40vw",
            }}
            ref={canvasRef}
          />
        </Container>
        <KeyValuePairs
          items={[
            {
              label: "Number of actions",
              value: compact(values(assertions)).length,
            },
          ]}
        />

        <FormField
          description="Whic platform would you like to use to embedd your manifest?"
          label="Compute"
        >
          <Controller
            control={control}
            defaultValue={"lambda"}
            name="computeType"
            render={({ field: { onChange, value } }) => {
              return createNewManifest.isPending ? (
                <StatusIndicator type="success">
                  {capitalize(value)}
                </StatusIndicator>
              ) : (
                <SegmentedControl
                  onChange={({ detail }) => onChange(detail.selectedId)}
                  selectedId={value}
                  options={[
                    { text: "Lambda", id: "lambda" },
                    { text: "Fargate", id: "fargate" },
                  ]}
                />
              );
            }}
          />
        </FormField>
      </SpaceBetween>
    </Container>
  );
};
