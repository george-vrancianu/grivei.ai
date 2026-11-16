import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { SourcePicker } from "../../molecules/SourcePicker/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { fixturePageContent, samplePageContent } from "../../samples/coverageGrid.ts";
import { CoveragePageLayout, type CoveragePageContent } from "./index.ts";

const meta = { title: "Domain/CoveragePageLayout", parameters: { layout: "fullscreen" } } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const selector = (locale: "en" | "ro") => (
  <SourcePicker options={[{ id: "SEAP", label: "SEAP" }, { id: "ONRC", label: "ONRC" }]} selected="SEAP" onSelect={() => {}} copy={{ label: pick(locale, { en: "Coverage of", ro: "Acoperirea pentru" }) }} />
);

const page = (status: "loading" | "error" | "ready", content?: CoveragePageContent, extra: { busy?: boolean; retry?: boolean } = {}): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <CoveragePageLayout
        status={status}
        content={content}
        locale={locale}
        methodologyHref={locale === "ro" ? "/ro/explore/methodology" : "/explore/methodology"}
        lensHref={locale === "ro" ? "/ro/explore/?lens=coverage" : "/explore/?lens=coverage"}
        sourceSelector={selector(locale)}
        busy={extra.busy}
        retry={extra.retry ? { label: pick(locale, { en: "Try again", ro: "Reîncearcă" }), onRetry: () => {} } : undefined}
        copy={sampleCopy.coveragePageLayout(locale)}
      />
    );
  };

/** The whole page on the sample grid: all six states, 2023-24 highlighted among the 19 quarters, data-through per kind, crawl-only counts, known gaps with reasons, rules, MF snapshot date. */
export const FullPage: Story = { render: page("ready", samplePageContent()) };

/** The contract's recorded "whole-grid" fixture (the API's own answer), no date chip. */
export const FromFixtureOpenWindow: Story = { render: page("ready", fixturePageContent("whole-grid")) };

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

/** First load: every panel keeps its title over skeleton blocks; the loading status sits beside the selector in the grid panel; the rules are real. */
export const Loading: Story = { render: page("loading") };

/** A failed request: the note and its retry in the grid panel, the rules stay, the data panels are left out. */
export const LoadFailed: Story = { render: page("error", undefined, { retry: true }) };

/** The last answer on screen while the next loads: the data panels dim (aria-busy), the header strips stay at full strength. */
export const Refetching: Story = { render: page("ready", samplePageContent(), { busy: true }) };

/** No quarter of the Source is loaded: the grid is replaced by a sentence. */
export const EmptyGrid: Story = { render: page("ready", fixturePageContent("empty-window")) };
