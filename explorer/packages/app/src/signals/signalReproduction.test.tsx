// Seam 3: the reproducing link of a Signal opens the authority's Records tab with the Signal's filter on (the app at the built URL, over fixtures).
import type { SignalData } from "@grivei/ui";
import { render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "../App.tsx";
import { fixtureClient } from "../testing/fixtureClient.ts";
import { openAt } from "../testing/openAt.ts";
import { decodeUrlState } from "../urlState/codec.ts";
import { signalReproduceHref } from "./reproduceHref.ts";

const authority = { key: "4000001", displayName: "MUNICIPIUL BRAȘOV", identity: "CUI" } as const;
const common = { authority, suppliers: [], dataThrough: "2024-11-30" };

const splitting: SignalData = {
  ...common, rule: "SPLITTING", date: "2024-07-19", firstDate: "2024-07-01", recordCount: 2,
  numbers: { __typename: "SplittingNumbers", purchases: 2, sum: "29000000", cap: "27012000", cpvGroup: "770", from: "2024-07-01", to: "2024-07-19" },
  reproduce: { authority: "4000001", supplier: "30000001", signal: "SPLITTING", cpv: "770", from: "2024-07-01", to: "2024-07-19" },
};
const overCap: SignalData = {
  ...common, rule: "OVER_CAP", date: "2024-01-19", firstDate: "2024-01-19", recordCount: 1,
  numbers: { __typename: "OverCapNumbers", value: "30000000", cap: "27012000", multiple: 1.11 },
  reproduce: { authority: "4000001", supplier: "30000001", signal: "OVER_CAP", cpv: null, from: "2024-01-19", to: "2024-01-19" },
};

const FACETS = /^(Filter by facet|Filtre pe fațete)$/;
const tabs = () => within(screen.getByRole("navigation", { name: /Sections of this page|Secțiunile paginii/ }));

async function openReproduction(locale: "en" | "ro", signal: SignalData) {
  const href = signalReproduceHref(locale, signal);
  openAt(href);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  const panel = await screen.findByRole("complementary", { name: FACETS });
  return { sent, panel: within(panel) };
}

describe("a Signal's reproducing link, opened", () => {
  it("shows the authority's Records tab with a splitting Signal's Records and its filter on (English)", async () => {
    const { sent, panel } = await openReproduction("en", splitting);
    expect(sent.map((s) => s.operation)).toEqual(["EntityRecords"]);
    expect(sent[0]?.variables).toMatchObject({ key: "4000001", role: "AUTHORITY", filter: { signal: "SPLITTING", supplier: "30000001", cpv: "770", from: "2024-07-01", to: "2024-07-19" } });
    expect(screen.getByRole("heading", { level: 1, name: "MUNICIPIUL BRAȘOV" })).toBeVisible();
    expect(tabs().getByRole("link", { name: "Records" })).toHaveAttribute("aria-current", "page");
    expect(panel.getByRole("button", { name: /^Splitting/, pressed: true })).toBeVisible();
    expect(panel.getByRole("button", { name: /^HACHI INVEST S\.R\.L\./, pressed: true })).toBeVisible();
    expect(await screen.findByText("2 Records")).toBeVisible();
    expect(screen.getByRole("link", { name: "Servicii de întreținere spații verzi (2)" })).toBeVisible();
    expect(decodeUrlState(window.location.search).filter).toEqual({ signal: "SPLITTING", supplier: "30000001", cpv: "770", from: "2024-07-01", to: "2024-07-19" });
  });

  it("does the same in Romanian under /ro/", async () => {
    const { panel } = await openReproduction("ro", splitting);
    expect(window.location.pathname).toBe("/ro/explore/authority/4000001/records");
    expect(tabs().getByRole("link", { name: "Înregistrări" })).toHaveAttribute("aria-current", "page");
    expect(panel.getByRole("button", { name: /^Fracționare/, pressed: true })).toBeVisible();
    await waitFor(() => expect(screen.getByText(/^2 înregistrări$/)).toBeVisible());
  });

  it("shows an over-cap Signal's one Record, the facet of its rule on", async () => {
    const { panel } = await openReproduction("en", overCap);
    expect(panel.getByRole("button", { name: /^Over cap/, pressed: true })).toBeVisible();
    expect(await screen.findByText("1 Record")).toBeVisible();
    expect(screen.getByRole("link", { name: "Deszăpezire străzi, sezon rece 2023-2024" })).toHaveAttribute("href", "/explore/record/DA12345678");
  });
});
