// Seam 3 for the Relationships tab: the graph, the timeline, the side panel and the Flow lens, through the app against the API's recorded answers
// (api/test/recordedRelationshipsCases.ts: the hospital, ALFA and the placement world's communes).
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { openAt } from "../../testing/openAt.ts";

const AUTHORITY = "/explore/authority/1000017/relationships"; // SPITALUL EXEMPLU: five counterparties, a natural person among them
const SUPPLIER = "/explore/supplier/2000007/relationships"; // ALFA DEMO SRL

async function opened(url: string, ready: string | RegExp = /^(Graph of the top counterparties|Graful principalelor contrapărți)$/) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
  await screen.findByRole("group", { name: ready });
  return sent;
}
const panel = () => screen.getByRole("complementary", { name: /^(Records with the picked counterparty|Înregistrările contrapărții alese)$/ });
const node = (name: RegExp) => screen.getByRole("button", { name });

describe("the Relationships tab of an authority", () => {
  it("renders the graph, the timeline and the side panel's hint from EntityRelationships", async () => {
    const sent = await opened(AUTHORITY);
    expect(sent).toMatchObject([{ operation: "EntityRelationships", variables: { key: "1000017", role: "AUTHORITY", filter: {} } }]);
    expect(screen.getByRole("heading", { level: 2, name: "Relationships" })).toBeVisible();
    expect(node(/ALFA DEMO SRL/)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("heading", { name: "By month" })).toBeVisible();
    expect(within(panel()).getByText(/Pick a counterparty/)).toBeVisible();
  });

  it("picking a supplier writes it to the URL and loads its months and its Records", async () => {
    const sent = await opened(AUTHORITY);
    const before = window.history.length;
    await userEvent.setup().click(node(/ALFA DEMO SRL/));
    await waitFor(() => expect(window.location.search).toBe("?counterparty=2000007"));
    expect(window.history.length).toBe(before);
    expect(await within(panel()).findByRole("heading", { name: /Records with/ })).toBeVisible();
    expect(sent.slice(1).map((s) => s.operation).sort()).toEqual(["EntityRecords", "EntityRelationships"]);
    expect(sent).toContainEqual(expect.objectContaining({ operation: "EntityRelationships", variables: { key: "1000017", role: "AUTHORITY", filter: {}, counterparty: "2000007" } }));
    expect(sent).toContainEqual(expect.objectContaining({ operation: "EntityRecords", variables: { key: "1000017", role: "AUTHORITY", filter: { supplier: "2000007" }, limit: 100, offset: 0 } }));
    expect(node(/ALFA DEMO SRL/)).toHaveAttribute("aria-pressed", "true");
    // the picked supplier's own months are drawn over the overall ones, and the graph was not reloaded
    expect(sent.filter((s) => s.operation === "EntityRelationships" && !(s.variables as { counterparty?: string }).counterparty)).toHaveLength(1);
    expect(screen.getAllByText("ALFA DEMO SRL").length).toBeGreaterThan(0);
  });

  it("opens with a counterparty picked, from the URL, and picking it again clears it", async () => {
    await opened(`${AUTHORITY}?counterparty=2000007`);
    expect(await within(panel()).findByRole("heading", { name: /Records with/ })).toBeVisible();
    await userEvent.setup().click(node(/ALFA DEMO SRL/));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(within(panel()).getByText(/Pick a counterparty/)).toBeVisible();
  });

  it("names the natural person's row without a link, and never offers it for picking", async () => {
    await opened(AUTHORITY);
    expect(screen.getAllByText("Persoană fizică").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /Persoană fizică/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Persoană fizică/ })).toBeNull();
  });

  it("says so when the entity has no counterparties in the filter", async () => {
    openAt(`${AUTHORITY}?from=2019-01-01&to=2019-12-31`);
    const { client, sent } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByText("No counterparties for the chosen filters.")).toBeVisible();
    expect(sent[0]).toMatchObject({ variables: { key: "1000017", role: "AUTHORITY", filter: { from: "2019-01-01", to: "2019-12-31" } } });
  });
});

