import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { FlowCaption } from "./index.ts";

const meta = { title: "Domain/FlowLensMap/FlowCaption" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const caption = (globals: Record<string, unknown>) => sampleCopy.flowLensMap(localeOf(globals["locale"])).caption;

export const Supplier: Story = { render: (_args, { globals }) => <FlowCaption role="supplier" homeName="Cluj" localOnly={false} copy={caption(globals)} /> };
export const Authority: Story = { render: (_args, { globals }) => <FlowCaption role="authority" homeName="Brașov" localOnly={false} copy={caption(globals)} /> };
export const LocalOnly: Story = { render: (_args, { globals }) => <FlowCaption role="supplier" homeName="Cluj" localOnly copy={caption(globals)} /> };
export const NoHome: Story = { render: (_args, { globals }) => <FlowCaption role="authority" homeName={null} localOnly={false} copy={caption(globals)} /> };
