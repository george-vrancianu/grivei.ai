import type { Meta, StoryObj } from "@storybook/react-vite";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { SupplierSkeleton } from "./index.ts";

const meta = { title: "Domain/SupplierSkeleton", component: SupplierSkeleton } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

/** The ONRC and People row on a supplier's first load: real titles and figure labels, blocks for the values. */
export const Loading: Story = {
  render: (_args, { globals }) => {
    const locale = localeOf(globals["locale"]);
    return <SupplierSkeleton onrc={sampleCopy.onrcSection(locale)} people={sampleCopy.peopleSection(locale)} />;
  },
};
