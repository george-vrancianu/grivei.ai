// Seam 3: the reproducing link of a Signal opens the authority's Records tab with the Signal's filter on, and lists exactly the Signal's
// Records (the app at the built URL over the API's recorded answers: every Signal of the recorded Overviews, all ten rules).
// Acceptance (#89): "for each rule, a Signal's reproducing link lists exactly its Records".
import type { RecordFilter } from "@grivei/contract";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SignalRule } from "@grivei/ui";
import { describe, expect, it } from "vitest";
import { App } from "../App.tsx";
import { fixtureClient } from "../testing/fixtureClient.ts";
import { openAt } from "../testing/openAt.ts";
import { overviewsWithSignals, overviewUrl, recordedSignals, recordsOfSignal, type OverviewSignal } from "../testing/signalRecordings.ts";
import { decodeUrlState } from "../urlState/codec.ts";
import { reproduceFilter, signalReproduceHref } from "./reproduceHref.ts";

const FACETS = /^(Filter by facet|Filtre pe fațete)$/;
const RULE_LABEL = {
  en: {
    OVER_CAP: "Over cap", SPLITTING: "Splitting", FRAMEWORK_OVERRUN: "Framework overrun", NO_PUBLICATION: "No publication", YOUNG_FIRM: "Young firm", NO_CONSTRUCTION_CAEN: "Works without a construction CAEN",
    AFTER_STRIKE_OFF: "After strike-off", INSOLVENCY: "Insolvency", FEW_EMPLOYEES: "At most one employee", NO_FINANCIAL_STATEMENT: "No financial statement",
    DONOR_TO_PARTY: "Donor to the authority's Party", SOE_BOARD_IN_SUPPLIER: "Public-enterprise board member in a supplier",
  },
  ro: {
    OVER_CAP: "Peste plafon", SPLITTING: "Fracționare", FRAMEWORK_OVERRUN: "Depășirea acordului-cadru", NO_PUBLICATION: "Fără publicare", YOUNG_FIRM: "Firmă tânără", NO_CONSTRUCTION_CAEN: "Lucrări fără CAEN de construcții",
    AFTER_STRIKE_OFF: "După radiere", INSOLVENCY: "Insolvență", FEW_EMPLOYEES: "Cel mult un angajat", NO_FINANCIAL_STATEMENT: "Fără situații financiare",
    DONOR_TO_PARTY: "Donator al Partidului autorității", SOE_BOARD_IN_SUPPLIER: "Administrator al unei întreprinderi publice într-un furnizor",
  },
} as const;
const RULES = [
  "OVER_CAP", "SPLITTING", "FRAMEWORK_OVERRUN", "NO_PUBLICATION", "YOUNG_FIRM", "NO_CONSTRUCTION_CAEN", "AFTER_STRIKE_OFF", "INSOLVENCY", "FEW_EMPLOYEES", "NO_FINANCIAL_STATEMENT",
] as const satisfies readonly SignalRule[];

