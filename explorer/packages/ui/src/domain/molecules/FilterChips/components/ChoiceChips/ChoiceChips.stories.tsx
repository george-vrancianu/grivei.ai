import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { ChoiceChips } from "./index.ts";

const meta = { title: "Domain/FilterChips/ChoiceChips" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const Channel: Story = {
  render: (_args, { globals }) => {
    const { channel } = sampleCopy.filterChips(localeOf(globals["locale"]));
    return (
      <ChoiceChips
        label={channel.group}
        options={[{ value: "DIRECT_PURCHASE", label: channel.options.DIRECT_PURCHASE }, { value: "CONTRACT", label: channel.options.CONTRACT }]}
        selected="DIRECT_PURCHASE"
        onChoose={() => {}}
      />
    );
  },
};

export const NothingSelected: Story = {
  render: (_args, { globals }) => {
    const { valueBucket } = sampleCopy.filterChips(localeOf(globals["locale"]));
    return (
      <ChoiceChips
        label={valueBucket.group}
        options={Object.entries(valueBucket.options).map(([value, label]) => ({ value, label }))}
        selected={undefined}
        onChoose={() => {}}
      />
    );
  },
};
