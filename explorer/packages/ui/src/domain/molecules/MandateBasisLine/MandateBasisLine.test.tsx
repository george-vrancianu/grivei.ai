import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { mandateBasisCopy } from "../../samples/leadership.ts";
import type { Locale } from "../../../theme/index.ts";
import { MandateBasisLine } from "./index.ts";

const base = { independent: false, memberParties: [] as string[], basis: "FINAL_MINUTES" as const, electionDate: "2024-06-09", dataThrough: "2024-06-09" };
const show = (mandate: Parameters<typeof MandateBasisLine>[0]["mandate"], locale: Locale = "en") => renderInUi(<MandateBasisLine mandate={mandate} locale={locale} copy={mandateBasisCopy[locale]} />, locale);

describe("MandateBasisLine", () => {
  it("names the AEP file and the election", () => {
    show(base);
    expect(screen.getByText("AEP final minutes, election of 9 June 2024")).toBeVisible();
  });

  it("says an independent is not a party, and names an alliance's member parties", () => {
    show({ ...base, independent: true });
    expect(screen.getByText(/Independent \(not a party\) · AEP final minutes/)).toBeVisible();
  });

  it("lists an alliance's members, and for the one-off 2025 file states its data-through day, in Romanian too", () => {
    show({ ...base, memberParties: ["PARTIDUL USR", "PLUS"], basis: "PARTIAL_MINUTES", electionDate: "2025-12-07", dataThrough: "2025-12-09" }, "ro");
    expect(screen.getByText(/alianță; partide membre: PARTIDUL USR, PLUS · alegeri parțiale AEP din 7 decembrie 2025.*9 decembrie 2025/)).toBeVisible();
  });
});
