import {
  Box,
  Button,
  ContentLayout,
  Header,
  SpaceBetween,
  Table,
} from "@cloudscape-design/components";

import { ListPaginateWithPathOutput } from "aws-amplify/storage";
import { useListAssets, useRemoveFiles } from "../../../api/api";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

import prettyBytes from "pretty-bytes";

export const Library = () => {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<
    ListPaginateWithPathOutput["items"]
  >([]);

  const { data, isLoading, refetch, isRefetching } = useListAssets();

  const { mutate, isPending } = useRemoveFiles(() => {
    setSelectedItems([]);
    refetch();
  });

  return (
    <ContentLayout>
      <Table
        header={
          <Header
            variant="h3"
            description={"Library of all assets uploaded"}
            actions={
              <SpaceBetween size="s" direction="horizontal">
                <Button
                  disabled={selectedItems.length !== 1}
                  onClick={() =>
                    navigate(
                      `/media-manager/edit-asset?asset=${selectedItems[0].path
                        .split("/")
                        .pop()}`
                    )
                  }
                >
                  Edit
                </Button>
                <Button
                  disabled={!selectedItems.length}
                  loading={isPending}
                  onClick={() =>
                    mutate({
                      filePaths: selectedItems.map((item) => item.path),
                    })
                  }
                >
                  Delete
                </Button>
                <Button
                  key={"refresh"}
                  iconName="refresh"
                  loading={isRefetching}
                  onClick={() => refetch()}
                />
              </SpaceBetween>
            }
          >
            Library
          </Header>
        }
        columnDefinitions={[
          {
            id: "name",
            header: "Name",
            cell: (item) => (
              <Link
                to={`/media-manager/inspect-asset?asset=${item.path
                  .split("/")
                  .pop()}`}
              >
                {item.path.split("/").pop()}
              </Link>
            ),
          },
          {
            id: "type",
            header: "Type",
            cell: (item) => item.path.split(".").pop(),
          },
          {
            id: "size",
            header: "Size",
            cell: (item) => prettyBytes(item.size ?? 0),
          },
          {
            id: "lastModified",
            header: "Last Modified",
            cell: (item) => new Date(item.lastModified ?? "").toLocaleString(),
          },
        ]}
        empty={
          <Box margin={{ vertical: "xs" }}>
            <SpaceBetween size="m">
              <b>No media assets</b>
              <Button onClick={() => navigate("/media-manager/upload-asset")}>
                Upload Media
              </Button>
            </SpaceBetween>
          </Box>
        }
        loading={isLoading}
        selectionType="multi"
        items={data?.items ?? []}
        loadingText="Loading assets"
        selectedItems={selectedItems}
        isItemDisabled={() => isPending}
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems)
        }
      />
    </ContentLayout>
  );
};
