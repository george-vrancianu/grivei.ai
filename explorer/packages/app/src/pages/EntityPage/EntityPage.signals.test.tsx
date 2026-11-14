// Seam 3: Signals on the entity pages, rendered from the API's recorded answers (recorded/signals/ and #86's archive-signals Overview): the Overview's
// Signal cards, the Records tab's Signal facet and row badges, the Relationships tab's rings. EN and /ro/.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forbiddenWords } from "@grivei/ui";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { createClient } from "../../graphql/client.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { sentence } from "../../testing/sentence.ts";
import { openAt } from "../../testing/openAt.ts";
import { overviewNamed, overviewsWithSignals, overviewUrl } from "../../testing/signalRecordings.ts";
import { fixtures } from "@grivei/contract/fixtures";
import allowlist from "@grivei/contract/persisted-queries.json";
import { signalMethodologyHref } from "../../signals/signalLinks.ts";
import { signalReproduceHref } from "../../signals/reproduceHref.ts";

async function opened(url: string, ready: string | RegExp) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
  await screen.findByRole(typeof ready === "string" ? "heading" : "group", { name: ready });
  return sent;
}
const cards = () => screen.getAllByRole("article");
const rulesOf = (name: string) => overviewNamed(name).data.entity!.seap.role!.signals.rows;

describe("the Overview's Signals (English)", () => {
  it("lists the authority's Signals newest first as cards: label, a sentence with the numbers filled in, the lawful line, the links; no score", async () => {
    const sent = await opened(overviewUrl(overviewNamed("authority-with-signals").variables), "Signals (8)");
    expect(sent).toMatchObject([{ operation: "EntityOverview", variables: { key: "1000017", role: "AUTHORITY", signalOrder: "DATE_DESC" } }]);
    expect(cards().map((c) => within(c).getByRole("heading").textContent)).toEqual([
      "No publication", "No publication", "No publication", "Over cap", "Over cap", "Over cap", "Over cap", "No publication",
    ]);
    const first = within(cards()[0]!);
    expect(first.getByText(/awarded by the procedure "Negociere fara publicare prealabila", which has no prior publication of a notice/i)).toBeVisible();
    expect(first.getByText(/^Possible lawful explanations: an emergency/)).toBeVisible();
    expect(first.getByText("Latest Record: 29 March 2026 · 1 Record")).toBeVisible();
    expect(first.getByRole("link", { name: "How this Signal is detected" })).toHaveAttribute("href", "/explore/methodology#signal-no-publication");
    expect(first.getByRole("link", { name: "See the Record" })).toHaveAttribute("href", "/explore/authority/1000017/records?from=2026-03-29&to=2026-03-29&signal=no-publication");
    // a Signal of one Record links that Record in SEAP; a Signal of two says to check each
    expect(first.getByRole("link", { name: "Check in SEAP" })).toHaveAttribute("href", "https://e-licitatie.ro/pub/notices/ca-notices/view-c/92000015"); // a crawled notice: its own page
    expect(within(cards()[4]!).getByRole("link", { name: "Check in SEAP" })).toHaveAttribute("href", "/source/seap/DA98000006"); // a bulk direct purchase: the redirect
    const two = within(cards()[2]!); // 2023-02-10: two Records, a consortium
    expect(two.getByText("Check each Record in SEAP")).toBeVisible();
    expect(two.queryByRole("link", { name: "Check in SEAP" })).toBeNull();
    expect(two.getByText("Latest Record: 10 February 2023 · 2 Records")).toBeVisible();
    // the numbers of an over-cap Signal: the value, the multiple and the cap
    const over = within(cards()[3]!);
    expect(over.getByText(sentence(/^One direct purchase was awarded for RON .*, .* times the direct-purchase cap of RON /))).toBeVisible();
    // the footer's "never scored" is the shell's principle, not a score on the page
    expect(screen.queryAllByText(/score|rank|riskiest/i).filter((el) => !el.closest("footer"))).toEqual([]);
  });

  it("orders them by value when the URL says so (still no score)", async () => {
    await opened(overviewUrl(overviewNamed("authority-with-signals-by-value").variables), "Signals (8)");
    expect(within(cards()[0]!).getByRole("heading").textContent).toBe("Over cap");
    expect(within(cards()[0]!).getByText(/Latest Record: 14 January 2023/)).toBeVisible();
  });

  it("lists, on a consortium member's page, the Signal of the consortium's Records, naming all three suppliers", async () => {
    await opened(overviewUrl(overviewNamed("consortium-member-supplier").variables), "Signals (1)");
    const card = within(cards()[0]!);
    expect(card.getByRole("heading").textContent).toBe("No publication");
    for (const [name, key] of [["ALFA DEMO SRL", "2000007"], ["BETA DEMO SRL", "2000015"], ["GAMMA DEMO SRL", "2000023"]] as const)
      expect(card.getByRole("link", { name: new RegExp(name) })).toHaveAttribute("href", `/explore/supplier/${key}`);
    expect(card.getByRole("link", { name: /SPITALUL EXEMPLU/ })).toHaveAttribute("href", "/explore/authority/1000017");
  });

  it("shows a Signal on every supplier page its Records touch: the hospital's own, the commune's and the both-roles authority's, on BETA's page", async () => {
    await opened(overviewUrl(overviewNamed("supplier-in-three-authorities-signals").variables), "Signals (5)");
    const authorities = cards().map((c) => within(c).getAllByRole("link", { name: /EXEMPLU|DEMO|CNAIR/ }).find((l) => l.getAttribute("href")?.startsWith("/explore/authority/"))!.getAttribute("href"));
    expect(new Set(authorities)).toEqual(new Set(["/explore/authority/1000017", "/explore/authority/1000009", "/explore/authority/2000031"]));
  });

  it("names no natural person: the over-cap Signal of a natural person's purchase has an authority and no supplier line", async () => {
    await opened(overviewUrl(overviewNamed("authority-with-signals").variables), "Signals (8)");
    const naturalPerson = cards().find((c) => within(c).queryByText("Latest Record: 3 February 2023 · 1 Record"))!;
    expect(within(naturalPerson).getByText("Contracting authority")).toBeVisible();
    expect(within(naturalPerson).queryByText("Suppliers")).toBeNull();
    expect(within(naturalPerson).queryByText(/Persoană fizică/)).toBeNull();
  });

  it("lists one card per rule on the pages of the splitting and framework-overrun archives, each linking its rule's methodology section", async () => {
    await opened(overviewUrl(overviewNamed("splitting-authority").variables), "Signals (3)");
    expect(cards().map((c) => within(c).getByRole("heading").textContent)).toEqual(["Splitting", "Splitting", "Splitting"]);
    expect(within(cards()[1]!).getByText(sentence(/^3 direct purchases in CPV group 301 between 1 March 2023 and 8 April 2023 add up to RON .*, above the single-purchase cap of RON /))).toBeVisible();
    for (const c of cards()) expect(within(c).getByRole("link", { name: "How this Signal is detected" })).toHaveAttribute("href", "/explore/methodology#signal-splitting");
  });

  it("shows the framework-overrun Signal with its ceiling, the subsequent total and the ratio", async () => {
    await opened(overviewUrl(overviewNamed("framework-overrun-authority").variables), "Signals (2)");
    expect(within(cards()[0]!).getByText(sentence(/^Subsequent contracts reported under one framework agreement add up to RON 1,250,000.00, against a ceiling of RON 1,000,000.00: 125% of it\./))).toBeVisible();
    expect(within(cards()[0]!).getByRole("link", { name: "See the 4 Records" })).toBeVisible();
  });

  it("says there are none for an entity without Signals", async () => {
    await opened("/explore/authority/1000017", "Signals (0)");
    expect(screen.getByText("No Signals for this entity.")).toBeVisible();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });

  // one test per recording: the cost of each is constant however many recordings there are, and a failure names the recording
  it.each(overviewsWithSignals.map((f) => [f.name, f] as const))("uses no word a Signal never uses, in the recorded Overview %s", async (_name, f) => {
    openAt(overviewUrl(f.variables));
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("heading", { name: /^Signals \(\d+\)$/ });
    await waitFor(() => expect(screen.getAllByRole("article").length).toBe(Math.min(f.data.entity!.seap.role!.signals.count, 20)));
    for (const card of screen.getAllByRole("article")) expect(forbiddenWords(card.textContent ?? "", "en")).toEqual([]);
  });
});

