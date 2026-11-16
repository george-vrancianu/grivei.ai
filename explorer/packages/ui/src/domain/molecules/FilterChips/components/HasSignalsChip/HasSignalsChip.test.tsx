import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { color } from "../../../../../theme/tokens.ts";
import { sampleCopy } from "../../../../samples/copy.ts";
import { HasSignalsChip } from "./index.ts";

/** The CSS emotion generated for the element's classes, media queries included. */
function cssFor(element: HTMLElement): string {
  const classes = [...element.classList];
  const rules: string[] = [];
  const visit = (list: CSSRuleList, prefix: string) => {
    for (const rule of Array.from(list)) {
      if (rule instanceof CSSMediaRule) visit(rule.cssRules, `@media ${rule.conditionText} `);
      else if (classes.some((name) => rule.cssText.includes(`.${name}`))) rules.push(prefix + rule.cssText);
    }
  };
  for (const sheet of Array.from(document.styleSheets)) visit(sheet.cssRules, "");
  return rules.join("\n").replace(/\s+/g, " ");
}

/** jsdom reports colours as `rgb(...)`; tokens are hex. */
const hex = (value: string) => `rgb(${[1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16)).join(", ")})`;

const { signals } = sampleCopy.filterChips("en");

describe("HasSignalsChip", () => {
  it.each([[true, true], [undefined, false], [false, false]] as const)("hasSignals %s shows pressed %s", (hasSignals, pressed) => {
    render(<HasSignalsChip hasSignals={hasSignals} onToggle={() => {}} copy={signals} />);
    expect(screen.getByRole("button", { name: "Has Signals", pressed })).toBeVisible();
  });

  it("toggles on click", async () => {
    const onToggle = vi.fn();
    render(<HasSignalsChip hasSignals={undefined} onToggle={onToggle} copy={signals} />);
    await userEvent.click(screen.getByRole("button", { name: "Has Signals" }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  const switchFor = (hasSignals: boolean | undefined) => {
    renderInUi(<HasSignalsChip hasSignals={hasSignals} onToggle={() => {}} copy={signals} />);
    return screen.getByRole("button", { name: "Has Signals" });
  };

  it("draws the amber ring and a switch track, both decoration", () => {
    const button = switchFor(undefined);
    expect(button.querySelector("[data-signal-mark]")).not.toBeNull();
    expect(button.querySelector("[data-switch-track]")).toHaveAttribute("aria-hidden", "true");
  });

  it("is a 44 px pill with a Signal-line border off, and an amber tint with an accent border and no halo on", () => {
    const off = getComputedStyle(switchFor(undefined));
    expect(off.minHeight).toBe("44px");
    expect(off.borderRadius).toBe("22px");
    expect(off.borderColor.toLowerCase()).toBe(hex(color.signalLine));
    cleanup();
    const on = getComputedStyle(switchFor(true));
    expect(on.backgroundColor.replace(/\s/g, "")).toBe(color.accentTint.replace(/\s/g, "").replace(",.", ",0."));
    expect(on.borderColor.toLowerCase()).toBe(hex(color.accent));
    expect(on.boxShadow).not.toContain("inset 0 0 0 1px");
    expect(on.boxShadow).not.toContain("3px");
  });

  it("moves the knob and recolours the track with the state", () => {
    const knob = () => screen.getByRole("button").querySelector<HTMLElement>("[data-switch-knob]")!;
    switchFor(undefined);
    expect(getComputedStyle(knob()).left).toBe("3px");
    cleanup();
    switchFor(true);
    expect(getComputedStyle(knob()).left).toBe("17px");
  });

  it("stops its transitions under prefers-reduced-motion", () => {
    const button = switchFor(true);
    const css = [button.querySelector<HTMLElement>("[data-switch-track]")!, button.querySelector<HTMLElement>("[data-switch-knob]")!].map(cssFor);
    for (const rules of css) {
      expect(rules).toContain("transition");
      expect(rules).toMatch(/@media \(prefers-reduced-motion: reduce\)[^}]*transition: none/);
    }
  });
});
