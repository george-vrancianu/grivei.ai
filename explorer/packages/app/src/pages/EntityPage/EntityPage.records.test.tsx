// Seam 3 for the Records tab: the facet panel, the URL's filter and the filtered table are views of one RecordFilter.
import type { RecordFilter } from "@grivei/contract";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { decodeUrlState } from "../../urlState/codec.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const SUPPLIER_RECORDS = "/explore/supplier/30000001/records";
const filterInUrl = (): RecordFilter => decodeUrlState(window.location.search).filter;
const panel = () => screen.getByRole("complementary", { name: /^(Filter by facet|Filtre pe fațete)$/ });

async function opened(url: string) {
  openAt(url);
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  await screen.findByRole("complementary", { name: /^(Filter by facet|Filtre pe fațete)$/ });
  return sent;
}

describe("the Records tab", () => {
  it("opens with the facets, the total and the Records of the unfiltered page", async () => {
    const sent = await opened(SUPPLIER_RECORDS);
    expect(sent.map((s) => s.operation)).toEqual(["EntityRecords"]);
    expect(screen.getByRole("heading", { level: 1, name: "HACHI INVEST S.R.L." })).toBeVisible();
    expect(within(panel()).getByRole("button", { name: "Splitting (2)", pressed: false })).toBeVisible();
    expect(screen.getByText("3 Records")).toBeVisible();
    expect(screen.getByRole("link", { name: "Deszăpezire străzi, sezon rece 2023-2024" })).toHaveAttribute("href", "/explore/record/DA12345678");
  });

  it("clicking a facet writes the filter to the URL (history replaced) and shows the filtered total and rows", async () => {
    await opened(SUPPLIER_RECORDS);
    const before = window.history.length;
    await userEvent.setup().click(within(panel()).getByRole("button", { name: "Splitting (2)" }));
    await waitFor(() => expect(filterInUrl()).toEqual({ signal: "SPLITTING" }));
    expect(window.location.search).toBe("?signal=splitting");
    expect(window.history.length).toBe(before);
    expect(await screen.findByText("2 Records")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(within(panel()).getByRole("button", { name: /^Splitting/, pressed: true })).toBeVisible();
    // the header and the tabs stayed on screen
    expect(screen.getByRole("heading", { level: 1, name: "HACHI INVEST S.R.L." })).toBeVisible();
  });

  it("clicking the active facet again removes it from the URL", async () => {
    await opened(`${SUPPLIER_RECORDS}?signal=splitting`);
    expect(await screen.findByText("2 Records")).toBeVisible();
    await userEvent.setup().click(within(panel()).getByRole("button", { name: /^Splitting/, pressed: true }));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(await screen.findByText("3 Records")).toBeVisible();
  });

  it("a supplier's counterparty facet writes authority", async () => {
    await opened(SUPPLIER_RECORDS);
    await userEvent.setup().click(within(panel()).getByRole("button", { name: /^MUNICIPIUL BRAȘOV/ }));
    await waitFor(() => expect(filterInUrl()).toEqual({ authority: "4000001" }));
  });

  it("an authority's counterparty facet writes supplier", async () => {
    await opened("/explore/authority/4000001/records");
    await userEvent.setup().click(within(panel()).getByRole("button", { name: /^HACHI INVEST S\.R\.L\./ }));
    await waitFor(() => expect(filterInUrl()).toEqual({ supplier: "30000001" }));
    expect(await screen.findByText("4 Records")).toBeVisible();
  });

  it("opens with several facets on, from the URL", async () => {
    await opened(`${SUPPLIER_RECORDS}?from=2024-01-01&to=2024-12-31&channel=direct-purchase&signal=splitting&authority=4000001`);
    for (const name of [/^Direct purchase/, /^Splitting/, /^2024/, /^MUNICIPIUL BRAȘOV/]) expect(within(panel()).getByRole("button", { name, pressed: true })).toBeVisible();
    expect(await screen.findByText("2 Records")).toBeVisible();
  });

  it("an empty result says so and Clear filters empties the facets in the URL", async () => {
    await opened(`${SUPPLIER_RECORDS}?channel=contract`);
    expect(await screen.findByText("No Records match these filters.")).toBeVisible();
    expect(within(panel()).getByRole("button", { name: "Contract", pressed: true })).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(await screen.findByText("3 Records")).toBeVisible();
  });

  it("shows an estimated total with ≈ and page links for a long list", async () => {
    await opened("/explore/authority/4000001/records?to=2030-12-31");
    expect(await screen.findByText(/^≈\s1,240,000 Records$/)).toBeVisible();
    const nav = screen.getByRole("navigation", { name: "Result pages" });
    expect(within(nav).getByRole("link", { name: "Page 2" })).toHaveAttribute("href", "/explore/authority/4000001/records?to=2030-12-31&page=2");
  });

  it("is in Romanian at /ro/", async () => {
    await opened("/ro/explore/supplier/30000001/records");
    expect(within(panel()).getByRole("group", { name: "Anul atribuirii" })).toBeVisible();
    expect(within(panel()).getByRole("group", { name: "Autoritate contractantă" })).toBeVisible();
    expect(screen.getByRole("heading", { level: 2, name: "Înregistrări" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Deszăpezire străzi, sezon rece 2023-2024" })).toHaveAttribute("href", "/ro/explore/record/DA12345678");
  });
});
