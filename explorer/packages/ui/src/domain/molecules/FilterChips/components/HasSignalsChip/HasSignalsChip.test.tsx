import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { HasSignalsChip } from "./index.ts";

const { signals } = sampleCopy.filterChips("en");

describe("HasSignalsChip", () => {
  it.each([[true, true], [undefined, false], [false, false]] as const)("hasSignals %s shows pressed %s", (hasSignals, pressed) => {
    render(<HasSignalsChip hasSignals={hasSignals} onToggle={() => {}} copy={signals} />);
    expect(screen.getByRole("group", { name: "Signals" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Has Signals", pressed })).toBeVisible();
  });

  it("toggles on click", async () => {
    const onToggle = vi.fn();
    render(<HasSignalsChip hasSignals={undefined} onToggle={onToggle} copy={signals} />);
    await userEvent.click(screen.getByRole("button", { name: "Has Signals" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
