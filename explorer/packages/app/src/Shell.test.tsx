// Seam 3: the app shell against the contract's mock responses. Every route, both languages, the language switch, the URL state.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "./App.tsx";
import { catalogue } from "./copy/index.ts";
import { loadTestCountyTopology } from "./testing/countyTopology.ts";
import { fixtureClient } from "./testing/fixtureClient.ts";
import { openAt } from "./testing/openAt.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const here = () => window.location.pathname + window.location.search;

/** No placeholder route is left: the entity pages, search, Record, Coverage and methodology pages are real (see pages/*). */
describe("the routes in both languages", () => {
  it("shows the full-results view at /explore/search and /ro/explore/search", async () => {
    for (const [locale, prefix] of [["en", "/explore"], ["ro", "/ro/explore"]] as const) {
      openAt(`${prefix}/search`);
      const { unmount } = render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
      expect(screen.getByRole("heading", { level: 1, name: catalogue[locale].pages.search.title })).toBeInTheDocument();
      expect(await screen.findByRole("heading", { level: 2, name: new RegExp(`^${catalogue[locale].results.tabs.suppliers} 3$`) })).toBeInTheDocument();
      unmount();
    }
  });

  it("shows the main screen at /explore/ and /ro/explore/", async () => {
    for (const [locale, prefix] of [["en", "/explore/"], ["ro", "/ro/explore/"]] as const) {
      openAt(prefix);
      const { unmount } = render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
      expect(screen.getByRole("heading", { level: 1, name: catalogue[locale].main.title })).toBeInTheDocument();
      expect(await screen.findByTestId("main-total")).toBeInTheDocument();
      unmount();
    }
  });

  it("offers a way back from a path it does not know", async () => {
    openAt("/ro/explore/nope");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    expect(screen.getByRole("heading", { level: 1, name: catalogue.ro.pages.notFound.title })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: catalogue.ro.pages.notFound.back }));
    expect(here()).toBe("/ro/explore/");
  });
});

describe("the header and the footer", () => {
  const nav = (locale: "en" | "ro") => within(screen.getByRole("navigation", { name: catalogue[locale].nav.label }));

  it("links the brand home and the main pages, in both languages", () => {
    for (const [locale, prefix] of [["en", "/explore"], ["ro", "/ro/explore"]] as const) {
      openAt(`${prefix}/search`);
      const { unmount } = render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
      const copy = catalogue[locale];
      expect(within(screen.getByRole("banner")).getByRole("link", { name: copy.brand })).toHaveAttribute("href", `${prefix}/`);
      expect(nav(locale).getByRole("link", { name: copy.nav.explore })).toHaveAttribute("href", `${prefix}/`);
      expect(nav(locale).getByRole("link", { name: copy.nav.coverage })).toHaveAttribute("href", `${prefix}/coverage`);
      expect(nav(locale).getByRole("link", { name: copy.nav.methodology })).toHaveAttribute("href", `${prefix}/methodology`);
      unmount();
    }
  });

  it("reaches the language link with the Tab key, in both languages", async () => {
    for (const [locale, prefix] of [["en", "/explore"], ["ro", "/ro/explore"]] as const) {
      openAt(`${prefix}/search`);
      const { unmount } = render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
      const banner = within(screen.getByRole("banner"));
      const link = banner.getByRole("link", { name: catalogue[locale].language.switchLabel });
      const user = userEvent.setup();
      let reached = false;
      for (let i = 0; i < 30 && !reached; i++) {
        await user.tab();
        reached = document.activeElement === link;
      }
      expect(reached).toBe(true);
      unmount();
    }
  });

  it("marks the current page, and only that one", () => {
    const cases = [
      ["/explore/", "explore"],
      ["/explore/search", "search"],
      ["/explore/coverage", "coverage"],
      ["/ro/explore/methodology", "methodology"],
      ["/explore/authority/4384206", "explore"],
      ["/explore/record/CAN1145000", "explore"],
    ] as const;
    for (const [path, current] of cases) {
      openAt(path);
      const locale = path.startsWith("/ro/") ? "ro" : "en";
      const { unmount } = render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
      const marked = nav(locale).getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
      expect(marked.map((link) => link.textContent), path).toEqual([catalogue[locale].nav[current]]);
      unmount();
    }
  });

  it("marks no nav link on a page that is not in the nav", () => {
    openAt("/explore/nope");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    expect(nav("en").queryAllByRole("link").filter((link) => link.hasAttribute("aria-current"))).toEqual([]);
  });

  it("shows the language switch in the header, in both languages", () => {
    for (const [locale, other, prefix] of [["en", "ro", "/explore/"], ["ro", "en", "/ro/explore/"]] as const) {
      openAt(prefix);
      const { unmount } = render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
      const banner = within(screen.getByRole("banner"));
      expect(banner.getByRole("link", { name: catalogue[locale].language.switchLabel })).toHaveTextContent(catalogue[locale].language.switchTo);
      expect(banner.getByText(catalogue[locale].language.current)).toHaveAttribute("aria-current", "true");
      expect(catalogue[other].language.current).toBe(catalogue[locale].language.switchTo);
      unmount();
    }
  });

  it("states where the data comes from and that Signals are never scored, in both languages", () => {
    for (const [locale, prefix] of [["en", "/explore/"], ["ro", "/ro/explore/"]] as const) {
      openAt(prefix);
      const { unmount } = render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
      const footer = within(screen.getByRole("contentinfo"));
      expect(footer.getByText(catalogue[locale].footer.provenance)).toBeInTheDocument();
      expect(footer.getByText(catalogue[locale].footer.signals)).toBeInTheDocument();
      unmount();
    }
    expect(catalogue.en.footer.signals).toBe("Signals are counted, never scored");
    expect(catalogue.en.footer.provenance).toMatch(/SEAP.*data\.gov\.ro.*e-licitatie\.ro/);
    expect(catalogue.ro.footer.provenance).toMatch(/SEAP.*data\.gov\.ro.*e-licitatie\.ro/);
  });
});

