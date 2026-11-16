import { fireEvent, screen } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
import { SourcePicker } from "./index.ts";

const rgb = (hex: string) => `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

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

  it("sits on the well track when it stands on a panel", () => {
    renderInUi(<SourcePicker options={options} selected="SEAP" onSelect={() => {}} copy={copy} />);
    const group = screen.getByRole("group", { name: "Source" });
    expect(getComputedStyle(group.parentElement!).borderTopColor).toBe(rgb(color.lineStrong));
    expect(getComputedStyle(group.parentElement!).boxShadow).toMatch(/\binset\b/);
    expect(screen.getByRole("button", { name: "SEAP · 120 Records" }).parentElement).toBe(group);
  });

  describe("inline, in the search box", () => {
    afterEach(() => vi.unstubAllGlobals());
    const screenIs = (narrow: boolean) => vi.stubGlobal("matchMedia", (query: string) => ({ matches: narrow, media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }));

    it("keeps the segments on a wide screen", () => {
      screenIs(false);
      renderInUi(<SourcePicker inline options={options} selected="SEAP" onSelect={() => {}} copy={copy} />);
      expect(screen.getByRole("button", { name: "SEAP · 120 Records" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("keeps no second track inside the search field, which is already a well", () => {
      screenIs(false);
      renderInUi(<SourcePicker inline options={options} selected="SEAP" onSelect={() => {}} copy={copy} />);
      expect(getComputedStyle(screen.getByRole("group", { name: "Source" }).parentElement!).boxShadow).not.toMatch(/\binset\b/);
    });

    it("becomes a dropdown on a narrow screen, with the counts in its options, and reports the Source picked", () => {
      screenIs(true);
      const onSelect = vi.fn();
      renderInUi(<SourcePicker inline options={options} selected="SEAP" onSelect={onSelect} copy={copy} />);
      const select = screen.getByRole("combobox", { name: "Source" });
      expect(select).toHaveValue("SEAP");
      expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["SEAP · 120 Records", "ONRC · 40 registrations"]);
      expect(screen.queryByRole("button")).toBeNull();
      fireEvent.change(select, { target: { value: "ONRC" } });
      expect(onSelect).toHaveBeenCalledWith("ONRC");
    });

    it("keeps the segments outside the search box, whatever the screen", () => {
      screenIs(true);
      renderInUi(<SourcePicker options={options} selected="SEAP" onSelect={() => {}} copy={copy} />);
      expect(screen.getByRole("group", { name: "Source" })).toBeVisible();
    });
  });
});
