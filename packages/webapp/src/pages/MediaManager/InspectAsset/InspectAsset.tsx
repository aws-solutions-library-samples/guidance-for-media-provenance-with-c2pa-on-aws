import {
  Tabs,
  Spinner,
  Flashbar,
  ContentLayout,
  FlashbarProps,
  SelectProps,
} from "@cloudscape-design/components";

import {
  useGetAssetAsFileObject,
  useGetFileProperties,
} from "../../../api/api";
import { GetPropertiesWithPathOutput } from "aws-amplify/storage";
import { InteractiveMap } from "./InteractiveMap/InteractiveMap";
import { useSearchParams } from "react-router-dom";
import { Manifests } from "./Manifests/Manifests";
import { Overview } from "./Overview/Overview";
import { useC2pa } from "@contentauth/react";
import { useState } from "react";

export const InspectAsset = () => {
  const [searchParams] = useSearchParams();
  const assetFile = useGetAssetAsFileObject(
    `assets/${searchParams.get("asset")}`
  );
  const fileProperties = useGetFileProperties(
    `assets/${searchParams.get("asset")}`
  );

  return (
    <ContentLayout>
      {fileProperties.isLoading || assetFile.isLoading ? (
        <Spinner />
      ) : (
        <TabView
          assetFile={assetFile.data}
          assetRefetch={assetFile.refetch}
          fileProperties={fileProperties.data}
        />
      )}
    </ContentLayout>
  );
};

interface ITabView {
  assetFile?: File;
  assetRefetch: () => Promise<unknown>;
  fileProperties?: GetPropertiesWithPathOutput;
}

export const TabView = ({
  assetFile,
  assetRefetch,
  fileProperties,
}: ITabView) => {
  const provenance = useC2pa(assetFile);
  const [activeTabId, setActiveTabId] = useState("overview");
  const [selectedOption, setSelectedOption] = useState<SelectProps.Option>({});

  const [flashbar, SetFlashBar] = useState<FlashbarProps["items"]>([
    {
      type: "info",
      dismissible: true,
      dismissLabel: "Dismiss message",
      onDismiss: () => SetFlashBar([]),
      content: "No Content Credential Detected",
    },
  ]);

  return (
    <>
      {provenance?.manifestStore === null && <Flashbar items={flashbar} />}
      <Tabs
        onChange={({ detail }) => {
          setActiveTabId(detail.activeTabId);
        }}
        activeTabId={activeTabId}
        tabs={[
          {
            id: "overview",
            label: "Overview",
            content: (
              <Overview
                provenance={provenance}
                assetRefetch={assetRefetch}
                fileProperties={fileProperties}
                setActiveTabId={setActiveTabId}
                setSelectedOption={setSelectedOption}
              />
            ),
          },
          {
            id: "manifests",
            label: "Manifests",
            disabled: !provenance?.manifestStore,
            content: (
              <Manifests
                selectedOption={selectedOption!}
                setSelectedOption={setSelectedOption}
                provenance={provenance}
              />
            ),
          },
          {
            id: "map",
            label: "Interactive Map",
            disabled: !provenance?.manifestStore?.activeManifest,
            content: provenance?.manifestStore?.activeManifest && (
              <InteractiveMap
                activeManifest={provenance?.manifestStore?.activeManifest}
              />
            ),
          },
        ]}
      />
    </>
  );
};
