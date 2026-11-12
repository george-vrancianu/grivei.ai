import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { LinearProgress } from "./index.ts";

const meta = { title: "Atoms/LinearProgress", component: LinearProgress } satisfies Meta<typeof LinearProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Determinate: Story = {
  render: (args, { globals }) => <LinearProgress {...args} variant="determinate" value={64} aria-label={pick(globals["locale"], { en: "Share", ro: "Pondere" })} />,
};

export const Indeterminate: Story = {
  render: (args, { globals }) => <LinearProgress {...args} aria-label={pick(globals["locale"], { en: "Loading", ro: "Se încarcă" })} />,
};
