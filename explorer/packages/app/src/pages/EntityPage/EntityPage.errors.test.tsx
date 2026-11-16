// Seam 4: a failed Overview request says so inside the page, with a retry. With the entity known from before (a filter that fails) the header, its tabs and its
// address stay and the note takes the Overview's place; a first load that failed has no header, so the note stands alone. EN and /ro/.
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

/** Answers `EntityOverview` from the recorded fixtures (the unfiltered one for any filter), except for the requests numbered in `failing`, which fail. */
function clientFailing(failing: number[]) {
  let count = 0;
  return createClient({
    fetch: async (_url, init) => {
      const { variables } = JSON.parse(String(init?.body)) as { variables: { filter: Record<string, unknown> } };
      if (failing.includes(++count)) return Response.json({ errors: [{ message: "down" }] }, { status: 400 });
      const hit = fixtures.EntityOverview.find((f) => canonical(f.variables) === canonical({ ...variables, filter: {} }));
      return hit ? Response.json({ data: hit.data }) : Response.json({ errors: [{ message: "no fixture" }] }, { status: 400 });
    },
  });
}

const words = {
  en: { base: "/explore/authority/1000017", failed: "The data could not be loaded.", retry: "Try again", headline: "Headline numbers", tabs: /Sections of this page/, cite: /Address of this view/ },
  ro: { base: "/ro/explore/authority/1000017", failed: "Datele nu au putut fi încărcate.", retry: "Reîncearcă", headline: "Cifre principale", tabs: /Secțiunile paginii/, cite: /Adresa acestei vizualizări/ },
} as const;

describe.each(["en", "ro"] as const)("a failed Overview request (%s)", (lang) => {
  const w = words[lang];

  it("on a first load shows the note alone, and its retry loads the page", async () => {
    openAt(w.base);
    render(<App client={clientFailing([1])} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(w.failed);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();

    await userEvent.setup().click(screen.getByRole("button", { name: w.retry }));
    expect(await screen.findByRole("list", { name: w.headline })).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeVisible();
  });

  it("after a filter keeps the header with its tabs and address, shows the note in the Overview's place, and its retry brings the answer back", async () => {
    openAt(w.base);
    render(<App client={clientFailing([2])} />);
    expect(await screen.findByRole("list", { name: w.headline })).toBeVisible();
    const name = screen.getByRole("heading", { level: 1 }).textContent;

    act(() => navigate(`${w.base}?from=2023-06-01`, "replace"));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(w.failed);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(name!);
    const header = screen.getByRole("heading", { level: 1 }).closest("header")!;
    expect(within(header).getByRole("navigation", { name: w.tabs })).toBeVisible();
    expect(within(header).getByText(w.cite)).toBeVisible();
    expect(screen.queryByRole("list", { name: w.headline })).toBeNull();

    await userEvent.setup().click(within(alert).getByRole("button", { name: w.retry }));
    await waitFor(() => expect(screen.getByRole("list", { name: w.headline })).toBeVisible());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
