// Seam 3 for the methodology page ("About the numbers" / "Despre cifre"): the app rendered at both URLs against the `MethodologyBaseRates`
// fixtures through the injected fetch (ticket #61). Acceptance: every section exists in EN and RO with a stable anchor; each Signal rule's
// section has a base-rate slot fed from the `signalRules` fixture.
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fixtures, recordedSignalsMethodology } from "@grivei/contract/fixtures";
import allowlist from "@grivei/contract/persisted-queries.json";
import { SIGNAL_RULES, forbiddenWords, plainMethodologyText, METHODOLOGY_ANCHORS, METHODOLOGY_SECTIONS, allMethodologyAnchors, signalAnchor, type Locale, type MethodologySectionKey } from "@grivei/ui";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { App } from "../../App.tsx";
import { catalogue } from "../../copy/index.ts";
import { createClient } from "../../graphql/client.ts";
import { methodologyHref } from "../../methodology/methodologyLinks.ts";
import { signalMethodologyHref } from "../../signals/signalLinks.ts";
import { fixtureClient } from "../../testing/fixtureClient.ts";
import { openAt } from "../../testing/openAt.ts";

const PATH = { en: "/explore/methodology", ro: "/ro/explore/methodology" } as const;
const ANCHORS = allMethodologyAnchors(SIGNAL_RULES);

const scrolled: Element[] = [];
beforeEach(() => {
  scrolled.length = 0;
  Element.prototype.scrollIntoView = function (this: Element) {
    scrolled.push(this);
  };
});
afterEach(() => {
  // @ts-expect-error jsdom does not define it; remove the stand-in again
  delete Element.prototype.scrollIntoView;
});

/** A client answering `MethodologyBaseRates` with one named fixture (the fixture client answers the first one for `{}`), or failing. */
function clientWith(name: string) {
  const id = allowlist.operations.find((o) => o.name === "MethodologyBaseRates")!.sha256;
  return createClient({
    fetch: async (_url, init) => {
      expect(JSON.parse(String(init?.body))).toMatchObject({ id, variables: {} });
      if (name === "pending") return new Promise<Response>(() => {});
      if (name === "fail") return Response.json({ errors: [{ message: "boom" }] }, { status: 500 });
      return Response.json({ data: fixtures.MethodologyBaseRates.find((f) => f.name === name)!.data });
    },
  });
}
function open(url: string, name = "typical-after-backfill") {
  openAt(url);
  render(<App client={clientWith(name)} />);
}
const region = (name: string) => within(screen.getByRole("region", { name }));

