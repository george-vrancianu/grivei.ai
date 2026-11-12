import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChipGroup } from "./index.ts";

describe("ChipGroup", () => {
  it("names the group with its caption", () => {
    render(<ChipGroup label="Channel"><button type="button">Contract</button></ChipGroup>);
    const group = screen.getByRole("group", { name: "Channel" });
    expect(group).toContainElement(screen.getByRole("button", { name: "Contract" }));
    expect(screen.getByText("Channel")).toBeVisible();
  });
});
