import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { followLink } from "../../utils/followLink.ts";
import { pageItems } from "./pageNav.utils.ts";

export interface PageNavCopy {
  /** The navigation landmark's accessible name. */
  label: string;
  previous: string;
  next: string;
  /** A page link's accessible name, given the page number already formatted ("Page 3"). */
  page: (formatted: string) => string;
}

export interface PageNavProps {
  /** The current page, 1-based. */
  page: number;
  pages: number;
  pageHref: (page: number) => string;
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
  copy: PageNavCopy;
}

/** Previous and next links with the page numbers between: real links, so every page can be cited and opened without JavaScript. */
export function PageNav({ page, pages, pageHref, onNavigate, locale, copy }: PageNavProps) {
  const format = (n: number) => formatCount(n, false, locale);
  const step = (target: number, text: string, enabled: boolean) =>
    enabled ? (
      <Link href={pageHref(target)} onClick={followLink(pageHref(target), onNavigate)} rel={target < page ? "prev" : "next"}>
        {text}
      </Link>
    ) : (
      // Nothing to follow: the edge is clear from the page links, so no stray "Previous" for a screen reader.
      <Typography component="span" color="text.disabled" aria-hidden="true">
        {text}
      </Typography>
    );
  return (
    <nav aria-label={copy.label}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        {step(page - 1, copy.previous, page > 1)}
        {pageItems(page, pages).map((item, i) =>
          item === "gap" ? (
            <span key={`gap-${i}`} aria-hidden="true">
              …
            </span>
          ) : (
            <Link
              key={item}
              href={pageHref(item)}
              onClick={followLink(pageHref(item), onNavigate)}
              aria-label={copy.page(format(item))}
              aria-current={item === page ? "page" : undefined}
              underline={item === page ? "none" : "always"}
              sx={item === page ? { fontWeight: "bold" } : undefined}
            >
              {format(item)}
            </Link>
          ),
        )}
        {step(page + 1, copy.next, page < pages)}
      </Stack>
    </nav>
  );
}
