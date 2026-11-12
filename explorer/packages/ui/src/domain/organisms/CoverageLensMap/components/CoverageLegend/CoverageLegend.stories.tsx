import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { sampleSources } from "../../../../samples/coverageLenses.ts";
import { CoverageLegend } from "./index.ts";

const meta = { title: "Domain/CoverageLensMap/CoverageLegend" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const Default: Story = {
  render: (_args, { globals }) => <CoverageLegend sources={sampleSources} copy={sampleCopy.coverageLensMap(localeOf(globals["locale"]))} />,
};

/** Every Source harvested: no planned-Sources line. */
export const AllHarvested: Story = {
  render: (_args, { globals }) => (
    <CoverageLegend sources={sampleSources.map((source) => ({ ...source, harvested: true }))} copy={sampleCopy.coverageLensMap(localeOf(globals["locale"]))} />
  ),
};
