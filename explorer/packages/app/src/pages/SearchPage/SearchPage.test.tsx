// Seam 3 for the full-results view: the page lives in the URL, through the codec.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const pages = () => screen.getByRole("navigation", { name: /^(Result pages|Paginile rezultatelor)$/ });

describe("the full-results view at /explore/search", () => {
  it("opens on the page the URL names, asking the API for that offset", async () => {
    openAt("/explore/search?from=2021-01-01&tab=records&page=2");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByText("Showing 51–100 of 120")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Records 120" })).toBeVisible();
    expect(within(pages()).getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(sent.at(-1)).toMatchObject({ operation: "FullResultsRecords", variables: { filter: { from: "2021-01-01" }, limit: 50, offset: 50 } });
  });

  it("shows Suppliers by default, from the first page", async () => {
    openAt("/explore/search");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByRole("heading", { name: "Suppliers 3" })).toBeVisible();
    expect(screen.getByRole("link", { name: "ȘANTIERUL ȚARA DEMO SRL" })).toHaveAttribute("href", "/explore/supplier/2000007");
    expect(screen.queryByRole("navigation", { name: "Result pages" })).not.toBeInTheDocument();
    expect(sent.at(-1)).toMatchObject({ operation: "FullResultsSuppliers", variables: { limit: 50, offset: 0 } });
  });

  it("changes the page in the URL through the codec, replacing the history entry; page 1 leaves `page` out", async () => {
    openAt("/explore/search?from=2021-01-01&tab=records&page=2");
    const before = window.history.length;
    const { client } = fixtureClient();
    render(<App client={client} />);
    const user = userEvent.setup();

    await user.click(within(await waitForPages()).getByRole("link", { name: "Page 3" }));
    await waitFor(() => expect(window.location.search).toBe("?from=2021-01-01&tab=records&page=3"));
    expect(await screen.findByText("Showing 101–120 of 120")).toBeVisible(); // the last page is partial
    expect(within(pages()).queryByRole("link", { name: "Next" })).not.toBeInTheDocument();

    await user.click(within(pages()).getByRole("link", { name: "Page 1" }));
    await waitFor(() => expect(window.location.search).toBe("?from=2021-01-01&tab=records"));
    expect(await screen.findByText("Showing 1–50 of 120")).toBeVisible();
    expect(window.history.length).toBe(before);
  });

  it("keeps the filter in the page links and in the way back to the results", async () => {
    openAt("/ro/explore/search?from=2021-01-01&tab=records&page=2");
    const { client } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByText("Se afișează 51–100 din 120")).toBeVisible();
    expect(within(pages()).getByRole("link", { name: "Pagina 3" })).toHaveAttribute("href", "/ro/explore/search?from=2021-01-01&tab=records&page=3");
    expect(screen.getByRole("link", { name: "Înapoi la rezultate" })).toHaveAttribute("href", "/ro/explore/?from=2021-01-01&tab=records");
  });

  it("Back to results adds a history entry, so the browser's back button returns to this page", async () => {
    openAt("/explore/search?from=2021-01-01&tab=records&page=2");
    const before = window.history.length;
    const { client } = fixtureClient();
    render(<App client={client} />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("link", { name: "Back to results" }));
    await waitFor(() => expect(window.location.pathname).toBe("/explore/"));
    expect(window.history.length).toBe(before + 1);
  });

  it("a stale page on a one-page result reads in the singular", async () => {
    openAt("/explore/search?tab=authorities&q=deszapezire&page=3");
    const { client } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByText("This page is past the end: there is only 1 page.")).toBeVisible();
  });

  it("a page past the last says so and links back to page 1", async () => {
    openAt("/explore/search?from=2021-01-01&tab=records&page=4");
    const { client } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByText("This page is past the end: there are only 3 pages.")).toBeVisible();
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Go to page 1" }));
    await waitFor(() => expect(window.location.search).toBe("?from=2021-01-01&tab=records"));
    expect(await screen.findByText("Showing 1–50 of 120")).toBeVisible();
  });
});

// The recorded answers (seam 1, archive-moneymap): the page asks the API for exactly the state the URL carries.
describe("the full-results view against the recorded API answers", () => {
  it("carries the query, the county and the tab from the URL into the request", async () => {
    openAt("/explore/search?q=comuna&county=RO-BV&tab=records");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { name: "Records 5" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Drum comunal" })).toHaveAttribute("href", "/explore/record/CAN9800001~1");
    expect(sent.at(-1)).toMatchObject({ operation: "FullResultsRecords", variables: { filter: { q: "comuna", county: "RO-BV" }, limit: 50, offset: 0 } });
  });

  it("orders the Records the way the URL says", async () => {
    openAt("/explore/search?q=comuna&tab=records&order=date-desc");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { name: "Records 8" })).toBeVisible();
    expect(sent.at(-1)).toMatchObject({ operation: "FullResultsRecords", variables: { filter: { q: "comuna" }, order: "DATE_DESC" } });
  });

  it("asks for the supplier side when the URL says so, in Romanian too", async () => {
    openAt("/ro/explore/search?county=RO-BV&countySide=supplier");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { name: "Furnizori 1" })).toBeVisible();
    expect(screen.getByRole("link", { name: "ȘANTIERUL ȚARA DEMO SRL" })).toHaveAttribute("href", "/ro/explore/supplier/2000007");
    expect(sent.at(-1)).toMatchObject({ operation: "FullResultsSuppliers", variables: { filter: { county: "RO-BV", countySide: "SUPPLIER" } } });
  });

  it("shows the authorities of a county, and the way back keeps the county and side", async () => {
    openAt("/explore/search?county=RO-BV&tab=authorities");
    const { client } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByRole("heading", { name: "Authorities 7" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Back to results" })).toHaveAttribute("href", "/explore/?county=RO-BV&tab=authorities");
  });

  it("says nothing matches, and types a new query into the URL", async () => {
    openAt("/explore/search?q=zzzzzz");
    const { client } = fixtureClient();
    render(<App client={client} />);
    expect(await screen.findByText("No suppliers match.")).toBeVisible();
    await userEvent.setup().clear(screen.getByRole("searchbox"));
    await waitFor(() => expect(window.location.search).toBe(""));
    expect(await screen.findByRole("heading", { name: "Suppliers 3" })).toBeVisible();
  });
});

const waitForPages = async () => {
  await screen.findByText(/^Showing/);
  return pages();
};
