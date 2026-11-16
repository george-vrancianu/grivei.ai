import type { Meta, StoryObj } from "@storybook/react-vite";
import { PillSkeleton } from "./index.ts";

const meta = { title: "Domain/PillSkeleton", component: PillSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The block that stands in for a count pill while the count loads; it has no text, so it is the same in both languages. */
export const Typical: Story = { render: () => <span>Suppliers <PillSkeleton /></span> };
