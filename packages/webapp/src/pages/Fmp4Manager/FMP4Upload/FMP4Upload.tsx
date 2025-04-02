import {
  Button,
  ContentLayout,
  Header,
  Input,
  SpaceBetween,
} from "@cloudscape-design/components";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { useState } from "react";

export const FMP4Upload = () => {
  const [folderName, setFolderName] = useState("");
  const [nameSaved, setNameSaved] = useState(false);

  return (
    <ContentLayout
      header={
        <Header
          variant="h3"
          description={
            "Select a folder to upload containing your init file, manifest json, and child fragments"
          }
        >
          fMP4 Asset Upload
        </Header>
      }
    >
      <SpaceBetween size={"m"}>
        <Input
          placeholder="Enter a folder name for this upload"
          onChange={({ detail }) => setFolderName(detail.value)}
          value={folderName}
          disabled={nameSaved}
        />
        <Button
          disabled={nameSaved || !folderName}
          variant="primary"
          onClick={() => {
            setNameSaved(true);
          }}
        >
          Save Folder Name
        </Button>
        {nameSaved && (
          <FileUploader
            acceptedFileTypes={[".mp4", ".mpd", ".m4s", ".json"]}
            path={`fragments/assets/${folderName}/`}
            maxFileCount={100}
            isResumable
          />
        )}
      </SpaceBetween>
    </ContentLayout>
  );
};
