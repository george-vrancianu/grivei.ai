import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { HasSignalsChip } from "./index.ts";

const meta = { title: "Domain/FilterChips/HasSignalsChip" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const Off: Story = {
  render: (_args, { globals }) => <HasSignalsChip hasSignals={undefined} onToggle={() => {}} copy={sampleCopy.filterChips(localeOf(globals["locale"])).signals} />,
};
export const On: Story = {
  render: (_args, { globals }) => <HasSignalsChip hasSignals onToggle={() => {}} copy={sampleCopy.filterChips(localeOf(globals["locale"])).signals} />,
};
/** A filter with `hasSignals: false` shows the switch off; "Without Signals" lives in the active row (see FilterChips). */
export const WithoutSignals: Story = {
  render: (_args, { globals }) => <HasSignalsChip hasSignals={false} onToggle={() => {}} copy={sampleCopy.filterChips(localeOf(globals["locale"])).signals} />,
};
