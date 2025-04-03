import {
  Container,
  Header,
  SpaceBetween,
  FormField,
  Select,
  Input,
  SegmentedControl,
} from "@cloudscape-design/components";

import { Controller } from "react-hook-form";
import { useListAssets } from "../../../api/api";

interface IStep2 {
  control: any;
  folderSelection: string;
}
export const Step2 = ({ control, folderSelection }: IStep2) => {
  const { data } = useListAssets(folderSelection);

  return (
    <Container
      header={
        <Header description={"Configure fragment parameters"}>Step 2</Header>
      }
    >
      <SpaceBetween size="l">
        <FormField
          description="What name would you like to save this asset as. If you provide a pre-exising name it will overwrite that asset."
          label="New Title"
        >
          <Controller
            control={control}
            defaultValue={`${folderSelection.split("/").reverse()[1]}`}
            name="newTitle"
            render={({ field: { onChange, value } }) => (
              <Input
                value={value}
                onChange={(event) => onChange(event.detail.value)}
              />
            )}
          />
        </FormField>

        <FormField
          label="Init File"
          description="Select the initialization segment file"
        >
          <Controller
            name="initFile"
            control={control}
            rules={{ required: "Init file is required" }}
            render={({ field }) => (
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
                options={data?.items.map((item) => {
                  return {
                    label: item.path.split("/").pop(),
                    value: item.path,
                  };
                })}
                filteringType="auto"
                placeholder="Choose init file..."
                loadingText="Loading init files..."
              />
            )}
          />
        </FormField>

        <FormField
          label="Fragments Pattern"
          description="Provide the pattern to match fragment files (e.g., fragment*.m4s)"
        >
          <Controller
            name="fragmentsPattern"
            control={control}
            rules={{ required: "Fragment pattern is required" }}
            render={({ field }) => (
              <Input
                {...field}
                onChange={({ detail }) => field.onChange(detail.value)}
                placeholder="fragment*.m4s"
              />
            )}
          />
        </FormField>

        <FormField label="Manifest File" description="Select the manifest file">
          <Controller
            name="manifestFile"
            control={control}
            rules={{ required: "Manifest file is required" }}
            render={({ field }) => (
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
                options={data?.items.map((item) => {
                  return {
                    label: item.path.split("/").pop(),
                    value: item.path,
                  };
                })}
                filteringType="auto"
                placeholder="Choose manifest file..."
                loadingText="Loading manifest files..."
              />
            )}
          />
        </FormField>

        <FormField
          description="Which platform would you like to use to embedd your manifest?"
          label="Compute"
        >
          <Controller
            control={control}
            defaultValue={"fargate"}
            name="computeType"
            render={({ field: { onChange, value } }) => {
              return (
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
