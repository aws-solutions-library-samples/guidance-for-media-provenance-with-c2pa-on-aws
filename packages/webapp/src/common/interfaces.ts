import { UseAuthenticator } from "@aws-amplify/ui-react";
import { AuthUser } from "aws-amplify/auth";

export interface IAuthenticator {
  signOut?: UseAuthenticator["signOut"];
  user?: AuthUser;
}
