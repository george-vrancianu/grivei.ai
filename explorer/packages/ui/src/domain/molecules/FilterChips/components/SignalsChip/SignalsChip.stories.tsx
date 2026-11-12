import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { SignalsChip } from "./index.ts";

const meta = { title: "Domain/FilterChips/SignalsChip" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const Off: Story = {
  render: (_args, { globals }) => <SignalsChip hasSignals={undefined} onToggle={() => {}} copy={sampleCopy.filterChips(localeOf(globals["locale"])).signals} />,
};
export const On: Story = {
  render: (_args, { globals }) => <SignalsChip hasSignals onToggle={() => {}} copy={sampleCopy.filterChips(localeOf(globals["locale"])).signals} />,
};
