import {
  TopNavigation,
  TopNavigationProps,
} from "@cloudscape-design/components";
import { IAuthenticator } from "./interfaces";

export const HeaderNavigation = ({ signOut, user }: IAuthenticator) => {
  const navItems: TopNavigationProps.Utility[] = [
    {
      type: "menu-dropdown",
      iconName: "user-profile",
      text: "Profile",
      onItemClick: ({ detail }) => {
        switch (detail.id) {
          case "signout":
            return signOut?.();
        }
      },
      items: [
        {
          id: "loginId",
          text: user?.signInDetails?.loginId ?? "Unable to load loginId",
          iconName: "user-profile-active",
        },
        {
          id: "signout",
          text: "Sign Out",
          iconName: "arrow-right",
        },
      ],
    },
  ];

  return (
    <TopNavigation
      identity={{
        href: "/",
        logo: {
          src: "https://d0.awsstatic.com/logos/powered-by-aws-white.png",
        },
        title:
          "Coalition for Content Provenance and Authenticity (C2PA) Guidance",
      }}
      utilities={navItems}
    />
  );
};
