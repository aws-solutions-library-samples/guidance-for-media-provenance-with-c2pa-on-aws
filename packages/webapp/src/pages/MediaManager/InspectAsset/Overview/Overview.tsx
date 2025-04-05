import {
  Badge,
  Header,
  Container,
  SpaceBetween,
  KeyValuePairs,
  Button,
  SelectProps,
  StatusIndicator,
  Spinner
} from "@cloudscape-design/components";

import { GetPropertiesWithPathOutput } from "aws-amplify/storage";
import { StorageImage } from "@aws-amplify/ui-react-storage";
import { C2paReadResult, generateVerifyUrl } from "c2pa";
import { useGetAssetMutate,  useGetAsset} from "../../../../api/api";
import { useSearchParams } from "react-router-dom";
import { Dispatch, SetStateAction } from "react";
import { ManifestInfo } from "./ManifestInfo";
//import { init_video } from "./DashVideo";
import DASHReact  from "./DASHReact";

import prettyBytes from "pretty-bytes";

 
interface IOverview {
  provenance?: C2paReadResult;
  assetRefetch: () => Promise<unknown>;
  fileProperties?: GetPropertiesWithPathOutput;
  setActiveTabId: Dispatch<SetStateAction<string>>;
  setSelectedOption: Dispatch<SetStateAction<SelectProps.Option>>;
}


export const Overview = ({
  provenance,
  fileProperties,
  setActiveTabId,
  setSelectedOption,
}: IOverview) => {
  const [searchParams] = useSearchParams();

  const { mutateAsync } = useGetAssetMutate();
  
  // Get the asset URL for use in the component
  const { data: _assetUrlData, isLoading: assetUrlLoading } = useGetAsset(searchParams.get("asset") || "");
  return (
    <SpaceBetween size="s">
      <Container header={<Header variant="h3">Source</Header>}>
        <KeyValuePairs
          columns={2}
          items={[
            {
              label: "File Name",
              value: provenance?.source.metadata.filename,
            },
            {
              label: "Type",
              value: <Badge color="grey">{provenance?.source.type}</Badge>,
            },
            {
              label: "Size",
              value: prettyBytes(provenance?.source.blob?.size ?? 0),
            },
            {
              label: "Last Modified",
              value: fileProperties?.toString(),
            },
          ]}
        />
      </Container>

      <Container
        header={
          <Header
            variant="h3"
            actions={
              <Button
                disabled={!provenance?.source}
                iconName={"external"}
                onClick={async () => {
                  const { url } = await mutateAsync({
                    path: `assets/${searchParams.get("asset")}`,
                  });
                  if (url) window.open(generateVerifyUrl(url.href));
                }}
              >
                View in Verify Tool
              </Button>
            }
          >
            Asset
          </Header>
        }
      >
        <SpaceBetween alignItems="center" size={"xxs"}>

          {searchParams.get("asset")?.endsWith(".mpd") ? (
            assetUrlLoading ? (
              <Spinner />
            ) : (
              <DASHReact
                url='https://cc-assets.netlify.app/video/fmp4-samples/boat.mpd'
                controls={true}
                autoPlay={false}
                className="video-js"
              />
            )
          ) : (
            <StorageImage
              height={"30vh"}
              alt={searchParams.get("asset") ?? ""}
              path={`assets/${searchParams.get("asset")}`}
            />
          )}
        </SpaceBetween>
      </Container>

      {provenance?.manifestStore && (
        <>
          <Container header={<Header variant="h3">Validation</Header>}>
            {provenance?.manifestStore?.validationStatus.length ? (
              <>
                <StatusIndicator type="error">
                  Validation Errors
                </StatusIndicator>
                <pre style={{ overflow: "scroll" }}>
                  {JSON.stringify(
                    provenance?.manifestStore?.validationStatus,
                    null,
                    2
                  )}
                </pre>
              </>
            ) : (
              <StatusIndicator type="success">
                No Validation Errors
              </StatusIndicator>
            )}
          </Container>

          <ManifestInfo
            manifestStore={provenance.manifestStore}
            setActiveTabId={setActiveTabId}
            setSelectedOption={setSelectedOption}
          />
        </>
      )}
    </SpaceBetween>
  );
};
