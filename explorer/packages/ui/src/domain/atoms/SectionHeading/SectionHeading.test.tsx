import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { SectionHeading } from "./index.ts";

describe("SectionHeading", () => {
  it("is a level 2 heading with the anchor it is given", () => {
    renderInUi(<SectionHeading id="x">Signals</SectionHeading>);
    expect(screen.getByRole("heading", { level: 2, name: "Signals" })).toHaveAttribute("id", "x");
  });
});
