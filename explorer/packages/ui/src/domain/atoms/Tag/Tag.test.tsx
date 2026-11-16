import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { Tag } from "./index.ts";

describe("Tag", () => {
  it("shows its label as text, not as a button or a status", () => {
    renderInUi(<Tag>SEAP counterparty</Tag>);
    expect(screen.getByText("SEAP counterparty")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("lets a long label wrap instead of being cut off", () => {
    renderInUi(<Tag>A very long label for a narrow screen</Tag>);
    const tag = screen.getByText("A very long label for a narrow screen");
    expect(tag).toHaveStyle({ overflowWrap: "anywhere" });
    expect(tag).not.toHaveStyle({ whiteSpace: "nowrap" });
  });
});
