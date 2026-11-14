// Seam 3 for BaniPartide's firm donations on the entity page (#182): the pages rendered from the API's recorded EntityOverview answers (the very JSON seam 1 compares
// the real API with): the list with date, party as published, kind and amount, each line citing BaniPartide and its underlying source, the data-through year, and
// "this supplier is also a firm donor" as context on the supplier page only.
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

const row = (section: ReturnType<typeof within>, sourceRow: number) => within(section.getAllByRole("row").find((r: HTMLElement) => r.getAttribute("data-source-row") === String(sourceRow))!);

describe("the firm donations section", () => {
  it("lists a supplier's donation and loan newest first with the date as far as it is readable, the party as published, the kind and the amount", async () => {
    await opened("/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Firm donations to parties" }));
    expect(section.getAllByRole("row").slice(1).map((r) => r.getAttribute("data-source-row"))).toEqual(["2", "1"]);
    expect(row(section, 1).getByText("15 March 2023")).toBeVisible();
    expect(row(section, 1).getByText("PNL")).toBeVisible();
    expect(row(section, 1).getByText("Donation")).toBeVisible();
    expect(row(section, 1).getByText(/50[\s\u00a0.,]000/)).toBeVisible();
    expect(row(section, 2).getByText("20.01.2024; 15.05.2024")).toBeVisible(); // the cell lists two dates: shown as published, no date claimed
    expect(row(section, 2).getByText("Loan")).toBeVisible();
    expect(row(section, 2).getByText(/250[\s\u00a0.,]000[.,]50/)).toBeVisible();
  });

  it("cites BaniPartide and its underlying source on every line and states the data-through year", async () => {
    await opened("/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Firm donations to parties" }));
    for (const n of [1, 2]) {
      expect(row(section, n).getByRole("link", { name: `BaniPartide, row ${n}` })).toHaveAttribute("href", "https://www.banipartide.ro/donatori-persoane-juridice.html");
      expect(row(section, n).getByRole("link", { name: /from the parties' publications/ })).toHaveAttribute("href", "https://www.banipartide.ro/metodologie.html");
    }
    expect(section.getByText(/Data through 2024: donations after that may be missing/)).toBeVisible();
    expect(section.getByText(/BaniPartide \(Expert Forum\), licence CC Attribution 4\.0 License; table fetched 14 November 2026\./)).toBeVisible();
  });

  it("says \"this supplier is also a firm donor\" as context on the supplier page, never as a Signal", async () => {
    await opened("/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Firm donations to parties" }));
    expect(section.getByText(/This supplier is also a firm donor: 1 donation and 1 loan to parties\. Context only, not a Signal\./)).toBeVisible();
    expect(section.getByText(/It is never a Party, and its amounts are never summed or added to awarded value/)).toBeVisible();
    expect(screen.queryByText(/total donat/i)).toBeNull();
  });

  it("shows the same list on the authority page of an entity with both roles, without the supplier line", async () => {
    await opened("/explore/authority/2000031");
    const section = within(await screen.findByRole("region", { name: "Firm donations to parties" }));
    expect(row(section, 4).getByText("PSD+PC")).toBeVisible(); // the party exactly as BaniPartide publishes it
    expect(row(section, 4).getByText("9 June 2021")).toBeVisible();
    expect(section.queryByText(/also a firm donor/)).toBeNull();
  });

  it("is absent from an entity BaniPartide lists nothing for", async () => {
    await opened("/explore/supplier/name-furnizor-local-srl");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByRole("region", { name: "Firm donations to parties" })).toBeNull();
    expect(screen.queryByText(/individual|ZAMFIR|POPA/)).toBeNull();
  });

  it("is in Romanian under /ro/", async () => {
    await opened("/ro/explore/supplier/2000007");
    const section = within(await screen.findByRole("region", { name: "Donații ale firmei către partide" }));
    expect(section.getByText(/Acest furnizor este și o firmă donatoare: 1 donație și 1 împrumut către partide\. Doar context, nu un Semnal\./)).toBeVisible();
    expect(row(section, 1).getByText("Donație")).toBeVisible();
    expect(row(section, 1).getByText("15 martie 2023")).toBeVisible();
    expect(row(section, 2).getByText("Împrumut")).toBeVisible();
    expect(section.getByText(/Date până în 2024/)).toBeVisible();
  });
});
