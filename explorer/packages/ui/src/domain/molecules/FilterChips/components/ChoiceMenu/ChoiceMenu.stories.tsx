import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { ChoiceMenu } from "./index.ts";

const meta = { title: "Domain/FilterChips/ChoiceMenu" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

type Channel = "DIRECT_PURCHASE" | "CONTRACT";

/** Controlled the way the bar is: choosing the chosen one again clears it. */
function ChannelDemo({ locale, initial, open }: { locale: "en" | "ro"; initial?: Channel; open?: boolean }) {
  const { channel, menuAny } = sampleCopy.filterChips(locale);
  const [selected, setSelected] = useState<Channel | undefined>(initial);
  return (
    <ChoiceMenu
      label={channel.group}
      unsetLabel={menuAny}
      options={(["DIRECT_PURCHASE", "CONTRACT"] as const).map((value) => ({ value, label: channel.options[value] }))}
      selected={selected}
      onChoose={(value) => setSelected(value === selected ? undefined : value)}
      defaultOpen={open}
    />
  );
}

export const ChannelUnset: Story = { render: (_args, { globals }) => <ChannelDemo locale={localeOf(globals["locale"])} /> };
export const ChannelSet: Story = { render: (_args, { globals }) => <ChannelDemo locale={localeOf(globals["locale"])} initial="CONTRACT" /> };
export const ChannelOpen: Story = { render: (_args, { globals }) => <ChannelDemo locale={localeOf(globals["locale"])} initial="CONTRACT" open /> };

export const ValueOpenNothingChosen: Story = {
  render: (_args, { globals }) => {
    const { valueBucket, menuAny } = sampleCopy.filterChips(localeOf(globals["locale"]));
    return (
      <ChoiceMenu
        label={valueBucket.group}
        unsetLabel={menuAny}
        options={Object.entries(valueBucket.options).map(([value, label]) => ({ value, label }))}
        selected={undefined}
        onChoose={() => {}}
        defaultOpen
      />
    );
  },
};
