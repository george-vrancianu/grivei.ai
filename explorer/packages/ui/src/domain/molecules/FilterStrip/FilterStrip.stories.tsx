import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../../atoms/Card/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { pick } from "../../../workbench/index.ts";
import { FilterStrip } from "./index.ts";

const meta = { title: "Domain/FilterStrip", component: FilterStrip } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** A strip in a panel with no padding: the content keeps 20 px off the edges. */
export const InPanel: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ p: 0, overflow: "hidden", maxWidth: 480 }}>
      <FilterStrip>
        <Typography variant="body2">{pick(globals["locale"], { en: "Filters sit here", ro: "Aici stau filtrele" })}</Typography>
      </FilterStrip>
    </Card>
  ),
};
