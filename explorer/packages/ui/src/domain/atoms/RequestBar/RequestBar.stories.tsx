import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../../../atoms/Box/index.ts";
import { RequestBar } from "./index.ts";

const meta = { title: "Domain/RequestBar", component: RequestBar } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** Inside a positioned frame standing in for the sticky header. */
const frame = (busy: boolean) => (
  <Box sx={{ position: "relative", height: 56, borderBottom: 1, borderColor: "divider", transform: "translateZ(0)" }}>
    <RequestBar busy={busy} />
  </Box>
);

export const Busy: Story = { render: () => frame(true) };
export const Idle: Story = { render: () => frame(false) };
