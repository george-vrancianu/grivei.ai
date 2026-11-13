import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { CopyLinkButton } from "./index.ts";

const meta = { title: "Domain/CopyLinkButton", component: CopyLinkButton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** Ready: nothing is said until the button is used. Click it to see the confirmation (or the failure, where the browser has no clipboard). */
export const Ready: Story = {
  render: (_args, { globals }) => <CopyLinkButton url="https://grivei.ai/explore/record/CAN1145000" copy={sampleCopy.copyLink(localeOf(globals["locale"]))} />,
};