describe("the Overview's Signals (Romanian, under /ro/)", () => {
  it("says the same in Romanian: label, sentence, lawful line, the links under /ro/", async () => {
    await opened(overviewUrl(overviewNamed("authority-with-signals").variables, "ro"), "Semnale (8)");
    const first = within(cards()[0]!);
    expect(first.getByRole("heading").textContent).toBe("Fără publicare");
    expect(first.getByText(/^Explicații legale posibile:/)).toBeVisible();
    expect(first.getByRole("link", { name: "Cum este detectat acest Semnal" })).toHaveAttribute("href", signalMethodologyHref("ro", "NO_PUBLICATION"));
    expect(first.getByRole("link", { name: /^Vezi înregistrarea/ })).toHaveAttribute("href", signalReproduceHref("ro", rulesOf("authority-with-signals")[0]!));
    expect(first.getByRole("link", { name: "Verifică în SEAP" })).toHaveAttribute("href", "https://e-licitatie.ro/pub/notices/ca-notices/view-c/92000015");
    for (const card of cards()) expect(forbiddenWords(card.textContent ?? "", "ro")).toEqual([]);
  });
});

describe("the Records tab's Signal facet and row badges", () => {
  const RECORDS = "/explore/authority/1000017/records?from=2023-01-10&to=2023-01-10&signal=over-cap";

  it("lists the Signal facet by the rule's one name and puts a compact badge on each Record in a Signal, linking to the Signal's Records", async () => {
    await opened(RECORDS, /^(Filter by facet|Filtre pe fațete)$/).catch(() => undefined);
    const panel = await screen.findByRole("complementary", { name: "Filter by facet" });
    expect(within(panel).getByRole("button", { name: /^Over cap/, pressed: true })).toBeVisible();
    const badges = await screen.findAllByRole("link", { name: "Over cap, 10 Jan 2023" });
    expect(badges).toHaveLength(2); // one per Record of the Signal
    for (const badge of badges) expect(badge).toHaveAttribute("href", "/explore/authority/1000017/records?from=2023-01-10&to=2023-01-10&signal=over-cap");
  });

  it("puts a badge on every row of the unfiltered tab that is in a Signal, and none on the others", async () => {
    openAt("/explore/authority/1000017/records?order=value-desc");
    const { client } = fixtureClient();
    render(<App client={client} />);
    await screen.findByRole("complementary", { name: "Filter by facet" });
    const rows = (await screen.findAllByRole("row")).slice(1); // the table's head row is not a Record
    const recorded = fixtures.EntityRecords.find((f) => f.name === "authority-with-signals")!.data.entity!.seap.role!.records.records.rows;
    const withSignals = recorded.filter((r) => r.record.signals.length > 0).length;
    expect(withSignals).toBeGreaterThan(0);
    expect(withSignals).toBeLessThan(recorded.length); // some Records are in no Signal
    const badged = rows.filter((r) => within(r).queryAllByRole("link", { name: /^(Over cap|No publication|Splitting|Framework overrun), / }).length > 0);
    expect(badged).toHaveLength(withSignals);
  });

  it("says it in Romanian", async () => {
    openAt("/ro/explore/authority/1000017/records?from=2023-01-10&to=2023-01-10&signal=over-cap");
    const { client } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findAllByRole("link", { name: "Peste plafon, 10 ian. 2023" })).toHaveLength(2);
    expect(within(screen.getByRole("complementary", { name: "Filtre pe fațete" })).getByRole("button", { name: /^Peste plafon/, pressed: true })).toBeVisible();
  });
});

