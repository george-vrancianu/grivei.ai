import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { FilterBarRow } from "./index.ts";

/** The CSS emotion generated for the element's classes: every rule that mentions one of them, media queries included. */
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

describe("FilterBarRow", () => {
  const setup = () => {
    renderInUi(
      <FilterBarRow>
        <button>Signals</button>
        <button>Year</button>
      </FilterBarRow>,
    );
    return { scroller: screen.getByTestId("filter-bar-scroller"), fade: screen.getByTestId("filter-bar-fade") };
  };

  it("keeps the controls in order, the first one first", () => {
    const { scroller } = setup();
    expect(Array.from(scroller.children).map((child) => child.textContent)).toEqual(["Signals", "Year"]);
  });

  it("is one row that scrolls sideways below md, and wraps from md up", () => {
    const { scroller } = setup();
    const css = cssFor(scroller);
    expect(css).toMatch(/flex-wrap: nowrap/);
    expect(css).toMatch(/overflow-x: auto/);
    expect(css).toMatch(/@media \(min-width: 900px\)[^}]*flex-wrap: wrap/);
    expect(css).toMatch(/@media \(min-width: 900px\)[^}]*overflow-x: visible/);
  });

  it("fades the right edge, outside the scroller so it stays put, below md only", () => {
    const { scroller, fade } = setup();
    expect(scroller).not.toContainElement(fade);
    expect(fade).toHaveAttribute("aria-hidden", "true");
    const css = cssFor(fade);
    expect(css).toMatch(/position: absolute/);
    expect(css).toMatch(/right: 0/);
    expect(css).toMatch(/pointer-events: none/);
    expect(css).toMatch(/linear-gradient\(to right/);
    expect(css).toMatch(/display: block/);
    expect(css).toMatch(/@media \(min-width: 900px\)[^}]*display: none/);
  });
});
