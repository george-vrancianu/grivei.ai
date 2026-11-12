import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { typicalCoverage } from "../../../../samples/coverageLenses.ts";
import { coverageByCounty } from "../../coverageLensMap.utils.ts";
import { CoverageTooltip } from "./index.ts";

const meta = { title: "Domain/CoverageLensMap/CoverageTooltip" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const rows = coverageByCounty(typicalCoverage.coverage);
const story = (name: string, code: string): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <CoverageTooltip name={name} row={rows.get(code)} lens={typicalCoverage} locale={locale} copy={sampleCopy.coverageLensMap(locale)} />;
  },
});

export const Harvested: Story = story("Brașov", "RO-BV");
export const KnownGaps: Story = story("Cluj", "RO-CJ");
export const NoOtherAuthorities: Story = story("Argeș", "RO-AG");
export const NoStatus: Story = story("Galați", "RO-GL");
