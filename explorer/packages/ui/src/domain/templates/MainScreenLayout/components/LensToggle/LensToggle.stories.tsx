import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { localeOf, sampleCopy } from "../../../../samples/copy.ts";
import { LensToggle } from "./index.ts";

const meta = { title: "Domain/MainScreenLayout/LensToggle" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

export const BothLenses: Story = {
  render: (_args, { globals }) => {
    const { lens } = sampleCopy.mainScreenLayout(localeOf(globals["locale"]));
    return (
      <Stack spacing={2}>
        <LensToggle lens="money" onLensChange={() => {}} copy={lens} />
        <LensToggle lens="coverage" onLensChange={() => {}} copy={lens} />
      </Stack>
    );
  },
};
