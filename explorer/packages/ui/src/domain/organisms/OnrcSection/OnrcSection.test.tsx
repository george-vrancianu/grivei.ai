import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { sampleCopy } from "../../samples/copy.ts";
import { onrcRegistration, onrcRegistrationSparse } from "../../samples/onrc.ts";
import { OnrcSection } from "./index.ts";

const show = (registration = onrcRegistration, onrcOnly = false, locale: "en" | "ro" = "en") =>
  renderInUi(<OnrcSection registration={registration} onrcOnly={onrcOnly} locale={locale} copy={sampleCopy.onrcSection(locale)} />, locale);

describe("OnrcSection", () => {
  it("shows the registration, each status with the snapshot it was first seen in, and says ONRC dates none", () => {
    show();
    const section = screen.getByRole("region", { name: "ONRC registration" });
    expect(within(section).getByText("J40/1001/2015")).toBeVisible();
    expect(within(section).getByText("10 March 2015")).toBeVisible();
    expect(within(section).getByText("insolvență")).toBeVisible();
    expect(within(section).getByText("first seen in the snapshot of 3 April 2026")).toBeVisible();
    // a status already in the earliest snapshot is a lower bound, never a "first seen"
    expect(within(section).getByText("funcțiune")).toBeVisible();
    expect(within(section).getByText("since at least the snapshot of 18 March 2025")).toBeVisible();
    expect(within(section).getByText(/ONRC publishes statuses without dates/)).toBeVisible();
  });

  it("lists the authorised CAEN codes, the seat and ONRC's names as aliases that never rename the page", () => {
    show();
    expect(screen.getByText("4211")).toBeVisible();
    expect(screen.getAllByText("CAEN 2008")).toHaveLength(2);
    expect(screen.getByText("Cluj-Napoca, Str. EXEMPLU, Nr. 1, Cod postal 400001 · Cluj")).toBeVisible();
    expect(screen.getByText("ALFA NOU SRL")).toBeVisible();
    expect(screen.getByText("ALFA VECHI SRL")).toBeVisible();
    expect(screen.getByText(/legal name today/)).toBeVisible();
    expect(screen.getByText(/never change the name at the top of the page/)).toBeVisible();
  });

  it("cites the snapshot and links to the dataset", () => {
    show();
    expect(screen.getByRole("link", { name: "Source: ONRC, snapshot of 6 May 2026" })).toHaveAttribute("href", "https://data.gov.ro/dataset/firme-06-05-2026");
  });

  it("says an organisation only in ONRC names no person, and carries no note otherwise", () => {
    const { unmount } = show(onrcRegistration, true);
    expect(screen.getByText(/No person of it is shown/)).toBeVisible();
    unmount();
    show(onrcRegistration, false);
    expect(screen.queryByText(/No person of it is shown/)).toBeNull();
  });

  it("is honest about what is missing (legacy layout, unnamed code, no seat) and is plain text without a dataset link", () => {
    show(onrcRegistrationSparse, true);
    expect(screen.getByText("not in the snapshot we read")).toBeVisible();
    expect(screen.getByText("status code 2110")).toBeVisible();
    expect(screen.getByText("no seat published")).toBeVisible();
    expect(screen.getByText("ONRC lists no authorised CAEN code.")).toBeVisible();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("speaks Romanian and keeps ONRC's own words as published", () => {
    show(onrcRegistration, false, "ro");
    expect(screen.getByRole("region", { name: "Înmatriculare ONRC" })).toBeVisible();
    expect(screen.getByText("văzută prima oară în extrasul din 3 aprilie 2026")).toBeVisible();
    expect(screen.getByText("insolvență")).toBeVisible();
    expect(screen.getByText(/ONRC publică stările fără date/)).toBeVisible();
  });
});
