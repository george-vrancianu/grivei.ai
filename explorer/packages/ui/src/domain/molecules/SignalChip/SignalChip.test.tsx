import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { SignalChip } from "./index.ts";

describe("the Signal chip base", () => {
  it("is a link with the amber ring", () => {
    renderInUi(<SignalChip href="/x#signals" label="Chip" />);
    expect(screen.getByRole("link", { name: "Chip" })).toHaveAttribute("href", "/x#signals");
    expect(document.querySelector("[data-signal-mark]")).not.toBeNull();
  });
});
