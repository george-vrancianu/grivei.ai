// Seam 3: each failed query of the main screen has its own "Try again" on the panel that owns it. The main query's note sits in the results panel
// (the Total shows an em dash, with no button of its own); a failed zoomed-county or Coverage lens query puts its note and button in the map panel only. EN and /ro/.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import type { GraphqlClient } from "../../graphql/client.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { loadTestUatTopology } from "../../testing/uatTopology.ts";

afterEach(() => openAt("/"));

/** The fixture network, where the first request of the named operation fails (a 500) and every later one is answered. */
function failFirst(operation: string) {
  const real = fixtureClient();
  let calls = 0;
  const failed: unknown[] = [];
  const client: GraphqlClient = {
    query: async (op, variables, options) => {
      if (op.name === operation && ++calls === 1) {
        failed.push(variables);
        throw new Error("HTTP 500");
      }
      return real.client.query(op, variables, options);
    },
  };
  /** The variables of the failed request, and those the network answered (the retry). */
  return { client, failed, answered: (name: string) => real.sent.filter((s) => s.operation === name).map((s) => s.variables) };
}

const open = (url: string, client: GraphqlClient) => {
  openAt(url);
  return render(<App client={client} loadCountyTopology={loadTestCountyTopology} loadUatTopology={loadTestUatTopology} />);
};

describe.each([
  { locale: "en", base: "/explore/" },
  { locale: "ro", base: "/ro/explore/" },
] as const)("Try again at $base", ({ locale, base }) => {
  const t = catalogue[locale];
  const region = (name: string) => screen.getByRole("region", { name });
  const results = () => region(t.mainScreenLayout.regions.results);
  const mapPanel = () => region(t.mainScreenLayout.regions.map);
  const retry = { name: t.status.retry };

  it("has its own words in each language", () => {
    expect(t.status.retry).toBe(locale === "en" ? "Try again" : "Reîncearcă");
  });

  it("a failed main query shows the note and Try again in the results panel and a dash for the Total, and pressing it asks the same query and shows the answer", async () => {
    const { client, failed, answered } = failFirst("MainScreen");
    open(`${base}?q=contract`, client);
    const user = userEvent.setup();
    const alert = await within(results()).findByRole("alert");
    expect(alert).toHaveTextContent(t.status.failed);
    const button = within(results()).getByRole("button", retry); // the note's action, under its sentence
    expect(screen.getAllByRole("button", retry)).toHaveLength(1);
    const total = screen.getByTestId("main-total");
    expect(total).toHaveTextContent(t.main.total);
    expect(total).toHaveTextContent("—");
    expect(within(total).queryByRole("button")).toBeNull();

    await user.click(button);
    await waitFor(() => expect(within(results()).getAllByRole("link").length).toBeGreaterThan(0), { timeout: 5000 });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", retry)).toBeNull();
    expect(screen.getByTestId("main-total")).not.toHaveTextContent("—");
    expect(answered("MainScreen")).toEqual(failed);
  });

  it("a failed Coverage lens query shows its note and Try again in the map panel only, and the results stay", async () => {
    const { client, failed, answered } = failFirst("CoverageLens");
    open(`${base}?lens=coverage`, client);
    const user = userEvent.setup();
    const alert = await within(mapPanel()).findByRole("alert");
    expect(alert).toHaveTextContent(t.status.failed);
    const button = within(mapPanel()).getByRole("button", retry);
    expect(within(results()).queryByRole("button", retry)).toBeNull();
    expect(within(results()).queryByRole("alert")).toBeNull();
    expect(await screen.findByTestId("main-total")).toHaveTextContent(/RON/);
    expect(screen.getAllByRole("button", retry)).toHaveLength(1);

    await user.click(button);
    expect(await within(mapPanel()).findByRole("button", { name: /^Brașov: / }, { timeout: 5000 })).toBeVisible();
    expect(within(mapPanel()).queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", retry)).toBeNull();
    expect(answered("CoverageLens")).toEqual(failed);
  });

  it("a failed zoomed-county query shows its note and Try again in the map panel only, and the results stay", async () => {
    const { client, failed, answered } = failFirst("ZoomedCounty");
    open(`${base}?county=RO-BV`, client);
    const user = userEvent.setup();
    const alert = await within(mapPanel()).findByRole("alert");
    expect(alert).toHaveTextContent(t.status.failed);
    const button = within(mapPanel()).getByRole("button", retry);
    expect(within(results()).queryByRole("button", retry)).toBeNull();
    expect(await screen.findByTestId("main-total")).toHaveTextContent(/RON/);
    await waitFor(() => expect(within(results()).getAllByRole("link").length).toBeGreaterThan(0));

    await user.click(button);
    expect(await within(mapPanel()).findByRole("heading", { name: t.zoomedCounty.title("Brașov", false) }, { timeout: 5000 })).toBeVisible();
    expect(within(mapPanel()).queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", retry)).toBeNull();
    expect(answered("ZoomedCounty")).toEqual(failed);
  });
});