describe("the Relationships tab of a supplier", () => {
  it("renders its authorities, and a picked authority's months and Records (the other side of the filter)", async () => {
    const sent = await opened(`${SUPPLIER}?counterparty=1000017`);
    expect(await within(panel()).findByRole("heading", { name: /Records with/ })).toBeVisible();
    expect(sent).toContainEqual(expect.objectContaining({ operation: "EntityRecords", variables: { key: "2000007", role: "SUPPLIER", filter: { authority: "1000017" }, limit: 100, offset: 0 } }));
    expect(sent).toContainEqual(expect.objectContaining({ operation: "EntityRelationships", variables: { key: "2000007", role: "SUPPLIER", filter: {}, counterparty: "1000017" } }));
    expect(node(/SPITALUL EXEMPLU/)).toHaveAttribute("aria-pressed", "true");
    expect(within(within(panel()).getByRole("heading", { name: /Records with/ })).getByRole("link", { name: "SPITALUL EXEMPLU" })).toHaveAttribute("href", "/explore/authority/1000017");
  });

  it("shows no Flow lens until asked, then draws it in the graph's place, keeping the timeline and the panel", async () => {
    const sent = await opened(SUPPLIER);
    const user = userEvent.setup();
    const toggle = screen.getByRole("group", { name: "Show" });
    expect(within(toggle).getByRole("button", { name: "Graph", pressed: true })).toBeVisible();
    await user.click(within(toggle).getByRole("button", { name: "Money flow" }));
    await waitFor(() => expect(window.location.search).toBe("?lens=flow"));
    // ALFA is placed in Cluj and every authority that has a county is there too: a single bubble, and the Unplaced tile for the other two
    expect(await screen.findByText(/All of the money placed in a county comes from Cluj: a single bubble and no arcs/)).toBeVisible();
    expect(screen.getByText(/Unplaced/)).toBeVisible();
    expect(screen.queryByRole("group", { name: "Graph of the top counterparties" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "By month" })).toBeVisible();
    expect(within(screen.getByRole("group", { name: "Show" })).getByRole("button", { name: "Money flow", pressed: true })).toBeVisible();
    // the Flow lens is part of the same response: no new request
    expect(sent.map((s) => s.operation)).toEqual(["EntityRelationships"]);
    await user.click(within(screen.getByRole("group", { name: "Show" })).getByRole("button", { name: "Graph" }));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(await screen.findByRole("group", { name: "Graph of the top counterparties" })).toBeVisible();
  });
});

describe("the Flow lens of an authority", () => {
  it("opens from the URL on the supplier side, with the off-map tile (this authority has no county: bubbles only)", async () => {
    openAt("/explore/authority/1000017/relationships?lens=flow");
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByText(/This authority's county is not known: bubbles only/)).toBeVisible();
    expect(screen.getByText("Unknown supplier county")).toBeVisible();
  });

  it("draws a placed authority's suppliers flowing out of its home county", async () => {
    openAt("/explore/authority/51000005/relationships?lens=flow");
    const { client } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByText(/Where this authority's money goes: suppliers across Romania, flowing out of Brașov\./)).toBeVisible();
    expect(screen.queryByText(/county is not known/)).not.toBeInTheDocument();
  });
});

describe("the Relationships tab in Romanian", () => {
  it("renders from the same data, with Romanian copy", async () => {
    await opened("/ro/explore/supplier/2000007/relationships", /^Graful principalelor contrapărți$/);
    expect(screen.getByRole("heading", { level: 2, name: "Relații" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Afișare" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pe luni" })).toBeVisible();
  });
});

describe("the Relationships tab's failures", () => {
  it("says so when the data cannot be loaded", async () => {
    openAt("/explore/supplier/30000009/relationships");
    const { client } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("alert")).toBeVisible();
  });
});
