import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { EntityResultList } from "../../molecules/EntityResultList/index.ts";
import type { EntityResultRowCopy } from "../../molecules/EntityResultRow/index.ts";
import { RecordResultList } from "../../molecules/RecordResultList/index.ts";
import type { RecordResultRowCopy } from "../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityResultPage, EntityRole, RecordResult, RecordResultPage } from "../../types.ts";
import { followLink } from "../../utils/followLink.ts";
import type { ResultTab } from "../ResultTabs/index.ts";
import { PageNav, type PageNavCopy } from "../../molecules/PageNav/index.ts";
import { PageNotice } from "./components/PageNotice/index.ts";
import { ResultsSummary } from "./components/ResultsSummary/index.ts";
import { DEFAULT_PAGE_SIZE, pageCount, pageRange } from "./fullResults.utils.ts";

export interface FullResultsCopy {
  /** The tab's name, as the heading ("Suppliers"). */
  heading: Record<ResultTab, string>;
  /** "Showing 51–100 of ≈5,100"; every argument is already in the locale's number format. */
  showing: (from: string, to: string, total: string) => string;
  /** One sentence per tab for a search with no results. */
  empty: Record<ResultTab, string>;
  /** A page number past the last page; `pages` is the last page, `formatted` the same in the locale's number format. */
  outOfRange: (pages: number, formatted: string) => string;
  /** A page inside the page count that came back with no rows: the (estimated) count overshot. */
  noRowsHere: string;
  /** The link back to page 1 beside `outOfRange` and `noRowsHere`. */
  firstPage: string;
  /** The link back to the main screen's result tabs. */
  back: string;
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
  /** Where "back to results" goes (the main screen with the same filter and tab); the link shows only with it. */
  backHref?: string;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  locale: Locale;
  copy: FullResultsCopy;
}

/** "Show all": one tab's rows for one page, with its count and links to the other pages. */
export function FullResults({
  results, page, pageSize = DEFAULT_PAGE_SIZE, pageHref, onNavigate, backHref, entityHref, recordHref, locale, copy,
}: FullResultsProps) {
  const { tab } = results;
  const { count } = results.page;
  const estimated = results.tab !== "records" && results.page.countEstimated;
  const pages = pageCount(count, pageSize);
  const shown = results.page.rows.length;
  // An estimated count can overshoot the real one, so a page inside `pages` may come back with no rows: also past the end.
  const pastTheEnd = count > 0 && (page > pages || shown === 0);
  const range = shown > 0 && !pastTheEnd ? { ...pageRange(page, pageSize, shown), text: copy.showing } : undefined;

  const rows =
    results.tab === "records" ? (
      <RecordResultList rows={results.page.rows} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.recordRow} />
    ) : (
      <EntityResultList
        rows={results.page.rows}
        role={results.tab === "authorities" ? "authority" : "supplier"}
        entityHref={entityHref}
        locale={locale}
        copy={copy.entityRow}
      />
    );

  return (
    <Stack spacing={2}>
      {backHref && (
        <Link href={backHref} onClick={followLink(backHref, onNavigate)}>
          {copy.back}
        </Link>
      )}
      <ResultsSummary heading={copy.heading[tab]} count={count} estimated={estimated} range={range} locale={locale} />
      {count === 0 && <PageNotice text={copy.empty[tab]} />}
      {pastTheEnd && (
        <PageNotice
          text={page > pages ? copy.outOfRange(pages, formatCount(pages, false, locale)) : copy.noRowsHere}
          link={{ href: pageHref(1), text: copy.firstPage }}
          onNavigate={onNavigate}
        />
      )}
      {range && rows}
      {pages > 1 && !pastTheEnd && <PageNav page={page} pages={pages} pageHref={pageHref} onNavigate={onNavigate} locale={locale} copy={copy.pagination} />}
    </Stack>
  );
}
