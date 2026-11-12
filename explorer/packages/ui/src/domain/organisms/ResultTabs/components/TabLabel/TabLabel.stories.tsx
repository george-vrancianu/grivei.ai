import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { TabLabel } from "./index.ts";

const meta = { title: "Domain/ResultTabs/TabLabel", component: TabLabel } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const label = (count: number, estimated: boolean): Story["render"] => (_a, { globals }) => {
  const locale = localeOf(globals["locale"]);
  return <TabLabel name={sampleCopy.resultTabs(locale).tabs.suppliers} count={count} estimated={estimated} locale={locale} />;
};
export const Exact: Story = { render: label(6, false) };
export const Estimated: Story = { render: label(240_000, true) };
