import {
  Box,
  Button,
  ContentLayout,
  Header,
  SpaceBetween,
  Table,
  Tabs,
} from "@cloudscape-design/components";

import { useListAssets } from "../../../api/api";
import { Link, useNavigate } from "react-router-dom";

export const FMP4Library = () => {
  const navigate = useNavigate();

  const { data, isLoading, refetch, isRefetching } =
    useListAssets("fragments/assets/");

  return (
    <ContentLayout>
      <Tabs
        tabs={[
          {
            label: "Fragments",
            id: "first",
            content: (
              <Table
                header={
                  <Header
                    variant="h3"
                    description={"Library of fragmented MP4 files by folder"}
                    actions={
                      <Button
                        key={"refresh"}
                        iconName="refresh"
                        loading={isRefetching}
                        onClick={() => refetch()}
                      />
                    }
                  >
                    fMP4 Library
                  </Header>
                }
                columnDefinitions={[
                  {
                    id: "name",
                    header: "Name",
                    cell: (item) => item.split("/").reverse()[1],
                  },
                ]}
                empty={
                  <Box margin={{ vertical: "xs" }}>
                    <SpaceBetween size="m">
                      <Button
                        onClick={() =>
                          navigate("/fmp4-manager/upload-asset-fmp4")
                        }
                      >
                        Upload fMP4
                      </Button>
                    </SpaceBetween>
                  </Box>
                }
                loading={isLoading}
                items={data?.excludedSubpaths ?? []}
                loadingText="Loading fragments"
                variant="container"
              />
            ),
          },
          {
            label: "Outputs",
            id: "second",
            content: (
              <Table
                header={
                  <Header
                    variant="h3"
                    description={"Processed fragments to outputs"}
                    actions={
                      <Button
                        key={"refresh"}
                        iconName="refresh"
                        loading={isRefetching}
                        onClick={() => refetch()}
                      />
                    }
                  >
                    Outputs Library
                  </Header>
                }
                columnDefinitions={[
                  {
                    id: "name",
                    header: "Name",
                    cell: () => (
                      <Link target="_blank">{"Fragment Output Location"}</Link>
                    ),
                  },
                ]}
                empty={
                  <Box margin={{ vertical: "xs" }}>
                    <SpaceBetween size="m">
                      <Button
                        onClick={() =>
                          navigate("/fmp4-manager/upload-asset-fmp4")
                        }
                      >
                        Upload fMP4
                      </Button>
                    </SpaceBetween>
                  </Box>
                }
                loading={isLoading}
                items={["TBC"]}
                loadingText="Loading fragments"
                variant="container"
              />
            ),
          },
        ]}
      />
    </ContentLayout>
  );
};
