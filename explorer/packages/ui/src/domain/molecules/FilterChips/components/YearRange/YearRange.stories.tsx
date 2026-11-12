import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { YearRange } from "./index.ts";

const meta = { title: "Domain/FilterChips/YearRange" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const at = (filter: { from?: string; to?: string }): Story["render"] => (_args, { globals }) => (
  <YearRange filter={filter} firstYear={2021} lastYear={2025} onFromYear={() => {}} onToYear={() => {}} copy={sampleCopy.filterChips(localeOf(globals["locale"])).year} />
);

export const NoRange: Story = { render: at({}) };
export const FullRange: Story = { render: at({ from: "2022-01-01", to: "2024-12-31" }) };
export const OneEnd: Story = { render: at({ from: "2023-01-01" }) };
/** Dates that are not year edges show as their containing years. */
export const MidYearDates: Story = { render: at({ from: "2024-03-15", to: "2024-09-30" }) };
