import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../../../../atoms/Card/index.ts";
import { pick } from "../../../../../workbench/index.ts";
import { PanelFoot } from "./index.ts";

const meta = { title: "Domain/Panel/PanelFoot", component: PanelFoot } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** Two children at the strip's two ends. */
export const TwoEnds: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ p: 0, maxWidth: 480 }}>
      <PanelFoot>
        <span>{pick(globals["locale"], { en: "Showing 1–7 of 54", ro: "Se afișează 1–7 din 54" })}</span>
        <span>{pick(globals["locale"], { en: "Show all", ro: "Arată tot" })}</span>
      </PanelFoot>
    </Card>
  ),
};
