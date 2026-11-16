// Seam 3 for the states of ONRC's screen (#256): skeletons on a first load, the last answer held (dimmed, `aria-busy`) while the next loads, and a failed request as a
// note with "Try again" inside the panel that failed. App at a URL with the fixture client; the second or first request of an operation is held or failed on purpose. EN and /ro/.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { navigate } from "../../routing/location.tsx";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { ONRC_TYPICAL_COUNT, onrcWholeCoverage, seapCountFor } from "../../testing/sourceFixtures.ts";

afterEach(() => openAt("/"));

const FILTERED = "status=1048&caen=62&county=UNPLACED&registeredFrom=2020-01-01&registeredTo=2026-12-31&seapCounterparty=false";
const extra = [seapCountFor("alfa beta"), onrcWholeCoverage];

/** The fixture network where `gate` decides, per request, whether an OnrcSearch or OnrcCoverage waits for `release()` or fails. */
function controlled(rule: { hold?: { operation: string; nth: number }; failFirst?: string }) {
  const real = fixtureClient({ extra });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const counts = new Map<string, number>();
  const failed: unknown[] = [];
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      const n = (counts.get(op.name) ?? 0) + 1;
      counts.set(op.name, n);
      if (rule.hold?.operation === op.name && n === rule.hold.nth) await gate;
      if (rule.failFirst === op.name && n === 1) {
        failed.push(variables);
        throw new Error("HTTP 500");
      }
      return real.client.query(op, variables, options);
    },
  };
  return { client, release: () => act(() => release()), failed, sent: real.sent };
}

const open = (url: string, client: GraphqlClient) => {
  openAt(url);
  return render(<App client={client} loadCountyTopology={loadTestCountyTopology} />);
};

