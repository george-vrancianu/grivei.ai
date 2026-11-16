import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { color, radius } from "../../../theme/tokens.ts";
import { ToggleButton } from "../../../atoms/ToggleButton/index.ts";
import { ToggleButtonGroup } from "../../../atoms/ToggleButtonGroup/index.ts";
import { SegmentedTrack } from "./index.ts";

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

describe("SegmentedTrack", () => {
  it("is a well around the group: ground fill, strong edge, control radius, inset shadow, and no second border", () => {
    renderInUi(
      <SegmentedTrack>
        <ToggleButtonGroup exclusive aria-label="Pick" value="a">
          <ToggleButton value="a">A</ToggleButton>
        </ToggleButtonGroup>
      </SegmentedTrack>,
    );
    const group = screen.getByRole("group", { name: "Pick" });
    const track = group.parentElement!;
    expect(getComputedStyle(track).backgroundColor).toBe(rgb(color.bg));
    expect(getComputedStyle(track).borderTopColor).toBe(rgb(color.lineStrong));
    expect(getComputedStyle(track).borderTopLeftRadius).toBe(`${radius.control}px`);
    expect(getComputedStyle(track).boxShadow).toMatch(/\binset\b/);
    expect(getComputedStyle(group).borderTopWidth).toBe("0px");
    expect(screen.getByRole("button", { name: "A" }).parentElement).toBe(group);
  });
});
