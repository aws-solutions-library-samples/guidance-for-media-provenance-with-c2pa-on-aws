import { ContentLayout, Header } from "@cloudscape-design/components";
import { FileUploader } from "@aws-amplify/ui-react-storage";

export const UploadAsset = () => {
  return (
    <ContentLayout
      header={
        <Header
          variant="h3"
          description={
            "Upload your media assets with or without c2pa metadata attached"
          }
        >
          Media Asset Upload
        </Header>
      }
    >
      <FileUploader
        acceptedFileTypes={["image/*", "video/*"]}
        path="assets/"
        maxFileCount={5}
        isResumable
      />
    </ContentLayout>
  );
};
