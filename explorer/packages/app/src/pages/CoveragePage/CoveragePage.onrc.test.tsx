// Seam 3 for the Coverage Source selector (#178): the page at both Sources, answering from the contract's ONRC coverage fixture.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { onrcWholeCoverage } from "../../testing/sourceFixtures.ts";

afterEach(() => openAt("/"));

function open(url: string, options: Parameters<typeof fixtureClient>[0] = { extra: [onrcWholeCoverage] }) {
  openAt(url);
  const fixture = fixtureClient(options);
  render(<App client={fixture.client} />);
  return fixture;
}
const here = () => `${window.location.pathname}${window.location.search}`;

describe.each([
  { base: "/explore", c: catalogue.en, locale: "en" },
  { base: "/ro/explore", c: catalogue.ro, locale: "ro" },
] as const)("the Coverage page's Source selector at $base", ({ base, c }) => {
  const s = c.sources;
  const selector = () => within(screen.getByRole("group", { name: s.coverageSwitch.label }));

  it("opens SEAP's quarter grid at the plain URL, with SEAP chosen in the selector", async () => {
    const { sent } = open(`${base}/coverage`);
    await screen.findByRole("region", { name: c.coverage.gridHeading });
    expect(selector().getByRole("button", { name: "SEAP", pressed: true })).toBeVisible();
    expect(sent.map((r) => r.operation)).toEqual(["CoveragePage"]);
  });

  it("opens ONRC's coverage at source=onrc: the data-through date, one row per snapshot, and a gap for the month with none", async () => {
    const { sent } = open(`${base}/coverage?source=onrc`);
    const table = await screen.findByRole("table", { name: s.onrc.coverage.snapshots.label });
    expect(screen.getByRole("heading", { level: 1, name: s.onrc.coverage.title })).toBeVisible();
    expect(selector().getByRole("button", { name: "ONRC", pressed: true })).toBeVisible();
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.getAttribute("data-state"))).toEqual(["LOADED", "KNOWN_GAP", "LOADED"]);
    expect(rows[1]).toHaveTextContent(s.onrc.coverage.snapshots.missingSnapshot);
    expect(screen.getByText(new RegExp(`${s.onrc.coverage.snapshots.dataThroughKind}: ${s.onrc.coverage.snapshots.dataThrough.through}`))).toBeVisible();
    // ONRC's page asks for ONRC's coverage, whole, and never SEAP's quarter grid
    expect(sent.map((r) => [r.operation, r.variables])).toEqual([["OnrcCoverage", {}]]);
  });

  it("moves between the Sources with the selector, the URL carrying the choice (SEAP's the plain one)", async () => {
    open(`${base}/coverage`);
    await screen.findByRole("region", { name: c.coverage.gridHeading });
    await userEvent.click(selector().getByRole("button", { name: "ONRC" }));
    expect(here()).toBe(`${base}/coverage?source=onrc`);
    await screen.findByRole("table", { name: s.onrc.coverage.snapshots.label });
    await userEvent.click(selector().getByRole("button", { name: "SEAP" }));
    expect(here()).toBe(`${base}/coverage`);
    expect(await screen.findByRole("region", { name: c.coverage.gridHeading })).toBeVisible();
  });

  it("says no ONRC snapshot is held when there is none", async () => {
    open(`${base}/coverage?source=onrc`, { extra: [{ operation: "OnrcCoverage", variables: {}, data: { sources: [], coverage: { window: { from: null, to: null }, denominator: "NONE", counties: [], grid: [] } } }] });
    expect(await screen.findByRole("status")).toHaveTextContent(s.onrc.coverage.snapshots.empty);
  });

  it("settles on a message when ONRC's coverage cannot be loaded", async () => {
    open(`${base}/coverage?source=onrc`, { failing: ["OnrcCoverage"] });
    expect(await screen.findByText(c.status.failed)).toBeVisible();
  });

  it("keeps SEAP's page behind a date-chip link: the window still only highlights", async () => {
    open(`${base}/coverage?from=2023-01-01&to=2023-12-31`);
    await screen.findByRole("region", { name: c.coverage.gridHeading });
    await waitFor(() => expect(document.querySelectorAll("th[aria-current='true']").length).toBeGreaterThan(0));
  });
});
