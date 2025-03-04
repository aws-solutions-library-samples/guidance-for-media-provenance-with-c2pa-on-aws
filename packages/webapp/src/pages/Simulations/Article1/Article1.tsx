import {
  AnchorNavigation,
  Box,
  BreadcrumbGroup,
  Button,
  Container,
  ContentLayout,
  Grid,
  Header,
  Link,
  SpaceBetween,
  Spinner,
  Table,
  TextContent,
} from "@cloudscape-design/components";

import { useGetAsset, useGetAssetAsFileObject } from "../../../api/api";
import { mainImageAtom, secondaryImageAtom } from "../../../api/atoms";
import { C2paWebComponents } from "../../../common/C2paWebComponent";
import { useNavigate } from "react-router-dom";
import { useC2pa } from "@contentauth/react";
import { useAtom } from "jotai";

export const Article1 = () => {
  const navigate = useNavigate();

  const [mainImage] = useAtom(mainImageAtom);
  const mainUrl = useGetAsset(mainImage?.value ?? "");
  const mainAssetFile = useGetAssetAsFileObject(mainImage?.value ?? "");
  const mainProvenance = useC2pa(mainAssetFile.data);

  const [secondaryImage] = useAtom(secondaryImageAtom);
  const secondaryUrl = useGetAsset(secondaryImage?.value ?? "");
  const secondaryAssetFile = useGetAssetAsFileObject(
    secondaryImage?.value ?? ""
  );
  const secondaryProvenance = useC2pa(secondaryAssetFile.data);

  return mainImage && secondaryImage ? (
    <ContentLayout
      headerVariant="high-contrast"
      defaultPadding
      disableOverlap
      maxContentWidth={1040}
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { href: "", text: "Marketplace" },
            { href: "", text: "Cloud Data Solution" },
          ]}
          expandAriaLabel="Show path"
          ariaLabel="Breadcrumbs"
        />
      }
      header={
        <Box padding={{ top: "xs", bottom: "l" }}>
          <Grid
            gridDefinition={[
              { colspan: { default: 12, xs: 8, s: 9 } },
              { colspan: { default: 12, xs: 4, s: 3 } },
            ]}
          >
            <div>
              <Box variant="h1">Cloud Data Solution</Box>
              <Box
                variant="p"
                color="text-body-secondary"
                margin={{ top: "xxs", bottom: "s" }}
              >
                Delivering data insights and analytics to make decisions
                quickly, and at scale. Enhance your next step decision-making
                through actionable insights with a free trial today.
              </Box>
              <SpaceBetween size="xs">
                <div>
                  Sold by: <Link variant="primary">Cloud Data</Link>
                </div>
                <div>Tags: Free trial | Vendor insights | Quick launch</div>
              </SpaceBetween>
            </div>

            <Box margin={{ top: "l" }}>
              <SpaceBetween size="s">
                <Button variant="primary" fullWidth={true}>
                  View purchase options
                </Button>
                <Button fullWidth={true}>Try for free</Button>
              </SpaceBetween>
            </Box>
          </Grid>
        </Box>
      }
    >
      <>
        <Grid gridDefinition={[{ colspan: 9 }, { colspan: 3 }]}>
          <div style={{ padding: "32px 0" }}>
            <SpaceBetween size="xl">
              <section id="product-overview">
                <Header variant="h2">
                  <span>Product overview</span>
                </Header>
                <SpaceBetween size="m">
                  <div>
                    <Box variant="p">
                      Receive real-time data insights to build process
                      improvements, track key performance indicators, and
                      predict future business outcomes. Create a new Cloud Data
                      Solution account to receive a 30 day free trial of all
                      Cloud Data Solution services.
                    </Box>
                    <Box variant="p">
                      Gather actionable analytics at scale to improve customer
                      experiences and application development. Plus, leverage
                      large data sets to drive business decisions.
                    </Box>
                  </div>

                  <div>
                    <Box variant="h3" margin={{ bottom: "xs" }}>
                      Product details
                    </Box>
                    <Box>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>Sold by</div>
                        <div style={{ width: "50%" }}>
                          <Link variant="primary">Cloud Data</Link>
                        </div>
                      </div>
                      <hr style={{ borderBlockStart: "1px solid #c6c6cd" }} />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>Product category</div>
                        <div style={{ width: "50%" }}>
                          Software as a Service
                        </div>
                      </div>
                      <hr style={{ borderBlockStart: "1px solid #c6c6cd" }} />
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>Delivery method</div>
                        <div style={{ width: "50%" }}>
                          {" "}
                          QuickLaunch
                          <br />
                          CloudFormation Template
                        </div>
                      </div>
                      <hr style={{ borderBlockStart: "1px solid #c6c6cd" }} />
                    </Box>
                  </div>

                  <Box margin={{ top: "xs" }}>
                    <Container>
                      {mainUrl.isLoading && mainAssetFile.isLoading ? (
                        <Spinner />
                      ) : (
                        mainProvenance && (
                          <C2paWebComponents
                            provenance={mainProvenance}
                            imageUrl={mainUrl.data?.url.href ?? ""}
                          />
                        )
                      )}
                    </Container>
                  </Box>

                  <div>
                    <Header variant="h3">Highlights</Header>
                    <TextContent>
                      <ul>
                        <li>
                          Real-time analytic alerts to detect anomalies across
                          your products and services.
                        </li>
                        <li>
                          Prepare data sets to increase visibility into areas of
                          your organization to make business decisions.
                        </li>
                        <li>
                          Build and manage large data sets to gain deeper
                          insights and track trends.
                        </li>
                        <li>
                          Begin a 30 day free trial to get actionable insights
                          today.
                        </li>
                      </ul>
                    </TextContent>
                  </div>

                  <div>
                    <Header variant="h3">Vendor insights</Header>
                    <SpaceBetween size="m">
                      <Box variant="p">
                        The current version of this product contains a security
                        profile, and has acquired the certifications below.
                        <br />
                        <Link variant="primary">
                          View all profiles for this product
                        </Link>
                      </Box>
                      <div style={{ maxWidth: "300px" }}>
                        {secondaryUrl.isLoading &&
                        secondaryAssetFile.isLoading ? (
                          <Spinner />
                        ) : (
                          secondaryProvenance && (
                            <C2paWebComponents
                              provenance={secondaryProvenance}
                              imageUrl={secondaryUrl.data?.url.href ?? ""}
                            />
                          )
                        )}
                      </div>
                    </SpaceBetween>
                  </div>
                </SpaceBetween>
              </section>
              <hr style={{ borderBlockStart: "1px solid #c6c6cd" }} />

              <section>
                <Header variant="h2">
                  <span id="pricing">Pricing</span>
                </Header>
                <SpaceBetween size="m">
                  <div>
                    <Box variant="p">
                      Use this tool to estimate the software and infrastructure
                      costs based your configuration choices. Your usage and
                      costs might be different from this estimate. The costs
                      will be reflected on your monthly billing reports.{" "}
                      <Link href="#" variant="primary">
                        Contact us
                      </Link>{" "}
                      to request contract pricing for this product.
                    </Box>
                  </div>

                  <Table
                    wrapLines={true}
                    header={<Header variant="h3">Cloud Data Solution</Header>}
                    columnDefinitions={[
                      { header: "Units", cell: (item) => item.units },
                      {
                        header: "Description",
                        cell: (item) => item.description,
                      },
                      { header: "12 months", cell: (item) => item["12months"] },
                      { header: "24 months", cell: (item) => item["24months"] },
                      { header: "36 months", cell: (item) => item["36months"] },
                    ]}
                    items={[
                      {
                        units: "Elite package",
                        description:
                          "50 users, each user can backup up to 20 devices",
                        "12months": "$1,200",
                        "24months": "$2,400",
                        "36months": "$3,600",
                      },
                      {
                        units: "Premium package",
                        description:
                          "30 users, each user can backup up to 10 devices",
                        "12months": "$840",
                        "24months": "$1,680",
                        "36months": "$2,520",
                      },
                      {
                        units: "Basic package",
                        description:
                          "10 users, each user can backup up to 2 devices",
                        "12months": "$840",
                        "24months": "$1,680",
                        "36months": "$2,520",
                      },
                    ]}
                  />
                </SpaceBetween>
              </section>

              <hr style={{ borderBlockStart: "1px solid #c6c6cd" }} />

              <section>
                <Box variant="h2" padding={{ bottom: "m" }}>
                  <span id="details">Details</span>
                </Box>
                <SpaceBetween size="m">
                  <div>
                    <Header variant="h3">Delivery method</Header>
                    <Box variant="p">
                      <strong>Software as a Service (SaaS)</strong> is a
                      delivery model for software applications whereby the
                      vendor hosts and operates the application over the
                      Internet. Customers pay for using the software without
                      owning the underlying infrastructure. With SaaS Contracts,
                      customers will pay for usage through their bill.{" "}
                      <Link href="#" variant="primary">
                        Learn more
                      </Link>
                    </Box>
                  </div>

                  <div>
                    <Header variant="h3">Terms and conditions</Header>
                    <Box variant="p">
                      By subscribing to this product you agree to terms and
                      conditions outlined in the product{" "}
                      <Link href="#" variant="primary">
                        End User License Agreement (EULA)
                      </Link>
                      .
                    </Box>
                  </div>
                </SpaceBetween>
              </section>
            </SpaceBetween>
          </div>
          <div style={{ padding: "32px" }}>
            <SpaceBetween size="s">
              <Header>On this page</Header>
              <AnchorNavigation
                anchors={[
                  {
                    text: "Product overview",
                    href: "#product-overview",
                    level: 1,
                  },
                  {
                    text: "Pricing",
                    href: "#pricing",
                    level: 1,
                  },
                  {
                    text: "Details",
                    href: "#details",
                    level: 1,
                  },
                ]}
              />
              <hr style={{ borderBlockStart: "1px solid #c6c6cd" }} />
              <SpaceBetween size="s">
                <Box variant="h4">Was this page helpful?</Box>
                <SpaceBetween direction="horizontal" size="xs">
                  <Button iconName="thumbs-up">Yes</Button>
                  <Button iconName="thumbs-down">No</Button>
                </SpaceBetween>
              </SpaceBetween>
            </SpaceBetween>
          </div>
        </Grid>
      </>
    </ContentLayout>
  ) : (
    <ContentLayout header={<Header>Selection Required</Header>} defaultPadding>
      <Container
        footer={
          <Button variant="primary" onClick={() => navigate("/simulations")}>
            Get Started
          </Button>
        }
      >
        Please navigate first <strong>Get Started</strong> where you can select
        your simulation images.
      </Container>
    </ContentLayout>
  );
};
