// Seam 3 for the Coverage page's states (#257): the first load as skeletons under real panel titles, a failed request as a note with its retry inside the grid panel
// (the rest of the page stays), and the Source selector in the grid panel's header in every state. EN and /ro/. A refetch (the held, dimmed answer) has no trigger on this page:
// the request's variables are constant, so the layout's busy state is covered at the UI level only.
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

/** The fixture network, where the first request of the named operation fails (a 500) and every later one is answered. */
function failFirst(operation: string) {
  const real = fixtureClient();
  let calls = 0;
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      if (op.name === operation && ++calls === 1) throw new Error("HTTP 500");
      return real.client.query(op, variables, options);
    },
  };
  return { client, sent: real.sent };
}

describe.each([
  { locale: "en", path: "/explore/coverage" },
  { locale: "ro", path: "/ro/explore/coverage" },
] as const)("the Coverage page's states in $locale", ({ locale, path }) => {
  const c = catalogue[locale].coverage;
  const t = catalogue[locale];
  const region = (name: string) => within(screen.getByRole("region", { name }));

  it("shows the first load as panels with their real titles, the selector and one loading status in the grid panel, then the answer", async () => {
    openAt(path);
    let release!: () => void;
    const { client } = fixtureClient({ hold: { operation: "CoveragePage", until: new Promise<void>((resolve) => (release = resolve)) } });
    render(<App client={client} />);
    for (const name of [c.gridHeading, c.knownGaps.heading, c.dataThrough.heading, c.rules.heading, c.snapshot.heading, c.perCounty.heading]) expect(screen.getByRole("region", { name })).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: c.title })).toBeVisible();
    expect(region(c.gridHeading).getByRole("group", { name: t.sources.coverageSwitch.label })).toBeVisible();
    expect(region(c.gridHeading).getByRole("status")).toHaveTextContent(c.loading);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: c.crawlOnly.heading })).toBeNull();
    expect(document.querySelectorAll("[aria-busy='true']")).toHaveLength(0);
    release();
    expect(await screen.findByRole("region", { name: c.grid.label })).toBeVisible();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("puts a failed request's note and its retry in the grid panel, keeps the rest of the page, and shows the answer after the retry", async () => {
    openAt(path);
    const { client, sent } = failFirst("CoveragePage");
    render(<App client={client} />);
    await screen.findByRole("alert");
    expect(region(c.gridHeading).getByRole("alert")).toHaveTextContent(c.error);
    expect(region(c.gridHeading).getByRole("group", { name: t.sources.coverageSwitch.label })).toBeVisible();
    expect(screen.getByRole("region", { name: c.rules.heading })).toBeVisible();
    expect(screen.queryByRole("region", { name: c.knownGaps.heading })).toBeNull();
    await userEvent.click(region(c.gridHeading).getByRole("button", { name: t.status.retry }));
    expect(await screen.findByRole("region", { name: c.grid.label })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("region", { name: c.knownGaps.heading })).toBeVisible();
    expect(sent.filter((s) => s.operation === "CoveragePage")).toHaveLength(1);
  });

  it("counts the Known gaps rows in the panel header", async () => {
    openAt(path);
    render(<App client={fixtureClient().client} />);
    await screen.findByRole("region", { name: c.grid.label });
    const panel = region(c.knownGaps.heading);
    const rows = panel.getAllByRole("row").length - 1;
    expect(rows).toBe(12);
    expect(panel.getByText(c.knownGaps.count(rows))).toBeVisible();
  });
});
