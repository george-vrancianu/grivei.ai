import type { Meta, StoryObj } from "@storybook/react-vite";
import { pick } from "../../../workbench/index.ts";
import { CountPill } from "./index.ts";

const meta = { title: "Domain/CountPill", component: CountPill } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** An exact count. */
export const Exact: Story = { render: (_args, { globals }) => <CountPill>{pick(globals["locale"], { en: "1,817", ro: "1.817" })}</CountPill> };
/** An estimate leads with ≈. */
export const Estimated: Story = { render: (_args, { globals }) => <CountPill>{pick(globals["locale"], { en: "≈ 2.4M", ro: "≈ 2,4 M" })}</CountPill> };
