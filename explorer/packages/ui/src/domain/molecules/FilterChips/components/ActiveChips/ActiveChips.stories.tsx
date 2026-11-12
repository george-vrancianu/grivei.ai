import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import type { ActiveChip } from "../../filterChips.utils.ts";
import { ActiveChips } from "./index.ts";

const meta = { title: "Domain/FilterChips/ActiveChips" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const chip = (label: string): ActiveChip => ({ id: label, label, remove: (f) => f });
const copyOf = (globals: Record<string, unknown>) => sampleCopy.filterChips(localeOf(globals["locale"])).active;

export const None: Story = { render: (_a, { globals }) => <ActiveChips chips={[]} onRemove={() => {}} onClearAll={() => {}} copy={copyOf(globals)} /> };
export const Several: Story = {
  render: (_a, { globals }) => (
    <ActiveChips
      chips={[chip("2023"), chip("Contract"), chip("Negociere fără publicare prealabilă")]}
      onRemove={() => {}}
      onClearAll={() => {}}
      copy={copyOf(globals)}
    />
  ),
};
