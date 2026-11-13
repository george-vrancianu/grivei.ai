import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { ToggleButton } from "./index.ts";

const meta = { title: "Atoms/ToggleButton", component: ToggleButton } satisfies Meta<typeof ToggleButton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { value: "a" }, render: (args, { globals }) => <ToggleButton {...args} value="a">{pick(globals["locale"], { en: "Authority county", ro: "Județul autorității" })}</ToggleButton> };
export const Selected: Story = { args: { value: "a" }, render: (args, { globals }) => <ToggleButton {...args} selected value="a">{pick(globals["locale"], { en: "Authority county", ro: "Județul autorității" })}</ToggleButton> };
export const Disabled: Story = { args: { value: "a" }, render: (args, { globals }) => <ToggleButton {...args} disabled value="a">{pick(globals["locale"], { en: "Supplier county", ro: "Județul furnizorului" })}</ToggleButton> };
