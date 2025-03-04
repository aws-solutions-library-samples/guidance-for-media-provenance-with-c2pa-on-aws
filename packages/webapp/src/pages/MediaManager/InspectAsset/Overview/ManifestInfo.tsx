import {
  Table,
  Badge,
  Header,
  SelectProps,
} from "@cloudscape-design/components";
import { Dispatch, SetStateAction, useState } from "react";
import { ManifestModal } from "./ManifestModal";
import { Manifest, ManifestStore } from "c2pa";
import { omit, values } from "lodash";

import styles from "./ManifestInfo.module.css";

interface IManifestInfo {
  manifestStore: ManifestStore;
  setActiveTabId: Dispatch<SetStateAction<string>>;
  setSelectedOption: Dispatch<SetStateAction<SelectProps.Option>>;
}

export const ManifestInfo = ({
  manifestStore,
  setActiveTabId,
  setSelectedOption,
}: IManifestInfo) => {
  const [visible, setVisible] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState<Manifest>();

  return (
    <>
      <Table
        className={styles.manifestInfoTable}
        onRowClick={(item) => {
          setSelectedManifest(item.detail.item);
          setVisible(true);
        }}
        header={
          <Header
            variant="h3"
            description={"Select a manifest below to learn more"}
            actions={<Badge color="green">Active Manifest</Badge>}
          >
            Manifest Store
          </Header>
        }
        items={[
          manifestStore.activeManifest,
          ...values(
            omit(manifestStore.manifests, [
              manifestStore.activeManifest.label ?? "",
            ])
          ),
        ]}
        columnDefinitions={[
          {
            header: "Name",
            cell: (item) =>
              manifestStore.activeManifest.label === item.label ? (
                <Badge className={styles.manifestinfobadge} color="green">
                  {item.label?.split(":").pop()}
                </Badge>
              ) : (
                item.label?.split(":").pop()
              ),
          },
          {
            header: "Assertions",
            cell: (item) => <div>{item.assertions.data.length}</div>,
          },
          {
            header: "Ingredients",
            cell: (item) => item.ingredients.length,
          },
          {
            header: "Algorithm",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cell: (item) => (item.signatureInfo as any)?.alg,
          },
          {
            header: "Issuer",
            cell: (item) => item.signatureInfo?.issuer,
          },
          {
            header: "Time",
            cell: (item) => item.signatureInfo?.time,
          },
        ]}
      />

      {selectedManifest && (
        <ManifestModal
          visible={visible}
          setVisible={setVisible}
          setActiveTabId={setActiveTabId}
          setSelectedOption={setSelectedOption}
          selectedManifest={selectedManifest}
          active={selectedManifest.label === manifestStore.activeManifest.label}
        />
      )}
    </>
  );
};
