// Seam 3 for ticket #104: the "n Signals" chip on entity rows, end to end. Recorded answers (recorded/signals/: hasSignals true and false) give the counts
// of the Signals archive; the hand "records-variety" answer (q=contract) gives an authority tab with and without Signals (its Records carry the no-publication Signal of the hospital). The chip leads to the
// entity's Overview for the tab's role, at the Signals anchor, where the Signals heading carries that id and is scrolled into view. EN and /ro/.
import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { forbiddenWords } from "@grivei/ui";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { loadTestCountyTopology } from "../../testing/countyTopology.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";
import { overviewNamed, overviewUrl } from "../../testing/signalRecordings.ts";

afterEach(() => window.history.replaceState(null, "", "/"));

const open = (url: string) => {
  openAt(url);
  return render(<App client={fixtureClient().client} loadCountyTopology={loadTestCountyTopology} />);
};
// the search has the hasSignals chip, so each entity link carries it (#106) in front of the anchor
const carried = "?search=hasSignals%3Dtrue";
const chipsOf = (panel: HTMLElement, noun: RegExp) => within(panel).queryAllByRole("link", { name: noun });

describe.each([
  { locale: "en", base: "/explore", authorities: "Authorities", suppliers: "Suppliers", noun: /^\d+ Signals? , /, hasSignals: "hasSignals=true", signals: (n: number) => `${n} Signals`, heading: "Signals (8)" },
  { locale: "ro", base: "/ro/explore", authorities: "Autorități", suppliers: "Furnizori", noun: /^\d+ Semnale? , /, hasSignals: "hasSignals=true", signals: (n: number) => `${n} Semnale`, heading: "Semnale (8)" },
] as const)("the Signals chip on entity rows at $base", ({ locale, base, authorities, suppliers, noun, hasSignals, signals, heading }) => {
  it("shows each Authorities row's own count, linked to the authority's Overview at the Signals anchor", async () => {
    open(`${base}/?${hasSignals}&tab=authorities`);
    const panel = await screen.findByRole("tabpanel", { name: new RegExp(`^${authorities}`) });
    await waitFor(() => expect(chipsOf(panel, noun)).toHaveLength(3));
    expect(chipsOf(panel, noun).map((c) => [c.textContent, c.getAttribute("href")])).toEqual([
      [`${signals(8)}, SPITALUL EXEMPLU`, `${base}/authority/1000017${carried}#signals`],
      [`${signals(3)}, COMUNA EXEMPLU`, `${base}/authority/1000009${carried}#signals`],
      [`${signals(1).replace("1 Signals", "1 Signal").replace("1 Semnale", "1 Semnal")}, CNAIR DEMO SA`, `${base}/authority/2000031${carried}#signals`],
    ]);
  });

  it("shows the Suppliers rows' counts, linked to the supplier's Overview (not the authority's)", async () => {
    open(`${base}/?${hasSignals}&tab=suppliers`);
    const panel = await screen.findByRole("tabpanel", { name: new RegExp(`^${suppliers}`) });
    await waitFor(() => expect(chipsOf(panel, noun)).toHaveLength(4));
    const hrefs = chipsOf(panel, noun).map((c) => c.getAttribute("href"));
    expect(hrefs).toEqual([`${base}/supplier/2000007${carried}#signals`, `${base}/supplier/2000015${carried}#signals`, `${base}/supplier/2000023${carried}#signals`, `${base}/supplier/name-avocati-demo${carried}#signals`]);
    expect(chipsOf(panel, noun)[0]).toHaveTextContent(signals(6));
  });

  it("shows no chip on a row without Signals (the Records outside every Signal)", async () => {
    open(`${base}/?hasSignals=false&tab=authorities`);
    const panel = await screen.findByRole("tabpanel", { name: new RegExp(`^${authorities}`) });
    await within(panel).findAllByRole("link", { name: /SPITALUL|COMUNA|CNAIR/ });
    expect(chipsOf(panel, noun)).toEqual([]);
  });

  it("shows a chip on the row that has Signals and none on the row that has not, in the same tab", async () => {
    open(`${base}/?q=contract&tab=authorities`);
    const panel = await screen.findByRole("tabpanel", { name: new RegExp(`^${authorities}`) });
    const rowOf = async (name: RegExp | string) => (await within(panel).findByRole("link", { name })).closest("li")!;
    const withSignals = await rowOf("SPITALUL CLINIC JUDEȚEAN DE URGENȚĂ SIBIU");
    const without = await rowOf("ASOCIAȚIA INTERCOMUNITARĂ EXEMPLU");
    expect(chipsOf(withSignals, noun).map((c) => c.textContent)).toEqual([`${signals(1).replace("1 Signals", "1 Signal").replace("1 Semnale", "1 Semnal")}, SPITALUL CLINIC JUDEȚEAN DE URGENȚĂ SIBIU`]);
    expect(chipsOf(without, noun)).toHaveLength(0);
  });

  it("is also on the full-results view of each tab", async () => {
    open(`${base}/search?${hasSignals}&tab=suppliers`);
    await screen.findByRole("heading", { name: /^(Suppliers|Furnizori) 4$/ });
    await waitFor(() => expect(screen.getAllByRole("link", { name: noun })).toHaveLength(4));
  });

  it("says nothing an accusing word would", async () => {
    open(`${base}/?${hasSignals}&tab=authorities`);
    const panel = await screen.findByRole("tabpanel", { name: new RegExp(`^${authorities}`) });
    await waitFor(() => expect(chipsOf(panel, noun)).toHaveLength(3));
    for (const chip of chipsOf(panel, noun)) expect(forbiddenWords(chip.textContent ?? "", locale)).toEqual([]);
    expect(catalogue[locale].results.entityRow.signals.label(3, "3")).toBe(signals(3));
  });

  describe("following the chip", () => {
    const scroll = vi.fn();
    beforeEach(() => {
      scroll.mockClear();
      Element.prototype.scrollIntoView = scroll;
    });
    afterEach(() => {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    });

    it("lands on the Overview with the Signals heading carrying the anchor, scrolled into view", async () => {
      open(`${overviewUrl(overviewNamed("authority-with-signals").variables, locale)}#signals`);
      await screen.findByRole("heading", { name: heading });
      const section = document.getElementById("signals")!;
      expect(section).toContainElement(screen.getByRole("heading", { name: heading }));
      await waitFor(() => expect(scroll).toHaveBeenCalled());
      expect(scroll.mock.contexts[0]).toBe(section);
    });

    it("does not scroll when the URL has no fragment", async () => {
      open(overviewUrl(overviewNamed("authority-with-signals").variables, locale));
      await screen.findByRole("heading", { name: heading });
      expect(scroll).not.toHaveBeenCalled();
    });
  });
});
