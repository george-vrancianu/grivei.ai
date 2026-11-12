import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { fixturePageContent, samplePageContent } from "../../samples/coverageGrid.ts";
import { CoveragePageLayout, type CoveragePageContent } from "./index.ts";

const meta = { title: "Domain/CoveragePageLayout", parameters: { layout: "fullscreen" } } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const page = (status: "loading" | "error" | "ready", content?: CoveragePageContent): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <CoveragePageLayout status={status} content={content} locale={locale} methodologyHref={locale === "ro" ? "/ro/explore/methodology" : "/explore/methodology"} copy={sampleCopy.coveragePageLayout(locale)} />;
  };

/** The whole page on the sample grid: all six states, 2023-24 highlighted among the 19 quarters, data-through per kind, crawl-only counts, known gaps with reasons, rules, MF snapshot date. */
export const FullPage: Story = { render: page("ready", samplePageContent()) };

/** The contract's "typical-open-window" fixture, no date chip. */
export const FromFixtureOpenWindow: Story = { render: page("ready", fixturePageContent("typical-open-window")) };

/** The contract's sparse "typical-every-gap-state" fixture with its closed window. */
export const FromFixtureEveryGapState: Story = { render: page("ready", fixturePageContent("typical-every-gap-state")) };

/** After the backfill: the 2021-22 award notices are loaded, and leave the known-gap list. */
export const AfterBackfill: Story = { render: page("ready", samplePageContent({ from: "2021-01-01", to: "2022-12-31" }, { backfilled: true })) };

/** No reference list loaded yet. */
export const SnapshotNotLoaded: Story = { render: page("ready", { ...samplePageContent(), referenceSnapshot: null }) };

/** No known gaps and no crawl-only Records: those sections say so or are left out. */
export const NoGaps: Story = {
  render: page("ready", { ...samplePageContent(), cells: samplePageContent().cells.filter((c) => c.state === "LOADED") }),
};

export const Loading: Story = { render: page("loading") };
export const LoadFailed: Story = { render: page("error") };

/** No quarter of the Source is loaded: the grid is replaced by a sentence. */
export const EmptyGrid: Story = { render: page("ready", fixturePageContent("empty-window")) };
