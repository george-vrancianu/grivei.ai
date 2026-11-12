// Seam 3 for the Record page: the app rendered against the API's recorded answers (ticket #85; `recordedRecordPage`, recorded by seam 1)
// through the injected fetch. The hand fixtures that remain (a framework overrun, a splitting Signal, a Record with no public page) are
// named where they are used.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { recordedRecordPage } from "@grivei/contract/fixtures";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

function open(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  return sent;
}
/** The path of a Record's page: the code is one URL segment, so `/` and the like are encoded. */
const pathOf = (code: string, prefix = "/explore") => `${prefix}/record/${encodeURIComponent(code)}`;
const valueOf = (label: string) => screen.getByText(label).nextElementSibling;
const region = (name: string) => within(screen.getByRole("region", { name }));
const text = (el: Element | null) => (el?.textContent ?? "").replace(/\s/g, " ");
const recorded = (name: string) => {
  const found = recordedRecordPage.find((f) => f.name === name)?.data.seap.record;
  if (!found) throw new Error(`no recorded RecordPage ${name}`);
  return found;
};
/** Opens a recorded case and waits for its title. */
async function openRecorded(name: string, prefix = "/explore") {
  const record = recorded(name);
  const sent = open(pathOf(record.code, prefix));
  await screen.findByRole("heading", { level: 1, name: record.title });
  return { record, sent };
}

describe("every Record kind renders from the API's recorded answers, in both languages", () => {
  const withRecord = recordedRecordPage.filter((f) => f.data.seap.record !== null);
  const kinds = new Set(withRecord.map((f) => f.data.seap.record!.kind));

  it("covers all four Record kinds", () => {
    expect([...kinds].sort()).toEqual(["AWARD_NOTICE", "CONTRACT", "DA", "DAN"]);
  });

  describe.each([
    ["en", "/explore", "Provenance", "Check in SEAP", "Contracting authority"],
    ["ro", "/ro/explore", "Proveniență", "Verifică în SEAP", "Autoritate contractantă"],
  ] as const)("%s", (_locale, prefix, provenance, checkIn, authorityLabel) => {
    it.each(withRecord.map((f) => [f.name, f.data.seap.record!] as const))("%s: title, authority, winners and the Check-in-SEAP link", async (name, record) => {
      const sent = open(pathOf(record.code, prefix));
      expect(await screen.findByRole("heading", { level: 1, name: record.title })).toBeInTheDocument();
      expect(sent.map((s) => s.operation)).toEqual(["RecordPage"]);
      expect(sent[0]).toMatchObject({ variables: { code: record.code } }); // the code as published, whatever its URL encoding
      expect(screen.getByText(authorityLabel).nextElementSibling).toHaveTextContent(record.authority.displayName);
      // the link: bulk Records go through the redirect endpoint for their code, crawled ones to their e-licitatie page
      const link = region(provenance).getByRole("link", { name: checkIn });
      expect(link, name).toHaveAttribute("href", record.provenance.url!);
      if (record.provenance.kind === "BULK") expect(link).toHaveAttribute("href", `/source/seap/${encodeURIComponent(record.code)}`);
      else expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/e-licitatie\.ro\/pub\/notices\/ca-notices\/view-/));
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
      if (record.provenance.via) expect(region(provenance).getByText(record.provenance.via)).toBeInTheDocument();
    });
  });
});

