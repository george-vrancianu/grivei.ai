import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import {
  authorityManyCounterpartiesOverview, authorityOverview, emptyOverview, manyAliasesOverview, supplierOverview,
} from "../../samples/fixtureData.ts";
import type { EntityAliases, EntityOverviewData, EntityRole } from "../../types.ts";
import { EntityOverview, OverviewSkeleton } from "./index.ts";

function show(data: { overview: EntityOverviewData; aliases: EntityAliases }, role: EntityRole, locale: Locale = "en", signals?: React.ReactNode, signalsToolbar?: React.ReactNode, extra: Partial<React.ComponentProps<typeof EntityOverview>> = {}) {
  renderInUi(
    <EntityOverview
      overview={data.overview}
      aliases={data.aliases}
      role={role}
      entityHref={(e, r) => `/explore/${r}/${e.key}`}
      recordHref={(r) => `/explore/record/${r.code}`}
      methodologyHref="/explore/methodology"
      suspectHref="/s"
      locale={locale}
      copy={sampleCopy.entityOverview(locale)}
      signals={signals}
      signalsToolbar={signalsToolbar}
      {...extra}
    />,
    locale,
  );
}

function overviewProps(data: { overview: EntityOverviewData; aliases: EntityAliases }, locale: Locale) {
  return {
    overview: data.overview,
    aliases: data.aliases,
    role: "supplier" as const,
    entityHref: (e: { key: string }, r: string) => `/explore/${r}/${e.key}`,
    recordHref: (r: { code: string }) => `/explore/record/${r.code}`,
    methodologyHref: "/explore/methodology",
    suspectHref: "/s",
    locale,
    copy: sampleCopy.entityOverview(locale),
  };
}

