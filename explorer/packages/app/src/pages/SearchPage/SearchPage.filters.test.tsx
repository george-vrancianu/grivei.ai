// Seam 3 for Full results (#268): the per-kind title, the active filter chips under the search box, and what a change keeps in the URL.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fixtures } from "@grivei/contract/fixtures";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { fixtureClient, type ExtraFixture } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const recordsAnswer = fixtures.FullResultsRecords.find((f) => f.variables.offset === 0 && !f.variables.order)!.data;
const records = (filter: Record<string, unknown>, offset: number, order?: string): ExtraFixture => ({
  operation: "FullResultsRecords",
  variables: { filter, limit: 50, offset, ...(order ? { order } : {}) },
  data: recordsAnswer,
});

describe.each([
  { locale: "en", base: "/explore" },
  { locale: "ro", base: "/ro/explore" },
] as const)("the Full results title at $base/search", ({ locale, base }) => {
  const t = catalogue[locale];
  it.each([
    ["", "suppliers"],
    ["?tab=suppliers", "suppliers"],
    ["?tab=authorities", "authorities"],
    ["?tab=records&from=2021-01-01", "records"],
  ] as const)("names the tab shown (%s)", async (query, tab) => {
    openAt(`${base}/search${query}`);
    render(<App client={fixtureClient().client} />);
    expect(await screen.findByRole("heading", { level: 1, name: t.pages.search.title[tab] })).toBeVisible();
    expect(screen.queryByRole("heading", { level: 1, name: /^(Search|Căutare)$/ })).not.toBeInTheDocument();
  });
});

it("says the kind in words in English and Romanian", () => {
  expect(catalogue.en.pages.search.title).toEqual({ suppliers: "All suppliers", authorities: "All contracting authorities", records: "All Records" });
  expect(catalogue.ro.pages.search.title).toEqual({ suppliers: "Toți furnizorii", authorities: "Toate autoritățile contractante", records: "Toate înregistrările" });
});

it("opens bare /explore/search on unfiltered Suppliers, with no chips", async () => {
  openAt("/explore/search");
  const { client, sent } = fixtureClient();
  render(<App client={client} />);
  expect(await screen.findByRole("heading", { name: "Suppliers 3" })).toBeVisible();
  expect(sent.at(-1)).toMatchObject({ operation: "FullResultsSuppliers", variables: { filter: {}, offset: 0 } });
  expect(screen.queryByRole("group", { name: catalogue.en.filterChips.active.group })).not.toBeInTheDocument();
});

describe("the active filter chips", () => {
  const url = "/explore/search?from=2021-01-01&to=2021-12-31&tab=records&page=2&order=date-desc";
  const extra = [records({ from: "2021-01-01", to: "2021-12-31" }, 50, "DATE_DESC"), records({ from: "2021-01-01" }, 0, "DATE_DESC"), records({ from: "2021-01-01", to: "2021-12-31", q: "pod" }, 0, "DATE_DESC")];

  it("are shown for a filtered URL, with no facet menus", async () => {
    openAt(url);
    render(<App client={fixtureClient({ extra }).client} />);
    const chips = await screen.findByRole("group", { name: "Active filters" });
    expect(within(chips).getByRole("button", { name: "Remove From 2021" })).toBeVisible();
    expect(within(chips).getByRole("button", { name: "Remove Until 2021" })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Award year|Channel/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  it("removing one drops page, keeps tab and order, and asks for the changed filter", async () => {
    openAt(url);
    const { client, sent } = fixtureClient({ extra });
    render(<App client={client} />);
    await userEvent.click(await screen.findByRole("button", { name: "Remove Until 2021" }));
    await waitFor(() => expect(window.location.search).toBe("?from=2021-01-01&tab=records&order=date-desc"));
    await waitFor(() => expect(sent.at(-1)).toMatchObject({ operation: "FullResultsRecords", variables: { filter: { from: "2021-01-01" }, offset: 0, order: "DATE_DESC" } }));
    expect(screen.queryByRole("button", { name: "Remove Until 2021" })).not.toBeInTheDocument();
  });

  it("Clear all empties the filter and keeps the tab", async () => {
    openAt("/explore/search?from=2021-01-01&tab=records&page=2");
    const { client } = fixtureClient();
    render(<App client={client} />);
    await userEvent.click(await screen.findByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(window.location.search).toBe("?tab=records"));
  });

  it("removing the county chip unsets the county and its UAT", async () => {
    openAt("/explore/search?county=RO-BV&uat=1&tab=authorities");
    const { client } = fixtureClient({ extra: [{ operation: "FullResultsAuthorities", variables: { filter: { county: "RO-BV", uat: 1 }, limit: 50, offset: 0 }, data: fixtures.FullResultsAuthorities[0]!.data }] });
    render(<App client={client} />);
    await userEvent.click(await screen.findByRole("button", { name: "Remove County: RO-BV" }));
    await waitFor(() => expect(window.location.search).toBe("?tab=authorities"));
  });

  it("editing the query does the same and replaces the history entry", async () => {
    openAt(url);
    const before = window.history.length;
    render(<App client={fixtureClient({ extra }).client} />);
    await userEvent.type(await screen.findByRole("searchbox", { name: catalogue.en.searchBar.label }), "pod");
    await waitFor(() => expect(window.location.search).toBe("?q=pod&from=2021-01-01&to=2021-12-31&tab=records&order=date-desc"));
    expect(window.history.length).toBe(before);
    expect(screen.getByRole("button", { name: "Remove Until 2021" })).toBeVisible();
  });

  it("Back to results carries the edited filter and the tab", async () => {
    openAt(url);
    render(<App client={fixtureClient({ extra }).client} />);
    await userEvent.click(await screen.findByRole("button", { name: "Remove Until 2021" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Back to results" })).toHaveAttribute("href", "/explore/?from=2021-01-01&tab=records"));
  });

  it("are in Romanian under /ro", async () => {
    openAt("/ro/explore/search?from=2021-01-01");
    render(<App client={fixtureClient().client} />);
    expect(await screen.findByRole("button", { name: catalogue.ro.filterChips.active.remove(catalogue.ro.filterChips.active.from("2021")) })).toBeVisible();
  });
});
