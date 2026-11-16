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
// Party lists are source data as registered: Romanian in both languages.
const PARTIES = ["PARTIDUL SOCIAL DEMOCRAT", "PARTIDUL NAȚIONAL LIBERAL", "ALIANȚA USR PLUS"];

// County names as the page shows them (map topology); a code with no name is shown as the code.
const COUNTY_NAMES: Record<string, string> = { "RO-BV": "Brașov" };

/** The chips are controlled; in the workbench a little state stands in for the URL. */
function Demo({ initial, locale }: { initial: RecordFilter; locale: "en" | "ro" }) {
  const [filter, setFilter] = useState<RecordFilter>(initial);
  return (
    <>
      <FilterChips filter={filter} countyName={filter.county ? COUNTY_NAMES[filter.county] : undefined} onChange={setFilter} procedureOptions={PROCEDURES} partyOptions={PARTIES} lastYear={2025} locale={locale} copy={sampleCopy.filterChips(locale)} />
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
/** Only a county picked on the map: the active row appears with its chip; removing it (or Clear all) unsets the county. */
export const CountyOnly: Story = { render: demo({ county: "RO-BV" }) };
/** The Party filter on one list, with its active chip (#181). */
export const PartyChosen: Story = { render: demo({ party: "ALIANȚA USR PLUS", from: "2024-01-01" }) };
/** Every badge chip on at once. */
export const EveryBadge: Story = {
  render: demo({
    badges: [
      "FRAMEWORK_CEILING", "SUBSEQUENT_CONTRACT", "CONSORTIUM_SHARE", "SUSPECT_VALUE", "NO_VALUE", "CUI_MISMATCH", "NAME_DIFFERS_FROM_ANAF",
      "IDENTITY_CURATED", "CRAWLED_PROVISIONAL", "CRAWL_ONLY",
    ],
  }),
};
/** A filter that says `hasSignals: false`: the Signals switch is off and "Without Signals" is the active chip. */
export const WithoutSignals: Story = { render: demo({ hasSignals: false }) };
/** Dates that are not year edges show as dates; "without Signals" shows as an active chip. */
export const OddDatesAndWithoutSignals: Story = { render: demo({ from: "2024-03-15", to: "2024-09-30", hasSignals: false }) };

/** Below `md` the bar is one row that scrolls sideways inside its strip, Signals first, with a fade on the right edge. The breakpoints follow the viewport, so the story sets Storybook's phone viewport. */
export const PhoneStrip: Story = {
  globals: { viewport: { value: "mobile2", isRotated: false } },
  render: demo({ from: "2023-01-01", channel: "CONTRACT" }),
};