describe("the EN/RO switch", () => {
  it("keeps the route and its query string, both ways", async () => {
    openAt("/explore/record/CAN9800006~1?q=pod&signal=splitting&page=2&tab=records");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    expect(screen.getByTestId("language-switch")).toHaveAttribute("href", "/ro/explore/record/CAN9800006~1?q=pod&signal=splitting&page=2&tab=records");

    await userEvent.click(screen.getByRole("link", { name: catalogue.en.language.switchLabel }));
    expect(here()).toBe("/ro/explore/record/CAN9800006~1?q=pod&signal=splitting&page=2&tab=records");
    expect(await screen.findByRole("heading", { level: 1, name: "Contract CAN9800006 1" })).toBeInTheDocument();
    expect(screen.getByText("Valoare publicată")).toBeInTheDocument();
    expect(document.documentElement.lang).toBe("ro");

    await userEvent.click(screen.getByRole("link", { name: catalogue.ro.language.switchLabel }));
    expect(here()).toBe("/explore/record/CAN9800006~1?q=pod&signal=splitting&page=2&tab=records");
    expect(await screen.findByText("Value as published")).toBeInTheDocument();
  });

  it("works from the main screen too", async () => {
    openAt("/explore/?cpv=301");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    await userEvent.click(screen.getByTestId("language-switch"));
    expect(here()).toBe("/ro/explore/?cpv=301");
  });

  it("is a plain link the reader can open in a new tab", () => {
    openAt("/explore/coverage?from=2024-01-01");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    expect(screen.getByTestId("language-switch")).toHaveAttribute("href", "/ro/explore/coverage?from=2024-01-01");
  });
});

describe("the URL state in the app", () => {
  it("replaces the history entry while a search is typed instead of adding one", async () => {
    openAt("/explore/search");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    const before = window.history.length;
    await userEvent.type(screen.getByRole("searchbox", { name: catalogue.en.searchBar.label }), "pod");
    expect(here()).toBe("/explore/search"); // not yet: the search waits for typing to pause
    await waitFor(() => expect(here()).toBe("/explore/search?q=pod"));
    expect(window.history.length).toBe(before);
    expect(screen.getByRole("searchbox")).toHaveValue("pod");
  });

  it("drops q from the URL when the box is emptied", async () => {
    openAt("/explore/search?q=pod&cpv=301");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    await userEvent.clear(screen.getByRole("searchbox"));
    await waitFor(() => expect(here()).toBe("/explore/search?cpv=301"));
  });

  it("follows a link as a new history entry (only URL-state updates replace)", async () => {
    openAt("/explore/search?q=pod");
    render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
    const before = window.history.length;
    await userEvent.click(screen.getByRole("link", { name: catalogue.en.nav.coverage }));
    expect(here()).toBe("/explore/coverage");
    expect(window.history.length).toBe(before + 1);
  });

  it("asks the API for the filter the URL carries", async () => {
    openAt("/explore/?q=pod&cpv=301&countySide=supplier");
    const { client, sent } = fixtureClient();
    render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
    await screen.findByRole("alert"); // no mock for this filter: the app says so
    expect(sent[0]).toMatchObject({ operation: "MainScreen", variables: { filter: { q: "pod", cpv: "301", countySide: "SUPPLIER" } } });
  });
});
