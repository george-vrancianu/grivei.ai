import type { ReactNode } from "react";
import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { OnrcResultRow, type OnrcResultRowCopy } from "../../molecules/OnrcResultRow/index.ts";
import { PageNav, type PageNavCopy } from "../../molecules/PageNav/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import type { OnrcResultData } from "../../types.ts";
import { followLink } from "../../utils/followLink.ts";
import { listSx } from "../../utils/listSx.ts";

export interface OnrcResultsCopy {
  /** The heading above the list: "40 registrations" (the language's plural rule); `formatted` is the count in the locale's number format. */
  heading: (n: number, formatted: string) => string;
  /** "Showing 51–100 of 120"; every argument is already in the locale's number format. */
  showing: (from: string, to: string, total: string) => string;
  /** No registration matches (never "nothing was registered": the Coverage page says what ONRC snapshots are held). */
  empty: string;
  /** The link under the empty sentence, to the Coverage lens of ONRC. */
  emptyLink: string;
  row: OnrcResultRowCopy;
  pagination: PageNavCopy;
}

export interface OnrcResultsProps {
  /** The registrations matching the filter (`organisations.count`) and one page of them (`organisations.rows`). */
  count: number;
  rows: readonly OnrcResultData[];
  /** The current page, 1-based, and the page size the query was sent with. */
  page: number;
  pageSize: number;
  pageHref: (page: number) => string;
  onNavigate?: ((href: string) => void) | undefined;
  /** The entity page of a registration's organisation; absent = names are plain text. */
  entityHref?: ((entity: { key: string }) => string) | undefined;
  /** Where the empty sentence's link goes (ONRC's Coverage lens); absent = no link. */
  emptyHref?: string | undefined;
  /** A slot above the list (the Entity page's ONRC filter chips). */
  toolbar?: ReactNode;
  locale: Locale;
  copy: OnrcResultsCopy;
}

/**
 * ONRC's Organisations tab: the match count, the registrations of one page in the API's order (text relevance, then newest registration; never mixed with another
 * Source's results, ADR 0005) and links to the other pages. Presentational: the page owns the URL and the fetch.
 */
export function OnrcResults({ count, rows, page, pageSize, pageHref, onNavigate, entityHref, emptyHref, toolbar, locale, copy }: OnrcResultsProps) {
  const format = (n: number) => formatCount(n, false, locale);
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const from = (page - 1) * pageSize + 1;
  return (
    <Stack component="section" aria-label={copy.heading(count, format(count))} spacing={2}>
      <Typography variant="h2" component="h2">
        {copy.heading(count, format(count))}
      </Typography>
      {toolbar}
      {rows.length === 0 ? (
        <StateNote kind="empty" action={emptyHref ? <Link href={emptyHref} onClick={followLink(emptyHref, onNavigate)}>{copy.emptyLink}</Link> : undefined}>
          {copy.empty}
        </StateNote>
      ) : (
        <>
          <Typography variant="caption">{copy.showing(format(from), format(from + rows.length - 1), format(count))}</Typography>
          <Stack component="ul" sx={listSx}>
            {rows.map((row) => (
              <OnrcResultRow key={row.registrationNumber} row={row} href={row.entity && entityHref ? entityHref(row.entity) : undefined} locale={locale} copy={copy.row} onNavigate={onNavigate} />
            ))}
          </Stack>
          {pages > 1 && <PageNav page={page} pages={pages} pageHref={pageHref} onNavigate={onNavigate} locale={locale} copy={copy.pagination} />}
        </>
      )}
    </Stack>
  );
}
