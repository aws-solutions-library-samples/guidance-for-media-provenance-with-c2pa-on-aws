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
    useListAssets("fragments/completed/");

  return (
    <ContentLayout>
      <Tabs
        tabs={[
          {
            label: "Fragments",
            id: "fragments",
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
            cell: (item) => (
              <Link
                to={`/fmp4-manager/inspect-asset?asset=${item}`}
              >
                {item}
              </Link>
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
                items={data?.excludedSubpaths ?? []}
                loadingText="Loading fragments"
                variant="container"
              />
            ),
          }          
        ]}
      />
    </ContentLayout>
  );
};
