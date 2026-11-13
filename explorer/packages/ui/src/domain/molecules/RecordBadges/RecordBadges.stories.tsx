import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { consortiumRecord, highlightedRecord } from "../../samples/fixtureData.ts";
import { RecordBadges } from "./index.ts";

const meta = { title: "Domain/RecordBadges", component: RecordBadges } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const badges = (row: typeof highlightedRecord): Story["render"] => (_a, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return <RecordBadges record={row.record} copy={sampleCopy.recordRow(locale)} />;
};
export const WithBadges: Story = { render: badges({ ...highlightedRecord, record: { ...highlightedRecord.record, badges: ["FRAMEWORK_CEILING", "CRAWLED_PROVISIONAL"] } }) };
/** Two winners: the consortium marker leads, then the Consortium share badge. */
export const Consortium: Story = { render: badges(consortiumRecord) };