describe("the Overview tab", () => {
  it("shows the headline numbers of a supplier", () => {
    show(supplierOverview, "supplier");
    const headline = screen.getByRole("list", { name: "Headline numbers" });
    expect(within(headline).getByText("RON 5,761,440")).toBeVisible();
    expect(within(headline).getByText("The largest holds 66.7% of the total")).toBeVisible();
    expect(within(headline).getByText("93.6%")).toBeVisible();
    expect(within(headline).getByText("1 suspect value left out")).toBeVisible();
  });

  it("puts the Signals the slot holds under a heading with their count, and says so when there are none", () => {
    show(supplierOverview, "supplier", "en", <p>the cards</p>);
    expect(screen.getByRole("heading", { name: "Signals (6)" })).toBeVisible();
    expect(screen.getByText("the cards")).toBeVisible();
  });

  it("says there are no Signals for an entity without any", () => {
    show(authorityOverview, "authority", "en", <p>the cards</p>);
    expect(screen.getByRole("heading", { name: "Signals (0)" })).toBeVisible();
    expect(screen.getByText("No Signals for this entity.")).toBeVisible();
    expect(screen.queryByText("the cards")).toBeNull();
  });

  it("lists every section of an authority with many counterparties, and the framework line with its ceilings", () => {
    show(authorityManyCounterpartiesOverview, "authority");
    expect(within(screen.getByRole("region", { name: "Framework agreements" })).getByText("RON 100,000,000")).toBeVisible();
    expect(screen.getByRole("region", { name: "Consortia" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Procedure types" })).toBeVisible();
    expect(screen.getByText("and 216 more")).toBeVisible();
  });

  it("shows the Romanian copy under /ro/", () => {
    show(authorityManyCounterpartiesOverview, "authority", "ro");
    expect(screen.getByRole("heading", { name: "Cele mai mari înregistrări" })).toBeVisible();
    expect(screen.getByText("și încă 216")).toBeVisible();
    expect(screen.getByText("Persoană fizică")).toBeVisible();
  });

  it("has an empty sentence for every list when nothing is in the filter", () => {
    show(emptyOverview, "authority");
    expect(screen.getByText("No counterparties in this selection.")).toBeVisible();
    expect(screen.getByText("No procedures in this selection.")).toBeVisible();
    expect(screen.getByText("No framework agreements.")).toBeVisible();
    expect(screen.getByText("No counted Records in this selection.")).toBeVisible();
  });

  it("shows many aliases, the ones that differ from ANAF flagged", () => {
    show(manyAliasesOverview, "supplier");
    const aliases = screen.getByRole("region", { name: "Appears in SEAP as" });
    expect(within(aliases).getAllByRole("listitem")).toHaveLength(8);
    expect(within(aliases).getAllByText("Name differs from ANAF")).toHaveLength(5);
  });
});

describe("the Overview's Signals section", () => {
  it.each(["en", "ro"] as const)("has the stable anchor #signals in %s, on the section that holds the heading", (locale) => {
    show(supplierOverview, "supplier", locale, <p>the cards</p>);
    const section = document.getElementById("signals")!;
    expect(section).not.toBeNull();
    expect(within(section).getByRole("heading", { level: 2 })).toBeVisible();
    expect(within(section).getByText("the cards")).toBeVisible();
  });

  it("keeps the anchor when there are no Signals, so a link to it still lands somewhere", () => {
    show(authorityOverview, "authority");
    expect(document.getElementById("signals")).not.toBeNull();
  });

  it("has the order toggle on the heading's line, before the cards", () => {
    show(supplierOverview, "supplier", "en", <p>the cards</p>, <p>the toggle</p>);
    const section = document.getElementById("signals")!;
    const parts = Array.from(section.querySelectorAll("h2, p")).map((n) => n.textContent);
    expect(parts).toEqual(["Signals (6)", "the toggle", "the cards"]);
  });

  const pageNav = sampleCopy.fullResults("en").pagination;
  const paging = (page: number, shown: number) => ({ page, pageSize: 20, shown, pageHref: (n: number) => `?page=${n}`, copy: pageNav });
  const withCount = (count: number) => ({ ...supplierOverview, overview: { ...supplierOverview.overview, signals: { ...supplierOverview.overview.signals, count } } });

  it.each([
    ["en", "Signals 1–20 of 72", "Page 4"],
    ["ro", "Semnalele 1–20 din 72", "Pagina 4"],
  ] as const)("tells the range beside the page links when the Signals run over one page (%s)", (locale, line, page4) => {
    renderInUi(
      <EntityOverview
        {...overviewProps(withCount(72), locale)}
        signals={<p>the cards</p>}
        signalsPaging={{ ...paging(1, 20), copy: sampleCopy.fullResults(locale).pagination }}
      />,
      locale,
    );
    expect(screen.getByText(line)).toBeVisible();
    expect(screen.getByRole("link", { name: page4 })).toHaveAttribute("href", "?page=4");
  });

  it("tells the range of a later and of a short last page", () => {
    renderInUi(<EntityOverview {...overviewProps(withCount(72), "en")} signals={<p>the cards</p>} signalsPaging={paging(4, 12)} />, "en");
    expect(screen.getByText("Signals 61–72 of 72")).toBeVisible();
  });

  it("tells the range but draws no page links when the Signals fit on one page", () => {
    renderInUi(<EntityOverview {...overviewProps(withCount(6), "en")} signals={<p>the cards</p>} signalsPaging={paging(1, 6)} />, "en");
    expect(screen.getByText("Signals 1–6 of 6")).toBeVisible();
    expect(screen.queryByRole("navigation", { name: pageNav.label })).toBeNull();
  });

  it("has no range line and no toolbar when there are no Signals", () => {
    renderInUi(<EntityOverview {...overviewProps(authorityOverview, "en")} signalsToolbar={<p>the toggle</p>} signalsPaging={paging(1, 0)} />, "en");
    expect(screen.queryByText(/^Signals \d/)).toBeNull();
    expect(screen.queryByText("the toggle")).toBeNull();
  });

  it("leaves the toolbar out when there are no Signals to order", () => {
    show(authorityOverview, "authority", "en", undefined, <p>the toggle</p>);
    expect(screen.queryByText("the toggle")).toBeNull();
  });

  it("is not scored: no heading, label or figure in the Overview says score, rank or risk", () => {
    show(supplierOverview, "supplier", "en", <p>the cards</p>);
    expect(document.body.textContent).not.toMatch(/\b(score|scored by|rank|risk|suspicious|fraud)\b/i);
  });
});

describe("the Overview while it reloads", () => {
  it("is aria-busy only while a next answer is awaited, and keeps its figures and headings", () => {
    const { unmount } = renderInUi(<EntityOverview {...overviewProps(supplierOverview, "en")} />, "en");
    expect(document.querySelector("[aria-busy]")).toBeNull();
    unmount();
    renderInUi(<EntityOverview {...overviewProps(supplierOverview, "en")} busy status={<p role="status">Loading…</p>} />, "en");
    const busy = document.querySelector("[aria-busy='true']")!;
    expect(within(busy as HTMLElement).getByRole("list", { name: "Headline numbers" })).toBeVisible();
    expect(within(busy as HTMLElement).getByRole("status")).toHaveTextContent("Loading…");
    expect(within(busy as HTMLElement).getByRole("heading", { name: "Counterparties" })).toBeVisible();
  });
});

describe("the Overview on first load", () => {
  it.each([
    ["en", "Headline numbers", ["Total awarded", "Counterparties", "Share via direct purchase", "Signals"], "Loading…"],
    ["ro", "Cifre principale", ["Total atribuit", "Contraparți", "Pondere prin achiziție directă", "Semnale"], "Se încarcă…"],
  ] as const)("keeps the real labels and headings and says it is loading (%s)", (locale, headline, labels, loading) => {
    const copy = sampleCopy.entityOverview(locale);
    renderInUi(<OverviewSkeleton copy={copy} status={<p role="status">{loading}</p>} />, locale);
    // placeholders are decoration: hidden from assistive technology, only the status line is announced
    expect(screen.queryByRole("list", { name: headline })).toBeNull();
    for (const label of labels) expect(screen.getAllByText(label)[0]).toBeVisible();
    for (const heading of [copy.counterparties.heading, copy.procedures.heading, copy.largest.heading, copy.frameworks.heading]) expect(screen.getAllByText(heading)[0]).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(loading);
  });
});
