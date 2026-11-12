import type { Meta, StoryObj } from "@storybook/react-vite";
import { FlowBubbles } from "./index.ts";

const meta = { title: "Domain/FlowLensMap/FlowBubbles" } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** Area proportional to money: 100, 25 and 4 units. */
export const Default: Story = {
  render: () => (
    <svg width={260} height={90} role="img" aria-label="Sample bubbles">
      <FlowBubbles
        bubbles={[
          { code: "A", x: 45, y: 45, r: 30, awarded: "10000" },
          { code: "B", x: 130, y: 45, r: 15, awarded: "2500" },
          { code: "C", x: 190, y: 45, r: 6, awarded: "400" },
        ]}
      />
    </svg>
  ),
};
