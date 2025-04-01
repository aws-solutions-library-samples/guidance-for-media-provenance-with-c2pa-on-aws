// packages/webapp/src/pages/MediaManager/Library/Library.tsx
import { Box, Button, ContentLayout, Header, SpaceBetween, Table } from "@cloudscape-design/components";
import { ListPaginateWithPathOutput } from "aws-amplify/storage";
import { useListAssets, useRemoveFiles } from "../../../api/api";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import prettyBytes from "pretty-bytes";

interface LibraryProps {
  type?: 'standard' | 'fmp4';
}

// Helper function to check if file is an image
const isImageFile = (path: string): boolean => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  const extension = path.split('.').pop()?.toLowerCase() || '';
  return imageExtensions.includes(extension);
};

export const Library = ({ type = 'standard' }: LibraryProps) => {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<
    ListPaginateWithPathOutput["items"]
  >([]);
  
  const { data, isLoading, refetch, isRefetching } = useListAssets();

  // Filter files based on type
  const filteredItems = data?.items.filter(item => {
    if (type === 'fmp4') {
      // Show only FMP4-related files
      return item.path.endsWith('init.mp4') || item.path.endsWith('.m4s') || item.path.endsWith('.json');
    }
    // For standard library, show only images
    return isImageFile(item.path);
  });

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
            description={type === 'fmp4' ? 
              "Library of fragmented MP4 files" : 
              "Library of image assets"}
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

<Button
  variant="primary"
  onClick={() => navigate(type === 'fmp4' ? 
    "/media-manager/upload-asset-fmp4" : 
    "/media-manager/upload-asset")}
>
  {type === 'fmp4' ? 'Upload MP4' : 'Upload Image'}
</Button>

              </SpaceBetween>
            }
          >
            {type === 'fmp4' ? 'FMP4 Library' : 'Image Library'}
          </Header>
        }
        columnDefinitions={[
          {
            id: "preview",
            header: "Preview",
            cell: (item) => (
              type !== 'fmp4' && isImageFile(item.path) ? (
                <img 
                  src={`/${item.path}`} 
                  alt={item.path.split("/").pop()} 
                  style={{ 
                    maxWidth: '50px', 
                    maxHeight: '50px', 
                    objectFit: 'contain' 
                  }} 
                />
              ) : null
            ),
          },
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
            cell: (item) => item.path.split(".").pop()?.toUpperCase(),
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
              <b>{type === 'fmp4' ? 'No FMP4 files' : 'No image files'}</b>
              <Button onClick={() => navigate(type === 'fmp4' ? 
                "/media-manager/upload-asset-fmp4" : 
                "/media-manager/upload-asset")}
              >
                Upload {type === 'fmp4' ? 'FMP4' : 'Image'}
              </Button>
            </SpaceBetween>
          </Box>
        }
        loading={isLoading}
        selectionType="multi"
        items={filteredItems ?? []}
        loadingText="Loading assets"
        selectedItems={selectedItems}
        isItemDisabled={() => isPending}
        onSelectionChange={({ detail }) =>
          setSelectedItems(detail.selectedItems)
        }
        variant="container"
      />
    </ContentLayout>
  );
};
