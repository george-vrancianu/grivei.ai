import type { Meta, StoryObj } from "@storybook/react-vite";
import { CountPill } from "./index.ts";

const meta = { title: "Domain/CountPill", component: CountPill } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** An exact count. */
export const Exact: Story = { render: () => <CountPill>1,817</CountPill> };
/** An estimate leads with ≈. */
export const Estimated: Story = { render: () => <CountPill>≈ 2.4M</CountPill> };
