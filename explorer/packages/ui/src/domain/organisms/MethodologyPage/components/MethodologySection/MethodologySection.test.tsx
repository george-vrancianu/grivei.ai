import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { MethodologySection, withAmounts } from "./index.ts";

const copy = {
  heading: "Suspect values",
  paragraphs: ["Prose."],
  items: ["A plain item.", withAmounts((a, b) => `The cap is ${a}, or ${b} for works.`, ["13506000", "45020000"])],
};

describe("MethodologySection", () => {
  it("sets every amount in a list item in the money variant, inside the sentence", () => {
    renderInUi(<MethodologySection id="suspect-values" locale="en" copy={copy} />);
    const item = screen.getByText(/^The cap is/);
    expect(item.textContent?.replace(/\s/g, " ")).toBe("The cap is RON 135,060, or RON 450,200 for works.");
    const amounts = [...item.querySelectorAll("span")];
    expect(amounts.map((a) => a.textContent?.replace(/\s/g, " "))).toEqual(["RON 135,060", "RON 450,200"]);
    for (const amount of amounts) {
      const style = getComputedStyle(amount);
      expect(style.fontFamily).toContain("IBM Plex Mono");
      expect(style.fontVariantNumeric).toBe("tabular-nums");
    }
  });

  it("leaves plain text as it is, and formats in Romanian", () => {
    renderInUi(<MethodologySection id="x" locale="ro" copy={copy} />);
    expect(screen.getByText("A plain item.")).toBeVisible();
    expect(screen.getByText(/^The cap is/).textContent?.replace(/\s/g, " ")).toBe("The cap is 135.060 RON, or 450.200 RON for works.");
  });
});
