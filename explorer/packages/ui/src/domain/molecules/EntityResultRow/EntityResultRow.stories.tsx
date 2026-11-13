import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { resultSamples, signalRowSamples } from "../../samples/fixtureData.ts";
import { EntityResultRow } from "./index.ts";

const meta = { title: "Domain/EntityResultRow", component: EntityResultRow } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const hrefOf = (key: string) => `/explore/supplier/${encodeURIComponent(key)}`;
const list = (rows: (typeof resultSamples)["typical"]["suppliers"]["rows"], locale: "en" | "ro") => (
  <Stack component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
    {rows.map((row) => (
      <EntityResultRow key={row.entity.key} row={row} href={hrefOf(row.entity.key)} locale={locale} copy={sampleCopy.entityRow(locale)} />
    ))}
  </Stack>
);

export const WithCounty: Story = { render: (_a, { globals }) => list(resultSamples.typical.suppliers.rows, localeOf(globals["locale"])) };
/** A national body, an entity no source places, and a name-only foreign firm: the county slot's fallbacks. */
export const NoCounty: Story = {
  render: (_a, { globals }) => list([...resultSamples.variety.suppliers.rows, ...resultSamples.variety.authorities.rows], localeOf(globals["locale"])),
};
export const HugeAmount: Story = { render: (_a, { globals }) => list(resultSamples.estimated.suppliers.rows, localeOf(globals["locale"])) };
/** An authority with Signals in the filter (the chip, linking to its Overview's Signals section) next to one without (no chip). */
export const WithAndWithoutSignals: Story = {
  render: (_a, { globals }) => (
    <Stack component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
      {signalRowSamples.authorities.rows.map((row) => (
        <EntityResultRow key={row.entity.key} row={row} href={`/explore/authority/${row.entity.key}`} locale={localeOf(globals["locale"])} copy={sampleCopy.entityRow(localeOf(globals["locale"]))} />
      ))}
    </Stack>
  ),
};
/** A supplier whose Records carry a Signal: the chip on the Suppliers tab (the plural forms are the SignalCountChip's Counts story). */
export const SupplierWithSignal: Story = { render: (_a, { globals }) => list(signalRowSamples.suppliers.rows, localeOf(globals["locale"])) };
