import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { Panel } from "./index.ts";

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
});
