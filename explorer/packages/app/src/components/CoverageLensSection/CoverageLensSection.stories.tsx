import type { Meta, StoryObj } from "@storybook/react-vite";
import { fixtures } from "@grivei/contract/fixtures";
import { catalogue } from "../../copy/index.ts";
import { testCountyTopology } from "../../testing/countyTopology.ts";
import { CoverageLensSection, type CoverageLensSectionProps } from "./index.ts";

const meta: Meta<Record<string, unknown>> = { title: "App/CoverageLensSection" };
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The API's recorded answers (seam 1, `fixtures/recorded`) for the invented joined world: one lens answer per date-chip window, the whole grid once. */
const lensOf = (name: string) => fixtures.CoverageLens.find((f) => f.name === name)!.data;
const gridCells = fixtures.CoveragePage.find((f) => f.name === "whole-grid")!.data.coverage.grid;

function render(props: Partial<CoverageLensSectionProps>): NonNullable<Story["render"]> {
  return (_args, { globals }) => {
    const locale = globals["locale"] === "ro" ? "ro" : "en";
    const t = catalogue[locale];
    return (
      <CoverageLensSection
        lens={lensOf("open-window")}
        loading={false}
        failed={false}
        topology={{ status: "ready", topology: testCountyTopology }}
        cells={gridCells}
        dateWindow={null}
        pageHref={locale === "ro" ? "/ro/explore/coverage" : "/explore/coverage"}
        onNavigate={() => undefined}
        county={undefined}
        onSelect={() => undefined}
        locale={locale}
        copy={{ map: t.coverageLensMap, grid: t.coverage.grid }}
        status={{ loading: t.status.loading, unavailable: t.main.mapUnavailable, failed: t.status.failed }}
        {...props}
      />
    );
  };
}

/** No date chip: the whole harvest is partial (a quarantined file), and no grid column is marked. */
export const OpenWindow: Story = { render: render({}) };
/** The 2023 chip: harvested with known gaps, the unplaced tally falls, and the year's four quarters are marked in the grid. */
export const Year2023: Story = { render: render({ lens: lensOf("year-2023"), dateWindow: { from: "2023-01-01", to: "2023-12-31" } }) };
/** A few days inside the loaded quarter: N of M and the other authorities fall to the Records dated there. */
export const NarrowWindow: Story = { render: render({ lens: lensOf("narrow-days"), dateWindow: { from: "2023-03-11", to: "2023-03-16" } }) };
/** A window before the harvest: every county not harvested. */
export const BeforeTheHarvest: Story = { render: render({ lens: lensOf("before-harvest"), dateWindow: { from: null, to: "2020-12-31" } }) };
/** A county chosen, as in the Money lens. */
export const CountySelected: Story = { render: render({ county: "RO-BV" }) };
/** The lens is loading; the grid is already there. */
export const Loading: Story = { render: render({ lens: null, loading: true }) };
/** The grid is still loading: the map stands alone. */
export const GridLoading: Story = { render: render({ cells: null }) };
/** The outlines could not be fetched. */
export const OutlinesUnavailable: Story = { render: render({ topology: { status: "error" } }) };
/** The Coverage query failed. */
export const Failed: Story = { render: render({ lens: null, failed: true }) };
