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
    openAt("/explore/search?tab=records&page=2");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByText("Showing 51–100 of 120")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Records 120" })).toBeVisible();
    expect(within(pages()).getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    expect(sent.at(-1)).toMatchObject({ operation: "FullResultsRecords", variables: { filter: {}, limit: 50, offset: 50 } });
  });

  it("shows Suppliers by default, from the first page", async () => {
    openAt("/explore/search");
    const { client, sent } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByRole("heading", { name: "Suppliers 3" })).toBeVisible();
    expect(screen.getByRole("link", { name: "CONSTRUCȚII TRANSILVANIA S.A." })).toHaveAttribute("href", "/explore/supplier/30000002");
    expect(screen.queryByRole("navigation", { name: "Result pages" })).not.toBeInTheDocument();
    expect(sent.at(-1)).toMatchObject({ operation: "FullResultsSuppliers", variables: { limit: 50, offset: 0 } });
  });

  it("changes the page in the URL through the codec, replacing the history entry; page 1 leaves `page` out", async () => {
    openAt("/explore/search?tab=records&page=2");
    const before = window.history.length;
    const { client } = fixtureClient();
    render(<App client={client} />);
    const user = userEvent.setup();

    await user.click(within(await waitForPages()).getByRole("link", { name: "Page 3" }));
    await waitFor(() => expect(window.location.search).toBe("?tab=records&page=3"));
    expect(await screen.findByText("Showing 101–120 of 120")).toBeVisible(); // the last page is partial
    expect(within(pages()).queryByRole("link", { name: "Next" })).not.toBeInTheDocument();

    await user.click(within(pages()).getByRole("link", { name: "Page 1" }));
    await waitFor(() => expect(window.location.search).toBe("?tab=records"));
    expect(await screen.findByText("Showing 1–50 of 120")).toBeVisible();
    expect(window.history.length).toBe(before);
  });

  it("keeps the filter in the page links and in the way back to the results", async () => {
    openAt("/ro/explore/search?tab=records&page=2");
    const { client } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByText("Se afișează 51–100 din 120")).toBeVisible();
    expect(within(pages()).getByRole("link", { name: "Pagina 3" })).toHaveAttribute("href", "/ro/explore/search?tab=records&page=3");
    expect(screen.getByRole("link", { name: "Înapoi la rezultate" })).toHaveAttribute("href", "/ro/explore/?tab=records");
  });

  it("Back to results adds a history entry, so the browser's back button returns to this page", async () => {
    openAt("/explore/search?tab=records&page=2");
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
    openAt("/explore/search?tab=records&page=4");
    const { client } = fixtureClient();
    render(<App client={client} />);

    expect(await screen.findByText("This page is past the end: there are only 3 pages.")).toBeVisible();
    const user = userEvent.setup();
    await user.click(screen.getByRole("link", { name: "Go to page 1" }));
    await waitFor(() => expect(window.location.search).toBe("?tab=records"));
    expect(await screen.findByText("Showing 1–50 of 120")).toBeVisible();
  });
});

const waitForPages = async () => {
  await screen.findByText(/^Showing/);
  return pages();
};
