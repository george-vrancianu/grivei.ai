// Seam 3 for MF's financial statements on the supplier page (#179): the pages rendered from the API's recorded EntityOverview answers (the very JSON seam 1
// compares the real API with): per-year figures, the revision marker, "not reported" for blanks, the awards' share of turnover as context, each year's file cited.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

async function opened(url: string) {
  openAt(url);
  render(<App client={fixtureClient().client} />);
  await screen.findByRole("heading", { level: 1 });
}

const row = (section: ReturnType<typeof within>, year: number) => within(section.getByRole("row", { name: new RegExp(`^${year}\\b`) }));

describe("the financial statements section", () => {
  it("shows a supplier's years newest first, each marked first release or revised, the newest as one that may be revised", async () => {
    await opened("/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Financial statements" }));
    expect(section.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("rowheader")[0]!.textContent!.slice(0, 4))).toEqual(["2025", "2024", "2023", "2022"]);
    expect(row(section, 2025).getByText("first release, may be revised")).toBeVisible();
    expect(row(section, 2024).getByText("first release")).toBeVisible();
    expect(row(section, 2023).getByText("revised")).toBeVisible();
    expect(section.getByText(/The newest year is a first release/)).toBeVisible();
  });

  it("reads blank cells \"not reported\" and never zero, a reported zero as 0, and a loss as negative", async () => {
    await opened("/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Financial statements" }));
    expect(row(section, 2022).getByText("not reported")).toBeVisible(); // blank employees
    expect(row(section, 2025).getAllByText("not reported")).toHaveLength(2); // blank debts and employees
    expect(row(section, 2024).getByText("0", { selector: "td" })).toBeVisible();
    expect(row(section, 2023).getByText(/[-\u2212]\s?(RON\s)?150[\s\u00a0.,]000/)).toBeVisible();
  });

  it("shows the awards of each year and their share of turnover as context, and says it is not a Signal", async () => {
    await opened("/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Financial statements" }));
    expect(row(section, 2023).getByText("49.1%")).toBeVisible(); // 5,890,000 RON awarded in 2023 over a turnover of 12,000,000 RON
    expect(row(section, 2022).getByText("0%")).toBeVisible();
    expect(section.getByText(/is context, not a Signal, and is never added to awarded value/)).toBeVisible();
  });

  it("cites MF and the file of each year", async () => {
    await opened("/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Financial statements" }));
    expect(row(section, 2023).getByRole("link", { name: "MF, web_bl_bs_sl_an2023.txt" })).toHaveAttribute("href", "https://data.gov.ro/dataset/ds/resource/r2023bl-rev/download/web_bl_bs_sl_an2023.txt");
    expect(row(section, 2023).getByRole("link", { name: "Situații financiare 2023" })).toHaveAttribute("href", "https://data.gov.ro/dataset/situatii_financiare2023");
    expect(row(section, 2023).getByText("Published 27 July 2025")).toBeVisible();
  });

  it("gives no share when the turnover is blank", async () => {
    await opened("/explore/supplier/2000015");
    const section = within(await screen.findByRole("region", { name: "Financial statements" }));
    const newest = row(section, 2025);
    expect(newest.getAllByText("not reported").length).toBeGreaterThanOrEqual(2); // the blank turnover and its share
    expect(row(section, 2024).getByText("revised")).toBeVisible();
  });

  it("is on the supplier page only, not the authority page of the same entity", async () => {
    await opened("/explore/authority/2000031");
    expect(screen.queryByRole("region", { name: "Financial statements" })).toBeNull();
    await screen.findByRole("region", { name: "Public enterprise (AMEPIP)" });
  });

  it("is in Romanian under /ro/", async () => {
    await opened("/ro/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Situații financiare" }));
    expect(row(section, 2022).getByText("nedeclarat")).toBeVisible();
    expect(row(section, 2025).getByText("prima publicare, poate fi revizuit")).toBeVisible();
    expect(section.getByText(/nu este o pondere din venituri/)).toBeVisible();
  });

  it("is absent from an entity MF holds no statements for", async () => {
    await opened("/explore/supplier/name-furnizor-local-srl");
    expect(screen.queryByRole("region", { name: /Financial statements/ })).toBeNull();
  });
});
