import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { highlightedRecord } from "../../../../samples/fixtureData.ts";
import { RecordMetaLine } from "./index.ts";

const meta = { title: "Domain/RecordResultRow/RecordMetaLine", component: RecordMetaLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const line = (record: typeof highlightedRecord.record): Story["render"] => (_a, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return <RecordMetaLine record={record} locale={locale} copy={sampleCopy.recordRow(locale)} />;
};
export const Contract: Story = { render: line({ ...highlightedRecord.record, channel: "CONTRACT" }) };
export const DirectPurchase: Story = { render: line({ ...highlightedRecord.record, channel: "DIRECT_PURCHASE" }) };
/** No date and no procedure published: those parts are left out. */
export const NothingPublished: Story = { render: line({ ...highlightedRecord.record, date: null, procedure: null }) };
