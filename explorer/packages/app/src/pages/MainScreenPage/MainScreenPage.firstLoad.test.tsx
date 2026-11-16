// First load: no answer yet, so the Total, the tab counts, the rows and the map are skeletons shaped like the content, with the page's real labels and a
// `role="status"` Loading line; the skeletons go when the answer lands. The main answer is held on a promise. EN and /ro/.
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

afterEach(() => openAt("/"));

const never = () => new Promise<never>(() => undefined);

describe.each([
  { locale: "en", base: "/explore/" },
  { locale: "ro", base: "/ro/explore/" },
] as const)("the main screen on first load at $base", ({ locale, base }) => {
  const t = catalogue[locale];
  const region = (name: string) => screen.getByRole("region", { name });
  const skeletons = (el: Element) => Array.from(el.querySelectorAll(".MuiSkeleton-root"));

  function openHeld(loadCountyTopology: typeof loadTestCountyTopology) {
    let release!: () => void;
    const until = new Promise<void>((resolve) => (release = resolve));
    openAt(base);
    render(<App client={fixtureClient({ hold: { operation: "MainScreen", until } }).client} loadCountyTopology={loadCountyTopology} />);
    return () => act(() => release());
  }

  it("shows the Total, the tabs and the rows as skeletons with their real labels, and says it is loading", async () => {
    const release = openHeld(loadTestCountyTopology);
    const results = region(t.mainScreenLayout.regions.results);
    // the dashed note is gone: the status line is the results header's
    expect(within(results).getByRole("status")).toHaveTextContent(t.status.loading);
    const tablist = within(results).getByRole("tablist");
    for (const name of Object.values(t.results.tabs)) expect(within(tablist).getByRole("tab", { name: new RegExp(name) })).toBeInTheDocument();
    expect(skeletons(tablist)).toHaveLength(3); // one pill block per count
    const rows = within(results).getByRole("list", { hidden: true });
    expect(rows).toHaveAttribute("aria-hidden", "true");
    expect(rows.children).toHaveLength(8);
    // the Total: its heading and the figures' labels are real, the values are blocks
    const total = screen.getByRole("heading", { name: t.main.total }).closest(".MuiCard-root")!;
    expect(within(total as HTMLElement).getByText(t.total.figures.records)).toBeVisible();
    expect(within(total as HTMLElement).getByText(t.total.figures.ceilings)).toBeVisible();
    expect(skeletons(total)).toHaveLength(3);
    expect(screen.queryByTestId("main-total")).toBeNull();
    // nothing is dimmed: there is no answer to hold
    expect(document.querySelector("[aria-busy='true']")).toBeNull();

    release();
    await screen.findByTestId("main-total");
    await waitFor(() => expect(within(results).queryByRole("status")).toBeNull());
    expect(document.querySelector(".MuiSkeleton-root")).toBeNull();
  });

  it("draws the map's areas in a neutral fill with a status chip when the outlines are in and the figures are not", async () => {
    const release = openHeld(loadTestCountyTopology);
    const panel = region(t.mainScreenLayout.regions.map);
    await waitFor(() => expect(panel.querySelectorAll("svg[aria-hidden='true'] path").length).toBeGreaterThan(0));
    expect(within(panel).getByRole("status")).toHaveTextContent(t.status.loading);
    expect(panel.querySelector("path[aria-pressed]")).toBeNull(); // no area can be picked yet
    release();
    expect(await within(panel).findByRole("heading", { name: t.main.mapTitle })).toBeVisible();
    expect(within(panel).queryByRole("status")).toBeNull();
  });

  it("is a map-sized block while the outlines have not loaded", async () => {
    const release = openHeld(never);
    const panel = region(t.mainScreenLayout.regions.map);
    expect(skeletons(panel)).toHaveLength(1);
    expect(panel.querySelector("svg[aria-hidden='true'] path")).toBeNull();
    expect(within(panel).getByRole("status")).toHaveTextContent(t.status.loading);
    release();
  });
});
