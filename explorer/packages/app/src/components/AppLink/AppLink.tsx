import { Link, followLink, type LinkProps } from "@grivei/ui";
import { navigate } from "../../routing/location.tsx";

/** An in-app link: a plain anchor (so it opens in a new tab and can be copied), followed without a page load on a plain click. */
export function AppLink({ href, onClick, target, ...props }: LinkProps & { href: string }) {
  const follow = followLink(href, (to) => navigate(to, "push"));
  return (
    <Link
      href={href}
      target={target}
      onClick={(event) => {
        onClick?.(event);
        if (target !== "_blank") follow(event);
      }}
      {...props}
    />
  );
}
