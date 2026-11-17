import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { color } from "../../../../../theme/tokens.ts";
import type { EntityPageRole } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";

export interface BreadcrumbCopy {
  /** The accessible name of the navigation, e.g. "You are here". */
  label: string;
  /** The link to the explorer's home, e.g. "explore". */
  home: string;
  /** The page's role in words, e.g. "contracting authority". */
  roles: Record<EntityPageRole, string>;
}

export interface BreadcrumbProps {
  role: EntityPageRole;
  /** The explorer's home. The caller owns routing (language prefix). */
  homeHref: string;
  /** Called with the href on a plain click, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  copy: BreadcrumbCopy;
}

/** "explore / contracting authority": a link back to the explorer's home, then the page's role as plain text. */
export function Breadcrumb({ role, homeHref, onNavigate, copy }: BreadcrumbProps) {
  return (
    <Typography component="nav" aria-label={copy.label} variant="meta" sx={{ color: color.muted }}>
      <Link href={homeHref} onClick={followLink(homeHref, onNavigate)} sx={{ color: color.text2 }}>
        {copy.home}
      </Link>
      <span aria-hidden="true"> / </span>
      <span>{copy.roles[role]}</span>
    </Typography>
  );
}
