import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { ceilingRecord, highlightedRecord, noValueRecord } from "../../samples/fixtureData.ts";
import { RecordValue } from "./index.ts";

const meta = { title: "Domain/RecordValue", component: RecordValue } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const value = (row: typeof highlightedRecord): Story["render"] => (_a, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return <RecordValue record={row.record} locale={locale} copy={sampleCopy.recordRow(locale)} />;
};
export const Awarded: Story = { render: value(highlightedRecord) };
/** A framework ceiling: the caption says it is not summed into the Total. */
export const Ceiling: Story = { render: value(ceilingRecord) };
export const NoValue: Story = { render: value(noValueRecord) };
