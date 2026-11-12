import type { MouseEvent } from "react";
import { Link, type LinkProps } from "@grivei/ui";
import { navigate } from "../../routing/location.tsx";

/** An in-app link: a plain anchor (so it opens in a new tab and can be copied), followed without a page load on a plain click. */
export function AppLink({ href, onClick, target, ...props }: LinkProps & { href: string }) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (event.defaultPrevented || !plain || target === "_blank") return;
    event.preventDefault();
    navigate(href, "push");
  };
  return <Link href={href} target={target} onClick={follow} {...props} />;
}
