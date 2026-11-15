import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { InsetFigure } from "./index.ts";

describe("InsetFigure", () => {
  it("reads as the label then the value", () => {
    renderInUi(<InsetFigure label="Records">2,558</InsetFigure>);
    expect(screen.getByText("Records").closest("p")).toHaveTextContent("Records 2,558");
  });
  it("is a link, named by what it reads, when it has somewhere to go", () => {
    renderInUi(<InsetFigure label="Suspect values left out" href="/explore/?badge=SUSPECT_VALUE">3</InsetFigure>);
    expect(screen.getByRole("link", { name: "Suspect values left out 3" })).toHaveAttribute("href", "/explore/?badge=SUSPECT_VALUE");
  });
  it("is plain text without an href", () => {
    renderInUi(<InsetFigure label="Records">1</InsetFigure>);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