describe.each(["en", "ro"] as const)("the page at %s", (locale) => {
  const t = catalogue[locale].methodology;
  const headings: [string, string][] = [
    ...METHODOLOGY_SECTIONS.map((k) => [METHODOLOGY_ANCHORS[k], t.sections[k].heading] as [string, string]),
    [METHODOLOGY_ANCHORS.signals, t.signals.heading],
    ...SIGNAL_RULES.map((r) => [signalAnchor(r), t.rules[r].heading] as [string, string]),
  ];

  it("has a heading with its stable anchor for every section", async () => {
    open(PATH[locale]);
    expect(await screen.findByRole("heading", { level: 1, name: t.title })).toBeVisible();
    for (const [anchor, text] of headings) {
      const heading = document.getElementById(anchor);
      expect(heading, anchor).not.toBeNull();
      expect(heading).toHaveTextContent(text);
      expect(heading?.tagName).toMatch(/^H[23]$/);
    }
    expect(headings.map(([a]) => a)).toEqual(ANCHORS);
    expect(new Set(ANCHORS).size).toBe(ANCHORS.length);
  });

  it("covers every section the ticket names", () => {
    expect(Object.keys(METHODOLOGY_ANCHORS).sort()).toEqual(
      ["awardedValue", "backfilledValues", "blankValues", "consortiumShares", "contractModifications", "coverageStatuses", "frameworkCeilings", "placement", "signals", "supplierIdentity", "suspectValues"],
    );
  });

  it("lists every section in a table of contents that links to its anchor", async () => {
    open(PATH[locale]);
    const nav = await screen.findByRole("navigation", { name: t.contents });
    expect(within(nav).getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(ANCHORS.map((a) => `${PATH[locale]}#${a}`));
  });

  it("shows every Signal rule's window, base rate, year and data-through date from the signalRules fixture (typical)", async () => {
    open(PATH[locale]);
    const rules = fixtures.MethodologyBaseRates.find((f) => f.name === "typical-after-backfill")!.data.signalRules;
    await within(await screen.findByRole("region", { name: t.rules.OVER_CAP.heading })).findAllByText(/2024/);
    for (const rule of rules) {
      const section = region(t.rules[rule.slug].heading);
      const fmt = (d: string) => new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ro", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
      expect(section.getByText(t.baseRate.range(fmt(rule.window.from!), fmt(rule.window.to!)))).toBeVisible();
      const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(rule.baseRate);
      // the Romanian percent sign follows a no-break space
      const sentence = t.baseRate.rate(percent, rule.baseRateYear).replace(/\s/g, " ");
      expect(section.getByText((text) => text.replace(/\s/g, " ") === sentence)).toBeVisible();
      expect(section.getByText(t.baseRate.dataThrough(fmt(rule.dataThrough)))).toBeVisible();
    }
  });

  it("reads the before-backfill answer: an open window start, a rate of zero and no-publication from 2023", async () => {
    open(PATH[locale], "before-backfill");
    await within(await screen.findByRole("region", { name: t.rules.OVER_CAP.heading })).findAllByText(/2024/);
    const fmt = (d: string) => new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ro", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
    const overrun = region(t.rules.FRAMEWORK_OVERRUN.heading);
    expect(overrun.getByText(t.baseRate.openStart(fmt("2024-11-30")))).toBeVisible();
    expect(overrun.getByText(t.baseRate.none(2024))).toBeVisible();
    expect(region(t.rules.NO_PUBLICATION.heading).getByText(t.baseRate.range(fmt("2023-01-01"), fmt("2024-11-30")))).toBeVisible();
  });

  it("keeps every section's prose when the figures are loading", async () => {
    open(PATH[locale], "pending");
    expect(await screen.findByRole("heading", { level: 1, name: t.title })).toBeVisible();
    for (const rule of SIGNAL_RULES) {
      const section = region(t.rules[rule].heading);
      expect(section.getByText(t.rules[rule].paragraphs[0]!)).toBeVisible();
      expect(section.getByRole("status")).toHaveTextContent(t.baseRate.loading);
    }
  });

  it("keeps every section's prose when the figures fail to load", async () => {
    open(PATH[locale], "fail");
    expect((await screen.findAllByText(t.baseRate.error)).length).toBe(SIGNAL_RULES.length);
    for (const rule of SIGNAL_RULES) expect(region(t.rules[rule].heading).getByText(t.rules[rule].paragraphs[0]!)).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("landing on an anchor", () => {
  it.each([["en"], ["ro"]] as const)("brings the section of /%s URL's fragment into view", async (locale) => {
    open(`${PATH[locale]}#signal-framework-overrun`);
    await screen.findByRole("heading", { level: 1, name: catalogue[locale].methodology.title });
    expect(scrolled).toEqual([document.getElementById("signal-framework-overrun")]);
  });

  it("follows a contents link without a load and scrolls to its section", async () => {
    open(PATH.en);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("link", { name: "Suspect values" }));
    expect(window.location.pathname + window.location.hash).toBe("/explore/methodology#suspect-values");
    expect(scrolled.at(-1)).toBe(document.getElementById("suspect-values"));
  });

  it("keeps the fragment when the language is switched", async () => {
    open(`${PATH.en}#signal-splitting`);
    await screen.findByRole("heading", { level: 1, name: "About the numbers" });
    expect(screen.getByRole("link", { name: "Romanian version of this page" })).toHaveAttribute("href", "/ro/explore/methodology#signal-splitting");
    await userEvent.setup().click(screen.getByRole("link", { name: "Romanian version of this page" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Despre cifre" })).toBeVisible();
    expect(window.location.hash).toBe("#signal-splitting");
  });
});

describe("every methodology link the app builds lands on an anchor of the page", () => {
  /** The methodology hrefs on the current screen, the header's own link to the page aside. */
  const methodologyLinks = () =>
    [...document.querySelectorAll<HTMLAnchorElement>("a[href*='/methodology']")].map((a) => a.getAttribute("href")!).filter((h) => h.includes("#"));
  const anchorOf = (href: string) => new URL(href, "http://localhost").hash.slice(1);

  it("builds one per section and one per Signal rule, in both languages", () => {
    for (const locale of ["en", "ro"] as const) {
      for (const key of Object.keys(METHODOLOGY_ANCHORS) as MethodologySectionKey[]) expect(ANCHORS).toContain(anchorOf(methodologyHref(locale, key)));
      for (const rule of SIGNAL_RULES) {
        expect(signalMethodologyHref(locale, rule)).toBe(`${PATH[locale]}#${signalAnchor(rule)}`);
        expect(ANCHORS).toContain(anchorOf(signalMethodologyHref(locale, rule)));
      }
    }
    expect(allMethodologyAnchors(SIGNAL_RULES)).toEqual(ANCHORS);
  });

  async function screenLinks(url: string, ready: () => Promise<unknown>): Promise<string[]> {
    openAt(url);
    render(<App client={fixtureClient().client} />);
    await ready();
    const links = methodologyLinks();
    cleanup();
    return links;
  }

  it("points the totals' ⓘ at awarded value and the suspect Record's rule at suspect values, then resolves each on the page", async () => {
    const overview = await screenLinks("/explore/authority/1000017", () => screen.findByRole("list", { name: "Headline numbers" }));
    expect(overview).toContain("/explore/methodology#awarded-value");
    const records = await screenLinks("/explore/authority/1000017/records", () => screen.findByRole("complementary", { name: "Filter by facet" }));
    expect(records).toContain("/explore/methodology#awarded-value");
    const record = await screenLinks(suspectPath(), () => screen.findByRole("region", { name: "Suspect value rule" }));
    expect(record).toContain("/explore/methodology#suspect-values");
    const romanian = await screenLinks("/ro/explore/authority/1000017", () => screen.findByRole("list", { name: "Cifre principale" }));
    expect(romanian).toContain("/ro/explore/methodology#awarded-value");

    for (const href of new Set([...overview, ...records, ...record, ...romanian])) {
      const locale: Locale = href.startsWith("/ro/") ? "ro" : "en";
      expect(href.startsWith(PATH[locale] + "#"), href).toBe(true);
      expect(ANCHORS, href).toContain(anchorOf(href));
      open(href);
      await screen.findByRole("heading", { level: 1, name: catalogue[locale].methodology.title });
      expect(document.getElementById(anchorOf(href)), href).not.toBeNull();
      cleanup();
    }
  });
});

describe("the Signal sections' wording", () => {
  it.each(["en", "ro"] as const)("never uses a word a Signal never uses (%s)", (locale) => {
    const t = catalogue[locale].methodology;
    const texts = [t.signals.heading, ...t.signals.paragraphs, ...Object.values(t.rules).flatMap((r) => [r.heading, ...r.paragraphs, ...(r.items ?? []).map(plainMethodologyText).map(plainMethodologyText), r.lawful]), t.baseRate.windowLabel, t.baseRate.rateLabel, t.baseRate.loading, t.baseRate.error, t.baseRate.missing];
    for (const text of texts) expect(forbiddenWords(text, locale), text).toEqual([]);
  });
});

/** The recorded Record whose suspect rule the Record page explains (a direct purchase at ten times the cap). */
function suspectPath(): string {
  const found = fixtures.RecordPage.find((f) => f.name === "direct-purchase-suspect")?.data.seap.record;
  if (!found) throw new Error("no recorded direct-purchase-suspect");
  return `/explore/record/${encodeURIComponent(found.code)}`;
}

// Acceptance (#89): the page shows each rule's national base rate from the API. The recorded answers are the real `signalRules` of three
// archives (seam 1, recorded/signals/MethodologyBaseRates.json): over-cap 2 of 3 and no-publication 1 of 3 authorities in one, splitting 1 of 1
// in the second and framework-overrun 1 of 1 in the third, so every rule's non-zero base rate is on the page in one of them.
describe.each(["en", "ro"] as const)("the base rates from the API's own answers (%s)", (locale) => {
  const t = catalogue[locale].methodology;
  const recordedRates = recordedSignalsMethodology;
  const fmt = (d: string) => new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "ro", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));

  it.each(recordedRates.map((f) => [f.name, f.data.signalRules] as const))("%s: each rule's window, rate, year and data-through date", async (name, rules) => {
    open(PATH[locale], name);
    await within(await screen.findByRole("region", { name: t.rules.OVER_CAP.heading })).findAllByText(/20\d\d/);
    for (const rule of rules) {
      const section = region(t.rules[rule.slug].heading);
      const to = fmt(rule.window.to ?? rule.dataThrough);
      expect(section.getByText(rule.window.from === null ? t.baseRate.openStart(to) : t.baseRate.range(fmt(rule.window.from), to))).toBeVisible();
      if (rule.baseRate === 0) expect(section.getByText(t.baseRate.none(rule.baseRateYear))).toBeVisible();
      else {
        const percent = new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 2 }).format(rule.baseRate);
        const sentence = t.baseRate.rate(percent, rule.baseRateYear).replace(/\s/g, " ");
        expect(section.getByText((text) => text.replace(/\s/g, " ") === sentence)).toBeVisible();
      }
      expect(section.getByText(t.baseRate.dataThrough(fmt(rule.dataThrough)))).toBeVisible();
    }
  });

  it("shows every rule's non-zero rate in one of the three answers, and a rule the answer lacks says nothing was computed", async () => {
    const nonZero = new Set(recordedRates.flatMap((f) => f.data.signalRules.filter((r) => r.baseRate > 0).map((r) => r.slug)));
    expect([...nonZero].sort()).toEqual([...SIGNAL_RULES].sort());
    const splitting = recordedRates.find((f) => f.name === "splitting-archive")!;
    open(PATH[locale], splitting.name);
    await within(await screen.findByRole("region", { name: t.rules.OVER_CAP.heading })).findAllByText(/20\d\d/);
    // the archive had no Contracte and no negotiated awards: the API sends no row for those two rules, and the page keeps their prose
    expect(region(t.rules.FRAMEWORK_OVERRUN.heading).getByText(t.rules.FRAMEWORK_OVERRUN.paragraphs[0]!)).toBeVisible();
    expect(region(t.rules.FRAMEWORK_OVERRUN.heading).queryByText(/100\s?%/)).toBeNull();
  });
});
