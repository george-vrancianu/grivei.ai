import type { OnrcFilter } from "@grivei/contract";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { localeOf } from "../../samples/copy.ts";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import { OnrcFilterChips } from "./index.ts";

const meta = { title: "Domain/OnrcFilterChips" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

function Bar({ locale, initial }: { locale: "en" | "ro"; initial: OnrcFilter }) {
  const [filter, setFilter] = useState(initial);
  return <OnrcFilterChips filter={filter} onChange={setFilter} locale={locale} copy={sampleOnrcCopy.filterChips(locale)} />;
}
const bar = (initial: OnrcFilter): Story["render"] => (_args, { globals }) => <Bar locale={localeOf(globals["locale"])} initial={initial} />;

/** No chip on. */
export const NoFilters: Story = { render: bar({}) };
/** Every chip on: status, CAEN prefix, the county of the count lens, a date range and SEAP counterparties only. */
export const EveryChip: Story = { render: bar({ status: [1048, 1107], caen: "42", county: "RO-CJ", registeredFrom: "2020-01-01", registeredTo: "2024-12-31", seapCounterparty: true }) };
/** A status the chips do not offer came in through the URL; the Unplaced tile is a chip. */
export const UnofferedStatusAndUnplaced: Story = { render: bar({ status: [2110], county: "UNPLACED" }) };
