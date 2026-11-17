import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
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
  it("reads a note after the value, and inside the link when there is one", () => {
    renderInUi(
      <>
        <InsetFigure label="Records" note="over 12 months">2,558</InsetFigure>
        <InsetFigure label="Suspect" href="/x" note="not counted">3</InsetFigure>
      </>,
    );
    expect(screen.getByText("Records").closest("p")).toHaveTextContent("Records 2,558 over 12 months");
    expect(screen.getByRole("link", { name: "Suspect 3 not counted" })).toBeVisible();
  });
  it("is a pressed-state toggle when it has onSelect, and calls it on a click", async () => {
    const onSelect = vi.fn();
    const { rerender } = renderInUi(<InsetFigure label="No county" onSelect={onSelect}>3</InsetFigure>);
    const button = screen.getByRole("button", { name: "No county 3" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledTimes(1);
    rerender(<InsetFigure label="No county" onSelect={onSelect} selected>3</InsetFigure>);
    expect(screen.getByRole("button", { name: "No county 3", pressed: true })).toBeVisible();
  });
});
