import type { ReactNode } from "react";
import type { RecordFilter } from "@grivei/contract";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { OrderSelect, type OrderSelectCopy, type RecordOrder } from "../../molecules/OrderSelect/index.ts";
import { PageNav, type PageNavCopy } from "../../molecules/PageNav/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import type { RecordResultRowCopy, RecordSignalBadges } from "../../molecules/RecordResultRow/index.ts";
import { TotalFigure, type InsetTotalCopy } from "../../molecules/TotalFigure/index.ts";
import type { EntityRef, EntityRole, RecordResult, RecordsTabData } from "../../types.ts";
import { EmptyRecords, type EmptyRecordsCopy } from "./components/EmptyRecords/index.ts";
import { RecordsFilterBar, clearRecordFilters, hasRecordFilters, type RecordsFilterBarCopy } from "./components/RecordsFilterBar/index.ts";
import { RecordsTable, type RecordsTableCopy } from "./components/RecordsTable/index.ts";

export interface RecordsTabCopy {
  /** The Records panel's title ("Records"). */
  heading: string;
  /** The Total panel's title ("Total awarded"). */
  totalHeading: string;
  facets: RecordsFilterBarCopy;
  empty: EmptyRecordsCopy;
  total: InsetTotalCopy;
  recordRow: RecordResultRowCopy;
  /** The table: its name and column heads (the counterparty column is named by the row copy: Winners or Authority). */
  table: RecordsTableCopy;
  /** The order control in the Records panel's header. */
  order: OrderSelectCopy;
  /** "Showing 1–7 of 54"; every argument is already in the locale's number format. */
  showing: (from: string, to: string, total: string) => string;
  pagination: PageNavCopy;
}

export interface RecordsTabProps {
  /** `entity.seap.role.records(filter)` of `EntityRecords`: the total, the facets and one page of Records, all for `filter`. Null when the request failed with nothing held: only the failure shows. */
  records: RecordsTabData | null;
  /** The URL's filter. The tab holds no filter state: a menu or chip choice calls `onFilterChange` with the whole next filter. */
  filter: RecordFilter;
  onFilterChange: (next: RecordFilter) => void;
  /** The order of the table (the URL's `order`) and the way to change it. */
  order: RecordOrder;
  onOrderChange: (order: RecordOrder) => void;
  /** The page's role, which decides which side the counterparty facet filters (`supplier` for an authority's page, `authority` for a supplier's). */
  role: EntityRole;
  /** The current page, 1-based, and the page size the query was sent with. */
  page: number;
  pageSize: number;
  pageHref: (page: number) => string;
  onNavigate?: ((href: string) => void) | undefined;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  methodologyHref: string;
  /** Where the suspect Records of this filter are listed. */
  suspectHref: string;
  locale: Locale;
  copy: RecordsTabCopy;
  /** A compact badge per Signal on each row; absent = none. */
  signalBadges?: RecordSignalBadges | undefined;
  /**
   * One extra control in the filter bar, after the menus (the "only Records matching '<query>'" link, #106).
   * Whatever sits here must change the URL's filter through the page, so the totals and the table follow it.
   */
  filterExtras?: ReactNode;
  /** The panels show their last answer while the next loads: their bodies are dimmed with `aria-busy="true"`; the bar and the headers stay at full strength. */
  busy?: boolean | undefined;
  /** The Records panel's header, right of the title and before the order control: the page's `LoadingStatus` while a request is in flight. */
  status?: ReactNode;
  /** A failed request: the note with its retry takes the Records panel's body; the filter bar (when `records` is held) stays. */
  failure?: ReactNode;
}

/**
 * The Records tab of an Entity page: the filter bar in its own panel, the Total in its own panel (the inset layout) and the Records table in a titled panel
 * (the order in the header, "Showing a–b of n" and the paging in the foot). Presentational: the page owns the URL and the fetch.
 */
export function RecordsTab({
  records, filter, onFilterChange, order, onOrderChange, role, page, pageSize, pageHref, onNavigate, entityHref, recordHref, methodologyHref, suspectHref, locale, copy, signalBadges, filterExtras, busy, status, failure,
}: RecordsTabProps) {
  const rows = records?.records.rows ?? [];
  const count = records?.records.count ?? 0;
  const pages = Math.ceil(count / Math.max(1, pageSize));
  const format = (n: number) => formatCount(n, false, locale);
  const first = (page - 1) * pageSize + 1;
  const showing = rows.length > 0 && records ? copy.showing(format(first), format(first + rows.length - 1), formatCount(count, records.total.estimated, locale)) : undefined;
  const foot = showing ? [<span key="showing">{showing}</span>, ...(pages > 1 ? [<PageNav key="pages" page={page} pages={pages} pageHref={pageHref} onNavigate={onNavigate} locale={locale} copy={copy.pagination} />] : [])] : undefined;
  const aside = (
    <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
      {status}
      <OrderSelect value={order} onChange={onOrderChange} copy={copy.order} />
    </Box>
  );
  return (
    <Stack spacing={2.5}>
      {records && <RecordsFilterBar facets={records.facets} filter={filter} role={role} onFilterChange={onFilterChange} extras={filterExtras} locale={locale} copy={copy.facets} />}
      {records && !failure && (
        <Panel heading={copy.totalHeading} level="h2" busy={busy}>
          <TotalFigure total={records.total} locale={locale} copy={copy.total} inset={{}} methodologyHref={methodologyHref} suspectHref={suspectHref} />
        </Panel>
      )}
      <Panel heading={copy.heading} level="h2" flush busy={busy && !failure} aside={aside} foot={failure ? undefined : foot}>
        {failure ? (
          <Box sx={{ p: 2 }}>{failure}</Box>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <EmptyRecords copy={copy.empty} onClear={hasRecordFilters(filter) ? () => onFilterChange(clearRecordFilters(filter)) : undefined} />
          </Box>
        ) : (
          <RecordsTable rows={rows} role={role} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={{ ...copy.table, recordRow: copy.recordRow }} signalBadges={signalBadges} />
        )}
      </Panel>
    </Stack>
  );
}
