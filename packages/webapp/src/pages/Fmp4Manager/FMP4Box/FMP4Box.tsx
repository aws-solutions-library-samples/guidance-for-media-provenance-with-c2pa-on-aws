import {
  FormField,
  SpaceBetween,
  Container,
  Header,
  ContentLayout,
  Button,
  FileUpload,
  Input,
} from "@cloudscape-design/components";

import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { useState } from "react";
import { useConvertMP4ToFMP4 } from "../../../api/api";
import DASHReact from "../../MediaManager/InspectAsset/Overview/DASHReact";

export type MP4BoxFormValues = {
  newTitle: string;
  mp4File: File | null;
};

export const FMP4Box = () => {
  const { control, handleSubmit, watch } = useForm<MP4BoxFormValues>({
    defaultValues: {
      mp4File: null,
    },
  });

  const [mpdUrl, setMpdUrl] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);

  const convertMP4ToFMP4 = useConvertMP4ToFMP4();

  const onSubmit: SubmitHandler<MP4BoxFormValues> = async (data) => {
    if (!data.mp4File) {
      setConversionError("Please upload an MP4 file");
      return;
    }

    setIsConverting(true);
    setConversionError(null);

    try {
      // Check file size - warn if it's large
      if (data.mp4File.size > 100 * 1024 * 1024) { // 100MB
        console.warn("Large file detected. Upload may take some time.");
      }

      // Validate file type
      if (!data.mp4File.type.includes('mp4') && !data.mp4File.name.toLowerCase().endsWith('.mp4')) {
        setConversionError("Please upload a valid MP4 file");
        setIsConverting(false);
        return;
      }

      const result = await convertMP4ToFMP4.mutateAsync({
        newTitle: data.newTitle || data.mp4File.name.replace(".mp4", ""),
        mp4File: data.mp4File,
      });

      if (result?.mpdUrl) {
        setMpdUrl(result.mpdUrl);
      } else {
        setConversionError("Conversion failed: No MPD URL returned");
      }
    } catch (error) {
      console.error("Conversion error:", error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes("ETag missing")) {
          setConversionError(
            "Upload failed due to CORS configuration. Please contact your administrator to update the S3 bucket CORS configuration to include ETag in ExposeHeaders."
          );
        } else if (error.message.includes("Network Error") || error.message.includes("Failed to fetch")) {
          setConversionError(
            "Network error occurred. Please check your connection and try again."
          );
        } else {
          setConversionError(`Conversion failed: ${error.message}`);
        }
      } else {
        setConversionError(`Conversion failed: ${String(error)}`);
      }
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <ContentLayout
        header={
          <Header
            variant="h1"
            description="Upload an MP4 file and convert it to a fragmented MP4 using MP4Box"
          >
            MP4Box Conversion
          </Header>
        }
      >
        <SpaceBetween size={"l"}>
          <Container header={<Header>Upload MP4</Header>}>
            <SpaceBetween size="l">
              <FormField
                description="What name would you like to save this asset as. If you provide a pre-existing name it will overwrite that asset."
                label="New Title"
              >
                <Controller
                  control={control}
                  name="newTitle"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      value={value}
                      onChange={(event) => onChange(event.detail.value)}
                      placeholder="Enter a title for the converted file"
                    />
                  )}
                />
              </FormField>

              <FormField
                label="MP4 File"
                description="Upload an MP4 file to convert to fragmented MP4"
                errorText={conversionError}
              >
                <Controller
                  name="mp4File"
                  control={control}
                  rules={{ required: "MP4 file is required" }}
                  render={({ field }) => (
                    <FileUpload
                      onChange={({ detail }) => {
                        if (detail.value.length > 0) {
                          field.onChange(detail.value[0]);
                        } else {
                          field.onChange(null);
                        }
                      }}
                      value={field.value ? [field.value] : []}
                      accept=".mp4"
                      i18nStrings={{
                        uploadButtonText: (e) => (e ? "Choose different file" : "Choose file"),
                        dropzoneText: (e) => (e ? "Drop to replace file" : "Drop MP4 file"),
                        removeFileAriaLabel: (e) => `Remove ${e}`,
                        limitShowFewer: "Show fewer files",
                        limitShowMore: "Show more files",
                        errorIconAriaLabel: "Error",
                      }}
                      showFileLastModified
                      showFileSize
                      tokenLimit={1}
                    />
                  )}
                />
              </FormField>
            </SpaceBetween>
          </Container>

          <Button 
            variant="primary" 
            loading={isConverting}
            disabled={!watch("mp4File")}
          >
            Convert to Fragmented MP4
          </Button>

          {mpdUrl && (
            <Container header={<Header>DASH Player</Header>}>
              <DASHReact
                url={mpdUrl}
                controls={true}
                autoPlay={false}
                className="video-js"
              />
            </Container>
          )}
        </SpaceBetween>
      </ContentLayout>
    </form>
  );
};
