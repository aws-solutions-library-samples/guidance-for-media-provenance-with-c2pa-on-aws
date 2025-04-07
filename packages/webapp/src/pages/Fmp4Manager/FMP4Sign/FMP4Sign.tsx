import {
  FormField,
  SpaceBetween,
  Container,
  Header,
  ContentLayout,
  Select,
  Button,
} from "@cloudscape-design/components";

import { useListAssets, useCreateNewFMP4Manifest } from "../../../api/api";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { Step2 } from "./StepTwo";

export type FormValues = {
  newTitle: string;
  computeType: "lambda" | "fargate";
  initFile: string;
  manifestFile: string;
  fragmentsPattern: string;
  folder: string;
};

export const FMP4Sign = () => {
  const { data } = useListAssets("fragments/assets/");

  const { control, handleSubmit, watch } = useForm<FormValues>();

  const createNewFMP4Manifest = useCreateNewFMP4Manifest();

  const folderSelection = watch("folder");

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    await createNewFMP4Manifest.mutateAsync({
      newTitle: data.newTitle,
      computeType: data.computeType,
      initFile: `s3://${import.meta.env.VITE_FRONTENDSTORAGEBUCKET}/${
        data.initFile
      }`,
      manifestFile: `s3://${import.meta.env.VITE_FRONTENDSTORAGEBUCKET}/${
        data.manifestFile
      }`,
      fragmentsPattern: `s3://${
        import.meta.env.VITE_FRONTENDSTORAGEBUCKET
      }/${folderSelection}${data.fragmentsPattern}`,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Fill the form and have your fMP4 signed"
          >
            Sign Fragmented MP4
          </Header>
        }
      >
        <SpaceBetween size={"l"}>
          <Container header={<Header>Step 1</Header>}>
            <Controller
              name="folder"
              control={control}
              rules={{ required: "folder required" }}
              render={({ field }) => (
                <FormField
                  label="Folder Selection"
                  description="Select the folder you wish to operate on"
                >
                  <Select
                    selectedOption={
                      field.value
                        ? {
                            label: field.value.split("/").pop() || "",
                            value: field.value,
                          }
                        : null
                    }
                    onChange={({ detail }) =>
                      field.onChange(detail.selectedOption.value)
                    }
                    options={data?.excludedSubpaths?.map((path) => {
                      return {
                        label: path.split("/").reverse()[1],
                        value: path,
                      };
                    })}
                  />
                </FormField>
              )}
            />
          </Container>
          {folderSelection && (
            <Step2 control={control} folderSelection={folderSelection} />
          )}
          <Button variant="primary" loading={createNewFMP4Manifest.isPending}>
            Submit
          </Button>
        </SpaceBetween>
      </ContentLayout>
    </form>
  );
};