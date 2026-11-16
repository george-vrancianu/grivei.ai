import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../Stack/index.ts";
import { Skeleton } from "./index.ts";

const meta = { title: "Atoms/Skeleton", component: Skeleton } satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Block: Story = { render: (args) => <Skeleton aria-hidden="true" variant="rounded" width={240} height={40} {...args} /> };

export const Shapes: Story = {
  render: () => (
    <Stack spacing={1.5} aria-hidden="true">
      <Skeleton variant="rounded" width={360} height={40} />
      <Skeleton variant="rounded" width={72} height={22} />
      <Skeleton variant="rounded" width={34} height={18} sx={{ borderRadius: "10px" }} />
      <Skeleton variant="rounded" width={104} height={28} sx={{ borderRadius: "14px" }} />
    </Stack>
  ),
};
