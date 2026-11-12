import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../../../workbench/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { sampleSources, typicalCoverage } from "../../../../samples/coverageLenses.ts";
import { coverageByCounty } from "../../coverageLensMap.utils.ts";
import { SourceMarks } from "./index.ts";

const meta = { title: "Domain/CoverageLensMap/SourceMarks" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const rows = coverageByCounty(typicalCoverage.coverage);
/** One county per status, and one without a row, side by side on a plain background. */
const centroids = new Map<string, readonly [number, number]>([["RO-BV", [30, 15]], ["RO-CJ", [90, 15]], ["RO-TM", [150, 15]], ["RO-MM", [210, 15]], ["RO-GL", [270, 15]]]);

export const OnEveryStatus: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <svg viewBox="0 0 300 30" width={600} role="img" aria-label={pick(locale, { en: "Source marks", ro: "Semnele Surselor" })}>
        <SourceMarks centroids={centroids} sources={sampleSources} coverage={rows} copy={sampleCopy.coverageLensMap(locale)} />
      </svg>
    );
  },
};
