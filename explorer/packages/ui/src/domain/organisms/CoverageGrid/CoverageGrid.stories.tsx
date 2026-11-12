import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { cellsBetween, fixturePageContent, sampleGrid } from "../../samples/coverageGrid.ts";
import type { GapCellData } from "../../types.ts";
import { CoverageGrid } from "./index.ts";

const meta = { title: "Domain/CoverageGrid" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const grid = (cells: readonly GapCellData[], window?: { from?: string | null; to?: string | null }) =>
  ((_args: unknown, { globals }: { globals: Record<string, unknown> }) => {
    const locale = localeOf(globals["locale"]);
    return <CoverageGrid cells={cells} locale={locale} copy={sampleCopy.coverageGrid(locale)} {...(window ? { window } : {})} />;
  }) as Story["render"];

/** All six states in one grid: loaded, the 2021-22 award notices not in the source, the Q2 2025 DAN known gap, 2024-Q4 CONTRACT possibly incomplete, a quarantined DA quarter (not yet loaded, no reason), and the current quarter crawled provisional. The grid is wide: it scrolls sideways, kind labels stay. */
export const AllStates: Story = { render: grid(sampleGrid()) };

/** The current quarter (2025-Q3): contracts and award notices crawled, provisional (with their crawl-only counts); direct purchases and their notices not yet loaded, awaiting the bulk file. */
export const CurrentQuarter: Story = { render: grid(cellsBetween(sampleGrid(), "2024-Q3", "2025-Q3"), { from: "2025-07-01", to: null }) };

/** 2021-22 award notices without a prior call are "not visible in the source" until the backfill has run. */
export const NotInSourceBeforeBackfill: Story = { render: grid(cellsBetween(sampleGrid(), "2021-Q1", "2023-Q1"), { from: "2021-01-01", to: "2022-12-31" }) };

/** After the backfill the same quarters are loaded (covered via e-licitatie). */
export const AfterBackfill: Story = { render: grid(cellsBetween(sampleGrid({ backfilled: true }), "2021-Q1", "2023-Q1"), { from: "2021-01-01", to: "2022-12-31" }) };

/** The Q2 2025 DAN known gap, hand-entered: its written reason is shown verbatim (Romanian in both languages) in the cell's tooltip and accessible name. */
export const HandEnteredKnownGap: Story = { render: grid(cellsBetween(sampleGrid(), "2024-Q4", "2025-Q3")) };

/** 2024-Q4 CONTRACT: possibly incomplete, by the published rule (fewer than 60% of the median row count of the surrounding quarters). */
export const PossiblyIncomplete: Story = { render: grid(cellsBetween(sampleGrid(), "2024-Q1", "2025-Q1"), { from: "2024-10-01", to: "2024-12-31" }) };

/** A quarantined bulk file reads as "not yet loaded" with no reason: the quarantine is never exposed (2023-Q3 DA). */
export const QuarantinedNotYetLoaded: Story = { render: grid(cellsBetween(sampleGrid(), "2023-Q1", "2023-Q4")) };

/** A closed range: the columns that overlap it are marked (header filled, cells outlined). */
export const WindowClosed: Story = { render: grid(sampleGrid(), { from: "2023-01-01", to: "2024-06-30" }) };

/** An open start (up to a date): every column up to that quarter. */
export const WindowOpenStart: Story = { render: grid(sampleGrid(), { from: null, to: "2022-03-31" }) };

/** An open end (from a date on). */
export const WindowOpenEnd: Story = { render: grid(sampleGrid(), { from: "2024-07-15", to: null }) };

/** No date chip: nothing is highlighted. */
export const WindowNone: Story = { render: grid(sampleGrid(), { from: null, to: null }) };

/** The contract's `CoveragePage` fixture "typical-open-window". */
export const FromFixture: Story = { render: grid(fixturePageContent("typical-open-window").cells) };

/** The contract's "typical-every-gap-state" fixture is sparse: quarters and kinds with no cell show as "no information". */
export const SparseFixture: Story = { render: grid(fixturePageContent("typical-every-gap-state").cells, { from: "2021-01-01", to: "2024-12-31" }) };

/** No cells at all (an empty window): the grid has no rows. */
export const Empty: Story = { render: grid([]) };
