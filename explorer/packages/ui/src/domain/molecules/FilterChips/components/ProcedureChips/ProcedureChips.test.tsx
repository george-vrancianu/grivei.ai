import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { ProcedureChips } from "./index.ts";

const copy = sampleCopy.filterChips("en").procedure;
const procedures = ["Achiziție directă", "Licitație deschisă"];

describe("ProcedureChips", () => {
  it("shows the procedures as published, several at once", () => {
    render(<ProcedureChips procedures={procedures} selected={["Licitație deschisă"]} onToggle={() => {}} copy={copy} />);
    expect(screen.getByRole("group", { name: "Procedure" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Licitație deschisă", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Achiziție directă", pressed: false })).toBeVisible();
  });

  it("reports the procedure clicked", async () => {
    const onToggle = vi.fn();
    render(<ProcedureChips procedures={procedures} selected={undefined} onToggle={onToggle} copy={copy} />);
    await userEvent.click(screen.getByRole("button", { name: "Achiziție directă" }));
    expect(onToggle).toHaveBeenCalledExactlyOnceWith("Achiziție directă");
  });

  it("says so when there is nothing to choose from", () => {
    render(<ProcedureChips procedures={[]} selected={undefined} onToggle={() => {}} copy={copy} />);
    expect(screen.getByText("No procedures to choose from.")).toBeVisible();
  });
});
