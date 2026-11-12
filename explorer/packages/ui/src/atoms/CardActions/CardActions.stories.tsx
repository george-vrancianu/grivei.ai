import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { Button } from "../Button/index.ts";
import { Card } from "../Card/index.ts";
import { CardActions } from "./index.ts";

const meta = { title: "Atoms/CardActions", component: CardActions } satisfies Meta<typeof CardActions>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => (
    <Card><CardActions {...args}>
      <Button size="small">{pick(globals["locale"], { en: "Open", ro: "Deschide" })}</Button>
      <Button size="small">{pick(globals["locale"], { en: "Share", ro: "Distribuie" })}</Button>
    </CardActions></Card>
  ),
};

export const WithoutSpacing: Story = {
  render: (args, { globals }) => (
    <Card><CardActions {...args} disableSpacing><Button size="small">{pick(globals["locale"], { en: "Open", ro: "Deschide" })}</Button></CardActions></Card>
  ),
};
