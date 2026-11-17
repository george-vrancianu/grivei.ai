// Seam 3 for the Relationships tab's loading, refetch and failure states, EN and /ro/: skeletons on a first load, the last answer kept (dimmed, aria-busy) while a filter
// or a change of picked counterparty loads, and a failed request shown with its retry inside the panel that failed. Requests are held or failed by operation and count.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fixtures } from "@grivei/contract/fixtures";
import { App } from "../../App.tsx";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient, type Before } from "../../testing/fixtureClient.ts";
import { navigate } from "../../routing/location.tsx";
import { openAt } from "../../testing/openAt.ts";

const words = {
  en: { base: "/explore/authority/1000017/relationships", failed: "The data could not be loaded.", retry: "Try again", loading: "Loading…", graph: /^Top counterparties/, picked: "Records with the picked counterparty", byMonth: "By month", flow: "Money flow", graphGroup: "Graph of the top counterparties", awarded: "Awarded" },
  ro: { base: "/ro/explore/authority/1000017/relationships", failed: "Datele nu au putut fi încărcate.", retry: "Reîncearcă", loading: "Se încarcă…", graph: /^Principalele contrapărți/, picked: "Înregistrările contrapărții alese", byMonth: "Pe luni", flow: "Flux de bani", graphGroup: "Graful principalelor contrapărți", awarded: "Atribuit" },
} as const;

const canonical = (value: unknown): string => JSON.stringify(value, (_k, v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));
/** The unfiltered answer, offered for a filtered request too (the fixtures have no recorded answer for most filters). */
const filteredToo = (from: string) => {
  const base = fixtures.EntityRelationships.find((f) => canonical(f.variables) === canonical({ key: "1000017", role: "AUTHORITY", filter: {} }))!;
  return [{ operation: "EntityRelationships", variables: { key: "1000017", role: "AUTHORITY", filter: { from } }, data: base.data }];
};
const isGraph = (variables: unknown) => !(variables as { counterparty?: string }).counterparty;
const gate = () => {
  let release!: () => void;
  const until = new Promise<void>((resolve) => (release = resolve));
  return { until, release };
};
const body = (region: HTMLElement) => region.querySelector("[data-panel-part='body']")!;

