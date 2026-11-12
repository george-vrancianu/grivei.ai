import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { SideToggle } from "./index.ts";

const meta = { title: "Domain/MoneyLensMap/SideToggle" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const BothSides: Story = {
  render: (_args, { globals }) => {
    const { side } = sampleCopy.moneyLensMap(localeOf(globals["locale"]));
    return (
      <Stack spacing={2}>
        <SideToggle side="AUTHORITY" onSideChange={() => {}} copy={side} />
        <SideToggle side="SUPPLIER" onSideChange={() => {}} copy={side} />
      </Stack>
    );
  },
};
