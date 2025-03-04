import { Link, useLocation } from "react-router-dom";
import { linkActive, linkNotActive } from "./colors";

interface INavigationLink {
  path: string;
  title: string;
}

export const NavigationLink = ({ path, title }: INavigationLink) => {
  const { pathname } = useLocation();

  return (
    <Link
      onMouseOver={({ target }) => {
        if (pathname !== path)
          (target as HTMLTextAreaElement).style.color = linkActive;
      }}
      onMouseLeave={({ target }) => {
        if (pathname !== path)
          (target as HTMLTextAreaElement).style.color = linkNotActive;
      }}
      style={{
        color: pathname !== path ? linkNotActive : linkActive,
        fontWeight: pathname === path ? 700 : 400,
        textDecoration: "none",
      }}
      to={path}
    >
      {title}
    </Link>
  );
};
