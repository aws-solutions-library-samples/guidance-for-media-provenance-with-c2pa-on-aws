import {
  Badge,
  Box,
  Button,
  Container,
  Form,
  Grid,
  Header,
  KeyValuePairs,
  Modal,
  SelectProps,
  SpaceBetween,
  Spinner,
} from "@cloudscape-design/components";

import { useGetEditsAndActitivy } from "../../../../api/utils";
import { Dispatch, SetStateAction, useRef } from "react";
import { Manifest, selectProducer } from "c2pa";
import { motion } from "framer-motion";
import { map } from "lodash";

interface IManifestModal {
  active: boolean;
  visible: boolean;
  selectedManifest: Manifest;
  setVisible: Dispatch<SetStateAction<boolean>>;
  setActiveTabId: Dispatch<SetStateAction<string>>;
  setSelectedOption: Dispatch<SetStateAction<SelectProps.Option>>;
}

export const ManifestModal = ({
  active,
  visible,
  setVisible,
  setActiveTabId,
  setSelectedOption,
  selectedManifest,
}: IManifestModal) => {
  const C2PAManifest = useRef<HTMLElement | null>(null);
  const ClaimSignature = useRef<HTMLElement | null>(null);
  const Claims = useRef<HTMLElement | null>(null);
  const Assertions = useRef<HTMLElement | null>(null);

  const producer = selectProducer(selectedManifest);

  const { data, isLoading } = useGetEditsAndActitivy(selectedManifest);

  return (
    <Modal
      size={"max"}
      visible={visible}
      onDismiss={() => setVisible(false)}
      footer={
        <Box float="right">
          <Button
            onClick={() => {
              setSelectedOption({
                label: (
                  <>
                    {selectedManifest.label!.split(":").pop()}{" "}
                    {active && <Badge color="green">Active Manifest</Badge>}
                  </>
                ) as unknown as string,
                value: selectedManifest.label!,
              });
              setActiveTabId("manifests");
            }}
            variant="primary"
          >
            View Full Screen
          </Button>
        </Box>
      }
      header={
        <Header
          description={active && <Badge color="green">Active Manifest</Badge>}
        >
          {selectedManifest.label}
        </Header>
      }
    >
      <div style={{ padding: "20px" }}>
        <Grid gridDefinition={[{ colspan: 4 }, { colspan: 8 }]}>
          <div
            style={{
              justifyContent: "center",
              display: "flex",
              width: "100%",
              height: "100%",
              flexDirection: "column",
              borderRight: "1px solid rgb(182, 190, 201)",
              paddingRight: "30px",
            }}
          >
            <motion.div
              onClick={() =>
                C2PAManifest.current?.scrollIntoView({ behavior: "smooth" })
              }
              style={{
                cursor: "pointer",
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <strong
                style={{
                  display: "flex",
                  justifyContent: "center",
                  padding: "5px",
                  backgroundColor: "rgb(218, 232, 215)",
                  border: "2px solid rgb(149, 184, 121)",
                }}
              >
                C2PA Manifest
              </strong>
            </motion.div>
            <div
              style={{
                border: "2px solid rgb(149, 184, 121)",
                backgroundColor: "rgb(218, 232, 215)",
                padding: "25px",
              }}
            >
              <SpaceBetween size="xs">
                <motion.div
                  style={{
                    display: "flex",
                    cursor: "pointer",
                    width: "100%",
                    height: "100%",
                    flexDirection: "column",
                    backgroundColor: "rgb(251, 232, 208)",
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    ClaimSignature.current?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                >
                  <strong
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "5px",
                      border: "2px solid rgb(208, 169, 63)",
                    }}
                  >
                    Claim Signature
                  </strong>
                  <div
                    style={{
                      border: "2px solid rgb(208, 169, 63)",
                      height: "40px",
                    }}
                  />
                </motion.div>

                <motion.div
                  style={{
                    display: "flex",
                    cursor: "pointer",

                    width: "100%",
                    height: "100%",
                    flexDirection: "column",
                    backgroundColor: "rgb(242, 209, 206)",
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    Claims.current?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                >
                  <strong
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "5px",
                      border: "2px solid rgb(182, 105, 102)",
                    }}
                  >
                    Claim
                  </strong>
                  <div
                    style={{
                      border: "2px solid rgb(182, 105, 102)",
                      height: "40px",
                    }}
                  />
                </motion.div>

                <motion.div
                  style={{
                    display: "flex",
                    cursor: "pointer",

                    width: "100%",
                    height: "100%",
                    flexDirection: "column",
                    backgroundColor: "rgb(75, 160, 221)",
                  }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    Assertions.current?.scrollIntoView({
                      behavior: "smooth",
                    });
                  }}
                >
                  <strong
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "5px",
                      border: "2px solid rgb(50, 116, 180)",
                      color: "white",
                    }}
                  >
                    Assertions
                  </strong>
                  <div
                    style={{
                      border: "2px solid rgb(50, 116, 180)",
                      height: "40px",
                    }}
                  />
                </motion.div>
              </SpaceBetween>
            </div>
            <small style={{ textAlign: "center" }}>I'm interactive</small>
          </div>

          <div style={{ height: "70vh", overflow: "scroll" }}>
            <Form header={<Header />}>
              <SpaceBetween direction="vertical" size="l">
                <section ref={C2PAManifest}>
                  <Container
                    header={<Header variant="h2">C2PA Manifest</Header>}
                  >
                    <Container header={<Header variant="h2">Producer</Header>}>
                      <KeyValuePairs
                        columns={3}
                        items={map(producer, (value, label) => {
                          return { label, value };
                        })}
                      />
                    </Container>
                  </Container>
                </section>

                <section ref={ClaimSignature}>
                  <Container
                    header={<Header variant="h2">Claim Signature</Header>}
                  >
                    <KeyValuePairs
                      columns={2}
                      items={map(
                        selectedManifest.signatureInfo,
                        (value, label) => {
                          return { label, value };
                        }
                      )}
                    />
                  </Container>
                </section>

                <section ref={Claims}>
                  <Container header={<Header variant="h2">Claim</Header>}>
                    <KeyValuePairs
                      columns={2}
                      items={[
                        {
                          label: "Claim Generator",
                          value: selectedManifest.claimGenerator,
                        },
                      ]}
                    />
                  </Container>
                </section>

                <section ref={Assertions}>
                  <Container header={<Header variant="h2">Assertions</Header>}>
                    {isLoading ? (
                      <Spinner />
                    ) : (
                      <SpaceBetween size="xs">
                        {data?.map((item, index) => {
                          return (
                            <Container
                              key={index}
                              header={
                                <Header
                                  variant="h3"
                                  actions={<img src={item.icon ?? ""} />}
                                >
                                  Assertion {index + 1}
                                </Header>
                              }
                            >
                              <pre style={{ overflow: "scroll" }}>
                                {JSON.stringify(item, null, 2)}
                              </pre>
                            </Container>
                          );
                        })}
                      </SpaceBetween>
                    )}
                  </Container>
                </section>
              </SpaceBetween>
            </Form>
          </div>
        </Grid>
      </div>
    </Modal>
  );
};
