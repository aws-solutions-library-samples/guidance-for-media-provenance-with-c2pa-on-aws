/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Alert,
  Box,
  Button,
  Container,
  ContentLayout,
  Header,
  Select,
  SelectProps,
  SpaceBetween,
  Wizard,
} from "@cloudscape-design/components";

import {
  useCreateNewManifest,
  useGetAssetMutate,
  useListAssets,
} from "../../../api/api";

import { useForm, useFieldArray, SubmitHandler } from "react-hook-form";
import { StorageImage } from "@aws-amplify/ui-react-storage";
import { ReviewAndSubmit } from "./ReviewAndSubmit";
import { usePhotoEditor } from "react-photo-editor";
import { useNavigate } from "react-router-dom";
import { getUrl } from "aws-amplify/storage";
import { useEffect, useState } from "react";
import { ImageEditor } from "./ImageEditor";
import { compact, values } from "lodash";
import { Actions } from "./Actions";

export type FormValues = {
  ingredients: SelectProps.Option[];
  newTitle: string;
  assertions: {
    brightness: any;
    contrast: any;
    saturation: any;
    grayScale: any;
    rotate: any;
    zoom: any;
    horizontallyFlipped: any;
    verticallyFlipped: any;
  };
  computeType: "lambda" | "fargate";
};

export const EditAsset = () => {
  const [file, setFile] = useState<File | undefined>();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const navigate = useNavigate();
  const listAssets = useListAssets();
  const getAssetMutate = useGetAssetMutate();
  const createNewManifest = useCreateNewManifest();
  const photoEditorHook = usePhotoEditor({ file });

  const { handleSubmit, control, watch, getValues, resetField } =
    useForm<FormValues>();
  const { fields, replace } = useFieldArray({
    name: "ingredients",
    control,
  });

  const newTitle = watch("newTitle");

  useEffect(() => {
    if (fields[0]?.value) {
      (async () => {
        const { url } = await getAssetMutate.mutateAsync({
          path: fields[0].value!,
        });

        const response = await fetch(url);
        const blob = await response.blob();
        const file = new File([blob], fields[0].label!, {
          type: blob.type,
        });

        setFile(file);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields[0]]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    await createNewManifest.mutateAsync({
      newTitle: data.newTitle,
      ingredients: data.ingredients,
      computeType: data.computeType,
      assertions: compact(values(data.assertions)),
      file: await photoEditorHook.generateEditedFile(),
    });
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h3"
          description={"Perform some basic edits to your images"}
        >
          Edit Asset
        </Header>
      }
    >
      {createNewManifest.isSuccess ? (
        <SpaceBetween size="xs">
          <Alert type="success" header="Manifest Created">
            The new manifest has been created and save to your library under the
            name <strong>{newTitle}</strong>.
          </Alert>

          <Container
            header={
              <Header description="Use the options below to either download or navigate to inspect the asset.">
                New Manifest
              </Header>
            }
            footer={
              <Box float="right">
                <SpaceBetween direction="horizontal" size="xs">
                  <Button
                    onClick={async () => {
                      const url = await getUrl({
                        path: `assets/${newTitle}`,
                      });
                      window.open(url.url);
                    }}
                  >
                    Download
                  </Button>
                  <Button
                    onClick={() =>
                      navigate(`/media-manager/inspect-asset?asset=${newTitle}`)
                    }
                    variant="primary"
                  >
                    Manifest Inspect
                  </Button>
                </SpaceBetween>
              </Box>
            }
          >
            <StorageImage
              height={"30vh"}
              alt={newTitle}
              path={`assets/${newTitle}`}
            />
          </Container>
        </SpaceBetween>
      ) : (
        <form>
          <Wizard
            isLoadingNextStep={createNewManifest.isPending}
            onSubmit={() => {
              handleSubmit(onSubmit)();
            }}
            i18nStrings={{
              stepNumberLabel: (stepNumber) => `Step ${stepNumber}`,
              collapsedStepsLabel: (stepNumber, stepsCount) =>
                `Step ${stepNumber} of ${stepsCount}`,
              navigationAriaLabel: "Steps",
              previousButton: "Previous",
              nextButton: "Next",
              submitButton: "Create Manifest",
            }}
            onNavigate={({ detail }) =>
              setActiveStepIndex(detail.requestedStepIndex)
            }
            activeStepIndex={activeStepIndex}
            steps={[
              {
                title: "Choose asset to edit",
                description:
                  "First select from the dropdown the asset you wish to edit.",
                content: (
                  <Container>
                    <Select
                      statusType={listAssets.isLoading ? "loading" : "finished"}
                      selectedOption={fields[0]}
                      onChange={({ detail }) => replace(detail.selectedOption)}
                      options={listAssets.data?.items.map((item) => {
                        return {
                          label: item.path.split("/").pop(),
                          value: item.path,
                        };
                      })}
                    />
                  </Container>
                ),
              },
              {
                title: "Perform Edits",
                description: "Perform the edits you wish to embedd.",
                content: (
                  <ImageEditor
                    photoEditorHook={photoEditorHook}
                    resetField={resetField}
                    control={control}
                  />
                ),
              },
              {
                title: "Actions",
                description:
                  "Review the actions you are about to embed into the asset",
                content: <Actions getValues={getValues} />,
              },
              {
                title: "Review & Submit",
                description: "Embed asset with selected actions",
                content: (
                  <ReviewAndSubmit
                    photoEditorHook={photoEditorHook}
                    control={control}
                    createNewManifest={createNewManifest}
                    getValues={getValues}
                  />
                ),
              },
            ]}
          />
        </form>
      )}
    </ContentLayout>
  );
};
