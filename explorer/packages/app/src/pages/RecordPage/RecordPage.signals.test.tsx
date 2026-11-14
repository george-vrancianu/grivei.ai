// Seam 3: the Signals a Record belongs to, on the Record page (stories 59, 69), rendered from the API's recorded answers: the over-cap, splitting
// and no-publication ones of #85 and the framework-overrun ones of #89 (recorded/signals/RecordPage.json). EN and /ro/.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fixtures } from "@grivei/contract/fixtures";
import { forbiddenWords } from "@grivei/ui";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { sentence } from "../../testing/sentence.ts";
import { openAt } from "../../testing/openAt.ts";

const recorded = (name: string) => {
  const found = fixtures.RecordPage.find((f) => f.name === name)?.data.seap.record;
  if (!found) throw new Error(`no recorded RecordPage ${name}`);
  return found;
};
async function open(name: string, prefix = "/explore") {
  const record = recorded(name);
  openAt(`${prefix}/record/${encodeURIComponent(record.code)}`);
  render(<App client={fixtureClient().client} />);
  await screen.findByRole("heading", { level: 1, name: record.title });
  return record;
}
const signals = (name: string) => within(screen.getByRole("region", { name }));
const SIGNALS_EN = "Signals this Record belongs to";

describe("the Signals on a Record page", () => {
  it("shows a framework overrun above 100% with its Signal as a card, then the Signal's four Records", async () => {
    const record = await open("framework-overrun-ceiling");
    expect(screen.getByText(/\(125%\)/)).toBeVisible();
    const section = signals(SIGNALS_EN);
    expect(section.getByRole("heading", { name: "Framework overrun" })).toBeVisible();
    expect(section.getByText(sentence(/add up to RON 1,250,000.00, against a ceiling of RON 1,000,000.00: 125% of it/))).toBeVisible();
    expect(section.getByText(/^Possible lawful explanations: indexation of prices/)).toBeVisible();
    expect(section.getByRole("link", { name: "See the 4 Records" })).toHaveAttribute("href", "/explore/authority/1000017/records?from=2023-01-10&to=2023-03-05&supplier=2000007&signal=framework-overrun");
    expect(section.getByRole("link", { name: "How this Signal is detected" })).toHaveAttribute("href", "/explore/methodology#signal-framework-overrun");
    expect(section.getByText("Check each Record in SEAP")).toBeVisible();
    for (const r of record.signals[0]!.records) expect(section.getByRole("link", { name: r.title })).toHaveAttribute("href", `/explore/record/${encodeURIComponent(r.code)}`);
  });

  it("lists no Signal for the subsequent contract reported after the crossing: it counts in the ratio but is no Record of the Signal", async () => {
    await open("framework-overrun-subsequent-after-crossing");
    expect(screen.getByText(/\(125%\)/)).toBeVisible();
    expect(screen.queryByRole("region", { name: SIGNALS_EN })).toBeNull();
  });

  it("links the one Record of a Signal to SEAP from the card (the Record's own provenance link)", async () => {
    await open("over-cap-single-record-signal");
    const section = signals(SIGNALS_EN);
    expect(section.getByRole("link", { name: "Check in SEAP" })).toHaveAttribute("href", "/source/seap/DA98000009");
    expect(section.getByRole("link", { name: "See the Record" })).toHaveAttribute("href", "/explore/authority/1000009/records?from=2023-02-02&to=2023-02-02&signal=over-cap");
  });

  it("names every supplier of a consortium's Signal, each linked to its own page", async () => {
    await open("framework-overrun-consortium");
    const section = signals(SIGNALS_EN);
    for (const [name, key] of [["ALFA DEMO SRL", "2000007"], ["BETA DEMO SRL", "2000015"], ["GAMMA DEMO SRL", "2000023"]] as const)
      expect(section.getByRole("link", { name })).toHaveAttribute("href", `/explore/supplier/${key}`);
  });

  it("names no natural person in a Signal: the card has an authority and no supplier", async () => {
    await open("signal-natural-person");
    const section = signals(SIGNALS_EN);
    expect(section.getByText("Contracting authority")).toBeVisible();
    expect(section.queryByText("Suppliers")).toBeNull();
    expect(screen.getByText("Winners").nextElementSibling).toHaveTextContent("Persoană fizică");
  });

  it("shows a splitting and a no-publication Signal as cards too, with their numbers", async () => {
    await open("splitting-signal");
    expect(signals(SIGNALS_EN).getByText(sentence(/^3 direct purchases in CPV group .* add up to RON /))).toBeVisible();
    expect(signals(SIGNALS_EN).getByRole("link", { name: "See the 3 Records" })).toBeVisible();
    document.body.innerHTML = "";
  });

  it("opens the Signal's Records tab from the card with exactly the Signal's Records", async () => {
    await open("framework-overrun-ceiling");
    await userEvent.setup().click(signals(SIGNALS_EN).getByRole("link", { name: "See the 4 Records" }));
    await screen.findByRole("complementary", { name: "Filter by facet" });
    expect(window.location.pathname).toBe("/explore/authority/1000017/records");
    await waitFor(() =>
      expect(screen.getAllByRole("link").map((a) => a.getAttribute("href")).filter((h) => h?.startsWith("/explore/record/")).sort()).toEqual(
        ["CAN9700001~1", "CAN9700001~2", "CAN9700001~3", "CAN9700001~4"].map((c) => `/explore/record/${encodeURIComponent(c)}`),
      ),
    );
  });

  const withSignals = fixtures.RecordPage.filter((x) => (x.data.seap.record?.signals.length ?? 0) > 0);
  const languages = [["/explore", SIGNALS_EN, "en"], ["/ro/explore", "Semnalele din care face parte această înregistrare", "ro"]] as const;
  // one test per recording and language, each with its own budget
  it.each(withSignals.flatMap((f) => languages.map(([prefix, label, locale]) => [f.name, locale, f, prefix, label] as const)))(
    "uses no word a Signal never uses, on the recorded Record page %s (%s)",
    async (_name, locale, f, prefix, label) => {
      openAt(`${prefix}/record/${encodeURIComponent(f.data.seap.record!.code)}`);
      render(<App client={fixtureClient().client} />);
      const section = await screen.findByRole("region", { name: label });
      expect(forbiddenWords(section.textContent ?? "", locale)).toEqual([]);
    },
  );
});

describe("the Signals on a Record page, in Romanian", () => {
  it("shows the card in Romanian with its links under /ro/", async () => {
    await open("framework-overrun-ceiling", "/ro/explore");
    const section = signals("Semnalele din care face parte această înregistrare");
    expect(section.getByRole("heading", { name: "Depășirea acordului-cadru" })).toBeVisible();
    expect(section.getByRole("link", { name: "Vezi cele 4 înregistrări" })).toHaveAttribute("href", "/ro/explore/authority/1000017/records?from=2023-01-10&to=2023-03-05&supplier=2000007&signal=framework-overrun");
    expect(section.getByRole("link", { name: "Cum este detectat acest Semnal" })).toHaveAttribute("href", "/ro/explore/methodology#signal-framework-overrun");
  });
});
