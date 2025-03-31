import React from "react";
import ReactDOM from "react-dom/client";

import "@cloudscape-design/global-styles/index.css";
import "@aws-amplify/ui-react/styles.css";
import "@xyflow/react/dist/style.css";

import { App } from "./App.tsx";
import { awsconfig } from "./aws-config.ts";
import { C2paProvider } from "@contentauth/react";
import { Authenticator } from "@aws-amplify/ui-react";
import { IAuthenticator } from "./common/interfaces.ts";
import { Library } from "./pages/MediaManager/Library/Library.tsx";
import { Article1 } from "./pages/Simulations/Article1/Article1.tsx";
import { Dashboard } from "./pages/Overview/Dashboard/Dashboard.tsx";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FMP4Manager} from "./pages/MediaManager/FMP4Manager/FMP4Manager.tsx";
import { EditAsset } from "./pages/MediaManager/EditAsset/EditAsset.tsx";
import { GetStarted } from "./pages/Simulations/GetStarted/GetStarted.tsx";
import { UploadAsset } from "./pages/MediaManager/UploadAsset/UploadAsset.tsx";
import { UploadAssetFMP4 } from "./pages/MediaManager/UploadAsset/UploadAssetFMP4.tsx";
import { InspectAsset } from "./pages/MediaManager/InspectAsset/InspectAsset.tsx";

import { Amplify } from "aws-amplify";

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
          element: <Library type="standard" />,
        },
        {
          path: "/fmp4-manager",
          element: <Library type="fmp4"/>,
        },
        {
          path: "/media-manager/upload-asset",
          element: <UploadAsset />,
        },
        {
          path: "/media-manager/upload-asset-fmp4",  
          element: <UploadAssetFMP4 />,
        },
        {
          path: "/media-manager/sign-fmp4",
          element: <FMP4Manager />,
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
      ],
    },
  ]);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Authenticator hideSignUp variation="modal">
      {({ signOut, user }) => {
        return (
          <C2paProvider
            config={{
              // Use CDN URLs instead of local imports
              workerSrc:
                "https://cdn.jsdelivr.net/npm/c2pa@latest/dist/c2pa.worker.min.js",
              wasmSrc:
                "https://cdn.jsdelivr.net/npm/c2pa@latest/dist/assets/wasm/toolkit_bg.wasm",
            }}
          >
            <QueryClientProvider client={queryClient}>
              <RouterProvider router={router({ signOut, user })} />
            </QueryClientProvider>
          </C2paProvider>
        );
      }}
    </Authenticator>
  </React.StrictMode>
);
