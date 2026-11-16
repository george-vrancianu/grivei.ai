import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { ApproxCount, formatCount } from "../../atoms/ApproxCount/index.ts";
import { CountPill } from "../../atoms/CountPill/index.ts";
import { EntityResultList } from "../../molecules/EntityResultList/index.ts";
import type { EntityResultRowCopy } from "../../molecules/EntityResultRow/index.ts";
import { RecordResultList } from "../../molecules/RecordResultList/index.ts";
import type { RecordResultRowCopy } from "../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityResultPage, EntityRole, RecordResult, RecordResultPage } from "../../types.ts";
import type { ResultTab } from "../ResultTabs/index.ts";
import { CiteLine, type CiteLineCopy } from "../../molecules/CiteLine/index.ts";
import { DEFAULT_RECORD_ORDER, OrderSelect, type OrderSelectCopy, type RecordOrder } from "../../molecules/OrderSelect/index.ts";
import { PageNav, type PageNavCopy } from "../../molecules/PageNav/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { PageNotice } from "./components/PageNotice/index.ts";
import { DEFAULT_PAGE_SIZE, pageCount, pageRange } from "./fullResults.utils.ts";

export interface FullResultsCopy {
  /** The tab's name, as the heading ("Suppliers"). */
  heading: Record<ResultTab, string>;
  /** "Showing 51–100 of ≈5,100"; every argument is already in the locale's number format. */
  showing: (from: string, to: string, total: string) => string;
  /** One sentence per tab for a search with no results. */
  empty: Record<ResultTab, string>;
  /** The link under the empty sentence (to the Coverage lens), shown when the caller gives `emptyHref`. It must not suggest that nothing was spent. */
  emptyLink: string;
  /** A page number past the last page; `pages` is the last page, `formatted` the same in the locale's number format. */
  outOfRange: (pages: number, formatted: string) => string;
  /** A page inside the page count that came back with no rows: the (estimated) count overshot. */
  noRowsHere: string;
  /** The link back to page 1 beside `outOfRange` and `noRowsHere`. */
  firstPage: string;
  /** The link back to the main screen's result tabs. */
  back: string;
  /** The citable-view line: its name and the copy button's texts. */
  cite: CiteLineCopy;
  /** The order control of the Records tab. */
  order: OrderSelectCopy;
  pagination: PageNavCopy;
  entityRow: EntityResultRowCopy;
  recordRow: RecordResultRowCopy;
}

/** One tab's results page, as the contract's `FullResults*` operations return it. */
export type FullResultsData = { tab: "authorities" | "suppliers"; page: EntityResultPage } | { tab: "records"; page: RecordResultPage };

export interface FullResultsProps {
  results: FullResultsData;
  /** The current page, 1-based (the URL's `page`). */
  page: number;
  /** Rows per page; the same `limit` the query was sent with. */
  pageSize?: number;
  /** The URL of a page, built by the caller (language prefix, filter, tab); page 1 is the caller's to keep short. */
  pageHref: (page: number) => string;
  /** A plain click on a link goes here instead of loading the page; leave it out and the browser follows the links. */
  onNavigate?: (href: string) => void;
  /** The full URL of this view, scheme included, for the citable-view line (the line shows only with it). */
  citeUrl?: string;
  /** The Records tab's current order (the API's default when the URL names none); the control shows only with `onOrderChange`. */
  order?: RecordOrder;
  onOrderChange?: (order: RecordOrder) => void;
  /** Where the empty result's link (`copy.emptyLink`) goes (the Coverage lens, built by the caller); absent = no link. */
  emptyHref?: string;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  /** The panel's header strip, right end, before the order control: the page's `LoadingStatus` while a request is in flight. */
  status?: ReactNode;
  /** The panel shows its last answer while the next loads: the body is dimmed with `aria-busy="true"`; the header strip and the foot stay at full strength. */
  busy?: boolean;
  locale: Locale;
  copy: FullResultsCopy;
}

/**
 * "Show all": one tab's rows for one page, in one panel. The header strip holds the kind, its count pill and the "Showing a–b of n" line on the left and the status and the order
 * control (Records only) on the right; the citable address is a strip under it, the rows are flush, and the foot holds the "Showing" line and the page links.
 * "Back to results" is a link on the ground above the panel. The page owns its width and gutter; this is the content.
 */
export function FullResults({
  results, page, pageSize = DEFAULT_PAGE_SIZE, pageHref, onNavigate, citeUrl, order = DEFAULT_RECORD_ORDER, onOrderChange, emptyHref, entityHref, recordHref, status, busy, locale, copy,
}: FullResultsProps) {
  const { tab } = results;
  const { count } = results.page;
  const estimated = results.tab !== "records" && results.page.countEstimated;
  const pages = pageCount(count, pageSize);
  const shown = results.page.rows.length;
  // An estimated count can overshoot the real one, so a page inside `pages` may come back with no rows: also past the end.
  const pastTheEnd = count > 0 && (page > pages || shown === 0);
  const range = shown > 0 && !pastTheEnd ? { ...pageRange(page, pageSize, shown), text: copy.showing } : undefined;

  const showing = range ? range.text(formatCount(range.from, false, locale), formatCount(range.to, false, locale), formatCount(count, estimated, locale)) : undefined;
  const showPageNav = pages > 1 && !pastTheEnd;
  const ordered = tab === "records" && onOrderChange !== undefined;

  const rows =
    results.tab === "records" ? (
      <RecordResultList rows={results.page.rows} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.recordRow} onNavigate={onNavigate} inset />
    ) : (
      <EntityResultList
        rows={results.page.rows}
        role={results.tab === "authorities" ? "authority" : "supplier"}
        entityHref={entityHref}
        locale={locale}
        copy={copy.entityRow}
        onNavigate={onNavigate}
        inset
      />
    );

  return (
    <Panel
      level="h2"
      label={copy.heading[tab]}
      busy={busy}
      flush
      heading={
        <>
          {copy.heading[tab]}
          <CountPill>
            <ApproxCount count={count} estimated={estimated} locale={locale} />
          </CountPill>
          {/* The foot says it again for assistive technology; here it only sits beside the kind. */}
          {showing && (
            <Typography variant="meta" component="span" aria-hidden="true" sx={{ fontWeight: 400 }}>
              {showing}
            </Typography>
          )}
        </>
      }
      aside={
        status || ordered ? (
          <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", gap: 2 }}>
            {status}
            {ordered && <OrderSelect value={order} onChange={onOrderChange} copy={copy.order} />}
          </Box>
        ) : undefined
      }
      foot={
        showing || showPageNav
          ? [
              showing && <span key="showing">{showing}</span>,
              showPageNav && <PageNav key="pages" page={page} pages={pages} pageHref={pageHref} onNavigate={onNavigate} locale={locale} copy={copy.pagination} />,
            ]
          : undefined
      }
    >
      {citeUrl && <CiteLine strip url={citeUrl} copy={copy.cite} />}
      {count === 0 && (
        <Box sx={{ p: 2 }}>
          <PageNotice text={copy.empty[tab]} link={emptyHref === undefined ? undefined : { href: emptyHref, text: copy.emptyLink }} onNavigate={onNavigate} />
        </Box>
      )}
      {pastTheEnd && (
        <Box sx={{ p: 2 }}>
          <PageNotice
            text={page > pages ? copy.outOfRange(pages, formatCount(pages, false, locale)) : copy.noRowsHere}
            link={{ href: pageHref(1), text: copy.firstPage }}
            onNavigate={onNavigate}
          />
        </Box>
      )}
      {range && rows}
    </Panel>
  );
}
