import type { ReactNode } from "react";
import { Link } from "../../../atoms/Link/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { OnrcResultRow, type OnrcResultRowCopy } from "../../molecules/OnrcResultRow/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { PageNav, type PageNavCopy } from "../../molecules/PageNav/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import type { OnrcResultData } from "../../types.ts";
import { followLink } from "../../utils/followLink.ts";
import { listSx } from "../../utils/listSx.ts";

export interface OnrcResultsCopy {
  /** The panel's title before any count is known (the first-load skeleton and a failed request): "Registrations". */
  title: string;
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
  /** A slot above the list, inside the panel (the Entity page's ONRC filter chips). */
  toolbar?: ReactNode;
  /** The header strip's right slot: the page's `LoadingStatus` while a request is in flight. */
  status?: ReactNode;
  /** The panel shows its last answer while the next loads: the body is dimmed with `aria-busy="true"`; the header and foot stay at full strength. */
  busy?: boolean | undefined;
  locale: Locale;
  copy: OnrcResultsCopy;
}

/**
 * ONRC's Organisations tab as a titled `Panel` (header "n registrations", flush rows, the "Showing …" line and the paging in the foot): the match count, the registrations of one page in the API's order (text relevance, then newest registration; never mixed with another
 * Source's results, ADR 0005) and links to the other pages. Presentational: the page owns the URL and the fetch.
 */
export function OnrcResults({ count, rows, page, pageSize, pageHref, onNavigate, entityHref, emptyHref, toolbar, status, busy, locale, copy }: OnrcResultsProps) {
  const format = (n: number) => formatCount(n, false, locale);
  const pages = Math.max(1, Math.ceil(count / pageSize));
  const from = (page - 1) * pageSize + 1;
  const foot =
    rows.length === 0
      ? undefined
      : [
          <span key="showing">{copy.showing(format(from), format(from + rows.length - 1), format(count))}</span>,
          ...(pages > 1 ? [<PageNav key="pages" page={page} pages={pages} pageHref={pageHref} onNavigate={onNavigate} locale={locale} copy={copy.pagination} />] : []),
        ];
  return (
    <Panel heading={copy.heading(count, format(count))} level="h2" flush busy={busy} aside={status} foot={foot}>
      {toolbar && <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>{toolbar}</Box>}
      {rows.length === 0 ? (
        <Box sx={{ p: 2 }}>
          <StateNote kind="empty" action={emptyHref ? <Link href={emptyHref} onClick={followLink(emptyHref, onNavigate)}>{copy.emptyLink}</Link> : undefined}>
            {copy.empty}
          </StateNote>
        </Box>
      ) : (
        <Stack component="ul" sx={listSx}>
          {rows.map((row) => (
            <OnrcResultRow key={row.registrationNumber} row={row} href={row.entity && entityHref ? entityHref(row.entity) : undefined} locale={locale} copy={copy.row} onNavigate={onNavigate} />
          ))}
        </Stack>
      )}
    </Panel>
  );
}
