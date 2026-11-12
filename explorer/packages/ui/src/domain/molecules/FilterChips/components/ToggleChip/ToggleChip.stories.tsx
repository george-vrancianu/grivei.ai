import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { pick } from "../../../../../workbench/index.ts";
import { ToggleChip } from "./index.ts";

const meta = { title: "Domain/FilterChips/ToggleChip" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const OffAndOn: Story = {
  render: (_args, { globals }) => (
    <Stack direction="row" spacing={1}>
      <ToggleChip label={pick(globals["locale"], { en: "Contract", ro: "Contract" })} pressed={false} onToggle={() => {}} />
      <ToggleChip label={pick(globals["locale"], { en: "Direct purchase", ro: "Achiziție directă" })} pressed onToggle={() => {}} />
    </Stack>
  ),
};

export const WithExplanation: Story = {
  render: (_args, { globals }) => (
    <ToggleChip
      label={pick(globals["locale"], { en: "No value", ro: "Fără valoare" })}
      description={pick(globals["locale"], { en: "SEAP publishes no value for this Record.", ro: "SEAP nu publică nicio valoare pentru această înregistrare." })}
      pressed={false}
      onToggle={() => {}}
    />
  ),
};
