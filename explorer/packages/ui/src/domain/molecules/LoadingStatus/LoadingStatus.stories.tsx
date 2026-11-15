import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { LoadingStatus } from "./index.ts";

const meta = { title: "Domain/LoadingStatus", component: LoadingStatus } satisfies Meta<typeof LoadingStatus>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: { label: "Loading…" },
  render: (args, { globals }) => <LoadingStatus {...args} label={pick(globals["locale"], { en: "Loading…", ro: "Se încarcă…" })} />,
};
