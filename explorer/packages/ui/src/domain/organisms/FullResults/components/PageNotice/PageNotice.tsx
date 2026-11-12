import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { followLink } from "../../../../utils/followLink.ts";

export interface PageNoticeProps {
  /** The sentence: nothing found, or the page is past the end. */
  text: string;
  /** Where the reader can go instead (page 1), shown with its text when both are given. */
  link?: { href: string; text: string } | undefined;
  onNavigate?: ((href: string) => void) | undefined;
}

/** What a page shows instead of rows: an empty result, or a page number past the last page. */
export function PageNotice({ text, link, onNavigate }: PageNoticeProps) {
  return (
    <Stack spacing={1}>
      <Typography>{text}</Typography>
      {link && (
        <Link href={link.href} onClick={followLink(link.href, onNavigate)}>
          {link.text}
        </Link>
      )}
    </Stack>
  );
}
