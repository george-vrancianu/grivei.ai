import type { Meta, StoryObj } from "@storybook/react-vite";
import { ToggleButton } from "../../../atoms/ToggleButton/index.ts";
import { ToggleButtonGroup } from "../../../atoms/ToggleButtonGroup/index.ts";
import { pick } from "../../../workbench/index.ts";
import { SegmentedTrack } from "./index.ts";

const meta = { title: "Domain/SegmentedTrack", component: SegmentedTrack } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj<Record<string, unknown>>;

/** The track alone, round a bare group: ground fill, strong edge, inset shadow, with the chosen segment in the selected state. Use `OptionToggle` for a real control. */
export const Track: Story = {
  render: (_args, { globals }) => {
    const [a, b] = pick(globals["locale"], { en: ["Money", "Coverage"], ro: ["Bani", "Acoperire"] });
    return (
      <SegmentedTrack>
        <ToggleButtonGroup exclusive aria-label={pick(globals["locale"], { en: "Choose one", ro: "Alege una" })} value="a">
          <ToggleButton value="a">{a}</ToggleButton>
          <ToggleButton value="b">{b}</ToggleButton>
        </ToggleButtonGroup>
      </SegmentedTrack>
    );
  },
};
