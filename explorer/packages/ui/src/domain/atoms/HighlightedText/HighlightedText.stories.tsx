import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "../../../atoms/Stack/index.ts";
import { HighlightedText } from "./index.ts";

const meta = { title: "Domain/HighlightedText", component: HighlightedText } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

export const OneRange: Story = {
  render: () => <HighlightedText text="Deszăpezire străzi, sezon rece 2023-2024" highlights={[[0, 10]]} />,
};
export const SeveralRanges: Story = {
  render: () => <HighlightedText text="Servicii de întreținere spații verzi (1)" highlights={[[24, 30], [31, 36]]} />,
};
export const NoRanges: Story = { render: () => <HighlightedText text="Reabilitare pod peste râul Olt" highlights={[]} /> };
/** Overlapping, unsorted and out-of-bounds ranges, which the API should not send but the display survives. */
export const MessyRanges: Story = {
  render: () => (
    <Stack>
      <HighlightedText text="Șantier școală înființare" highlights={[[8, 14], [0, 7], [3, 9], [20, 99]]} />
    </Stack>
  ),
};
