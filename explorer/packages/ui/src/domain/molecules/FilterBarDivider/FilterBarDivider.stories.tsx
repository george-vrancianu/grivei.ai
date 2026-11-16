import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { FilterBarDivider } from "./index.ts";

const meta = { title: "Domain/FilterBarDivider" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The rule between the first control of a filter bar and the menus. */
export const BetweenControls: Story = {
  render: (_args, { globals }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span>{pick(globals["locale"], { en: "Signals", ro: "Semnale" })}</span>
      <FilterBarDivider />
      <span>{pick(globals["locale"], { en: "Channel", ro: "Canal" })}</span>
    </div>
  ),
};
