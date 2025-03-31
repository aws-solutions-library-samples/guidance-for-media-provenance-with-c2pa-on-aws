// packages/webapp/src/pages/MediaManager/FMP4Selection/FMP4Selection.tsx

import { Container, Multiselect } from "@cloudscape-design/components";
import { useListAssets } from "../../../api/api";
import { useEffect, useState } from "react";

interface FMP4SelectionProps {
  onChange: (values: string[]) => void;
  values?: string[];
}

export const FMP4Selection = ({ onChange, values = [] }: FMP4SelectionProps) => {
  const { data, isLoading } = useListAssets();
  const [selectedOptions, setSelectedOptions] = useState<{ label: string; value: string }[]>([]);

  // Filter for only M4S files (excluding init files)
  const m4sFiles = data?.items.filter(item => 
    item.path.endsWith('.m4s')
  ) ?? [];

  // Create options from filtered files
  const options = m4sFiles.map(item => ({
    label: item.path.split("/").pop() || '',
    value: item.path
  }));

  // Update selected options when values change
  useEffect(() => {
    if (values.length > 0) {
      const newSelectedOptions = values.map(value => {
        const option = options.find(opt => opt.value === value);
        return option || { label: value.split("/").pop() || '', value };
      });
      setSelectedOptions(newSelectedOptions);
    }
  }, [values, options]);

  return (
    <Container>
      <Multiselect
        statusType={isLoading ? "loading" : "finished"}
        selectedOptions={selectedOptions}
        onChange={({ detail }) => {
          setSelectedOptions(detail.selectedOptions);
          onChange(detail.selectedOptions.map(opt => opt.value));
        }}
        options={options}
        filteringType="auto"
        placeholder="Choose M4S files..."
        deselectAriaLabel={e => `Remove ${e.label}`}
        loadingText="Loading M4S files..."
        errorText="Error loading M4S files"
        recoveryText="Retry"
        filteringPlaceholder="Find M4S files"
        selectedAriaLabel="Selected"
      />
    </Container>
  );
};
