import type { Meta, StoryObj } from "@storybook/react-vite";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { ResultTabPanel } from "./index.ts";

const meta = { title: "Domain/ResultTabs/ResultTabPanel", component: ResultTabPanel } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const WithShowAll: Story = {
  render: (_a, { globals }) => {
    const copy = sampleCopy.resultTabs(localeOf(globals["locale"]));
    return (
      <ResultTabPanel id="p" tabId="t" selected shown={50} count={240_000} emptyText={copy.empty.suppliers} showAll={{ href: "/explore/search", text: copy.showAll(240_000, "240,000") }}>
        <Typography>Rows</Typography>
      </ResultTabPanel>
    );
  },
};
export const Empty: Story = {
  render: (_a, { globals }) => (
    <ResultTabPanel id="p" tabId="t" selected shown={0} count={0} emptyText={sampleCopy.resultTabs(localeOf(globals["locale"])).empty.suppliers}>
      <Typography>Rows</Typography>
    </ResultTabPanel>
  ),
};
