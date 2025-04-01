// packages/webapp/src/pages/MediaManager/FMP4Manager/FMP4Manager.tsx

import { useState } from 'react';
import { 
  Form, 
  FormField, 
  SpaceBetween, 
  Container, 
  Header,
  ContentLayout,
  Input,
  Select,
  Button,
  Alert
} from "@cloudscape-design/components";
import { useForm, Controller } from 'react-hook-form';
import { useListAssets, useSignFMP4 } from "../../../api/api";

interface FMP4FormData {
  initFile: string;
  manifestFile: string;
  fragmentsPattern: string;
}

export const FMP4Manager = () => {
  const { data: assets, isLoading } = useListAssets();
  const signFMP4 = useSignFMP4();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { control, handleSubmit } = useForm<FMP4FormData>({
    defaultValues: {
      initFile: '',
      manifestFile: '',
      fragmentsPattern: 'fragment*.m4s'
    }
  });

  // Filter for init files and manifest files
  const initFiles = assets?.items.filter(item => 
    item.path.endsWith('init.mp4') || item.path.endsWith('dashinit.mp4')
  ) ?? [];
  
  const manifestFiles = assets?.items.filter(item => 
    item.path.endsWith('.json')
  ) ?? [];

  // Create options from filtered files
  const initOptions = initFiles.map(item => ({
    label: item.path.split("/").pop() || '',
    value: item.path
  }));

  const manifestOptions = manifestFiles.map(item => ({
    label: item.path.split("/").pop() || '',
    value: item.path
  }));

  const onSubmit = async (data: FMP4FormData) => {
    try {
      setError(null);
      setSuccess(null);
      
      const payload = {
        s3_bucket: import.meta.env.VITE_FRONTENDSTORAGEBUCKET,
        init_file: data.initFile,
        fragments_pattern: data.fragmentsPattern,
        manifest_file: data.manifestFile
      };

      const result = await signFMP4.mutateAsync(payload);
      setSuccess('Files signed successfully!');
      console.log("FMP4 signing completed:", result);
      
    } catch (error) {
      console.error("Error signing FMP4 files:", error);
      setError('Failed to sign files. Please try again.');
    }
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Sign fragmented MP4 files with manifest data"
        >
          Sign Fragmented MP4
        </Header>
      }
    >
      <Container>
        <Form>
          <SpaceBetween size="l">
            {error && (
              <Alert type="error" dismissible onDismiss={() => setError(null)}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert type="success" dismissible onDismiss={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

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
                      field.value ? {
                        label: field.value.split("/").pop() || '',
                        value: field.value
                      } : null
                    }
                    onChange={({ detail }) => 
                      field.onChange(detail.selectedOption.value)
                    }
                    options={initOptions}
                    filteringType="auto"
                    placeholder="Choose init file..."
                    loadingText="Loading init files..."
                    statusType={isLoading ? "loading" : "finished"}
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
                    placeholder="fragment*.m4s"
                  />
                )}
              />
            </FormField>

            <FormField
              label="Manifest File"
              description="Select the manifest file"
            >
              <Controller
                name="manifestFile"
                control={control}
                rules={{ required: "Manifest file is required" }}
                render={({ field }) => (
                  <Select
                    selectedOption={
                      field.value ? {
                        label: field.value.split("/").pop() || '',
                        value: field.value
                      } : null
                    }
                    onChange={({ detail }) => 
                      field.onChange(detail.selectedOption.value)
                    }
                    options={manifestOptions}
                    filteringType="auto"
                    placeholder="Choose manifest file..."
                    loadingText="Loading manifest files..."
                    statusType={isLoading ? "loading" : "finished"}
                  />
                )}
              />
            </FormField>

            <Button
  variant="primary"
  onClick={(event) => {
    event.preventDefault();
    handleSubmit(onSubmit)();
  }}
  loading={signFMP4.isPending}
>
              Sign Files
            </Button>
          </SpaceBetween>
        </Form>
      </Container>
    </ContentLayout>
  );
};
