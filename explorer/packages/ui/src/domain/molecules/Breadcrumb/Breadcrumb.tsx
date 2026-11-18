import { Link } from "../../../atoms/Link/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { color } from "../../../theme/tokens.ts";
import { followLink } from "../../utils/followLink.ts";

export interface BreadcrumbCopy {
  /** The accessible name of the navigation, e.g. "You are here". */
  label: string;
  /** The link to the explorer's home, e.g. "explore". */
  home: string;
}

export interface BreadcrumbProps {
  /** The trail's last segment, plain text: the page's role or kind in words, e.g. "contracting authority" or "person". */
  current: string;
  /** The explorer's home. The caller owns routing (language prefix). */
  homeHref: string;
  /** Called with the href on a plain click, so the app can change page without a load. */
  onNavigate?: ((href: string) => void) | undefined;
  copy: BreadcrumbCopy;
}

/** "explore / contracting authority": a link back to the explorer's home, then the current page's kind as plain text. Shared by the entity header and the person panel. */
export function Breadcrumb({ current, homeHref, onNavigate, copy }: BreadcrumbProps) {
  return (
    <Typography component="nav" aria-label={copy.label} variant="meta" sx={{ color: color.muted }}>
      <Link href={homeHref} onClick={followLink(homeHref, onNavigate)} sx={{ color: color.text2 }}>
        {copy.home}
      </Link>
      <span aria-hidden="true"> / </span>
      <span>{current}</span>
    </Typography>
  );
}
