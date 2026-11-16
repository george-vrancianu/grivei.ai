import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";
import { PageNav, type PageNavCopy } from "../../../../molecules/PageNav/index.ts";
import { SIGNALS_ANCHOR } from "../../entityOverview.utils.ts";

export interface SignalsSectionCopy {
  /** "Signals (2)", given the count and its formatted text. */
  heading: (count: number, formatted: string) => string;
  /** The sentence when the entity has no Signals. */
  empty: string;
  /** "Signals 1–20 of 72", given the formatted first, last and total. */
  range: (from: string, to: string, total: string) => string;
}

export interface SignalsPaging {
  /** The current page, 1-based. */
  page: number;
  /** Signals per page: with the page and the count it makes the range line, and the number of pages. */
  pageSize: number;
  /** How many Signals this page holds (the rows sent). */
  shown: number;
  pageHref: (page: number) => string;
  onNavigate?: ((href: string) => void) | undefined;
  copy: PageNavCopy;
}

export interface SignalsSectionProps {
  /** `overview.signals.count`: all Signals of the filter, not only the rows sent. */
  count: number;
  locale: Locale;
  copy: SignalsSectionCopy;
  /** The control on the heading's line: the order toggle (#107). Shown only when there are Signals. */
  toolbar?: ReactNode;
  /** A loading status, at the right end of the heading's line (while a refetch is in flight). */
  status?: ReactNode;
  /** The Signal cards (the Signal card organism fills this slot). */
  children?: ReactNode;
  /** The line under the cards: the range ("Signals 1–20 of 72", whenever there are Signals) beside the page links (only when there is more than one page). */
  paging?: SignalsPaging;
}

/**
 * The Signals section, anchored at `#signals`, on the ground (each Signal card is a panel of its own): the heading with the count, the toolbar and the loading status on
 * one line, the cards, then the range line beside the page links on one line. A sentence replaces all of it when there are none.
 */
export function SignalsSection({ count, locale, copy, toolbar, status, children, paging }: SignalsSectionProps) {
  const heading = copy.heading(count, formatCount(count, false, locale));
  const pages = paging ? Math.ceil(count / paging.pageSize) : 0;
  const from = paging ? (paging.page - 1) * paging.pageSize + 1 : 0;
  return (
    <Stack component="section" id={SIGNALS_ANCHOR} spacing={1.5} aria-label={heading} sx={{ scrollMarginTop: 16 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", columnGap: 2, rowGap: 1, minHeight: 36 }}>
        <SectionHeading>{heading}</SectionHeading>
        <Box sx={{ display: "flex", alignItems: "center", columnGap: 2, ml: "auto" }}>
          {status}
          {count > 0 && toolbar}
        </Box>
      </Box>
      {count === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <>
          {children}
          {paging && (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", columnGap: 2, rowGap: 1 }}>
              <Typography variant="meta" component="p">
                {copy.range(formatCount(from, false, locale), formatCount(Math.min(count, from + paging.shown - 1), false, locale), formatCount(count, false, locale))}
              </Typography>
              {pages > 1 && <PageNav locale={locale} page={paging.page} pages={pages} pageHref={paging.pageHref} onNavigate={paging.onNavigate} copy={paging.copy} />}
            </Box>
          )}
        </>
      )}
    </Stack>
  );
}
