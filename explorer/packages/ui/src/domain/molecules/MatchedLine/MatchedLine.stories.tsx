import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { highlightedRecord } from "../../samples/fixtureData.ts";
import { MatchedLine } from "./index.ts";

const meta = { title: "Domain/MatchedLine", component: MatchedLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const Highlighted: Story = {
  render: (_a, { globals }) => <MatchedLine matchedField={highlightedRecord.matchedField!} copy={sampleCopy.recordRow(localeOf(globals["locale"]))} />,
};