describe("a Record page", () => {
  it("shows loading first", () => {
    open(pathOf("CAN9000003~5"));
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("opens a contract by its code: title, kind, procedure, values, authority and winner", async () => {
    const { record } = await openRecorded("contract-single-winner");
    expect(screen.getByText("Contract")).toBeInTheDocument();
    expect(screen.getByText("Licitatie deschisa")).toBeInTheDocument();
    expect(valueOf("Value as published")).toHaveTextContent("RON 150.00");
    expect(valueOf("Counted value")).toHaveTextContent("RON 150.00");
    expect(screen.getByText("Contracting authority").nextElementSibling).toHaveTextContent("SPITALUL EXEMPLU");
    expect(within(screen.getByText("Winners").nextElementSibling as HTMLElement).getAllByRole("link")).toHaveLength(1);
    expect(record.badges).toEqual([]);
  });

  it("opens a direct purchase (DA) and a direct-purchase award notification (DAN) under their own kind", async () => {
    await openRecorded("direct-purchase-counted");
    expect(screen.getByText("Direct purchase (DA)")).toBeInTheDocument();
    expect(valueOf("Value as published")).toHaveTextContent("RON 1,350,599.00");
    expect(region("Provenance").getByText("Achizitii directe 2023 - T1")).toBeInTheDocument();
  });

  it("names a DAN as a direct purchase award notification", async () => {
    await openRecorded("direct-purchase-notice");
    expect(screen.getByText("Direct purchase award notification (DAN)")).toBeInTheDocument();
    expect(valueOf("Value as published")).toHaveTextContent("RON 5,089.00");
  });

  it("opens an award notice, its two winners sharing the value equally", async () => {
    await openRecorded("award-notice-consortium");
    expect(screen.getByText("Award notice")).toBeInTheDocument();
    expect(valueOf("Counted value")).toHaveTextContent("RON 98,800.00");
    expect(screen.getAllByText(/equal share RON 49,400.00/)).toHaveLength(2);
  });

  it("links the authority and the winner to their pages, in the language's prefix", async () => {
    await openRecorded("contract-single-winner", "/ro/explore");
    const links = screen.getAllByRole("link").map((l) => l.getAttribute("href") ?? "");
    expect(links.some((h) => h.startsWith("/ro/explore/authority/"))).toBe(true);
    expect(links.some((h) => h.startsWith("/ro/explore/supplier/"))).toBe(true);
  });

  it("shows a consortium's full value, each member's equal share and the convention label; a natural person among them is unnamed", async () => {
    await openRecorded("consortium-with-natural-person");
    expect(valueOf("Counted value")).toHaveTextContent("RON 1,000.00");
    expect(screen.getAllByText(/equal share RON 333.3[34]/)).toHaveLength(3);
    expect(screen.getByText(/counting convention, not a figure SEAP publishes/)).toBeInTheDocument();
    const winners = within(screen.getByText("Winners").nextElementSibling as HTMLElement);
    expect(winners.getByText(/Persoană fizică/)).toBeInTheDocument();
    expect(winners.getAllByRole("link").map((l) => l.textContent)).toEqual(["ALFA DEMO SRL", "BALKAN TRADING OOD"]);
  });

  it("marks a member known by a foreign VAT id as identified by name only, and still never names the natural person", async () => {
    await openRecorded("consortium-name-only-members");
    expect(screen.getAllByText("name only")).toHaveLength(1);
    const winners = screen.getByText("Winners").nextElementSibling as HTMLElement;
    expect(winners).toHaveTextContent("Persoană fizică");
    expect(within(winners).getAllByRole("link")).toHaveLength(2);
  });

  it("shows the framework line with its percentage and lists the subsequent contracts, with links that keep the code's encoding", async () => {
    await openRecorded("framework-agreement");
    expect(screen.getByText("Ceiling RON 10,000,000.00; subsequent contracts reported so far RON 5,000,000.00 (50%)")).toBeInTheDocument();
    const framework = region("Framework agreement");
    const hrefs = framework.getAllByRole("link").map((l) => l.getAttribute("href")).filter((h) => h?.startsWith("/explore/record/"));
    expect(hrefs).toEqual(["/explore/record/CAN9800001~2", "/explore/record/CAN9800001~3"]);
    expect(valueOf("Counted value")).toHaveTextContent("a framework ceiling is not money awarded");
    expect(screen.getByText("Framework ceiling")).toBeInTheDocument();
  });

  it("points a subsequent contract back to its framework agreement, and a click follows it without a page load", async () => {
    const { record } = await openRecorded("subsequent-contract");
    expect(record.framework!.agreement!.code).toBe("CAN9800001~1");
    expect(valueOf("Counted value")).toHaveTextContent("RON 4,000,000.00");
    const back = region("Framework agreement").getByRole("link", { name: record.framework!.agreement!.title });
    expect(back).toHaveAttribute("href", "/explore/record/CAN9800001~1");
    await userEvent.setup().click(back);
    expect(window.location.pathname).toBe("/explore/record/CAN9800001~1");
    expect(await screen.findByText("Ceiling RON 10,000,000.00; subsequent contracts reported so far RON 5,000,000.00 (50%)")).toBeInTheDocument();
  });

  it("leaves the percentage out when the framework's ceiling is blank", async () => {
    await openRecorded("framework-blank-ceiling");
    expect(screen.getByText("Ceiling not published; subsequent contracts reported so far RON 500,000.00")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    expect(valueOf("Value as published")).toHaveTextContent("No value in SEAP");
  });

  it("shows a framework contract won by two firms with both its badges", async () => {
    await openRecorded("framework-consortium");
    const badges = region("Badges and what they mean");
    expect(badges.getByText("Framework ceiling")).toBeInTheDocument();
    expect(badges.getByText("Consortium share")).toBeInTheDocument();
  });

  it("opens a Record whose code holds a slash: the URL encodes it, the request carries it as published, the link keeps it encoded", async () => {
    const sent = open("/explore/record/CAN9000010~1398514%2F1");
    expect(await screen.findByRole("heading", { level: 1, name: /Servicii de reparare si de intretinere a incalzirii centrale/ })).toBeInTheDocument();
    expect(sent[0]).toMatchObject({ variables: { code: "CAN9000010~1398514/1" } });
    expect(region("Provenance").getByRole("link", { name: "Check in SEAP" })).toHaveAttribute("href", "/source/seap/CAN9000010~1398514%2F1");
    expect(region("Framework agreement").getByText(/\(32.2%\)/)).toBeInTheDocument();
  });

  it.each([
    ["direct-purchase-suspect", "at least ten times the cap in force", "RON 135,060.00"],
    ["contract-suspect-over-estimate", "at least a hundred times the estimated value", "RON 10,000,000.00"],
    ["contract-suspect-no-estimate", "above 50 bn RON and e-licitatie gives no estimated value", null],
  ])("says why a suspect value (%s) is not counted and states the rule", async (name, rule, threshold) => {
    await openRecorded(name);
    expect(valueOf("Counted value")).toHaveTextContent("breaks a counting rule");
    const note = region("Suspect value rule");
    expect(note.getByText(new RegExp(rule))).toBeInTheDocument();
    if (threshold) expect(note.getByText(new RegExp(threshold.replace(".", "\\."))) ).toBeInTheDocument();
    expect(region("Badges and what they mean").getByText("Suspect value")).toBeInTheDocument();
  });

  it("shows a Record with no value as 'No value in SEAP'", async () => {
    await openRecorded("direct-purchase-no-value");
    expect(valueOf("Value as published")).toHaveTextContent("No value in SEAP");
    expect(valueOf("Counted value")).toHaveTextContent("Nothing to count");
    expect(region("Badges and what they mean").getByText("No value")).toBeInTheDocument();
  });

  it("never names or links a natural-person winner", async () => {
    await openRecorded("natural-person-winner");
    const winners = screen.getByText("Winners").nextElementSibling as HTMLElement;
    expect(winners).toHaveTextContent("Persoană fizică");
    expect(within(winners).queryByRole("link")).toBeNull();
    expect(document.body).not.toHaveTextContent(/\b\d{13}\b/); // no CNP either
  });

  it.each([
    ["cui-mismatch", "CUI mismatch", /does not match the one ANAF confirms/],
    ["name-differs-from-anaf", "Name differs from ANAF", /differs from the registered name at ANAF/],
    ["identity-curated", "Identity curated", /A person reviewed and fixed who this party is/],
  ])("shows the %s badge with its explanation as visible text", async (name, label, explanation) => {
    await openRecorded(name);
    const badges = region("Badges and what they mean");
    expect(badges.getByText(label)).toBeInTheDocument();
    expect(badges.getByText(explanation)).toBeVisible();
  });

  it("shows a crawled Record as provisional and links to its e-licitatie page, with no bulk file named", async () => {
    await openRecorded("crawled-provisional");
    expect(region("Badges and what they mean").getByText(/awaiting the official bulk data/)).toBeVisible();
    const provenance = region("Provenance");
    expect(provenance.getByRole("link", { name: "Check in SEAP" })).toHaveAttribute("href", "https://e-licitatie.ro/pub/notices/ca-notices/view-c/92000013");
    expect(provenance.getByText("Read from the Source's own site")).toBeInTheDocument();
    expect(provenance.getByText("12 November 2026")).toBeInTheDocument();
    expect(provenance.queryByText("File or notice")).toBeNull();
  });

  it("shows a crawl-only Record and an RFQ notice with the page of their own notice type", async () => {
    await openRecorded("crawl-only");
    expect(region("Badges and what they mean").getByText(/never matched in the official bulk data/)).toBeVisible();
    expect(region("Provenance").getByText("11 November 2026")).toBeInTheDocument();
  });

  it("shows a bulk Record that was crawled too with the bulk's file and the redirect link", async () => {
    await openRecorded("bulk-over-crawl");
    const provenance = region("Provenance");
    expect(provenance.getByText("Contracte 2026 - T1")).toBeInTheDocument();
    expect(provenance.getByText("Published bulk file")).toBeInTheDocument();
    expect(provenance.getByRole("link", { name: "Check in SEAP" })).toHaveAttribute("href", "/source/seap/CAN9200001~C-1");
  });

  it("lists the Signal a Record belongs to with its Records, in neutral words", async () => {
    await openRecorded("over-cap-signal");
    const signals = region("Signals this Record belongs to");
    expect(signals.getByRole("heading", { name: "Over cap" })).toBeInTheDocument();
    expect(signals.getByText(/2 Records/)).toBeInTheDocument();
    expect(signals.getByRole("link", { name: "Achizitie DA98000002" })).toHaveAttribute("href", "/explore/record/DA98000002");
    expect(signals.queryByText(/fraud|illegal|corrupt/i)).toBeNull();
  });

  it("lists a no-publication Signal on a crawled award notice", async () => {
    await openRecorded("no-publication-signal");
    expect(region("Signals this Record belongs to").getByRole("heading", { name: "No publication" })).toBeInTheDocument();
    expect(screen.getByText("Award notice")).toBeInTheDocument();
  });

  it("lists an over-cap Signal whose only winner is a natural person without naming them", async () => {
    await openRecorded("signal-natural-person");
    expect(region("Signals this Record belongs to").getByRole("heading", { name: "Over cap" })).toBeInTheDocument();
    expect(screen.getByText("Winners").nextElementSibling).toHaveTextContent("Persoană fizică");
  });

  it("shows a framework overrun above 100% and its Signal (hand fixture: the rule is #76, not recorded yet)", async () => {
    open("/explore/record/CAN1160100");
    await screen.findByRole("heading", { level: 1, name: /Acord-cadru lucrări/ });
    expect(screen.getByText(/\(112.4%\)/)).toBeInTheDocument();
    expect(region("Signals this Record belongs to").getByRole("heading", { name: "Framework overrun" })).toBeInTheDocument();
  });

  it("says there is no stable public page when the Record has no URL (hand fixture: the redirect cannot resolve an RFQA code)", async () => {
    open("/explore/record/RFQA9100077");
    await screen.findByRole("heading", { level: 1, name: "Servicii de curățenie" });
    expect(region("Provenance").queryByRole("link")).toBeNull();
    expect(region("Provenance").getByText(/no stable public page/)).toBeInTheDocument();
  });

  it("follows a link to another Record without a page load", async () => {
    await openRecorded("over-cap-signal");
    // DA98000002 is not a recorded case: the click lands on the page and the page tells the data could not be loaded
    await userEvent.setup().click(region("Signals this Record belongs to").getByRole("link", { name: "Achizitie DA98000002" }));
    expect(window.location.pathname).toBe("/explore/record/DA98000002");
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  });
});

describe("the Record page in Romanian, under /ro/", () => {
  it("renders the framework line, the labels and the provenance in Romanian", async () => {
    await openRecorded("framework-agreement", "/ro/explore");
    expect(screen.getByText("Valoare publicată")).toBeInTheDocument();
    expect(text(screen.getByText(/Plafon .*contracte subsecvente raportate până acum/))).toMatch(/Plafon .*10\.000\.000,00.*5\.000\.000,00.* \(50\s?%\)/);
    expect(region("Proveniență").getByRole("link", { name: "Verifică în SEAP" })).toHaveAttribute("href", "/source/seap/CAN9800001~1");
    expect(region("Acord-cadru").getAllByRole("link").map((l) => l.getAttribute("href")).filter((h) => h?.startsWith("/ro/explore/record/"))).toEqual(["/ro/explore/record/CAN9800001~2", "/ro/explore/record/CAN9800001~3"]);
  });

  it("says in Romanian that a suspect value is not counted, with its rule", async () => {
    await openRecorded("direct-purchase-suspect", "/ro/explore");
    expect(valueOf("Valoare luată în calcul")).toHaveTextContent("încalcă o regulă de calcul");
    expect(region("Regula valorii suspecte").getByText(/de cel puțin zece ori plafonul în vigoare/)).toBeInTheDocument();
  });

  it("shows a natural person as 'Persoană fizică', unnamed and unlinked", async () => {
    await openRecorded("natural-person-winner", "/ro/explore");
    const winners = screen.getByText("Câștigători").nextElementSibling as HTMLElement;
    expect(winners).toHaveTextContent("Persoană fizică");
    expect(within(winners).queryByRole("link")).toBeNull();
  });

  it("shows the Signal and the no-value sentence in Romanian", async () => {
    await openRecorded("over-cap-signal", "/ro/explore");
    expect(region("Semnalele din care face parte această înregistrare").getByRole("heading", { name: "Peste plafon" })).toBeInTheDocument();
    await screen.findByText("Valoare publicată");
  });

  it("shows the no-value Record in Romanian", async () => {
    await openRecorded("direct-purchase-no-value", "/ro/explore");
    expect(valueOf("Valoare publicată")).toHaveTextContent("Nicio valoare în SEAP");
  });

  it("says in Romanian when a Record has no public page", async () => {
    open("/ro/explore/record/RFQA9100077");
    await screen.findByRole("heading", { level: 1, name: "Servicii de curățenie" });
    expect(region("Proveniență").getByText(/nu are încă o pagină publică stabilă/)).toBeInTheDocument();
  });
});

describe("a Record page that cannot show a Record", () => {
  it.each([
    ["/explore", "Record not found", "No Record is published under the code CAN0000000.", "/explore/"],
    ["/ro/explore", "Înregistrarea nu a fost găsită", "Nicio înregistrare nu este publicată sub codul CAN0000000.", "/ro/explore/"],
  ])("says so when no Record has that code (%s)", async (prefix, title, body, back) => {
    const sent = open(pathOf("CAN0000000", prefix));
    expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
    expect(sent[0]).toMatchObject({ variables: { code: "CAN0000000" } });
    expect(screen.getByText(body)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /main screen|ecranul principal/i })).toHaveAttribute("href", back);
  });

  it("says so when the data could not be loaded", async () => {
    open("/explore/record/NOFIXTURE1");
    expect(await screen.findByRole("alert")).toHaveTextContent("could not be loaded");
  });
});
