// Seam 3 for ticket #226: the county picked on the map is an active filter. Its chip names the county, stands alone in the
// active row, and removing it (or Clear all) unsets the county and the UAT, as the map's back link does; both languages.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { loadTestUatTopology } from "../../testing/uatTopology.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const here = () => window.location.pathname + window.location.search;
const open = (url: string) => {
  openAt(url);
  return render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} loadUatTopology={loadTestUatTopology} />);
};

describe.each([
  { locale: "en", prefix: "" },
  { locale: "ro", prefix: "/ro" },
] as const)("the county chip at $prefix/explore/", ({ locale, prefix }) => {
  const t = catalogue[locale];
  const base = `${prefix}/explore/`;
  const active = () => within(screen.getByRole("group", { name: t.filterChips.active.group }));
  const chipName = (area: string) => t.filterChips.active.remove(t.filterChips.active.county(area));

  it("shows the county by its name, alone in the active row, and removing it unsets the county and the UAT", async () => {
    open(`${base}?county=RO-BV&uat=880010`);
    const user = userEvent.setup();
    await user.click(await within(await screen.findByRole("group", { name: t.filterChips.active.group })).findByRole("button", { name: chipName("Brașov") }));
    await waitFor(() => expect(here()).toBe(base)); // the same URL as the back link leaves
    await waitFor(() => expect(screen.queryByRole("group", { name: t.filterChips.active.group })).toBeNull()); // nothing set: no active row
    expect(await screen.findByRole("button", { name: /^Brașov:/ })).toBeVisible(); // the map is back at Romania
  });

  it("keeps the county chip with the other chips, and Clear all unsets them, the county and the UAT, and keeps the rest", async () => {
    open(`${base}?q=pod&county=RO-BV&uat=880010&countySide=authority&channel=contract&tab=records`);
    const user = userEvent.setup();
    await active().findByRole("button", { name: chipName("Brașov") });
    await user.click(screen.getByRole("button", { name: t.filterChips.active.clearAll }));
    await waitFor(() => expect(here()).toBe(`${base}?q=pod&tab=records`));
  });

  it("removing the county chip keeps the other chips", async () => {
    open(`${base}?county=RO-BV&channel=contract`);
    await userEvent.setup().click(await active().findByRole("button", { name: chipName("Brașov") }));
    await waitFor(() => expect(here()).toBe(`${base}?channel=contract`));
    expect(active().getByRole("button", { name: t.filterChips.active.remove(t.filterChips.channel.options.CONTRACT) })).toBeVisible();
  });

  it("names an off-map area by its tile's label, not its code", async () => {
    open(`${base}?county=UNPLACED`);
    expect(await active().findByRole("button", { name: chipName(t.moneyLensMap.tiles.unplaced) })).toBeVisible();
    expect(screen.queryByRole("button", { name: /UNPLACED/ })).toBeNull();
  });
});
