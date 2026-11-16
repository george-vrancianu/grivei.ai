import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../../../atoms/Card/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { pick } from "../../../workbench/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { TotalSkeleton } from "./index.ts";

const meta = { title: "Domain/TotalSkeleton", component: TotalSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The Total on first load, in its panel: real labels, blocks for the values. */
export const FirstLoad: Story = {
  render: (_args, { globals }) => (
    <Card sx={{ px: 2.5, py: 2.25 }}>
      <TotalSkeleton
        labels={sampleCopy.total(localeOf(globals["locale"])).figures}
        heading={<Typography variant="meta" component="h2">{pick(globals["locale"], { en: "Total awarded", ro: "Total atribuit" })}</Typography>}
      />
    </Card>
  ),
};

export const Phone: Story = { ...FirstLoad, globals: { viewport: { value: "mobile2", isRotated: false } } };
