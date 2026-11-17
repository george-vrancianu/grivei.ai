import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { PanelPair } from "./index.ts";

describe("PanelPair", () => {
  it("renders both panels, the wide one first", () => {
    renderInUi(<PanelPair wide={<p>wide</p>} narrow={<p>narrow</p>} />);
    const [first, second] = screen.getAllByText(/wide|narrow/);
    expect(first).toHaveTextContent("wide");
    expect(second).toHaveTextContent("narrow");
  });

  it("renders a lone panel on its own", () => {
    renderInUi(<PanelPair narrow={<p>narrow</p>} />);
    expect(screen.getByText("narrow")).toBeVisible();
    expect(screen.queryByText("wide")).toBeNull();
  });
});
