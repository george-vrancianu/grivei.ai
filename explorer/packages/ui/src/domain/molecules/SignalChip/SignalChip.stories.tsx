import type { Meta, StoryObj } from "@storybook/react-vite";
import { SignalChip } from "./index.ts";

const meta = { title: "Domain/SignalChip", component: SignalChip } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The shared base of the Signal chips: amber ring, outlined, a link. */
export const Default: Story = { render: () => <SignalChip href="/explore/authority/1000017#signals" label="Signal chip" /> };
