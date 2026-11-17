import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { color } from "../../../../../theme/tokens.ts";
import { followLink } from "../../../../utils/followLink.ts";

export interface PersonBreadcrumbCopy {
  /** The accessible name of the navigation, e.g. "You are here". */
  label: string;
  /** The link to the explorer's home, e.g. "explore". */
  home: string;
  /** The page's kind in words, e.g. "person". */
  current: string;
}

export interface PersonBreadcrumbProps {
  /** The explorer's home. The caller owns routing (language prefix). */
  homeHref: string;
  onNavigate?: ((href: string) => void) | undefined;
  copy: PersonBreadcrumbCopy;
}

/** "explore / person": a link back to the explorer's home, then the page's kind as plain text. The entity header's breadcrumb, whose words are entity roles, is not reused. */
export function PersonBreadcrumb({ homeHref, onNavigate, copy }: PersonBreadcrumbProps) {
  return (
    <Typography component="nav" aria-label={copy.label} variant="meta" sx={{ color: color.muted }}>
      <Link href={homeHref} onClick={followLink(homeHref, onNavigate)} sx={{ color: color.text2 }}>
        {copy.home}
      </Link>
      <span aria-hidden="true"> / </span>
      <span>{copy.current}</span>
    </Typography>
  );
}
