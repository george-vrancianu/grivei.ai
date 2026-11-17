import type { Meta, StoryObj } from "@storybook/react-vite";
import type { RecordFilter } from "@grivei/contract";
import { useState } from "react";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { authorityRecords, authorityWithSignalsRecords, supplierNoMatches, supplierRecords, supplierSeveralFacetsFilter, supplierSeveralFacetsRecords } from "../../../../samples/fixtureData.ts";
import type { EntityRole, RecordFacetData } from "../../../../types.ts";
import { RecordsFilterBar } from "./index.ts";

const meta = { title: "Domain/RecordsTab/RecordsFilterBar", component: RecordsFilterBar } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

function Sample({ facets, role, initial, locale }: { facets: RecordFacetData; role: EntityRole; initial: RecordFilter; locale: "en" | "ro" }) {
  const [filter, setFilter] = useState(initial);
  return <RecordsFilterBar facets={facets} filter={filter} role={role} onFilterChange={setFilter} locale={locale} copy={sampleCopy.recordsFacets(locale)} />;
}
const sample =
  (facets: RecordFacetData, role: EntityRole, initial: RecordFilter = {}): Story["render"] =>
  (_args, { globals }) => <Sample facets={facets} role={role} initial={initial} locale={localeOf(globals["locale"])} />;

export const OfASupplier: Story = { render: sample(supplierRecords.facets, "supplier") };
export const OfAnAuthority: Story = { render: sample(authorityWithSignalsRecords.facets, "authority") };
export const SeveralActive: Story = { render: sample(supplierSeveralFacetsRecords.facets, "supplier", supplierSeveralFacetsFilter) };
/** What a Signal card's "See the Records" opens: one chip each for the Signal, the supplier, the date range and the CPV code. */
export const SignalReproduction: Story = {
  render: sample(authorityRecords.facets, "authority", { signal: "NO_PUBLICATION", supplier: "2000007", from: "2024-03-01", to: "2024-05-31", cpv: "45210000" }),
};
/** Active values the facets lack stay in the bar as chips, and their menus keep them (without a count). */
export const ActiveValuesNotListed: Story = {
  render: sample(supplierNoMatches.facets, "supplier", { channel: "CONTRACT", procedure: ["Licitație deschisă"], signal: "OVER_CAP", badges: ["NO_VALUE"], from: "2023-01-01", to: "2023-12-31", authority: "4000001" }),
};
/** Estimated counts lead with "≈". */
export const EstimatedCounts: Story = {
  render: sample({ ...supplierRecords.facets, channel: supplierRecords.facets.channel.map((f) => ({ ...f, total: { ...f.total, estimated: true, records: 12_400 } })) }, "supplier"),
};
