import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { SignalMark } from "./index.ts";

const meta = { title: "Domain/SignalMark", component: SignalMark } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The two sizes: 12 px for a card heading, 8 px inside a chip. */
export const Sizes: Story = {
  render: () => (
    <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <SignalMark />
      <SignalMark size="small" />
    </Stack>
  ),
};
