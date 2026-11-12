import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { openWindowCoverage, typicalCoverage } from "../../../../samples/coverageLenses.ts";
import type { CoverageLens } from "../../../../types.ts";
import { coverageByCounty } from "../../coverageLensMap.utils.ts";
import { CoverageFigures } from "./index.ts";

const meta = { title: "Domain/CoverageLensMap/CoverageFigures" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const story = (lens: CoverageLens, withNote = false): Story => ({
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <CoverageFigures row={coverageByCounty(lens.coverage).get("NATIONAL")} lens={lens} withNote={withNote} locale={locale} copy={sampleCopy.coverageLensMap(locale)} />;
  },
});

export const National: Story = story(typicalCoverage);
export const WithNote: Story = story(typicalCoverage, true);
/** The window has no start: "since 2021". */
export const OpenWindow: Story = story(openWindowCoverage);
