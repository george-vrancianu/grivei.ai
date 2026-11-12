import type { Meta, StoryObj } from "@storybook/react-vite";
import { arcShape } from "../../flowLensMap.utils.ts";
import { FlowArcs } from "./index.ts";

const meta = { title: "Domain/FlowLensMap/FlowArcs" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

const arc = (code: string, from: readonly [number, number], to: readonly [number, number], width: number, outward: boolean) => ({
  code, from: outward ? "HOME" : code, to: outward ? code : "HOME", awarded: "0", width, ...arcShape(from, to, 6, 6, width)!,
});

/** Into the home county (left), out of it (right); widths 2, 6 and 12. */
export const Default: Story = {
  render: () => (
    <svg width={420} height={160} role="img" aria-label="Sample arcs">
      <FlowArcs arcs={[arc("A", [190, 20], [190, 140], 2, false), arc("B", [20, 30], [190, 140], 6, false), arc("C", [20, 140], [190, 140], 12, false)]} />
      <FlowArcs arcs={[arc("D", [230, 140], [400, 30], 4, true), arc("E", [230, 140], [400, 140], 8, true)]} />
    </svg>
  ),
};
