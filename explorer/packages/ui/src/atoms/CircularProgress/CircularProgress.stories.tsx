import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { CircularProgress } from "./index.ts";

const meta = { title: "Atoms/CircularProgress", component: CircularProgress } satisfies Meta<typeof CircularProgress>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args, { globals }) => <CircularProgress {...args} aria-label={pick(globals["locale"], { en: "Loading", ro: "Se încarcă" })} />,
};

export const Small: Story = {
  render: (args, { globals }) => <CircularProgress {...args} size={16} aria-label={pick(globals["locale"], { en: "Loading", ro: "Se încarcă" })} />,
};
