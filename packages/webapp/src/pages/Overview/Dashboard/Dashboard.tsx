import {
  StatusIndicator,
  ContentLayout,
  ColumnLayout,
  Container,
  Button,
  Header,
  Cards,
  Box,
  Grid,
  Spinner,
  SpaceBetween,
} from "@cloudscape-design/components";

import { StorageImage } from "@aws-amplify/ui-react-storage";
import { Link, useNavigate } from "react-router-dom";
import { useListAssets } from "../../../api/api";
import { reduce } from "lodash";

import prettyBytes from "pretty-bytes";

export const Dashboard = () => {
  const navigate = useNavigate();

  const { data, isLoading, isRefetching, isError, refetch } =
    useListAssets("complete/assets/");

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <Button
              onClick={() => navigate("/media-manager/upload-asset")}
              variant="primary"
            >
              Upload Media
            </Button>
          }
        >
          Dashboard
        </Header>
      }
    >
      <Grid
        gridDefinition={[
          { colspan: { l: 8, m: 8, default: 12 } },
          { colspan: { l: 4, m: 4, default: 12 } },
          { colspan: { default: 12 } },
        ]}
      >
        {/* Platform Overview */}
        <Container
          header={
            <Header
              variant="h2"
              description="High level metrics on the overall performance of the platform"
            >
              Overview
            </Header>
          }
          fitHeight={true}
        >
          <ColumnLayout columns={4} variant="text-grid" minColumnWidth={170}>
            <div>
              <Box variant="awsui-key-label">Total Media Assets</Box>
              <Header variant="h1">
                {isLoading ? (
                  <Spinner />
                ) : isError ? (
                  <StatusIndicator type="error">Error</StatusIndicator>
                ) : (
                  <Link to={"/media-manager"}>{data?.items.length}</Link>
                )}
              </Header>
            </div>
            <div>
              <Box variant="awsui-key-label">Volume of Data</Box>
              <Header variant="h1">
                {isLoading ? (
                  <Spinner />
                ) : isError ? (
                  <StatusIndicator type="error">Error</StatusIndicator>
                ) : (
                  <Link to={"/media-manager"}>
                    {prettyBytes(
                      reduce(
                        data?.items,
                        (sum, item) => {
                          return sum + (item.size ?? 0);
                        },
                        0
                      )
                    )}
                  </Link>
                )}
              </Header>
            </div>
            <div>
              <Box variant="awsui-key-label">...</Box>
              <Header variant="h1">
                {isLoading ? <Spinner /> : <Link to={""}>...</Link>}
              </Header>
            </div>
            <div>
              <Box variant="awsui-key-label">...</Box>
              <Header variant="h1">
                {isLoading ? <Spinner /> : <Link to={""}>...</Link>}
              </Header>
            </div>
          </ColumnLayout>
        </Container>

        {/* Service Health */}
        <Container
          fitHeight={true}
          header={
            <Header variant="h2" info={<></>}>
              Platform information
            </Header>
          }
        >
          <ColumnLayout columns={2}>
            <div>
              <Box variant="awsui-key-label">Host Region</Box>
              <div>{import.meta.env.VITE_REGION}</div>
            </div>
            <div>
              <Box variant="awsui-key-label">Frontend Storage Bucket</Box>
              <StatusIndicator type={isError ? "error" : "success"}>
                {import.meta.env.VITE_FRONTENDSTORAGEBUCKET}
              </StatusIndicator>
            </div>
            <div>
              <Box variant="awsui-key-label">Backend Storage Bucket</Box>
              <StatusIndicator type={isError ? "error" : "success"}>
                {import.meta.env.VITE_BACKENDSTORAGEBUCKET}
              </StatusIndicator>
            </div>
          </ColumnLayout>
        </Container>

        {/* Assets Gallery */}
        <Cards
          header={
            <Header
              variant="h3"
              description={"Showcase of uploaded assets"}
              actions={[
                <Button
                  key={"refresh"}
                  loading={isRefetching}
                  iconName="refresh"
                  onClick={() => refetch()}
                />,
              ]}
            >
              Gallery
            </Header>
          }
          cardDefinition={{
            header: (item) => (
              <Link
                to={`/media-manager/inspect-asset?asset=${item.path
                  .split("/")
                  .pop()}`}
              >
                {item.path.split("/").pop()}
              </Link>
            ),
            sections: [
              {
                id: "asset",
                content: (item) => (
                  <StorageImage
                    alt={item.path.split("/").pop()}
                    path={item.path}
                  />
                ),
              },
            ],
          }}
          empty={
            <Box margin={{ vertical: "xs" }} textAlign="center" color="inherit">
              <SpaceBetween size="m">
                <b>No media assets</b>
                <Button onClick={() => navigate("/media-manager/upload-asset")}>
                  Upload Media
                </Button>
              </SpaceBetween>
            </Box>
          }
          trackBy="name"
          loading={isLoading}
          loadingText="Loading gallery"
          items={data?.items ?? []}
          cardsPerRow={[
            { cards: 1 },
            { minWidth: 300, cards: 2 },
            { minWidth: 550, cards: 3 },
            { minWidth: 1000, cards: 4 },
          ]}
        />
      </Grid>
    </ContentLayout>
  );
};
