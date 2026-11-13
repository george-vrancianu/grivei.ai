import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { AreaShareLine } from "./index.ts";

const meta = { title: "Domain/AreaShareLine", component: AreaShareLine } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const Typical: Story = {
  render: (_a, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <AreaShareLine bani="1500000000" locale={locale} copy={sampleCopy.recordRow(locale)} />;
  },
};
