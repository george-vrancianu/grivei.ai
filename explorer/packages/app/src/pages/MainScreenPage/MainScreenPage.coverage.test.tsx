// Seam 3 for ticket #90: the Coverage lens of the main screen against the recorded CoverageLens and CoveragePage responses (`@grivei/contract`
// `fixtures/recorded`, made by seam 1), in English and Romanian. The date chip is the lens's window and the compact grid's highlight.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const here = () => window.location.pathname + window.location.search;
const open = (url: string, failing: readonly string[] = []) => {
  openAt(url);
  const { client, sent } = fixtureClient({ failing });
  return { ...render(<App client={client} loadCountyTopology={loadTestCountyTopology} />), sent };
};
const plain = (text: string | null) => (text ?? "").replaceAll(" ", " ");
const county = (name: string) => screen.findByRole("button", { name: new RegExp(`^${name}: `) });
const asked = (sent: { operation: string; variables: unknown }[], operation: string) => sent.filter((s) => s.operation === operation).map((s) => JSON.stringify(s.variables));
const inRange = () => [...document.querySelectorAll<HTMLElement>("[data-compact] th[aria-current='true']")].map((th) => th.dataset["quarter"]);

describe.each([
  {
    locale: "en", url: "/explore/", prefix: "",
    partial: "Partial", knownGaps: "Harvested, with known gaps",
    openSentence: "4 of 6 public entities have SEAP records since 2021, plus 3 other contracting authorities",
    year2023Sentence: "4 of 6 public entities have SEAP records since 1 Jan 2023, plus 3 other contracting authorities",
    nationalSentence: "2 of 3 public entities have SEAP records since 2021",
    unplaced: ["3 authorities without a county", "1 authority without a county"],
    planned: "Not harvested yet: ONRC, ANI, Ministerul Finanțelor, portal.just.ro",
    fromYear: "From year", toYear: "To year",
    notHarvested: "Not harvested",
  },
  {
    locale: "ro", url: "/ro/explore/", prefix: "/ro",
    partial: "Parțial", knownGaps: "Colectat, cu lacune cunoscute",
    openSentence: "4 din 6 entități publice au înregistrări SEAP începând cu 2021, plus 3 alte autorități contractante",
    year2023Sentence: "4 din 6 entități publice au înregistrări SEAP începând cu 1 ian. 2023, plus 3 alte autorități contractante",
    nationalSentence: "2 din 3 entități publice au înregistrări SEAP începând cu 2021",
    unplaced: ["3 autorități fără județ", "1 autoritate fără județ"],
    planned: "Necolectate încă: ONRC, ANI, Ministerul Finanțelor, portal.just.ro",
    fromYear: "Din anul", toYear: "Până în anul",
    notHarvested: "Necolectat",
  },
] as const)("the Coverage lens at $url", (c) => {
  const t = catalogue[c.locale];

  it("shows the statuses, N of M tooltips, tiles and Source marks from the API, and the compact grid", async () => {
    const { sent } = open(`${c.url}?lens=coverage`);
    const brasov = await county("Brașov");
    expect(plain(brasov.getAttribute("aria-label"))).toBe(`Brașov: ${c.partial}. ${c.openSentence}`);
    await userEvent.hover(brasov);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(c.partial);
    expect(tooltip).toHaveTextContent(c.openSentence);
    expect(tooltip).toHaveTextContent(t.coverageLensMap.tooltip.boughtNothingNote);
    // the legend names the planned Sources, which the API serves greyed
    expect(screen.getByText(c.planned)).toBeVisible();
    const national = screen.getByRole("button", { name: new RegExp(`^${t.coverageLensMap.tiles.national}`) });
    expect(plain(national.textContent)).toContain(c.nationalSentence);
    expect(plain(screen.getByRole("button", { name: new RegExp(`^${t.coverageLensMap.tiles.unplaced}`) }).textContent)).toContain(c.unplaced[0]);
    // the compact grid beside it: the whole grid, 19 quarters, no highlight, a link to the Coverage page
    expect(screen.getByRole("region", { name: t.coverage.grid.label })).toBeVisible();
    expect(document.querySelectorAll("[data-compact] th[data-quarter]")).toHaveLength(19);
    expect(inRange()).toEqual([]);
    expect(screen.getByRole("link", { name: t.coverage.grid.seePage })).toHaveAttribute("href", `${c.prefix}/explore/coverage?lens=coverage`);
    expect(asked(sent, "CoverageLens")).toEqual(["{}"]);
    expect(asked(sent, "CoveragePage")).toEqual(["{}"]);
  });

  it("follows the date chip: the status, N of M and the tiles re-asked for the new window, and the grid highlight moved", async () => {
    const { sent } = open(`${c.url}?lens=coverage`);
    const user = userEvent.setup();
    await county("Brașov");
    expect(plain((await county("Brașov")).getAttribute("aria-label"))).toContain(`${c.partial}.`);

    await user.selectOptions(screen.getByRole("combobox", { name: c.fromYear }), "2023");
    await waitFor(() => expect(here()).toBe(`${c.url}?from=2023-01-01&lens=coverage`));
    await user.selectOptions(screen.getByRole("combobox", { name: c.toYear }), "2023");
    await waitFor(() => expect(here()).toBe(`${c.url}?from=2023-01-01&to=2023-12-31&lens=coverage`));

    // the 2023 window is past the quarantined 2022 file: the status changes, the sentence starts at the window's start
    await waitFor(async () => expect(plain((await county("Brașov")).getAttribute("aria-label"))).toBe(`Brașov: ${c.knownGaps}. ${c.year2023Sentence}`));
    expect(plain(screen.getByRole("button", { name: new RegExp(`^${t.coverageLensMap.tiles.unplaced}`) }).textContent)).toContain(c.unplaced[1]);
    // the grid is not re-asked (a windowed answer would be cut to it): the same cells, the window's quarters marked
    expect(inRange()).toEqual(["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4"]);
    expect(document.querySelectorAll("[data-compact] th[data-quarter]")).toHaveLength(19);
    expect(screen.getByRole("link", { name: t.coverage.grid.seePage })).toHaveAttribute("href", `${c.prefix}/explore/coverage?from=2023-01-01&to=2023-12-31&lens=coverage`);
    expect(asked(sent, "CoverageLens")).toEqual(["{}", '{"window":{"from":"2023-01-01"}}', '{"window":{"from":"2023-01-01","to":"2023-12-31"}}']);
    expect(asked(sent, "CoveragePage")).toEqual(["{}"]);
  });

  it("reads the window from the URL alone, and the Coverage page link carries it so the page highlights the same quarters", async () => {
    const { sent } = open(`${c.url}?from=2023-01-01&to=2023-12-31&lens=coverage`);
    const user = userEvent.setup();
    expect(plain((await county("Brașov")).getAttribute("aria-label"))).toContain(`${c.knownGaps}.`);
    expect(asked(sent, "CoverageLens")).toEqual(['{"window":{"from":"2023-01-01","to":"2023-12-31"}}']);
    await user.click(screen.getByRole("link", { name: t.coverage.grid.seePage }));
    await waitFor(() => expect(here()).toBe(`${c.prefix}/explore/coverage?from=2023-01-01&to=2023-12-31&lens=coverage`));
    await screen.findByRole("heading", { level: 1, name: t.coverage.title });
    const marked = [...document.querySelectorAll<HTMLElement>("th[aria-current='true']")].map((th) => th.dataset["quarter"]);
    expect(marked).toEqual(["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4"]);
  });

  it("filters the results with a county click, as the Money lens does, and a second click takes it back", async () => {
    const { sent } = open(`${c.url}?lens=coverage`);
    const user = userEvent.setup();
    await user.click(await county("Brașov"));
    await waitFor(() => expect(here()).toBe(`${c.url}?county=RO-BV&lens=coverage`));
    expect(await screen.findByRole("button", { name: new RegExp(`^Brașov: `), pressed: true })).toBeVisible();
    await waitFor(() => expect(asked(sent, "MainScreen")).toContain('{"filter":{"county":"RO-BV"}}'));
    await user.click(screen.getByRole("button", { name: new RegExp(`^Brașov: `) }));
    await waitFor(() => expect(here()).toBe(`${c.url}?lens=coverage`));
    // the lens answer does not depend on the county: asked once
    expect(asked(sent, "CoverageLens")).toEqual(["{}"]);
  });

  it("takes the Unplaced tile as an authority area even when the supplier side was chosen", async () => {
    open(`${c.url}?countySide=supplier&lens=coverage`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: new RegExp(`^${t.coverageLensMap.tiles.unplaced}`) }));
    // the area is an authority one: the side goes back to the default instead of matching nothing
    await waitFor(() => expect(here()).toBe(`${c.url}?county=UNPLACED&lens=coverage`));
  });

  it("shows a window before any harvest as not harvested, M unchanged", async () => {
    open(`${c.url}?to=2020-12-31&lens=coverage`);
    const brasov = await county("Brașov");
    expect(plain(brasov.getAttribute("aria-label"))).toContain(c.notHarvested);
  });

  it("asks nothing for Coverage while the Money lens is shown", async () => {
    const { sent } = open(c.url);
    await screen.findByTestId("main-total");
    expect(sent.map((s) => s.operation)).toEqual(["MainScreen"]);
  });
});

describe("the Coverage lens' states", () => {
  it("says so when the Coverage answer cannot be loaded, and leaves the results working", async () => {
    open("/explore/?lens=coverage", ["CoverageLens"]);
    expect((await screen.findAllByRole("alert")).map((a) => a.textContent)).toContain(catalogue.en.status.failed);
    expect(await screen.findByTestId("main-total")).toBeVisible();
  });

  it("shows the lens named in the toggle, pressed, with the map and the grid in its slot only", async () => {
    open("/explore/?lens=coverage");
    await county("Brașov");
    const toggle = screen.getByRole("group", { name: catalogue.en.mainScreenLayout.lens.label });
    expect(within(toggle).getByRole("button", { name: "Coverage" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /^Brașov: RON/ })).toBeNull(); // not the Money lens's county names
  });
});