describe.each(["en", "ro"] as const)("the Relationships tab's states (%s)", (lang) => {
  const w = words[lang];
  const region = (name: string | RegExp) => screen.getByRole("region", { name });

  it("shows skeletons with the real heading, toggle and panel titles on a first load, then the graph", async () => {
    openAt(w.base);
    const held = gate();
    const before: Before = ({ operation }) => (operation === "EntityRelationships" ? held.until : undefined);
    render(<App client={fixtureClient({ before }).client} loadCountyTopology={loadTestCountyTopology} />);
    expect(await screen.findByRole("group", { name: /^(Show|Afișare)$/ })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: /^(Relationships|Relații)$/ })).toBeVisible();
    expect(region(w.graph)).toBeVisible();
    expect(region(w.picked)).toBeVisible();
    expect(screen.getByRole("heading", { name: w.byMonth })).toBeVisible();
    expect(screen.getAllByRole("status").map((s) => s.textContent)).toContain(w.loading);
    expect(screen.queryByRole("group", { name: w.graphGroup })).toBeNull();
    act(() => held.release());
    expect(await screen.findByRole("group", { name: w.graphGroup })).toBeVisible();
  });

  it("keeps the last graph and months, dimmed and aria-busy, while a filter reloads them, the headers at full strength", async () => {
    openAt(w.base);
    const held = gate();
    const before: Before = ({ operation, variables, n }) => (operation === "EntityRelationships" && isGraph(variables) && n === 2 ? held.until : undefined);
    render(<App client={fixtureClient({ before, extra: filteredToo("2023-06-01") }).client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("group", { name: w.graphGroup });
    act(() => navigate(`${w.base}?from=2023-06-01`, "replace"));
    await waitFor(() => expect(body(region(w.graph))).toHaveAttribute("aria-busy", "true"));
    expect(screen.getByRole("group", { name: w.graphGroup })).toBeVisible();
    expect(body(region(w.byMonth))).toHaveAttribute("aria-busy", "true");
    expect(within(region(w.graph)).getByRole("status")).toHaveTextContent(w.loading);
    expect(region(w.graph).querySelector("[data-panel-part='header']")!.closest("[aria-busy]")).toBeNull();
    act(() => held.release());
    await waitFor(() => expect(body(region(w.graph))).not.toHaveAttribute("aria-busy"));
    expect(within(region(w.graph)).queryByRole("status")).toBeNull();
  });

  it("keeps the picked panel through a filter reload", async () => {
    openAt(`${w.base}?counterparty=2000007`);
    const held = gate();
    const before: Before = ({ operation, variables, n }) => (operation === "EntityRelationships" && isGraph(variables) && n === 2 ? held.until : undefined);
    render(<App client={fixtureClient({ before, extra: [...filteredToo("2023-06-01"), ...pickedFor("2023-06-01")] }).client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("group", { name: w.graphGroup });
    await within(region(w.picked)).findByRole("heading", { level: 4 });
    act(() => navigate(`${w.base}?counterparty=2000007&from=2023-06-01`, "replace"));
    await waitFor(() => expect(body(region(w.graph))).toHaveAttribute("aria-busy", "true"));
    expect(within(region(w.picked)).getByRole("heading", { level: 4 })).toBeVisible();
    act(() => held.release());
    await waitFor(() => expect(body(region(w.graph))).not.toHaveAttribute("aria-busy"));
    expect(within(region(w.picked)).getByRole("heading", { level: 4 })).toBeVisible();
  });

  it("keeps the last counterparty's panel dimmed while the next pick loads, header and close at full strength", async () => {
    openAt(`/${lang === "ro" ? "ro/" : ""}explore/authority/4000001/relationships?counterparty=30000002`);
    const held = gate();
    const before: Before = ({ operation, n }) => (operation === "EntityRecords" && n === 2 ? held.until : undefined);
    const { container } = render(<App client={fixtureClient({ before }).client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("group", { name: w.graphGroup });
    const panel = region(w.picked);
    const first = (await within(panel).findByRole("heading", { level: 4 })).textContent;
    await userEvent.setup().click(container.querySelector<HTMLElement>('[data-node="30000001"]')!);
    await waitFor(() => expect(body(panel)).toHaveAttribute("aria-busy", "true"));
    expect(within(panel).getByRole("heading", { level: 4 })).toHaveTextContent(first!);
    expect(within(panel).getByRole("status")).toHaveTextContent(w.loading);
    expect(within(panel).getByRole("button", { name: /^(Close|Închide)$/ })).toBeEnabled();
    act(() => held.release());
    await waitFor(() => expect(body(panel)).not.toHaveAttribute("aria-busy"));
    expect(within(panel).getByRole("heading", { level: 4 }).textContent).not.toBe(first);
  });

  it("shows a skeleton body with the real figure labels on a first pick", async () => {
    openAt(`${w.base}?counterparty=2000007`);
    const held = gate();
    const before: Before = ({ operation }) => (operation === "EntityRecords" ? held.until : undefined);
    render(<App client={fixtureClient({ before }).client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("group", { name: w.graphGroup });
    const panel = region(w.picked);
    expect(await within(panel).findByText(w.awarded)).toBeVisible();
    expect(within(panel).getByRole("status")).toHaveTextContent(w.loading);
    act(() => held.release());
    expect(await within(panel).findByText(/^\d+ of \d+ shown$|^\d+ din \d+ afișate$/)).toBeVisible();
  });

  it("a failed tab request keeps the page and the heading, shows the note inside the graph panel, and its retry brings the answer back", async () => {
    openAt(w.base);
    const before: Before = ({ operation, variables, n }) => (operation === "EntityRelationships" && isGraph(variables) && n === 2 ? "fail" : undefined);
    render(<App client={fixtureClient({ before, extra: filteredToo("2023-06-01") }).client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("group", { name: w.graphGroup });
    act(() => navigate(`${w.base}?from=2023-06-01`, "replace"));
    const alert = await within(region(w.graph)).findByRole("alert");
    expect(alert).toHaveTextContent(w.failed);
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: /^(Relationships|Relații)$/ })).toBeVisible();
    await userEvent.setup().click(within(alert).getByRole("button", { name: w.retry }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByRole("group", { name: w.graphGroup })).toBeVisible();
  });

  it("a failed picked request shows the note with its retry inside the picked panel, the graph stays, and the retry fills the panel", async () => {
    openAt(`${w.base}?counterparty=2000007`);
    const before: Before = ({ operation, n }) => (operation === "EntityRecords" && n === 1 ? "fail" : undefined);
    render(<App client={fixtureClient({ before }).client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("group", { name: w.graphGroup });
    const panel = region(w.picked);
    const alert = await within(panel).findByRole("alert");
    expect(alert).toHaveTextContent(w.failed);
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(screen.getByRole("group", { name: w.graphGroup })).toBeVisible();
    await userEvent.setup().click(within(alert).getByRole("button", { name: w.retry }));
    expect(await within(panel).findByText(w.awarded)).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("a Money flow panel whose outlines fail to load shows the note with its retry inside the panel", async () => {
    openAt(`${w.base}?lens=flow`);
    let calls = 0;
    const load = () => (++calls === 1 ? Promise.reject(new Error("404")) : loadTestCountyTopology());
    render(<App client={fixtureClient().client} loadCountyTopology={load} />);
    const alert = await screen.findByRole("alert");
    expect(within(screen.getByRole("region", { name: w.flow })).getByRole("alert")).toBe(alert);
    await userEvent.setup().click(within(alert).getByRole("button", { name: w.retry }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(await within(screen.getByRole("region", { name: w.flow })).findByRole("list", { name: /^(Money by county|Banii pe județe)$/ })).toBeVisible();
  });
});

/** The picked counterparty's own answers under a filter: the unfiltered ones. */
function pickedFor(from: string) {
  const months = fixtures.EntityRelationships.find((f) => canonical(f.variables) === canonical({ key: "1000017", role: "AUTHORITY", filter: {}, counterparty: "2000007" }))!;
  const records = fixtures.EntityRecords.find((f) => canonical(f.variables) === canonical({ key: "1000017", role: "AUTHORITY", filter: { supplier: "2000007" }, limit: 100, offset: 0 }))!;
  return [
    { operation: "EntityRelationships", variables: { key: "1000017", role: "AUTHORITY", filter: { from }, counterparty: "2000007" }, data: months.data },
    { operation: "EntityRecords", variables: { key: "1000017", role: "AUTHORITY", filter: { from, supplier: "2000007" }, limit: 100, offset: 0 }, data: records.data },
  ];
}
