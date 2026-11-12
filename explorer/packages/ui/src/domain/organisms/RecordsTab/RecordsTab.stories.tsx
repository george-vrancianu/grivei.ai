import type { Meta, StoryObj } from "@storybook/react-vite";
import type { RecordFilter } from "@grivei/contract";
import { useState } from "react";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import {
  authorityEstimatedRecords, authorityOneSupplierFilter, authorityOneSupplierRecords, authorityRecords, supplierNoMatches, supplierNoMatchesFilter,
  supplierRecords, supplierSeveralFacetsFilter, supplierSeveralFacetsRecords, supplierSplittingFilter, supplierSplittingRecords,
} from "../../samples/fixtureData.ts";
import type { EntityRole, RecordsTabData } from "../../types.ts";
import { RecordsTab } from "./index.ts";

const meta = { title: "Domain/RecordsTab", component: RecordsTab } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The tab, with the filter held by the story (the real one holds it in the URL), so clicks show the panel's own change. */
function Sample({ records, role, initial, locale, pageSize = 100, page = 1, count }: {
  records: RecordsTabData; role: EntityRole; initial: RecordFilter; locale: "en" | "ro"; pageSize?: number; page?: number; count?: number;
}) {
  const [filter, setFilter] = useState(initial);
  return (
    <RecordsTab
      records={count === undefined ? records : { ...records, records: { ...records.records, count } }}
      filter={filter}
      onFilterChange={setFilter}
      role={role}
      page={page}
      pageSize={pageSize}
      pageHref={(n) => `?page=${n}`}
      entityHref={(entity, r) => `/explore/${r}/${entity.key}`}
      recordHref={(record) => `/explore/record/${record.code}`}
      methodologyHref="/explore/methodology"
      suspectHref="?badges=suspect-value"
      locale={locale}
      copy={sampleCopy.recordsTab(locale)}
    />
  );
}

const sample =
  (records: RecordsTabData, role: EntityRole, initial: RecordFilter, extra: { pageSize?: number; page?: number; count?: number } = {}): Story["render"] =>
  (_args, { globals }) => <Sample records={records} role={role} initial={initial} locale={localeOf(globals["locale"])} {...extra} />;

/** A supplier's tab, no facet on: every facet group with its counts; the counterparty facet lists authorities. */
export const SupplierNoFilter: Story = { render: sample(supplierRecords, "supplier", {}) };
/** An authority's tab, no facet on: the counterparty facet lists suppliers and the badge facet has values. */
export const AuthorityNoFilter: Story = { render: sample(authorityRecords, "authority", {}) };
/** One facet on (click it again to clear it); the total and the table are the filtered ones. */
export const OneFacetOn: Story = { render: sample(supplierSplittingRecords, "supplier", supplierSplittingFilter) };
/** A year, the channel and one authority on at once. */
export const SeveralFacetsActive: Story = { render: sample(supplierSeveralFacetsRecords, "supplier", supplierSeveralFacetsFilter) };
/** One supplier chosen on an authority's tab (the filter's `supplier`). */
export const AuthorityWithSupplierChosen: Story = { render: sample(authorityOneSupplierRecords, "authority", authorityOneSupplierFilter) };
/** The filter matches nothing: a sentence, a button that clears the facets, and the active facet still shown in the panel. */
export const EmptyResult: Story = { render: sample(supplierNoMatches, "supplier", supplierNoMatchesFilter) };
/** Nothing to filter and nothing to show: no facet on, so no clear button. */
export const EmptyNoFacets: Story = { render: sample(supplierNoMatches, "supplier", {}) };
/** An estimated total and count (≈) with many pages. */
export const EstimatedTotal: Story = { render: sample(authorityEstimatedRecords, "authority", { to: "2030-12-31" }, { page: 3 }) };
