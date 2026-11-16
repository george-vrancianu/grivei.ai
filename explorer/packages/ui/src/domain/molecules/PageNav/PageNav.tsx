import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { hover, pressed, selected } from "../../../theme/states.ts";
import { color, font, radius, shadow, size, type } from "../../../theme/tokens.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { followLink } from "../../utils/followLink.ts";
import { pageItems } from "./pageNav.utils.ts";

/** The cell every page link and step shares: a 44 px mono box with a border, and no states. */
const cellSx = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: size.primaryAction,
  minWidth: size.primaryAction,
  px: 1.5,
  border: `1px solid ${color.lineStrong}`,
  borderRadius: `${radius.control}px`,
  fontFamily: font.mono,
  fontSize: type.label.size,
  color: color.text,
} as const;
/** A page link: raised like an outlined button, with the shared hover and pressed fills. */
const boxSx = { ...cellSx, backgroundColor: color.raised, boxShadow: shadow.raised, "&:hover": hover, "&:active": pressed } as const;
/** The current page: the shared selected fragment (line fill, inset accent outline), no amber fill; it holds that look on hover and press. */
const currentSx = { ...boxSx, ...selected, "&:hover": selected, "&:active": selected } as const;
/** A step with nothing to follow: dashed, no fill, muted, and no hover or pressed fill. */
const disabledSx = { ...cellSx, border: `1px dashed ${color.lineStrong}`, color: color.muted, cursor: "default" } as const;

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
      <Link href={pageHref(target)} onClick={followLink(pageHref(target), onNavigate)} rel={target < page ? "prev" : "next"} underline="none" sx={boxSx}>
        {text}
      </Link>
    ) : (
      // Visible but inert: a link that is aria-disabled keeps its name for a screen reader and shows where the list ends.
      <Typography component="span" variant="label" role="link" aria-disabled="true" sx={disabledSx}>
        {text}
      </Typography>
    );
  return (
    <nav aria-label={copy.label}>
      <Stack direction="row" useFlexGap sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.75 }}>
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
              underline="none"
              sx={item === page ? currentSx : boxSx}
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
