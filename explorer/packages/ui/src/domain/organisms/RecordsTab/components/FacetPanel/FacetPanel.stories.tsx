import type { Meta, StoryObj } from "@storybook/react-vite";
import type { RecordFilter } from "@grivei/contract";
import { useState } from "react";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { authorityRecords, supplierNoMatches, supplierRecords, supplierSeveralFacetsFilter, supplierSeveralFacetsRecords } from "../../../../samples/fixtureData.ts";
import type { EntityRole, RecordFacetData } from "../../../../types.ts";
import { FacetPanel } from "./index.ts";

const meta = { title: "Domain/RecordsTab/FacetPanel", component: FacetPanel } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

function Sample({ facets, role, initial, locale }: { facets: RecordFacetData; role: EntityRole; initial: RecordFilter; locale: "en" | "ro" }) {
  const [filter, setFilter] = useState(initial);
  return <FacetPanel facets={facets} filter={filter} role={role} onFilterChange={setFilter} locale={locale} copy={sampleCopy.recordsFacets(locale)} />;
}
const sample =
  (facets: RecordFacetData, role: EntityRole, initial: RecordFilter = {}): Story["render"] =>
  (_args, { globals }) => <Sample facets={facets} role={role} initial={initial} locale={localeOf(globals["locale"])} />;

export const OfASupplier: Story = { render: sample(supplierRecords.facets, "supplier") };
export const OfAnAuthority: Story = { render: sample(authorityRecords.facets, "authority") };
export const SeveralActive: Story = { render: sample(supplierSeveralFacetsRecords.facets, "supplier", supplierSeveralFacetsFilter) };
/** Active values the facet lists lack stay in the panel, without a count, so they can be switched off. */
export const ActiveValuesNotListed: Story = {
  render: sample(supplierNoMatches.facets, "supplier", { channel: "CONTRACT", procedure: ["Licitație deschisă"], signal: "OVER_CAP", badges: ["NO_VALUE"], from: "2023-01-01", to: "2023-12-31", authority: "4000001" }),
};
/** Estimated counts lead with "≈". */
export const EstimatedCounts: Story = {
  render: sample({ ...supplierRecords.facets, channel: supplierRecords.facets.channel.map((f) => ({ ...f, total: { ...f.total, estimated: true, records: 12_400 } })) }, "supplier"),
};
