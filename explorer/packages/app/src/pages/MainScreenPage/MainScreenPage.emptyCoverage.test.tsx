// Seam 3 for ticket #105: a search with no matches says so and links to the Coverage lens, keeping the county and the date chip,
// so the reader can check whether "nothing" means "not harvested". The link's URL is the codec's; following it shows the lens.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { decodeUrlState } from "../../urlState/codec.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const here = () => window.location.pathname + window.location.search;
const open = (url: string) => {
  openAt(url);
  const { client, sent } = fixtureClient();
  return { ...render(<App client={client} loadCountyTopology={loadTestCountyTopology} />), sent };
};

describe.each([
  { locale: "en", prefix: "", message: "No Records match." },
  { locale: "ro", prefix: "/ro", message: "Nicio înregistrare nu corespunde." },
] as const)("the empty state of the result tabs at $prefix/explore/", ({ locale, prefix, message }) => {
  const t = catalogue[locale];
  const search = "q=zzzzzz&county=RO-CJ&countySide=supplier&from=2023-01-01&to=2023-12-31&tab=records";

  it("shows the message and a link whose URL selects the Coverage lens with the same county and date chip", async () => {
    open(`${prefix}/explore/?${search}`);
    const panel = await screen.findByRole("tabpanel");
    await waitFor(() => expect(within(panel).getByText(message)).toBeVisible());
    const link = within(panel).getByRole("link", { name: t.results.emptyLink });

    const href = link.getAttribute("href") ?? "";
    const [path, query] = href.split("?");
    expect(path).toBe(`${prefix}/explore/`);
    // decoded by the codec: the Coverage lens, the same county and dates; the query, the side and the tab are not carried
    expect(decodeUrlState(query ?? "")).toEqual({ filter: { county: "RO-CJ", from: "2023-01-01", to: "2023-12-31" }, lens: "coverage" });
  });

  it("shows the Coverage lens when followed, in the same window, without a page load", async () => {
    const { sent } = open(`${prefix}/explore/?${search}`);
    const user = userEvent.setup();
    const panel = await screen.findByRole("tabpanel");
    const link = await within(panel).findByRole("link", { name: t.results.emptyLink });
    const href = link.getAttribute("href") ?? "";
    await user.click(link);

    await waitFor(() => expect(here()).toBe(href));
    expect(await screen.findByRole("button", { name: new RegExp(`^${t.coverageLensMap.tiles.national}`) })).toBeVisible();
    expect(screen.getByRole("region", { name: t.coverage.grid.label })).toBeVisible();
    expect(sent.filter((s) => s.operation === "CoverageLens").map((s) => JSON.stringify(s.variables))).toEqual(['{"window":{"from":"2023-01-01","to":"2023-12-31"}}']);
  });

  it("links from every empty tab, and says nothing about spending", async () => {
    open(`${prefix}/explore/?q=zzzzzz`);
    const panel = await screen.findByRole("tabpanel");
    await waitFor(() => expect(within(panel).getByRole("link", { name: t.results.emptyLink })).toHaveAttribute("href", `${prefix}/explore/?lens=coverage`));
    expect(panel).toHaveTextContent(t.results.empty.suppliers);
  });
});

describe.each([
  { locale: "en", prefix: "", message: "No suppliers match." },
  { locale: "ro", prefix: "/ro", message: "Niciun furnizor nu corespunde." },
] as const)("the empty full-results view at $prefix/explore/search", ({ locale, prefix, message }) => {
  const t = catalogue[locale];

  it("shows the same message and link, and following it shows the Coverage lens", async () => {
    open(`${prefix}/explore/search?q=zzzzzz`);
    const user = userEvent.setup();
    expect(await screen.findByText(message)).toBeVisible();
    const link = screen.getByRole("link", { name: t.results.emptyLink });
    expect(link).toHaveAttribute("href", `${prefix}/explore/?lens=coverage`);
    await user.click(link);
    await waitFor(() => expect(here()).toBe(`${prefix}/explore/?lens=coverage`));
    expect(await screen.findByRole("region", { name: t.coverage.grid.label })).toBeVisible();
  });
});
