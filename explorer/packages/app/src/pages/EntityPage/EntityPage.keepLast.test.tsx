// Seam 3: the Overview keeps its last answer on screen only while the same entity and filter reload (a new Signals order or page). A different
// filter or role shows the loading line, never the old figures. EN and /ro/. The second answer is held on a promise, so the pending state can be read.
import { act, render, screen, within } from "@testing-library/react";
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

describe.each(["en", "ro"] as const)("the Overview while a different filter loads (%s)", (lang) => {
  const w = words[lang];

  it("shows the loading line and not the old figure, then the new figure", async () => {
    openAt(w.base);
    const { client, release } = heldClient();
    render(<App client={client} />);
    const headline = () => within(screen.getByRole("list", { name: w.headline }));
    expect(await within(await screen.findByRole("list", { name: w.headline })).findByText(w.old)).toBeVisible();

    act(() => navigate(`${w.base}?from=2023-06-01`, "replace"));
    expect(screen.getByRole("status")).toHaveTextContent(w.loading);
    expect(screen.queryByRole("list", { name: w.headline })).toBeNull();
    expect(screen.queryByText(w.old)).toBeNull();

    release();
    expect(await within(await screen.findByRole("list", { name: w.headline })).findByText(w.next)).toBeVisible();
    expect(headline().queryByText(w.old)).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe.each(["en", "ro"] as const)("the Overview while the other role loads (%s)", (lang) => {
  const w = lang === "en"
    ? { base: "/explore/authority/2000031", old: "RON 340,000", next: "RON 2,020,000", loading: "Loading…", headline: "Headline numbers", other: "sells · supplier" }
    : { base: "/ro/explore/authority/2000031", old: /^340\.000\sRON$/, next: /^2\.020\.000\sRON$/, loading: "Se încarcă…", headline: "Cifre principale", other: "vinde · furnizor" };

  it("shows the loading line and not the first role's figure, then the other role's figure", async () => {
    openAt(w.base);
    const { client, release } = heldClient();
    render(<App client={client} />);
    expect(await within(await screen.findByRole("list", { name: w.headline })).findByText(w.old)).toBeVisible();

    await userEvent.setup().click(screen.getByRole("link", { name: w.other }));
    expect(screen.getByRole("status")).toHaveTextContent(w.loading);
    expect(screen.queryByText(w.old)).toBeNull();

    release();
    expect(await within(await screen.findByRole("list", { name: w.headline })).findByText(w.next)).toBeVisible();
    expect(screen.queryByText(w.old)).toBeNull();
  });
});
