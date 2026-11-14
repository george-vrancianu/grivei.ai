import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { donations, donationsCopy, donationsUndated } from "../../samples/donations.ts";
import type { FirmDonationsData } from "../../types.ts";
import { FirmDonationsSection } from "./index.ts";

const show = (data: FirmDonationsData = donations, supplier = true, locale: Locale = "en") =>
  renderInUi(<FirmDonationsSection donations={data} supplier={supplier} locale={locale} copy={donationsCopy[locale]} />, locale);

const row = (sourceRow: number) => within(document.querySelector(`tr[data-source-row="${sourceRow}"]`) as HTMLElement);

describe("FirmDonationsSection", () => {
  it("lists each donation and loan with the date, the party as published, the kind and the amount, in the order given", () => {
    show();
    expect(screen.getByRole("region", { name: "Firm donations to parties" })).toBeVisible();
    expect(screen.getAllByRole("row").slice(1).map((r) => (r as HTMLElement).dataset["sourceRow"])).toEqual(["2", "1"]);
    expect(row(1).getByText("15 March 2023")).toBeVisible();
    expect(row(1).getByText("PNL")).toBeVisible();
    expect(row(1).getByText("Donation")).toBeVisible();
    expect(row(1).getByText(/50[\s\u00a0.,]000/)).toBeVisible();
    expect(row(2).getByText("Loan")).toBeVisible();
    expect(row(2).getByText(/250[\s\u00a0.,]000[.,]50/)).toBeVisible();
  });

  it("claims no date where BaniPartide's cell gives none: it shows the cell as published, else the year, else \"not stated\"", () => {
    show();
    expect(row(2).getByText("20.01.2024; 15.05.2024")).toBeVisible(); // two dates in the cell: shown verbatim, not one of them picked
    show(donationsUndated);
    expect(within(screen.getAllByRole("region")[1]!).getAllByText("2021").length).toBeGreaterThan(0); // the year stands in for an empty cell
    expect(screen.getByText("not stated")).toBeVisible();
    expect(screen.getByText("pnl")).toBeVisible(); // the party exactly as published, not upper-cased or matched to a Party
  });

  it("states the data-through year and that later donations may be missing", () => {
    show();
    expect(screen.getByText(/Data through 2024: donations after that may be missing/)).toBeVisible();
  });

  it("cites BaniPartide and its underlying source on every line, with the licence and publisher", () => {
    show();
    for (const n of [1, 2]) {
      expect(row(n).getByRole("link", { name: `BaniPartide, row ${n}` })).toHaveAttribute("href", "https://www.banipartide.ro/donatori-persoane-juridice.html");
      expect(row(n).getByRole("link", { name: "from the parties' publications (Monitorul Oficial, AEP)" })).toHaveAttribute("href", "https://www.banipartide.ro/metodologie.html");
    }
    expect(screen.getByText(/BaniPartide \(Expert Forum\), licence CC Attribution 4\.0 License; table fetched 14 November 2026\./)).toBeVisible();
    expect(screen.getByRole("link", { name: "How BaniPartide sources its data" })).toBeVisible();
  });

  it("opens a supplier's section with \"also a firm donor\" as context, and leaves the line out on another page", () => {
    show(donations, true);
    expect(screen.getByText(/This supplier is also a firm donor: 1 donation and 1 loan to parties\. Context only, not a Signal\./)).toBeVisible();
    show(donations, false);
    expect(screen.getAllByText(/also a firm donor/)).toHaveLength(1); // only the first render's
  });

  it("says a firm donation is context, never a Party, and its amounts are never summed", () => {
    show();
    expect(screen.getByText(/is context, not a Signal\. It is never a Party, and its amounts are never summed or added to awarded value/)).toBeVisible();
    expect(screen.queryByText(/total/i)).toBeNull();
  });

  it("is the same in Romanian", () => {
    show(donations, true, "ro");
    expect(screen.getByRole("heading", { name: "Donații ale firmei către partide" })).toBeVisible();
    expect(row(1).getByText("15 martie 2023")).toBeVisible();
    expect(row(1).getByText("Donație")).toBeVisible();
    expect(row(2).getByText("Împrumut")).toBeVisible();
    expect(screen.getByText(/Acest furnizor este și donator-firmă: 1 donație și 1 împrumut către partide/)).toBeVisible();
    expect(screen.getByText(/Date până în 2024/)).toBeVisible();
    expect(row(1).getByRole("link", { name: "BaniPartide, rândul 1" })).toBeVisible();
  });
});
