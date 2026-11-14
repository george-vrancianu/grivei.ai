import { fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { SourcePicker } from "./index.ts";

const copy = { label: "Source" };
const options = [{ id: "SEAP", label: "SEAP", count: "120 Records" }, { id: "ONRC", label: "ONRC", count: "40 registrations" }];

describe("SourcePicker", () => {
  it("lists every Source with its own count and presses the chosen one", () => {
    renderInUi(<SourcePicker options={options} selected="SEAP" onSelect={() => {}} copy={copy} />);
    expect(screen.getByRole("group", { name: "Source" })).toBeVisible();
    expect(screen.getByRole("button", { name: "SEAP · 120 Records" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "ONRC · 40 registrations" })).toHaveAttribute("aria-pressed", "false");
  });

  it("shows only the name of a Source that has no count (no query, loading, failed)", () => {
    renderInUi(<SourcePicker options={[{ id: "SEAP", label: "SEAP" }, { id: "ONRC", label: "ONRC" }]} selected="ONRC" onSelect={() => {}} copy={copy} />);
    expect(screen.getByRole("button", { name: "ONRC" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "SEAP" })).toBeVisible();
  });

  it("reports the Source clicked, and nothing for a click on the chosen one", () => {
    const onSelect = vi.fn();
    renderInUi(<SourcePicker options={options} selected="SEAP" onSelect={onSelect} copy={copy} />);
    fireEvent.click(screen.getByRole("button", { name: "SEAP · 120 Records" }));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "ONRC · 40 registrations" }));
    expect(onSelect).toHaveBeenCalledWith("ONRC");
  });
});
