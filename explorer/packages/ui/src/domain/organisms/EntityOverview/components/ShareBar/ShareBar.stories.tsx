import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { ShareBar } from "./index.ts";

const meta = { title: "Domain/EntityOverview/ShareBar", component: ShareBar } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The same bar at 100%, 18.8%, 2.5% and with no share to tell (a zero total). */
export const Shares: Story = {
  render: () => (
    <Stack spacing={1.5} sx={{ maxWidth: 360 }}>
      <ShareBar share={1} />
      <ShareBar share={0.188} />
      <ShareBar share={0.025} />
      <ShareBar share={null} />
    </Stack>
  ),
};
