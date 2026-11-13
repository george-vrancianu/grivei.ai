import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { ChannelTag } from "./index.ts";

const meta = { title: "Domain/ChannelTag", component: ChannelTag } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const tag = (channel: "CONTRACT" | "DIRECT_PURCHASE"): Story["render"] => (_a, { globals }) => (
  <ChannelTag channel={channel} labels={sampleCopy.recordRow(localeOf(globals["locale"])).channel} />
);
export const Contract: Story = { render: tag("CONTRACT") };
export const DirectPurchase: Story = { render: tag("DIRECT_PURCHASE") };