describe.each([
  { locale: "en", base: "/explore/" },
  { locale: "ro", base: "/ro/explore/" },
] as const)("ONRC's screen, its states, at $base", ({ base, locale }) => {
  const c = catalogue[locale];
  const s = c.sources;
  const region = (name: string) => screen.getByRole("region", { name });
  const mapPanel = () => region(s.onrc.layout.regions.map);
  const heading = s.onrc.results.heading(ONRC_TYPICAL_COUNT, String(ONRC_TYPICAL_COUNT));
  const retry = { name: c.status.retry };

  it("shows skeletons in the results and the map on a first load while the real labels stay, then the answer", async () => {
    const { client, release } = controlled({ hold: { operation: "OnrcSearch", nth: 1 } });
    open(`${base}?q=alfa+beta&source=onrc`, client);
    const panel = await screen.findByRole("region", { name: s.onrc.results.title });
    expect(within(panel).getByRole("heading", { level: 2, name: s.onrc.results.title })).toBeVisible();
    expect(within(panel).getByRole("status")).toHaveTextContent(c.status.loading);
    expect(panel.querySelectorAll(".MuiSkeleton-root").length).toBeGreaterThan(0);
    expect(within(panel).queryByRole("listitem")).toBeNull();
    // real labels: the title, the search box, the filter bar and the lens toggle
    expect(screen.getByRole("heading", { level: 1, name: s.onrc.title })).toBeVisible();
    expect(screen.getByRole("searchbox")).toHaveValue("alfa beta");
    expect(screen.getByRole("button", { name: new RegExp(`^${s.onrc.filterChips.seapCounterparty.group}`) })).toBeVisible();
    expect(screen.getByRole("button", { name: c.mainScreenLayout.lens.coverage })).toBeVisible();
    expect(within(mapPanel()).getByRole("status")).toHaveTextContent(c.status.loading); // the map is a skeleton under its own status line

    release();
    expect(await screen.findByRole("region", { name: heading })).toBeVisible();
    expect(within(region(heading)).queryByRole("status")).toBeNull();
    expect(document.querySelector(".MuiSkeleton-root")).toBeNull();
  });

  it("keeps the last answer dimmed and aria-busy, with the header at full strength, while a filter change loads, then swaps", async () => {
    const { client, release } = controlled({ hold: { operation: "OnrcSearch", nth: 2 } });
    open(`${base}?q=alfa+beta&source=onrc`, client);
    const panel = await screen.findByRole("region", { name: heading });
    const body = () => panel.querySelector<HTMLElement>('[data-panel-part="body"]')!;
    expect(body()).not.toHaveAttribute("aria-busy");

    act(() => navigate(`${base}?${FILTERED}&source=onrc`, "replace"));
    await waitFor(() => expect(body()).toHaveAttribute("aria-busy", "true"));
    expect(within(panel).getAllByRole("listitem")).toHaveLength(2); // the previous rows stay
    expect(document.querySelector(".MuiSkeleton-root")).toBeNull(); // a refetch never shows skeletons
    expect(within(panel).getByRole("status")).toHaveTextContent(c.status.loading);
    expect(within(panel).getByRole("status").closest("[aria-busy]")).toBeNull(); // the status line is outside the dimmed body
    expect(panel.querySelector('[data-panel-part="header"]')).not.toHaveAttribute("aria-busy");
    expect(mapPanel().querySelector("[aria-busy='true']")).not.toBeNull();

    release();
    await waitFor(() => expect(screen.queryByRole("region", { name: heading })).toBeNull());
    const settled = screen.getByRole("heading", { level: 2, name: /^\d/ }).closest("section")!;
    expect(settled.querySelector('[data-panel-part="body"]')).not.toHaveAttribute("aria-busy");
    expect(within(settled).queryByRole("status")).toBeNull();
  });

  it("a failed search is a note with Try again inside the results panel, the rest of the page stays, and pressing it shows the answer", async () => {
    const { client, failed, sent } = controlled({ failFirst: "OnrcSearch" });
    open(`${base}?q=alfa+beta&source=onrc`, client);
    expect(await screen.findByRole("alert")).toHaveTextContent(c.status.failed);
    const panel = region(s.onrc.results.title);
    expect(within(panel).getByRole("alert")).toBeVisible();
    expect(screen.getAllByRole("button", retry)).toHaveLength(1);
    expect(within(panel).getByRole("button", retry)).toBeVisible();
    expect(screen.getByRole("heading", { level: 1, name: s.onrc.title })).toBeVisible();
    expect(screen.getByRole("searchbox")).toHaveValue("alfa beta");

    await userEvent.click(within(panel).getByRole("button", retry));
    expect(await screen.findByRole("region", { name: heading })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
    // the network answered the same request again
    expect(sent.filter((r) => r.operation === "OnrcSearch").map((r) => r.variables)).toEqual([failed[0]]);
  });

  it("a failed Coverage lens request is a note with Try again in the map panel only, and the results stay", async () => {
    const { client, failed, sent } = controlled({ failFirst: "OnrcCoverage" });
    open(`${base}?q=alfa+beta&lens=coverage&source=onrc`, client);
    expect(await screen.findByRole("region", { name: heading })).toBeVisible();
    expect(await within(mapPanel()).findByRole("alert")).toHaveTextContent(c.status.failed);
    expect(screen.getAllByRole("button", retry)).toHaveLength(1);
    expect(within(region(heading)).queryByRole("alert")).toBeNull();

    await userEvent.click(within(mapPanel()).getByRole("button", retry));
    expect(await within(mapPanel()).findByRole("table", { name: s.onrc.coverage.snapshots.label })).toBeVisible();
    expect(sent.filter((r) => r.operation === "OnrcCoverage").map((r) => r.variables)).toEqual([failed[0]]);
  });

  it("puts the range line in the foot of the results panel and tags a SEAP counterparty", async () => {
    open(`${base}?q=alfa+beta&source=onrc`, controlled({}).client);
    const panel = await screen.findByRole("region", { name: heading });
    const foot = panel.querySelector<HTMLElement>('[data-panel-part="foot"]')!;
    expect(within(foot).getByText(s.onrc.results.showing("1", String(ONRC_TYPICAL_COUNT), String(ONRC_TYPICAL_COUNT)))).toBeVisible();
    expect(within(panel).getAllByText(s.onrc.results.row.seapCounterparty)[0]).toBeVisible();
    expect(within(panel).getAllByRole("listitem")[0]).toBeVisible();
  });
});
