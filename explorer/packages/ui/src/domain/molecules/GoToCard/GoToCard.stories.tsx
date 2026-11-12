import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { nameOnlyParty, resultSamples } from "../../samples/fixtureData.ts";
import { GoToCard } from "./index.ts";

const meta = { title: "Domain/GoToCard", component: GoToCard } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const CuiEntity: Story = {
  render: (_a, { globals }) => <GoToCard entity={resultSamples.goTo.goTo!} href="/explore/supplier/30000001" copy={sampleCopy.goTo(localeOf(globals["locale"]))} />,
};
export const NameOnlyEntity: Story = {
  render: (_a, { globals }) => (
    <GoToCard
      entity={nameOnlyParty.entity!}
      href={`/explore/supplier/${nameOnlyParty.entity!.key}`}
      copy={sampleCopy.goTo(localeOf(globals["locale"]))}
    />
  ),
};
