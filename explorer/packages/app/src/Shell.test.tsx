// Seam 3: the app shell against the contract's mock responses. Every route, both languages, the language switch, the URL state.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.tsx";
import { catalogue } from "./copy/index.ts";
import { fixtureClient } from "./testing/fixtureClient.ts";
import { openAt } from "./testing/openAt.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const here = () => window.location.pathname + window.location.search;

/** Each route (path after the language prefix) with the heading its placeholder shows, per language. */
const ROUTES = [
  { path: "search", en: catalogue.en.pages.search.title, ro: catalogue.ro.pages.search.title },
  { path: "authority/4305857", en: catalogue.en.pages.authority.overview, ro: catalogue.ro.pages.authority.overview, detail: "4305857" },
  { path: "authority/4305857/records", en: catalogue.en.pages.authority.records, ro: catalogue.ro.pages.authority.records, detail: "4305857" },
  { path: "authority/4305857/relationships", en: catalogue.en.pages.authority.relationships, ro: catalogue.ro.pages.authority.relationships, detail: "4305857" },
  { path: "supplier/name-popescu-srl", en: catalogue.en.pages.supplier.overview, ro: catalogue.ro.pages.supplier.overview, detail: "name-popescu-srl" },
  { path: "supplier/name-popescu-srl/records", en: catalogue.en.pages.supplier.records, ro: catalogue.ro.pages.supplier.records, detail: "name-popescu-srl" },
  { path: "supplier/name-popescu-srl/relationships", en: catalogue.en.pages.supplier.relationships, ro: catalogue.ro.pages.supplier.relationships, detail: "name-popescu-srl" },
  { path: "record/CAN1170001", en: catalogue.en.pages.record.title, ro: catalogue.ro.pages.record.title, detail: "CAN1170001" },
  { path: "coverage", en: catalogue.en.pages.coverage.title, ro: catalogue.ro.pages.coverage.title },
  { path: "methodology", en: catalogue.en.pages.methodology.title, ro: catalogue.ro.pages.methodology.title },
] as const;

describe("every route renders its placeholder in both languages", () => {
  it.each(ROUTES)("/explore/$path in English and /ro/explore/$path in Romanian", (route) => {
    for (const [locale, prefix] of [["en", "/explore"], ["ro", "/ro/explore"]] as const) {
      openAt(`${prefix}/${route.path}`);
      const { unmount } = render(<App client={fixtureClient().client} />);
      expect(screen.getByRole("heading", { level: 1, name: route[locale] })).toBeInTheDocument();
      if ("detail" in route) expect(screen.getByTestId("route-detail")).toHaveTextContent(route.detail);
      expect(screen.getByText(catalogue[locale].pages.placeholder)).toBeInTheDocument();
      expect(document.documentElement.lang).toBe(locale);
      unmount();
    }
  });

  it("shows the main screen at /explore/ and /ro/explore/", async () => {
    for (const [locale, prefix] of [["en", "/explore/"], ["ro", "/ro/explore/"]] as const) {
      openAt(prefix);
      const { unmount } = render(<App client={fixtureClient().client} />);
      expect(screen.getByRole("heading", { level: 1, name: catalogue[locale].main.title })).toBeInTheDocument();
      expect(await screen.findByTestId("total-awarded")).toBeInTheDocument();
      unmount();
    }
  });

  it("offers a way back from a path it does not know", async () => {
    openAt("/ro/explore/nope");
    render(<App client={fixtureClient().client} />);
    expect(screen.getByRole("heading", { level: 1, name: catalogue.ro.pages.notFound.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: catalogue.ro.pages.notFound.back }));
    expect(here()).toBe("/ro/explore/");
  });
});

describe("the EN/RO switch", () => {
  it("keeps the route and its query string, both ways", async () => {
    openAt("/explore/authority/4305857/records?q=pod&signal=splitting&page=2&tab=records");
    render(<App client={fixtureClient().client} />);
    expect(screen.getByTestId("language-switch")).toHaveAttribute("href", "/ro/explore/authority/4305857/records?q=pod&signal=splitting&page=2&tab=records");

    await userEvent.click(screen.getByRole("link", { name: catalogue.en.language.switchLabel }));
    expect(here()).toBe("/ro/explore/authority/4305857/records?q=pod&signal=splitting&page=2&tab=records");
    expect(screen.getByRole("heading", { level: 1, name: catalogue.ro.pages.authority.records })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ro");

    await userEvent.click(screen.getByRole("link", { name: catalogue.ro.language.switchLabel }));
    expect(here()).toBe("/explore/authority/4305857/records?q=pod&signal=splitting&page=2&tab=records");
    expect(screen.getByRole("heading", { level: 1, name: catalogue.en.pages.authority.records })).toBeInTheDocument();
  });

  it("works from the main screen too", async () => {
    openAt("/explore/?cpv=301");
    render(<App client={fixtureClient().client} />);
    await userEvent.click(screen.getByTestId("language-switch"));
    expect(here()).toBe("/ro/explore/?cpv=301");
  });

  it("is a plain link the reader can open in a new tab", () => {
    openAt("/explore/coverage?from=2024-01-01");
    render(<App client={fixtureClient().client} />);
    expect(screen.getByTestId("language-switch")).toHaveAttribute("href", "/ro/explore/coverage?from=2024-01-01");
  });
});

describe("the URL state in the app", () => {
  it("replaces the history entry while a search is typed instead of adding one", async () => {
    openAt("/explore/search");
    render(<App client={fixtureClient().client} />);
    const before = window.history.length;
    await userEvent.type(screen.getByRole("searchbox", { name: catalogue.en.searchField.label }), "pod");
    expect(here()).toBe("/explore/search?q=pod");
    expect(window.history.length).toBe(before);
    expect(screen.getByRole("searchbox")).toHaveValue("pod");
  });

  it("drops q from the URL when the box is emptied", async () => {
    openAt("/explore/search?q=pod&cpv=301");
    render(<App client={fixtureClient().client} />);
    await userEvent.clear(screen.getByRole("searchbox"));
    expect(here()).toBe("/explore/search?cpv=301");
  });

  it("follows a link as a new history entry (only URL-state updates replace)", async () => {
    openAt("/explore/search?q=pod");
    render(<App client={fixtureClient().client} />);
    const before = window.history.length;
    await userEvent.click(screen.getByRole("link", { name: catalogue.en.nav.coverage }));
    expect(here()).toBe("/explore/coverage");
    expect(window.history.length).toBe(before + 1);
  });

  it("asks the API for the filter the URL carries", async () => {
    openAt("/explore/?q=pod&cpv=301&countySide=supplier");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);
    await screen.findByRole("alert"); // no mock for this filter: the app says so
    expect(sent[0]).toMatchObject({ operation: "MainScreen", variables: { filter: { q: "pod", cpv: "301", countySide: "SUPPLIER" } } });
  });
});
