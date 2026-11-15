import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Card } from "../Card/index.ts";
import { Typography } from "../Typography/index.ts";
import { Well } from "./index.ts";

const meta = { title: "Atoms/Well", component: Well } satisfies Meta<typeof Well>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A well on a panel: where a map, a figure or an input sits. */
export const OnPanel: Story = {
  render: (args, { globals }) => (
    <Card sx={{ p: 2, maxWidth: 360 }}>
      <Well {...args} sx={{ p: 2 }}>
        <Typography>{pick(globals["locale"], { en: "Sunk into the panel", ro: "Adâncit în panou" })}</Typography>
      </Well>
    </Card>
  ),
};

/** The stronger edge an input has. */
export const StrongEdge: Story = { ...OnPanel, args: { edge: "lineStrong" } };
