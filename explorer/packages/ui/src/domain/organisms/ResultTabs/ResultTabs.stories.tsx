import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { pick } from "../../../workbench/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { resultSamples } from "../../samples/fixtureData.ts";
import { ResultTabs, type ResultTabsProps } from "./index.ts";

const meta = { title: "Domain/ResultTabs", component: ResultTabs } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const sample =
  (data: (typeof resultSamples)[keyof typeof resultSamples], extra: Partial<ResultTabsProps> | ((locale: Locale) => Partial<ResultTabsProps>) = {}): Story["render"] =>
  (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return (
      <ResultTabs
        {...data}
        entityHref={(entity, role) => `/explore/${role}/${entity.key}`}
        recordHref={(record) => `/explore/record/${record.code}`}
        locale={locale}
        copy={sampleCopy.resultTabs(locale)}
        {...(typeof extra === "function" ? extra(locale) : extra)}
      />
    );
  };

/** Suppliers open by default; the reader switches tabs. */
export const Typical: Story = { render: sample(resultSamples.typical) };
export const RecordsTab: Story = { render: sample(resultSamples.typical, { tab: "records" }) };
export const AuthoritiesTab: Story = { render: sample(resultSamples.typical, { tab: "authorities" }) };
/** Every Record state at once, including consortium Records with their full value. */
export const ConsortiumRecords: Story = { render: sample(resultSamples.variety, { tab: "records" }) };
/** HyperLogLog counts: "≈" before the distinct counts; the Records count stays exact. */
export const EstimatedCounts: Story = { render: sample(resultSamples.estimated) };
export const GoToCard: Story = { render: sample(resultSamples.goTo) };
export const Empty: Story = { render: sample(resultSamples.empty) };
export const EmptyRecords: Story = { render: sample(resultSamples.empty, { tab: "records" }) };
/** The "show all" slot: more rows exist than shown, and the caller says where the full list lives. */
export const ShowAll: Story = { render: sample(resultSamples.estimated, { showAllHref: (tab) => `/explore/search?tab=${tab}` }) };

/** An empty tab can offer a next step under its sentence (#105 puts the Coverage lens link here). */
export const EmptyWithAction: Story = {
  render: sample(resultSamples.empty, (locale) => ({
    tab: "records",
    emptyAction: () => <a href="/explore/?lens=coverage">{pick(locale, { en: "See what is covered", ro: "Vezi ce este acoperit" })}</a>,
  })),
};
