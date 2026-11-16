import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { YearMenu } from "./index.ts";

const meta = { title: "Domain/FilterChips/YearMenu" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const at = (filter: { from?: string; to?: string }, defaultOpen = false): Story["render"] => (_args, { globals }) => {
  const copy = sampleCopy.filterChips(localeOf(globals["locale"]));
  return <YearMenu filter={filter} firstYear={2021} lastYear={2025} onFromYear={() => {}} onToYear={() => {}} copy={copy.year} unsetLabel={copy.menuAny} defaultOpen={defaultOpen} />;
};

export const NoRange: Story = { render: at({}) };
export const FullRange: Story = { render: at({ from: "2022-01-01", to: "2024-12-31" }) };
export const OneEnd: Story = { render: at({ from: "2023-01-01" }) };
export const UntilOnly: Story = { render: at({ to: "2025-12-31" }) };
export const SingleYear: Story = { render: at({ from: "2024-01-01", to: "2024-12-31" }) };
/** Dates that are not year edges show as their containing years. */
export const MidYearDates: Story = { render: at({ from: "2024-03-15", to: "2024-09-30" }) };
/** Two columns, "From year" and "To year", each "Any" then the years; stays open while you pick. */
export const OpenNothingChosen: Story = { render: at({}, true) };
export const OpenRangeChosen: Story = { render: at({ from: "2022-01-01", to: "2024-12-31" }, true) };
