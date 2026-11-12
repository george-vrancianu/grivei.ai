import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { consortiumRecord, highlightedRecord, noValueRecord } from "../../../../samples/fixtureData.ts";
import { RecordValueLine } from "./index.ts";

const meta = { title: "Domain/RecordResultRow/RecordValueLine", component: RecordValueLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const line = (row: typeof highlightedRecord): Story["render"] => (_a, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return <RecordValueLine record={row.record} locale={locale} copy={sampleCopy.recordRow(locale)} />;
};
export const WithValue: Story = { render: line(highlightedRecord) };
export const NoValue: Story = { render: line(noValueRecord) };
/** Two winners: the full value with the consortium marker, and the Consortium share badge. */
export const Consortium: Story = { render: line(consortiumRecord) };
