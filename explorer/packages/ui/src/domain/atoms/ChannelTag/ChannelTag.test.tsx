import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { ChannelTag } from "./index.ts";

const labels = { DIRECT_PURCHASE: "Direct purchase", CONTRACT: "Contract" };

describe("ChannelTag", () => {
  it("shows the label of the channel", () => {
    renderInUi(<ChannelTag channel="DIRECT_PURCHASE" labels={labels} />);
    expect(screen.getByText("Direct purchase")).toBeVisible();
  });

  it("lets a long label wrap instead of being cut off", () => {
    renderInUi(<ChannelTag channel="CONTRACT" labels={{ ...labels, CONTRACT: "A very long label for a narrow screen" }} />);
    const tag = screen.getByText("A very long label for a narrow screen");
    expect(tag).toHaveStyle({ overflowWrap: "anywhere" });
    expect(tag).not.toHaveStyle({ whiteSpace: "nowrap" });
  });
});
