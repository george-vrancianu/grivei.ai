import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { methodologyRates, sampleBaseRateCopy } from "../../samples/methodology.ts";
import type { SignalRuleBaseRateData } from "../../types.ts";
import { SignalRuleBaseRate } from "./index.ts";
import { formatBaseRate } from "./signalRuleBaseRate.utils.ts";

const rule = (over: Partial<SignalRuleBaseRateData> = {}): SignalRuleBaseRateData => ({
  slug: "OVER_CAP", window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.057, baseRateYear: 2024, dataThrough: "2024-11-30", ...over,
});
const show = (r: SignalRuleBaseRateData | null, locale: Locale = "en") =>
  renderInUi(<SignalRuleBaseRate status="ready" rule={r} locale={locale} copy={sampleBaseRateCopy(locale)} />, locale);

describe("the base-rate slot of a Signal rule", () => {
  it("shows the window, the rate as a percentage, its year and the data-through date", () => {
    show(rule());
    expect(screen.getByText("1 January 2021 to 30 November 2024")).toBeVisible();
    expect(screen.getByText("5.7% of contracting authorities had at least one in 2024.")).toBeVisible();
    expect(screen.getByText("Data through 30 November 2024")).toBeVisible();
  });

  it("formats in Romanian", () => {
    show(rule(), "ro");
    expect(screen.getByText("1 ianuarie 2021 – 30 noiembrie 2024")).toBeVisible();
    expect(screen.getByText(/^5,7\s?% dintre autoritățile contractante au avut cel puțin unul în 2024\.$/)).toBeVisible();
    expect(screen.getByText("Date până la 30 noiembrie 2024")).toBeVisible();
  });

  it("says no authority had one when the rate is zero, instead of 0%", () => {
    show(rule({ baseRate: 0 }));
    expect(screen.getByText("No contracting authority had one in 2024.")).toBeVisible();
    expect(screen.queryByText(/0%/)).toBeNull();
  });

  it("says the window has no start when it is open, and runs to the data-through date when it has no end", () => {
    show(rule({ window: { from: null, to: null }, dataThrough: "2024-10-31" }));
    expect(screen.getByText("From the first Record loaded to 31 October 2024")).toBeVisible();
  });

  it("never rounds a small rate down to zero", () => {
    expect(formatBaseRate(0.00004, "en")).toBe("<0.01%");
    expect(formatBaseRate(0.004, "en")).toBe("0.4%");
    expect(formatBaseRate(0.112, "ro").replace(/\s/g, "")).toBe("11,2%");
  });

  it("reads the fixture's four rules", () => {
    expect(methodologyRates("typical-after-backfill").map((r) => r.slug)).toEqual(["OVER_CAP", "SPLITTING", "FRAMEWORK_OVERRUN", "NO_PUBLICATION"]);
  });

  it.each([["loading"], ["error"]] as const)("says so while %s, with no figures", (status) => {
    renderInUi(<SignalRuleBaseRate status={status} locale="en" copy={sampleBaseRateCopy("en")} />, "en");
    expect(screen.getByRole("status")).toHaveTextContent(status === "loading" ? "Loading" : "could not be loaded");
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("says there is no figure when the answer has no entry for the rule", () => {
    show(null);
    expect(screen.getByRole("status")).toHaveTextContent("There is no national figure for this rule yet.");
  });
});
