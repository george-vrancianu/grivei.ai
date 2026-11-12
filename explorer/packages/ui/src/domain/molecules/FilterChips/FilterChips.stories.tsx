import type { RecordFilter } from "@grivei/contract";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Typography } from "../../../atoms/Typography/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { FilterChips } from "./index.ts";

const meta = { title: "Domain/FilterChips", component: FilterChips } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

// Procedure names are source data: Romanian in both languages.
const PROCEDURES = ["Achiziție directă", "Licitație deschisă", "Negociere fără publicare prealabilă"];

/** The chips are controlled; in the workbench a little state stands in for the URL. */
function Demo({ initial, locale }: { initial: RecordFilter; locale: "en" | "ro" }) {
  const [filter, setFilter] = useState<RecordFilter>(initial);
  return (
    <>
      <FilterChips filter={filter} onChange={setFilter} procedureOptions={PROCEDURES} lastYear={2025} locale={locale} copy={sampleCopy.filterChips(locale)} />
      <Typography variant="caption" component="pre" sx={{ mt: 2 }}>
        {JSON.stringify(filter)}
      </Typography>
    </>
  );
}

const demo = (initial: RecordFilter): Story["render"] => (_args, { globals }) => <Demo initial={initial} locale={localeOf(globals["locale"])} />;

export const NoChips: Story = { render: demo({}) };
export const SeveralActive: Story = {
  render: demo({
    from: "2023-01-01", to: "2024-12-31", channel: "DIRECT_PURCHASE", valueBucket: "UP_TO_270K", hasSignals: true,
    procedure: ["Achiziție directă"], badges: ["SUSPECT_VALUE", "NO_VALUE"], q: "deszăpezire", county: "RO-BV",
  }),
};
/** Every badge chip on at once. */
export const EveryBadge: Story = {
  render: demo({
    badges: [
      "FRAMEWORK_CEILING", "SUBSEQUENT_CONTRACT", "CONSORTIUM_SHARE", "SUSPECT_VALUE", "NO_VALUE", "CUI_MISMATCH", "NAME_DIFFERS_FROM_ANAF",
      "IDENTITY_CURATED", "CRAWLED_PROVISIONAL", "CRAWL_ONLY",
    ],
  }),
};
/** Dates that are not year edges show as dates; "without Signals" shows as an active chip. */
export const OddDatesAndWithoutSignals: Story = { render: demo({ from: "2024-03-15", to: "2024-09-30", hasSignals: false }) };
