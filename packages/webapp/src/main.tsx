import ReactDOM from "react-dom/client";

import { InspectAsset } from "./pages/MediaManager/InspectAsset/InspectAsset.tsx";
import { UploadAsset } from "./pages/MediaManager/UploadAsset/UploadAsset.tsx";
import { FMP4Library } from "./pages/Fmp4Manager/FMP4Library/FMP4Library.tsx";
import { FMP4Upload } from "./pages/Fmp4Manager/FMP4Upload/FMP4Upload.tsx";
import { GetStarted } from "./pages/Simulations/GetStarted/GetStarted.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditAsset } from "./pages/MediaManager/EditAsset/EditAsset.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { FMP4Sign } from "./pages/Fmp4Manager/FMP4Sign/FMP4Sign.tsx";
import { Dashboard } from "./pages/Overview/Dashboard/Dashboard.tsx";
import { Article1 } from "./pages/Simulations/Article1/Article1.tsx";
import { Library } from "./pages/MediaManager/Library/Library.tsx";
import { IAuthenticator } from "./common/interfaces.ts";
import { Authenticator } from "@aws-amplify/ui-react";
import { C2paProvider } from "@contentauth/react";
import { awsconfig } from "./aws-config.ts";
import { Amplify } from "aws-amplify";
import { App } from "./App.tsx";

import "@cloudscape-design/global-styles/index.css";
import "@aws-amplify/ui-react/styles.css";
import "@xyflow/react/dist/style.css";
import { FMP4Inspect } from "./pages/Fmp4Manager/FMP4Inspect/FMP4Inspect.tsx";

Amplify.configure(awsconfig);

export const queryClient = new QueryClient();

const router = ({ signOut, user }: IAuthenticator) => {
  return createBrowserRouter([
    {
      path: "/",
      element: <App signOut={signOut} user={user} />,
      children: [
        {
          path: "/",
          element: <Dashboard />,
        },
        {
          path: "/media-manager",
          element: <Library />,
        },
        {
          path: "/media-manager/upload-asset",
          element: <UploadAsset />,
        },
        {
          path: "/media-manager/inspect-asset",
          element: <InspectAsset />,
        },
        {
          path: "/media-manager/edit-asset",
          element: <EditAsset />,
        },
        {
          path: "/simulations",
          element: <GetStarted />,
        },
        {
          path: "/simulations/article-1",
          element: <Article1 />,
        },
        {
          path: "/fmp4-manager",
          element: <FMP4Library />,
        },
        {
          path: "/fmp4-manager/inspect-asset",
          element: <FMP4Inspect />,
        },
        {
          path: "/fmp4-manager/upload-asset-fmp4",
          element: <FMP4Upload />,
        },
        {
          path: "/fmp4-manager/sign-fmp4",
          element: <FMP4Sign />,
        },
      ],
    },
  ]);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Authenticator hideSignUp variation="modal">
    {({ signOut, user }) => {
      return (
        <C2paProvider
          config={{
            // Use CDN URLs instead of local imports
            workerSrc:
              "https://cdn.jsdelivr.net/npm/c2pa@0.28.4/dist/c2pa.worker.min.js",
            wasmSrc:
              "https://cdn.jsdelivr.net/npm/c2pa@0.28.4/dist/assets/wasm/toolkit_bg.wasm",
          }}
        >
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router({ signOut, user })} />
          </QueryClientProvider>
        </C2paProvider>
      );
    }}
  </Authenticator>
);
