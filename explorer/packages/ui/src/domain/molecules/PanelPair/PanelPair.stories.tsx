import type { Meta, StoryObj } from "@storybook/react-vite";
import { Panel } from "../Panel/index.ts";
import { pick } from "../../../workbench/index.ts";
import { PanelPair } from "./index.ts";

const meta = { title: "Domain/PanelPair", component: PanelPair } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

const panel = (title: string, text: string) => (
  <Panel heading={title} level="h2">
    {text}
  </Panel>
);

/** Two panels: side by side from `md` up, stacked below. */
export const Both: Story = {
  render: (_args, { globals }) => (
    <PanelPair
      wide={panel(pick(globals["locale"], { en: "Wide panel", ro: "Panou lat" }), "…")}
      narrow={panel(pick(globals["locale"], { en: "Narrow panel", ro: "Panou îngust" }), "…")}
    />
  ),
};

/** A lone panel takes the full width. */
export const Alone: Story = {
  render: (_args, { globals }) => <PanelPair narrow={panel(pick(globals["locale"], { en: "Only panel", ro: "Singurul panou" }), "…")} />,
};
