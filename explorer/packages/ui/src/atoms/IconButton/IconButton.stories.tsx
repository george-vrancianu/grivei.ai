import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../workbench/index.ts";
import { IconButton } from "./index.ts";

const meta = {
  title: "Atoms/IconButton",
  component: IconButton,
  args: { "aria-label": "Close" },
} satisfies Meta<typeof IconButton>;
export default meta;
type Story = StoryObj<typeof meta>;

// The glyph is plain text here: icons are the app's concern, the accessible label is the point.
export const Default: Story = {
  render: (args, { globals }) => (
    <IconButton {...args} aria-label={pick(globals["locale"], { en: "Close", ro: "Închide" })}>×</IconButton>
  ),
};

export const Disabled: Story = {
  args: { disabled: true },
  render: (args, { globals }) => (
    <IconButton {...args} aria-label={pick(globals["locale"], { en: "Close", ro: "Închide" })}>×</IconButton>
  ),
};

export const Sizes: Story = {
  render: (_args, { globals }) => (
    <>
      {(["small", "medium", "large"] as const).map((size) => (
        <IconButton key={size} size={size} aria-label={pick(globals["locale"], { en: "Open details", ro: "Deschide detaliile" })}>+</IconButton>
      ))}
    </>
  ),
};
