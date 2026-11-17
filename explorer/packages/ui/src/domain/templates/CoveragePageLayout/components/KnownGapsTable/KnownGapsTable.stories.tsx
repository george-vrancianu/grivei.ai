import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { samplePageContent } from "../../../../samples/coverageGrid.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { explainedCells } from "../../../../utils/coverageGrid.ts";
import { KnownGapsTable } from "./index.ts";

const meta = { title: "Domain/CoveragePageLayout/KnownGapsTable" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const inPanel = (cellsOf: () => ReturnType<typeof explainedCells>): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    const copy = sampleCopy.coveragePageLayout(locale);
    const cells = cellsOf();
    return (
      <Panel heading={copy.knownGaps.heading} level="h2" aside={copy.knownGaps.count(cells.length)} flush>
        <KnownGapsTable cells={cells} locale={locale} copy={copy} />
      </Panel>
    );
  };

/** The sample grid's rows: each state with its cell colour beside its name. */
export const Typical: Story = { render: inPanel(() => explainedCells(samplePageContent().cells)) };

/** A single row: the count reads "1 cell" / "1 celulă". */
export const OneGap: Story = { render: inPanel(() => explainedCells(samplePageContent().cells).slice(0, 1)) };

/** No known gaps: the intro and the empty sentence, "0 cells" in the header. */
export const None: Story = { render: inPanel(() => []) };
