import {
  Alert,
  Container,
  ContentLayout,
  Grid,
  Header,
  Select,
  SpaceBetween,
} from "@cloudscape-design/components";

import { mainImageAtom, secondaryImageAtom } from "../../../api/atoms";
import { StorageImage } from "@aws-amplify/ui-react-storage";
import { useListAssets } from "../../../api/api";
import { useAtom } from "jotai";

export const GetStarted = () => {
  const [mainImage, setMainImage] = useAtom(mainImageAtom);
  const [secondaryImage, setSecondaryImage] = useAtom(secondaryImageAtom);

  const listAssets = useListAssets();

  return (
    <ContentLayout
      header={
        <Header
          variant="h3"
          description={
            "Make your selection below of the images you would like to simulate in some of the articles."
          }
        >
          Get Started
        </Header>
      }
    >
      <SpaceBetween size="s">
        <Grid gridDefinition={[{ colspan: 6 }, { colspan: 6 }]}>
          <Container
            header={
              <Header
                variant="h3"
                description="This will appear as the main image"
              >
                Main Image
              </Header>
            }
          >
            <SpaceBetween size="l">
              <Select
                statusType={listAssets.isLoading ? "loading" : "finished"}
                selectedOption={mainImage}
                onChange={({ detail }) => setMainImage(detail.selectedOption)}
                options={listAssets.data?.items.map((item) => {
                  return {
                    label: item.path.split("/").pop(),
                    value: item.path,
                  };
                })}
              />
              {mainImage && (
                <StorageImage alt={mainImage.value} path={mainImage.value!} />
              )}
            </SpaceBetween>
          </Container>
          <Container
            header={
              <Header
                variant="h3"
                description="Where there is space this will be the secondary image to show"
              >
                Secondary Image
              </Header>
            }
          >
            <SpaceBetween size="l">
              <Select
                statusType={listAssets.isLoading ? "loading" : "finished"}
                selectedOption={secondaryImage}
                onChange={({ detail }) =>
                  setSecondaryImage(detail.selectedOption)
                }
                options={listAssets.data?.items.map((item) => {
                  return {
                    label: item.path.split("/").pop(),
                    value: item.path,
                  };
                })}
              />
              {secondaryImage && (
                <StorageImage
                  alt={secondaryImage.value}
                  path={secondaryImage.value!}
                />
              )}
            </SpaceBetween>
          </Container>
        </Grid>
        {mainImage && secondaryImage && (
          <Alert type="success">
            You may proceed to the simulation by selecting one of the articles
            on the left menu.
          </Alert>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
};
