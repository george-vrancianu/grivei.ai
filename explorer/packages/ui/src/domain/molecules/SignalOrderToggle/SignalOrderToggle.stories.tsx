import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { SignalOrderToggle } from "./index.ts";

const meta = { title: "Domain/SignalOrderToggle", component: SignalOrderToggle } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The default: Signals newest first, "by date" pressed. */
export const ByDate: Story = {
  render: (_args, { globals }) => <SignalOrderToggle value="DATE_DESC" onChange={() => {}} copy={sampleCopy.signalOrder(localeOf(globals["locale"]))} />,
};
/** Signals largest first, "by RON" pressed. */
export const ByRon: Story = {
  render: (_args, { globals }) => <SignalOrderToggle value="VALUE_DESC" onChange={() => {}} copy={sampleCopy.signalOrder(localeOf(globals["locale"]))} />,
};
