import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { ToggleChip } from "../ToggleChip/index.ts";
import { ChipGroup } from "./index.ts";

const meta = { title: "Domain/ChipGroup" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const Typical: Story = {
  render: (_args, { globals }) => (
    <ChipGroup label={pick(globals["locale"], { en: "Channel", ro: "Canal" })}>
      <ToggleChip label={pick(globals["locale"], { en: "Direct purchase", ro: "Achiziție directă" })} pressed onToggle={() => {}} />
      <ToggleChip label="Contract" pressed={false} onToggle={() => {}} />
    </ChipGroup>
  ),
};
