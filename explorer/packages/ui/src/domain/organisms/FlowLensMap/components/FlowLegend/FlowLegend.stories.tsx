import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { FlowLegend } from "./index.ts";
import { onPanel } from "../../../../../workbench/index.ts";

const meta = { title: "Domain/FlowLensMap/FlowLegend", decorators: [onPanel] } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const Supplier: Story = {
  render: (_args, { globals }) => <FlowLegend role="supplier" hasHome copy={sampleCopy.flowLensMap(localeOf(globals["locale"])).legend} />,
};
export const Authority: Story = {
  render: (_args, { globals }) => <FlowLegend role="authority" hasHome copy={sampleCopy.flowLensMap(localeOf(globals["locale"])).legend} />,
};
/** No home county: no arcs, so no arc, arrow or home entries. */
export const NoHome: Story = {
  render: (_args, { globals }) => <FlowLegend role="authority" hasHome={false} copy={sampleCopy.flowLensMap(localeOf(globals["locale"])).legend} />,
};
