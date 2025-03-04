import {
  Badge,
  Container,
  Select,
  SelectProps,
} from "@cloudscape-design/components";
import { Dispatch, SetStateAction } from "react";
import { C2paReadResult } from "c2pa";
import { map } from "lodash";

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (_: string, value: object | null) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
};

interface IManifests {
  setSelectedOption: Dispatch<SetStateAction<SelectProps.Option>>;
  selectedOption: SelectProps.Option;
  provenance?: C2paReadResult;
}

export const Manifests = ({
  provenance,
  setSelectedOption,
  selectedOption,
}: IManifests) => {
  return (
    <Container>
      <Select
        selectedOption={selectedOption}
        onChange={({ detail }) => setSelectedOption(detail.selectedOption)}
        options={map(
          provenance?.manifestStore?.manifests,
          (manifest, label) => {
            return {
              label: (
                <>
                  {label.split(":").pop()}{" "}
                  {provenance?.manifestStore?.activeManifest.label ===
                    manifest.label && (
                    <Badge color="green">Active Manifest</Badge>
                  )}
                </>
              ) as unknown as string,
              value: label,
            };
          }
        )}
      />
      {Object.keys(selectedOption).length === 0 ? (
        <small>Select a manifest from the dropdown</small>
      ) : (
        <pre>
          {JSON.stringify(
            provenance?.manifestStore?.manifests[selectedOption.value!],
            getCircularReplacer(),
            2
          )}
        </pre>
      )}
    </Container>
  );
};