describe("the Relationships tab's rings", () => {
  it("rings the counterparties whose Records are in a Signal and says so in their names, in English and Romanian", async () => {
    openAt("/explore/authority/1000017/relationships?from=2023-01-01&to=2023-12-31");
    const { client } = fixtureClient();
    const { unmount } = render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    const graph = await screen.findByRole("group", { name: "Graph of the top counterparties" });
    expect(within(graph).getByRole("button", { name: /^ALFA DEMO SRL.*has Signals/ })).toBeVisible();
    expect(graph.querySelectorAll("[data-ring]").length).toBe(4); // ALFA, BETA, GAMMA and the lumped natural persons
    expect(screen.getByText("Amber ring: has Signals")).toBeVisible();
    unmount();
    openAt("/ro/explore/supplier/2000015/relationships?from=2023-01-01&to=2023-12-31");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    const ro = await screen.findByRole("group", { name: "Graful principalelor contrapărți" });
    expect(within(ro).getByRole("button", { name: /^SPITALUL EXEMPLU.*are Semnale/ })).toBeVisible();
    expect(ro.querySelectorAll("[data-ring]").length).toBe(1); // the both-roles entity bought from BETA outside every Signal
  });
});

describe("the Overview's Signal pages", () => {
  // no recorded archive has more than 20 Signals for one entity, so the answer is the recorded one with a larger count
  const manySignals = () => {
    const recorded = overviewNamed("authority-with-signals");
    const sent: { variables: Record<string, unknown> }[] = [];
    const client = createClient({
      fetch: async (_url, init) => {
        const { id, variables } = JSON.parse(String(init?.body)) as { id: string; variables: Record<string, unknown> };
        expect(allowlist.operations.find((o) => o.sha256 === id)?.name).toBe("EntityOverview");
        sent.push({ variables });
        const role = recorded.data.entity!.seap.role!;
        return Response.json({ data: { entity: { ...recorded.data.entity!, seap: { ...recorded.data.entity!.seap, role: { ...role, signals: { ...role.signals, count: 45 } } } } } });
      },
    });
    return { client, sent };
  };

  it("links the pages under the cards and asks the next 20 when one is opened", async () => {
    openAt("/explore/authority/1000017");
    const { client, sent } = manySignals();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("heading", { name: "Signals (45)" });
    expect(sent[0]!.variables).not.toHaveProperty("signalOffset");
    const pages = within(screen.getByRole("navigation", { name: "Signal pages" }));
    expect(pages.getByRole("link", { name: "Page 3" })).toHaveAttribute("href", "/explore/authority/1000017?page=3");
    await userEvent.setup().click(pages.getByRole("link", { name: "Page 2" }));
    await waitFor(() => expect(sent.at(-1)!.variables).toMatchObject({ signalOffset: 20 }));
    expect(window.location.search).toBe("?page=2");
  });

  it("says it in Romanian and asks the third page's offset", async () => {
    openAt("/ro/explore/authority/1000017?page=3");
    const { client, sent } = manySignals();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByRole("navigation", { name: "Paginile Semnalelor" })).toBeVisible();
    expect(sent[0]!.variables).toMatchObject({ signalOffset: 40 });
  });
});
