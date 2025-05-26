import { HeaderNavigation } from "./common/HeaderNavigation";
import { NavigationLink } from "./common/NavigationLink";
import { Outlet, useLocation } from "react-router-dom";
import { IAuthenticator } from "./common/interfaces";
import { compact, startCase } from "lodash";

import {
  AppLayout,
  BreadcrumbGroup,
  SideNavigation,
  SideNavigationProps,
} from "@cloudscape-design/components";

const navItems: SideNavigationProps.Item[] = [
  {
    type: "section",
    text: "Overview",
    items: [
      {
        text: "",
        type: "link",
        href: "",
        info: <NavigationLink path={"/"} title={"Dashboard"} />,
      },
    ],
  },
  {
    type: "section",
    text: "Media Manager",
    items: [
      {
        text: "",
        type: "link",
        href: "",
        info: <NavigationLink path={"/media-manager"} title={"Library"} />,
      },
      {
        text: "",
        type: "link",
        href: "",
        info: (
          <NavigationLink
            path={"/media-manager/upload-asset"}
            title={"Upload Asset"}
          />
        ),
      },
      {
        text: "",
        type: "link",
        href: "",
        info: (
          <NavigationLink
            path={"/media-manager/edit-asset"}
            title={"Edit Asset"}
          />
        ),
      },
    ],
  },

  {
    type: "section",
    text: "Simulations",
    items: [
      {
        text: "",
        type: "link",
        href: "",
        info: <NavigationLink path={"/simulations"} title={"Get Started"} />,
      },
      {
        text: "",
        type: "link",
        href: "",
        info: (
          <NavigationLink path={"/simulations/article-1"} title={"Article 1"} />
        ),
      },
    ],
  },
  {
    type: "section",
    text: "Fragmented MP4",
    items: [
      {
        text: "",
        type: "link",
        href: "",
        info: <NavigationLink path={"/fmp4-manager"} title={"Library"} />,
      },
      {
        text: "",
        type: "link",
        href: "",
        info: (
          <NavigationLink
            path={"/fmp4-manager/upload-asset-fmp4"}
            title={"Upload fMP4 Asset"}
          />
        ),
      },
      {
        text: "",
        type: "link",
        href: "",
        info: (
          <NavigationLink
            path={"/fmp4-manager/sign-fmp4"}
            title={"Sign fMP4"}
          />
        ),
      },
      /*{
        text: "",
        type: "link",
        href: "",
        info: (
          <NavigationLink
            path={"/fmp4-manager/inspect-asset"}
            title={"Dash Player Example"}
          />
        ),
      },*/
    ],
  },
];

export const App = ({ signOut, user }: IAuthenticator) => {
  const { pathname } = useLocation();

  return (
    <>
      <HeaderNavigation signOut={signOut} user={user} />
      <AppLayout
        disableContentPaddings={pathname.includes("/simulations/")}
        toolsHide
        navigation={<SideNavigation items={navItems} activeHref={pathname} />}
        breadcrumbs={
          !pathname.includes("/simulations/") && (
            <BreadcrumbGroup
              items={compact(pathname.split("/")).map(
                (pageLink, index, arr) => {
                  return {
                    text: startCase(pageLink),
                    href: `/${arr.slice(0, index + 1).join("/")}`,
                  };
                }
              )}
            />
          )
        }
        content={<Outlet />}
      />
    </>
  );
};
