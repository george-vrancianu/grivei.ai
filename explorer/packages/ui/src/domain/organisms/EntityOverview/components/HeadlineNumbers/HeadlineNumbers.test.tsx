import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { emptyOverview, supplierOverview } from "../../../../samples/fixtureData.ts";
import { HeadlineNumbers } from "./index.ts";

const show = (overview: typeof supplierOverview.overview, locale: "en" | "ro" = "en") =>
  renderInUi(
    <HeadlineNumbers overview={overview} locale={locale} copy={sampleCopy.entityOverview(locale).headline} methodologyHref="/m" suspectHref="/s" />,
    locale,
  );

describe("HeadlineNumbers", () => {
  it("shows the total with what it left out, the counterparties with the top share, the direct-purchase share and the Signals", () => {
    show(supplierOverview.overview);
    const items = within(screen.getByRole("list", { name: "Headline numbers" })).getAllByRole("listitem");
    expect(within(items[0]!).getByText("RON 3,400,000")).toBeVisible();
    expect(within(items[0]!).getByRole("link", { name: "1 suspect value left out" })).toHaveAttribute("href", "/s");
    expect(within(items[1]!).getByText("3")).toBeVisible();
    expect(within(items[1]!).getByText("The largest holds 82% of the total")).toBeVisible();
    expect(within(items[2]!).getByText("64%")).toBeVisible();
    expect(within(items[3]!).getByText("2")).toBeVisible();
  });

  it("tells no share when there are no Records", () => {
    show(emptyOverview.overview);
    const items = within(screen.getByRole("list", { name: "Headline numbers" })).getAllByRole("listitem");
    expect(within(items[2]!).getByText("–")).toBeVisible();
    expect(screen.queryByText(/The largest holds/)).toBeNull();
  });

  it("tells no share when the Records carry no money, rather than a misleading 0%", () => {
    const o = supplierOverview.overview;
    show({ ...o, directPurchaseShare: 0, total: { ...o.total, records: 3, awarded: "0" } });
    const items = within(screen.getByRole("list", { name: "Headline numbers" })).getAllByRole("listitem");
    expect(within(items[2]!).getByText("–")).toBeVisible();
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("formats the numbers in Romanian", () => {
    show(supplierOverview.overview, "ro");
    expect(screen.getByText(/^3\.400\.000\sRON$/)).toBeVisible();
    expect(screen.getByText(/^Cea mai mare deține 82\s%\sdin total$/)).toBeVisible();
  });
});
