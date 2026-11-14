import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { financials, financialsBlankTurnover, financialsCopy } from "../../samples/financials.ts";
import type { FinancialStatementsData } from "../../types.ts";
import { FinancialStatementsSection } from "./index.ts";

const show = (data: FinancialStatementsData = financials, locale: Locale = "en") =>
  renderInUi(<FinancialStatementsSection financials={data} locale={locale} copy={financialsCopy[locale]} />, locale);

const row = (year: number) => within(screen.getByRole("row", { name: new RegExp(`^${year}\\b`) }));

describe("FinancialStatementsSection", () => {
  it("shows one row per fiscal year, newest first, with the figures in RON", () => {
    show();
    const section = screen.getByRole("region", { name: "Financial statements" });
    expect(within(section).getByRole("heading", { name: "Financial statements" })).toBeVisible();
    const years = screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("rowheader")[0]!.textContent);
    expect(years.map((y) => y!.slice(0, 4))).toEqual(["2025", "2024", "2023", "2022"]);
    const r2023 = row(2023);
    expect(r2023.getByText(/12[\s\u00a0.,]000[\s\u00a0.,]000/)).toBeVisible(); // turnover 12,000,000 RON
    expect(r2023.getByText("41")).toBeVisible();
  });

  it("reads a blank count and any other blank cell \"not reported\", never zero, and a reported zero as 0", () => {
    show();
    expect(row(2022).getByText("not reported")).toBeVisible(); // blank employees
    expect(row(2025).getAllByText("not reported")).toHaveLength(2); // blank debts and employees
    expect(row(2024).getByText("0", { selector: "td" })).toBeVisible(); // a reported zero stays zero
    expect(row(2024).queryByText("not reported")).toBeNull();
  });

  it("marks each year's release and notes that the newest, a first release, may be revised", () => {
    show();
    expect(row(2025).getByText("first release, may be revised")).toBeVisible();
    expect(row(2024).getByText("first release")).toBeVisible();
    expect(row(2023).getByText("revised")).toBeVisible();
    expect(screen.getByText(/The newest year is a first release/)).toBeVisible();
  });

  it("shows a loss as negative and the awards of the year with their share of turnover as context", () => {
    show();
    expect(row(2023).getByText(/[-\u2212]\s?(RON\s)?150[\s\u00a0.,]000/)).toBeVisible();
    expect(row(2023).getByText("49.1%")).toBeVisible();
    expect(row(2024).getByText("0.1%")).toBeVisible(); // 0.125% to one decimal
    expect(row(2022).getByText("0%")).toBeVisible();
    expect(screen.getByText(/is context, not a Signal, and is never added to awarded value/)).toBeVisible();
  });

  it("gives no share for a blank turnover, shows a share above 100% as it is, and has no revision note without a newest first release", () => {
    show(financialsBlankTurnover);
    expect(row(2025).getAllByText("not reported").length).toBeGreaterThanOrEqual(2);
    expect(row(2024).getByText("150%")).toBeVisible();
    show({ years: [financials.years[2]!] });
    expect(screen.getAllByText(/The newest year is a first release/)).toHaveLength(1); // only the first render's
  });

  it("cites MF and the file of each year, linked to MF's dataset on data.gov.ro", () => {
    show();
    const link = row(2023).getByRole("link", { name: "MF, web_bl_bs_sl_an2023.txt" });
    expect(link).toHaveAttribute("href", "https://data.gov.ro/dataset/situatii_financiare2023");
    expect(row(2023).getByText("Published 27 July 2025")).toBeVisible();
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("is the same in Romanian", () => {
    show(financials, "ro");
    expect(screen.getByRole("heading", { name: "Situații financiare" })).toBeVisible();
    expect(row(2022).getByText("nedeclarat")).toBeVisible();
    expect(row(2025).getByText("prima publicare, poate fi revizuit")).toBeVisible();
    expect(row(2023).getByText(/49,1\s%/)).toBeVisible();
    expect(screen.getByText(/nu este o pondere din venituri/)).toBeVisible();
  });
});
