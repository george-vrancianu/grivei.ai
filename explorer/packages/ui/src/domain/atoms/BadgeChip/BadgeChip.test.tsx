import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectTypeOf } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import type { RecordBadge } from "../../types.ts";
import { BadgeChip, RECORD_BADGES, type BadgeCopy } from "./index.ts";

/** The enum as the contract's schema declares it. */
function schemaBadges(): string[] {
  const sdl = readFileSync(resolve(import.meta.dirname, "../../../../../contract/schema/schema.graphql"), "utf8");
  const body = /enum RecordBadge \{([^}]*)\}/.exec(sdl)![1]!;
  return body.replace(/#.*$/gm, "").trim().split(/\s+/);
}

describe("BadgeChip", () => {
  it("covers exactly the RecordBadge enum, in the type and at run time", () => {
    expectTypeOf<keyof BadgeCopy>().toEqualTypeOf<RecordBadge>();
    expect([...RECORD_BADGES].sort()).toEqual(schemaBadges().sort());
  });

  describe.each(["en", "ro"] as const)("in %s", (locale) => {
    const copy = sampleCopy.badges(locale);
    it.each(RECORD_BADGES)("%s has a label and an explanation, and shows its caveat on hover", async (badge) => {
      expect(copy[badge].label).not.toBe("");
      expect(copy[badge].explanation).not.toBe("");
      renderInUi(<BadgeChip badge={badge} copy={copy} />, locale);
      await userEvent.hover(screen.getByText(copy[badge].label));
      expect(await screen.findByRole("tooltip")).toHaveTextContent(copy[badge].explanation);
    });
  });

  it("is keyboard reachable and describes itself by its caveat", async () => {
    const copy = sampleCopy.badges("en");
    renderInUi(<BadgeChip badge="SUSPECT_VALUE" copy={copy} />);
    await userEvent.tab();
    expect(screen.getByText("Suspect value").closest("[tabindex]")).toHaveFocus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent(copy.SUSPECT_VALUE.explanation);
  });
});
