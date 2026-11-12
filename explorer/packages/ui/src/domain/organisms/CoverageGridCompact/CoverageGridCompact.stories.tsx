import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../atoms/Box/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { sampleGrid } from "../../samples/coverageGrid.ts";
import { CoverageGridCompact } from "./index.ts";

const meta = { title: "Domain/CoverageGridCompact" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The side panel's grid: small cells, no visible text (accessible names and tooltips stay), condensed legend, a link to the Coverage page. */
export const Default: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <Box sx={{ width: 320 }}>
        <CoverageGridCompact cells={sampleGrid()} dateWindow={{ from: "2023-01-01", to: "2024-12-31" }} href={locale === "ro" ? "/ro/explore/coverage?from=2023-01-01" : "/explore/coverage?from=2023-01-01"} locale={locale} copy={sampleCopy.coverageGrid(locale)} />
      </Box>
    );
  },
};

/** No date chip: nothing highlighted, no range swatch in the legend. */
export const NoWindow: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <Box sx={{ width: 320 }}>
        <CoverageGridCompact cells={sampleGrid()} href="/explore/coverage" locale={locale} copy={sampleCopy.coverageGrid(locale)} />
      </Box>
    );
  },
};
