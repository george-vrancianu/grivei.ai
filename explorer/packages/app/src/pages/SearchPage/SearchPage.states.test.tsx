// Seam 3: the full-results view in its panels. First load shows a skeleton with the real kind; a refetch keeps the last answer, dimmed and aria-busy, with a
// Loading line in the header; a failed request shows the note and Try again inside the results panel while the rest of the page stays. EN and /ro/.
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { navigate } from "../../routing/location.tsx";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

/** The first answer of a fresh App takes a while under load. */
const SLOW = { timeout: 15_000 };
vi.setConfig({ testTimeout: 30_000 });

/** The fixture network where the nth request of FullResultsRecords (and every later one) waits for `release()`, or the first request fails. */
function slowClient({ holdFrom }: { holdFrom: number }) {
  const real = fixtureClient();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let calls = 0;
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      if (op.name.startsWith("FullResults") && ++calls >= holdFrom) await gate;
      return real.client.query(op, variables, options);
    },
  };
  return { client, release: () => act(() => release()) };
}

function failFirst() {
  const real = fixtureClient();
  let calls = 0;
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      if (op.name.startsWith("FullResults") && ++calls === 1) throw new Error("HTTP 500");
      return real.client.query(op, variables, options);
    },
  };
  return { client, sent: real.sent };
}

describe.each([
  { locale: "en", base: "/explore/search" },
  { locale: "ro", base: "/ro/explore/search" },
] as const)("the full-results view's states at $base", ({ locale, base }) => {
  const t = catalogue[locale];
  const kind = t.results.tabs.records;
  const url = `${base}?from=2021-01-01&tab=records`;
  /** Read the panel after each state change: the skeleton, the answer and the error are different elements. */
  const page = () => screen.getByRole("main");
  const panel = () => within(screen.getByRole("region", { name: kind }));

  it("first load: the page's own parts are real, the results panel is a skeleton with the real kind and one Loading line", async () => {
    const { client, release } = slowClient({ holdFrom: 1 });
    openAt(url);
    render(<App client={client} />);

    expect(screen.getByRole("heading", { level: 1, name: t.pages.search.title })).toBeVisible();
    expect(screen.getByRole("searchbox")).toBeVisible();
    expect(screen.getByRole("link", { name: t.fullResults.back })).toBeVisible();
    expect(panel().getByRole("heading", { level: 2, name: kind })).toBeVisible();
    expect(screen.getAllByText(t.status.loading)).toHaveLength(1);
    expect(panel().getByText(t.status.loading)).toBeVisible();
    expect(page().querySelector(".MuiSkeleton-root")).not.toBeNull();
    expect(screen.getByRole("search")).not.toHaveAttribute("aria-busy", "true"); // no typed query: the field does not spin

    release();
    expect(await screen.findByRole("heading", { level: 2, name: `${kind} 120` }, SLOW)).toBeVisible();
    expect(screen.queryByText(t.status.loading)).toBeNull();
    expect(page().querySelector(".MuiSkeleton-root")).toBeNull();
  });

  it("a page change keeps the last answer, dimmed and aria-busy, with the Loading line in the header, then swaps", async () => {
    const { client, release } = slowClient({ holdFrom: 2 });
    openAt(url);
    render(<App client={client} />);
    await screen.findByRole("heading", { level: 2, name: `${kind} 120` }, SLOW);
    const rowsBefore = panel().getAllByRole("link").map((a) => a.textContent);
    const showing = t.fullResults.showing("1", "50", "120");
    expect(screen.getAllByText(showing)).toHaveLength(2);
    expect(screen.queryByText(t.status.loading)).toBeNull();

    act(() => navigate(`${url}&page=2`, "replace"));
    expect(page().querySelector(".MuiSkeleton-root")).toBeNull(); // a refetch never shows the skeleton
    expect(panel().getAllByRole("link").map((a) => a.textContent)).toEqual(rowsBefore);
    expect(screen.getAllByText(showing)).toHaveLength(2); // the Showing line describes the rows on screen (page 1), not the requested page 2
    expect(screen.queryByText(t.fullResults.showing("51", "100", "120"))).toBeNull();
    const body = panel().getAllByRole("listitem")[0]!.closest("[aria-busy]");
    expect(body).toHaveAttribute("aria-busy", "true");
    const status = panel().getByText(t.status.loading);
    expect(status.closest("[aria-busy]")).toBeNull(); // the header strip stays at full strength, so the line is announced
    expect(panel().getByRole("heading", { level: 2, name: `${kind} 120` })).toBeVisible();
    expect(screen.getByRole("search")).not.toHaveAttribute("aria-busy", "true"); // a page change is not a typed query

    release();
    expect(await screen.findAllByText(t.fullResults.showing("51", "100", "120"), {}, SLOW)).toHaveLength(2);
    expect(screen.queryByText(t.status.loading)).toBeNull();
    expect(page().querySelector("[aria-busy=true]")).toBeNull();
  });

  it("another tab never shows the last tab's rows: it reads as the skeleton", async () => {
    const { client, release } = slowClient({ holdFrom: 2 });
    openAt(`${base}?from=2021-01-01`);
    render(<App client={client} />);
    await screen.findByRole("heading", { level: 2, name: new RegExp(`^${t.results.tabs.suppliers}`) }, SLOW);

    act(() => navigate(url, "replace"));
    expect(within(screen.getByRole("region", { name: kind })).getByRole("status")).toBeVisible();
    expect(page().querySelector(".MuiSkeleton-root")).not.toBeNull();
    expect(screen.queryByRole("region", { name: t.results.tabs.suppliers })).toBeNull();
    release();
    expect(await screen.findByRole("heading", { level: 2, name: `${kind} 120` }, SLOW)).toBeVisible();
  });

  it("a failed request puts the note and Try again in the results panel, the rest of the page stays, and Try again shows the answer", async () => {
    const { client, sent } = failFirst();
    openAt(url);
    render(<App client={client} />);
    const user = userEvent.setup();

    await screen.findByRole("alert", {}, SLOW);
    expect(panel().getByRole("alert")).toHaveTextContent(t.status.failed); // inside the results panel (read after the swap: the panel is a new element)
    expect(screen.getByRole("heading", { level: 1, name: t.pages.search.title })).toBeVisible();
    expect(screen.getByRole("searchbox")).toBeVisible();
    expect(screen.getByRole("link", { name: t.fullResults.back })).toBeVisible();
    expect(screen.getAllByRole("button", { name: t.status.retry })).toHaveLength(1);
    expect(panel().getByRole("button", { name: t.status.retry })).toBeVisible();

    await user.click(panel().getByRole("button", { name: t.status.retry }));
    expect(await screen.findByRole("heading", { level: 2, name: `${kind} 120` }, SLOW)).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(sent.filter((s) => s.operation === "FullResultsRecords")).toHaveLength(1); // the failed first request never reached the fixtures; the retry did
  });
});

it("says Try again in each language", () => {
  expect([catalogue.en.status.retry, catalogue.ro.status.retry]).toEqual(["Try again", "Reîncearcă"]);
});
