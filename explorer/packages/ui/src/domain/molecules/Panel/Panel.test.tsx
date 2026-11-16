import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { STRIP_FILL } from "../FilterStrip/filterStrip.fill.ts";
import { Panel } from "./index.ts";

const part = (container: HTMLElement, name: string) => container.querySelector<HTMLElement>(`[data-panel-part="${name}"]`);

describe("Panel", () => {
  it("is a region named by its heading, or by `label` when given", () => {
    renderInUi(
      <>
        <Panel heading="Provenance">one</Panel>
        <Panel heading="Signals" label="Signals this Record belongs to">two</Panel>
      </>,
    );
    expect(screen.getByRole("region", { name: "Provenance" })).toHaveTextContent("one");
    expect(screen.getByRole("heading", { level: 3, name: "Provenance" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Signals this Record belongs to" })).toHaveTextContent("two");
  });

  it("shows the aside in the header strip, beside the heading", () => {
    const { container } = renderInUi(<Panel heading="Provenance" aside="3 sources">body</Panel>);
    expect(part(container, "header")).toHaveTextContent("Provenance");
    expect(part(container, "header")).toHaveTextContent("3 sources");
    expect(part(container, "body")).not.toHaveTextContent("3 sources");
  });

  it("takes header content beyond text, named by `label`", () => {
    renderInUi(
      <Panel heading={<><span data-testid="ring" />Rule one</>} label="Rule one">
        body
      </Panel>,
    );
    expect(screen.getByRole("region", { name: "Rule one" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 3 })).toContainElement(screen.getByTestId("ring"));
  });

  it("has no foot unless given one, and puts it after the body", () => {
    const { container, rerender } = renderInUi(<Panel heading="Records">rows</Panel>);
    expect(part(container, "foot")).toBeNull();
    rerender(<Panel heading="Records" foot="Showing 1–7 of 54">rows</Panel>);
    expect(part(container, "foot")).toHaveTextContent("Showing 1–7 of 54");
    expect(part(container, "body")!.compareDocumentPosition(part(container, "foot")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("pads the body, or leaves it flush for a list", () => {
    const { container, rerender } = renderInUi(<Panel heading="Records">rows</Panel>);
    expect(part(container, "body")).toHaveStyle({ padding: "16px" });
    rerender(<Panel heading="Records" flush>rows</Panel>);
    expect(part(container, "body")).not.toHaveStyle({ padding: "16px" });
  });

  it("draws the header and foot as strips: the strip fill and a hairline towards the body", () => {
    const { container } = renderInUi(<Panel heading="Records" foot="foot">rows</Panel>);
    for (const name of ["header", "foot"]) expect(part(container, name)).toHaveStyle({ backgroundColor: STRIP_FILL });
    expect(getComputedStyle(part(container, "header")!).borderBottomWidth).toBe("1px");
    expect(getComputedStyle(part(container, "foot")!).borderTopWidth).toBe("1px");
  });
});
