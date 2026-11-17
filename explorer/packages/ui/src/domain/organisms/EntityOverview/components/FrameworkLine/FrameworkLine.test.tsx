import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityManyCounterpartiesOverview, emptyOverview } from "../../../../samples/fixtureData.ts";
import { FrameworkLine } from "./index.ts";

const show = (frameworks: typeof emptyOverview.overview.frameworks, locale: "en" | "ro" = "en") =>
  renderInUi(<FrameworkLine frameworks={frameworks} locale={locale} copy={sampleCopy.entityOverview(locale).frameworks} />, locale);

const figure = (label: string) => screen.getByText(label).closest("p")!;

describe("FrameworkLine", () => {
  it("shows the count, the ceilings (not summed) and the subsequent contracts reported with their share of the ceilings, and says ceilings are not in the total", () => {
    show(authorityManyCounterpartiesOverview.overview.frameworks);
    expect(screen.getByRole("region", { name: "Framework agreements" })).toBeVisible();
    expect(within(figure("Agreements")).getByText("4")).toBeVisible();
    expect(within(figure("Ceilings")).getByText("RON 100,000,000")).toBeVisible();
    expect(within(figure("Ceilings")).getByText("not summed")).toBeVisible();
    expect(within(figure("Subsequent contracts")).getByText("RON 112,400,000")).toBeVisible();
    // the share is written as it is, past 100% too (the bar stops at full)
    expect(within(figure("Subsequent contracts")).getByText("112.4% of the ceilings")).toBeVisible();
    expect(screen.getByText(/not in the total/)).toBeVisible();
  });

  it("says the share in Romanian, with its decimal comma", () => {
    show({ count: 3, ceilings: "100000000", subsequentReported: "18200000" }, "ro");
    expect(within(figure("Contracte subsecvente")).getByText(/^18,2\s%\sdin plafoane$/)).toBeVisible();
    expect(within(figure("Plafoane")).getByText("neadunate")).toBeVisible();
  });

  it("tells no share when the ceilings are blank", () => {
    show({ count: 1, ceilings: "0", subsequentReported: "0" });
    expect(screen.queryByText(/of the ceilings/)).toBeNull();
  });

  it("is a sentence when there are no framework agreements", () => {
    show(emptyOverview.overview.frameworks);
    expect(screen.getByText("No framework agreements.")).toBeVisible();
    expect(screen.queryByText("Ceilings")).toBeNull();
  });
});
