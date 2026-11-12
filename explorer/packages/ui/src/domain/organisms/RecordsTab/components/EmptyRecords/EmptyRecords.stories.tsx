import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { EmptyRecords } from "./index.ts";

const meta = { title: "Domain/RecordsTab/EmptyRecords", component: EmptyRecords } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const WithFacetsOn: Story = {
  render: (_args, { globals }) => <EmptyRecords copy={sampleCopy.recordsTab(localeOf(globals["locale"])).empty} onClear={() => {}} />,
};
export const NoFacetsOn: Story = {
  render: (_args, { globals }) => <EmptyRecords copy={sampleCopy.recordsTab(localeOf(globals["locale"])).empty} />,
};
