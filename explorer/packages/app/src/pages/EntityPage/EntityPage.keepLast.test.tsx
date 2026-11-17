// Seam 3: the Overview keeps its last answer on screen, dimmed and `aria-busy`, while the same entity and role reload (a new filter, Signals order or page, or a retry).
// A different role shows the first-load state, never the old figures. EN and /ro/. The second answer is held on a promise, so the pending state can be read.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { fixtures } from "@grivei/contract/fixtures";
import { App } from "../../App.tsx";
import { createClient } from "../../graphql/client.ts";
import { navigate } from "../../routing/location.tsx";
import { openAt } from "../../testing/openAt.ts";

const canonical = (value: unknown): string =>
  JSON.stringify(value, (_k, v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v));

/**
 * Answers `EntityOverview` from the recorded fixtures (the unfiltered one for any filter, with its headline figure changed so the two can be told
 * apart); the second request waits for `release()`.
 */
function heldClient() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let count = 0;
  const client = createClient({
    fetch: async (_url, init) => {
      const { variables } = JSON.parse(String(init?.body)) as { variables: { filter: Record<string, unknown> } };
      const n = ++count;
      if (n === 2) await gate;
      const hit = fixtures.EntityOverview.find((f) => canonical(f.variables) === canonical({ ...variables, filter: {} }));
      if (!hit) return Response.json({ errors: [{ message: "no fixture" }] }, { status: 400 });
      const data = JSON.stringify(hit.data);
      return Response.json({ data: JSON.parse(Object.keys(variables.filter).length > 0 ? data.replace('"884000000"', '"100000000"') : data) });
    },
  });
  return { client, release };
}

const words = {
  en: { base: "/explore/authority/1000017", old: "RON 8,840,000", next: "RON 1,000,000", loading: "Loading…", headline: "Headline numbers" },
  ro: { base: "/ro/explore/authority/1000017", old: /^8\.840\.000\sRON$/, next: /^1\.000\.000\sRON$/, loading: "Se încarcă…", headline: "Cifre principale" },
} as const;

const headlineOf = (name: string) => screen.queryByRole("list", { name });
const holds = async (name: string, text: string | RegExp) => waitFor(() => expect(within(screen.getByRole("list", { name })).getByText(text)).toBeVisible());

describe.each(["en", "ro"] as const)("the Overview while a different filter loads (%s)", (lang) => {
  const w = words[lang];

  it("keeps the old figures, marked aria-busy with a loading status, until the new ones land", async () => {
    openAt(w.base);
    const { client, release } = heldClient();
    render(<App client={client} />);
    await holds(w.headline, w.old);
    expect(headlineOf(w.headline)!.closest("[aria-busy='true']")).toBeNull();

    act(() => navigate(`${w.base}?from=2023-06-01`, "replace"));
    expect(screen.getAllByRole("status").map((s) => s.textContent)).toContain(w.loading);
    expect(within(headlineOf(w.headline)!).getByText(w.old)).toBeVisible();
    expect(headlineOf(w.headline)!.closest("[aria-busy='true']")).not.toBeNull();

    release();
    await holds(w.headline, w.next);
    expect(within(headlineOf(w.headline)!).queryByText(w.old)).toBeNull();
    expect(headlineOf(w.headline)!.closest("[aria-busy='true']")).toBeNull();
    expect(screen.queryByText(w.loading)).toBeNull();
  });
});

describe.each(["en", "ro"] as const)("the Overview while the other role loads (%s)", (lang) => {
  const w = lang === "en"
    ? { base: "/explore/authority/2000031", old: "RON 340,000", next: "RON 2,020,000", loading: "Loading…", headline: "Headline numbers", other: "sells · supplier" }
    : { base: "/ro/explore/authority/2000031", old: /^340\.000\sRON$/, next: /^2\.020\.000\sRON$/, loading: "Se încarcă…", headline: "Cifre principale", other: "vinde · furnizor" };

  it("shows the first-load state and not the first role's figure, then the other role's figure", async () => {
    openAt(w.base);
    const { client, release } = heldClient();
    render(<App client={client} />);
    await holds(w.headline, w.old);

    await userEvent.setup().click(screen.getByRole("link", { name: w.other }));
    expect(screen.getAllByRole("status").map((s) => s.textContent)).toContain(w.loading);
    // the first-load state: the real labels stay, the old figures go
    expect(screen.queryByText(w.old)).toBeNull();
    expect(headlineOf(w.headline)).toBeNull();

    release();
    await holds(w.headline, w.next);
    expect(screen.queryByText(w.old)).toBeNull();
  });
});

/** Answers every `EntityOverview` from the recorded fixtures (the unfiltered one for any filter); the requests numbered in `held` wait for `release()`. */
function gatedClient(held: number[]) {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let count = 0;
  const client = createClient({
    fetch: async (_url, init) => {
      const { variables } = JSON.parse(String(init?.body)) as { variables: { filter: Record<string, unknown> } };
      if (held.includes(++count)) await gate;
      const hit = fixtures.EntityOverview.find((f) => canonical(f.variables) === canonical({ ...variables, filter: {} }));
      return hit ? Response.json({ data: hit.data }) : Response.json({ errors: [{ message: "no fixture" }] }, { status: 400 });
    },
  });
  return { client, release };
}

const supplier = {
  en: { base: "/explore/supplier/3100020?signalOrder=value-desc", onrc: "ONRC registration", people: "Administrators and legal representatives", fact: "J40/1001/2015" },
  ro: { base: "/ro/explore/supplier/3100020?signalOrder=value-desc", onrc: "Înmatriculare ONRC", people: "Administratori și reprezentanți legali", fact: "J40/1001/2015" },
} as const;

describe.each(["en", "ro"] as const)("a supplier's ONRC and People panels while the Overview reloads (%s)", (lang) => {
  const w = supplier[lang];
  const body = (name: string) => screen.getByRole("region", { name }).querySelector("[data-panel-part='body']")!;

  it("keeps both panels on screen, their bodies aria-busy and their headers at full strength, until the next answer lands", async () => {
    openAt(w.base);
    const { client, release } = gatedClient([2]);
    render(<App client={client} />);
    await screen.findByRole("region", { name: w.onrc });
    expect(body(w.onrc)).not.toHaveAttribute("aria-busy");

    act(() => navigate(`${w.base}&from=2023-06-01`, "replace"));
    await waitFor(() => expect(body(w.onrc)).toHaveAttribute("aria-busy", "true"));
    expect(body(w.people)).toHaveAttribute("aria-busy", "true");
    expect(within(screen.getByRole("region", { name: w.onrc })).getByText(w.fact)).toBeVisible();
    expect(screen.getByRole("region", { name: w.onrc }).querySelector("[data-panel-part='header']")).not.toHaveAttribute("aria-busy");

    release();
    await waitFor(() => expect(body(w.onrc)).not.toHaveAttribute("aria-busy"));
    expect(body(w.people)).not.toHaveAttribute("aria-busy");
  });

  it("draws the two panels' titles and labels as a skeleton on the first load, then the real panels", async () => {
    openAt(w.base);
    const { client, release } = gatedClient([1]);
    render(<App client={client} />);
    expect(await screen.findByRole("region", { name: w.onrc, hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: w.people, hidden: true })).toBeInTheDocument();
    expect(screen.queryByText(w.fact)).toBeNull();

    release();
    expect(await screen.findByText(w.fact)).toBeVisible();
  });
});
