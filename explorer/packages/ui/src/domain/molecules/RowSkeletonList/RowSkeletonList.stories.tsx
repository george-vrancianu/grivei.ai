import type { Meta, StoryObj } from "@storybook/react-vite";
import { RowSkeletonList } from "./index.ts";

const meta = { title: "Domain/RowSkeletonList", component: RowSkeletonList } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** Eight blocks shaped like entity rows, fading down; no text, so the same in both languages. */
export const Typical: Story = { render: () => <RowSkeletonList /> };
/** Below 600 px the chip and the amount wrap under the name. */
export const Phone: Story = { ...Typical, globals: { viewport: { value: "mobile2", isRotated: false } } };
