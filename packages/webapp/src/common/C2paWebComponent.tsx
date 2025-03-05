import { ManifestSummary } from "c2pa-wc/dist/components/ManifestSummary";
import { useEffect, useRef, useState } from "react";

import "c2pa-wc/dist/components/ManifestSummary";
import "c2pa-wc/dist/components/PanelSection";
import "c2pa-wc/dist/components/Indicator";
import "c2pa-wc/dist/components/Popover";
import "c2pa-wc/dist/components/Icon";

import {
  C2paReadResult,
  createL2ManifestStore,
  generateVerifyUrl,
  L2ManifestStore,
} from "c2pa";

interface WebComponentsProps {
  provenance: C2paReadResult;
  imageUrl: string;
}

export const C2paWebComponents = ({
  provenance,
  imageUrl,
}: WebComponentsProps) => {
  const [manifestStore, setManifestStore] = useState<L2ManifestStore | null>(
    null
  );
  const summaryRef = useRef<ManifestSummary>(null);

  useEffect(() => {
    let disposeFn = () => {};

    if (!provenance?.manifestStore?.activeManifest) {
      return;
    }

    createL2ManifestStore(provenance.manifestStore).then(
      ({ manifestStore, dispose }) => {
        setManifestStore({ ...manifestStore, error: null });
        disposeFn = dispose;
      }
    );

    return disposeFn;
  }, [provenance.manifestStore]);

  useEffect(() => {
    const summaryElement = summaryRef.current;

    if (summaryElement && manifestStore) {
      summaryElement.manifestStore = manifestStore;
      summaryElement.viewMoreUrl = generateVerifyUrl(imageUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryRef, manifestStore]);

  return (
    <div style={{ position: "relative" }}>
      <img width={"100%"} src={imageUrl} />
      {manifestStore ? (
        <div>
          <cai-popover
            style={{ position: "absolute", top: "10px", right: "10px" }}
            interactive
          >
            <cai-indicator slot="trigger" />
            <cai-manifest-summary ref={summaryRef} slot="content" />
          </cai-popover>
        </div>
      ) : null}
    </div>
  );
};
