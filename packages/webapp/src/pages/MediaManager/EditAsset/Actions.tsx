import { Container } from "@cloudscape-design/components";
import { UseFormGetValues } from "react-hook-form";
import { compact, values } from "lodash";
import { FormValues } from "./EditAsset";

interface ActionsProps {
  getValues: UseFormGetValues<FormValues>;
}

export const Actions = ({ getValues }: ActionsProps) => {
  const assertions = getValues("assertions");

  return (
    <Container>
      {compact(values(assertions)).length ? (
        <pre style={{ overflow: "scroll" }}>
          {JSON.stringify(compact(values(assertions)), null, 2)}
        </pre>
      ) : (
        <pre>No action assertions have been applied</pre>
      )}
    </Container>
  );
};