const signals = recordedSignals();
/** The recorded Overview whose page lists the Signal (the first such). */
const overviewOf = (signal: OverviewSignal) => overviewsWithSignals.find((f) => f.data.entity!.seap.role!.signals.rows.some((s) => s.reproduce.authority === signal.reproduce.authority && JSON.stringify(s.reproduce) === JSON.stringify(signal.reproduce)))!;
const tabs = () => within(screen.getByRole("navigation", { name: /Sections of this page|Secțiunile paginii/ }));
const recordLinks = () => screen.getAllByRole("link").filter((a) => /\/explore\/record\//.test(a.getAttribute("href") ?? "")).map((a) => decodeURIComponent((a.getAttribute("href") ?? "").split("/record/")[1]!));

/** Opens the Overview that lists the Signal, clicks the Signal card's reproducing link and waits for the Records tab. */
async function followReproduceLink(locale: "en" | "ro", signal: OverviewSignal) {
  openAt(overviewUrl(overviewOf(signal).variables, locale));
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  const href = signalReproduceHref(locale, signal);
  await screen.findByRole("heading", { level: 1 });
  const link = await waitFor(() => {
    const found = document.querySelector<HTMLAnchorElement>(`a[href="${CSS.escape(href)}"]`);
    if (!found) throw new Error(`no link ${href}`);
    return found;
  });
  await userEvent.setup().click(link);
  const panel = await screen.findByRole("region", { name: FACETS });
  return { sent, panel: within(panel), href };
}

describe("the recordings carry Signals of all ten rules", () => {
  it("has at least one recorded Signal for each rule, and several of the over-cap, splitting and framework-overrun ones", () => {
    for (const rule of RULES) expect(signals.filter((s) => s.rule === rule).length, rule).toBeGreaterThan(0);
    expect(signals.length).toBeGreaterThanOrEqual(21);
  });
});

describe.each(RULES)("%s: a Signal's reproducing link lists exactly its Records", (rule) => {
  const ofRule = signals.filter((s) => s.rule === rule);

  it.each(ofRule.map((s) => [`${s.reproduce.authority} ${s.firstDate}..${s.date} (${s.recordCount} Records)`, s] as const))("%s", async (_name, signal) => {
    const { sent, panel, href } = await followReproduceLink("en", signal);
    // the link is the authority's Records tab with exactly the Signal's grouping as the filter, through the URL codec
    expect(window.location.pathname + window.location.search).toBe(href);
    const filter = reproduceFilter(signal.reproduce);
    expect(decodeUrlState(window.location.search).filter).toEqual(filter);
    const request = sent.filter((s) => s.operation === "EntityRecords").at(-1);
    expect(request?.variables).toEqual({ key: String(signal.reproduce.authority), role: "AUTHORITY", filter, limit: 100, offset: 0 });
    expect(tabs().getByRole("link", { name: "Records" })).toHaveAttribute("aria-current", "page");
    expect(panel.getByRole("button", { name: `Remove Signal: ${RULE_LABEL.en[rule]}` })).toBeVisible();
    // the rows are the Signal's Records, no more and no fewer
    const expected = recordsOfSignal(signal).records.rows.map((r) => r.record.code);
    expect(expected).toHaveLength(signal.recordCount);
    await waitFor(() => expect(recordLinks().sort()).toEqual([...expected].sort()));
  });

  it("does the same in Romanian under /ro/", async () => {
    const signal = ofRule[0]!;
    const { panel } = await followReproduceLink("ro", signal);
    expect(window.location.pathname.startsWith("/ro/explore/authority/")).toBe(true);
    expect(tabs().getByRole("link", { name: "Înregistrări" })).toHaveAttribute("aria-current", "page");
    expect(panel.getByRole("button", { name: `Elimină Semnal: ${RULE_LABEL.ro[rule]}` })).toBeVisible();
    const expected = recordsOfSignal(signal).records.rows.map((r) => r.record.code);
    await waitFor(() => expect(recordLinks().sort()).toEqual([...expected].sort()));
  });
});

describe("a Signal's reproducing link, on a supplier's page", () => {
  it("goes to the AUTHORITY's Records tab, not the supplier's, so a consortium member sees the same list", async () => {
    const signal = signals.find((s) => s.rule === "NO_PUBLICATION" && s.suppliers.length === 3)!;
    const gamma = overviewsWithSignals.find((f) => f.name === "consortium-member-supplier")!;
    openAt(overviewUrl(gamma.variables));
    const { client } = fixtureClient();
    render(<App client={client} />);
    const link = await screen.findByRole("link", { name: "See the 2 Records" });
    expect(link).toHaveAttribute("href", signalReproduceHref("en", signal));
    expect(link.getAttribute("href")).toContain("/explore/authority/1000017/records");
    await userEvent.setup().click(link);
    await screen.findByRole("region", { name: FACETS });
    await waitFor(() => expect(recordLinks().sort()).toEqual(["CAN9800001~1", "CAN9800002~1"]));
  });
});

describe("a Signal's reproducing filter shows one active chip per parameter, each clearing only its own", () => {
  const signal = signals.find((s) => s.reproduce.supplier && s.reproduce.cpv && s.reproduce.from && s.reproduce.to)!;
  const filter = reproduceFilter(signal.reproduce);
  const chips = () => within(screen.getByRole("group", { name: /^(Active filters|Filtre active)$/ })).getAllByRole("button", { name: /^(Remove|Elimină) / });
  const urlFilter = () => decodeUrlState(window.location.search).filter;
  const without = (whole: RecordFilter, ...fields: (keyof RecordFilter)[]): RecordFilter => Object.fromEntries(Object.entries(whole).filter(([field]) => !fields.includes(field as keyof RecordFilter)));

  it("has a recorded Signal with a supplier, a CPV code and a date range", () => {
    expect(signal).toBeDefined();
  });

  it.each([
    ["en", "Remove", `Signal: ${RULE_LABEL.en[signal.rule]}`, "CPV: "],
    ["ro", "Elimină", `Semnal: ${RULE_LABEL.ro[signal.rule]}`, "CPV: "],
  ] as const)("shows the Signal, the supplier, the date range and the CPV code (%s)", async (locale, remove, signalChip, cpvChip) => {
    await followReproduceLink(locale, signal);
    const names = chips().map((chip) => chip.getAttribute("aria-label"));
    // the date range is one chip, so a filter of signal, supplier, from, to and cpv has four
    expect(names).toHaveLength(4);
    expect(names[0]).toBe(`${remove} ${signalChip}`);
    expect(names[3]).toBe(`${remove} ${cpvChip}${signal.reproduce.cpv}`);
  });

  it("clearing the CPV chip removes only the CPV code from the URL; the list follows the shorter filter", async () => {
    await followReproduceLink("en", signal);
    await userEvent.setup().click(screen.getByRole("button", { name: `Remove CPV: ${signal.reproduce.cpv}` }));
    await waitFor(() => expect(urlFilter()).toEqual(without(filter, "cpv")));
  });

  it("clearing the date-range chip removes from and to together and nothing else", async () => {
    await followReproduceLink("en", signal);
    const dates = chips()[2]!;
    await userEvent.setup().click(dates);
    await waitFor(() => expect(urlFilter()).toEqual(without(filter, "from", "to")));
  });

  it("clearing the Signal chip and the supplier chip each removes only its own parameter", async () => {
    await followReproduceLink("en", signal);
    const user = userEvent.setup();
    await user.click(chips()[0]!);
    await waitFor(() => expect(urlFilter()).toEqual(without(filter, "signal")));
    await user.click(chips()[0]!); // the supplier chip is the first one now
    await waitFor(() => expect(urlFilter()).toEqual(without(filter, "signal", "supplier")));
  });
});
