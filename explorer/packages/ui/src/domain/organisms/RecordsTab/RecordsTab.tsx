import type { ReactNode } from "react";
import type { RecordFilter } from "@grivei/contract";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { SectionHeading } from "../../atoms/SectionHeading/index.ts";
import { color } from "../../../theme/tokens.ts";
import type { Locale } from "../../../theme/index.ts";
import { PageNav, type PageNavCopy } from "../../molecules/PageNav/index.ts";
import type { RecordResultRowCopy, RecordSignalBadges } from "../../molecules/RecordResultRow/index.ts";
import { TotalFigure, type TotalFigureCopy } from "../../molecules/TotalFigure/index.ts";
import type { EntityRef, EntityRole, RecordResult, RecordsTabData } from "../../types.ts";
import { EmptyRecords, type EmptyRecordsCopy } from "./components/EmptyRecords/index.ts";
import { RecordsTable, type RecordsTableCopy } from "./components/RecordsTable/index.ts";
import { FacetPanel, type FacetPanelCopy } from "./components/FacetPanel/index.ts";
import { clearFacets, hasFacetsOn } from "./recordsTab.utils.ts";

export interface RecordsTabCopy {
  /** The heading above the table ("Records"). */
  heading: string;
  facets: FacetPanelCopy;
  empty: EmptyRecordsCopy;
  total: TotalFigureCopy;
  recordRow: RecordResultRowCopy;
  /** The table: its name and column heads (the counterparty column is named by the row copy: Winners or Authority). */
  table: RecordsTableCopy;
  pagination: PageNavCopy;
}

export interface RecordsTabProps {
  /** `entity.seap.role.records(filter)` of `EntityRecords`: the total, the facets and one page of Records, all for `filter`. */
  records: RecordsTabData;
  /** The URL's filter. The tab holds no filter state: a facet choice calls `onFilterChange` with the whole next filter. */
  filter: RecordFilter;
  onFilterChange: (next: RecordFilter) => void;
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
   * The slot between the facets and the totals, for one extra control that changes the filter (the "only Records matching '<query>'" link, #106).
   * Whatever sits here must change the URL's filter through the page, so the totals and the table follow it.
   */
  filterExtras?: ReactNode;
}

/** The Records tab of an Entity page: the facet side panel, the total that follows the filter, and the Records table. */
export function RecordsTab({
  records, filter, onFilterChange, role, page, pageSize, pageHref, onNavigate, entityHref, recordHref, methodologyHref, suspectHref, locale, copy, signalBadges, filterExtras,
}: RecordsTabProps) {
  const { total, facets } = records;
  const rows = records.records.rows;
  const pages = Math.ceil(records.records.count / Math.max(1, pageSize));
  const empty = records.records.count === 0;
  return (
    <Stack spacing={2.5}>
      <SectionHeading>{copy.heading}</SectionHeading>
      <FacetPanel facets={facets} filter={filter} role={role} onFilterChange={onFilterChange} locale={locale} copy={copy.facets} />
      {filterExtras}
      <Box sx={{ py: 2, borderTop: 1, borderBottom: 1, borderColor: color.line }}>
        <TotalFigure total={total} locale={locale} copy={copy.total} methodologyHref={methodologyHref} suspectHref={suspectHref} />
      </Box>
      {empty ? (
        <EmptyRecords copy={copy.empty} onClear={hasFacetsOn(filter, role) ? () => onFilterChange(clearFacets(filter, role)) : undefined} />
      ) : (
        <RecordsTable
          rows={rows}
          role={role}
          entityHref={entityHref}
          recordHref={recordHref}
          locale={locale}
          copy={{ ...copy.table, recordRow: copy.recordRow }}
          signalBadges={signalBadges}
        />
      )}
      {pages > 1 && <PageNav page={page} pages={pages} pageHref={pageHref} onNavigate={onNavigate} locale={locale} copy={copy.pagination} />}
    </Stack>
  );
}
