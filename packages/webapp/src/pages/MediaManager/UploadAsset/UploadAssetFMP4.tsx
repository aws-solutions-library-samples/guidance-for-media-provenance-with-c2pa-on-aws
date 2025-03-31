import { ContentLayout, Header } from "@cloudscape-design/components";
import { FileUploader } from "@aws-amplify/ui-react-storage";

export const UploadAssetFMP4 = () => {
  return (
    <ContentLayout
      header={
        <Header
          variant="h3"
          description={
            "Upload your fmp4 assets"
          }
        >
          Media Asset Upload
        </Header>
      }
    >
      <FileUploader
        acceptedFileTypes={[".mp4", ".mpd", ".m4s",".json"]}
        path="assets/"
        maxFileCount={30}
        isResumable
      />
    </ContentLayout>
  );
};
