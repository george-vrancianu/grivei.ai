import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sentence } from "../../../testing/sentence.ts";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { frameworkOverrunSignal, manySuppliersSignal, noPublicationSignal, overCapSignal, splittingSignal } from "../../samples/signals.ts";
import type { SignalData } from "../../types.ts";
import { SignalCard } from "./index.ts";

function show(signal: SignalData, locale: Locale = "en", extra: { seapHref?: string | null; onNavigate?: (href: string) => void } = {}) {
  renderInUi(
    <SignalCard
      signal={signal}
      reproduceHref="/explore/authority/4000001/records?signal=splitting"
      methodologyHref="/explore/methodology#signal-splitting"
      entityHref={(e, r) => `/explore/${r}/${e.key}`}
      locale={locale}
      copy={sampleCopy.signalCard(locale)}
      {...extra}
    />,
    locale,
  );
}

describe("the money in a Signal sentence", () => {
  const flat = (t: string) => t.replace(/[\s\u00a0\u202f]+/g, " ");
  const inMoney = (el: HTMLElement) => getComputedStyle(el).fontFamily.includes("IBM Plex Mono");
  it.each([
    ["en", overCapSignal, ["RON 300,000.00", "RON 270,120.00"]],
    ["ro", overCapSignal, ["300.000,00\u00a0RON", "270.120,00\u00a0RON"]],
    ["en", splittingSignal, ["RON 290,000.00", "RON 270,120.00"]],
    ["ro", splittingSignal, ["290.000,00\u00a0RON", "270.120,00\u00a0RON"]],
    ["en", frameworkOverrunSignal, ["RON 112,400,000.00", "RON 100,000,000.00"]],
    ["ro", frameworkOverrunSignal, ["112.400.000,00\u00a0RON", "100.000.000,00\u00a0RON"]],
  ] as const)("renders each amount in the money variant (%s)", (locale, signal, amounts) => {
    show(signal, locale);
    for (const amount of amounts) {
      const el = screen.getAllByText((_c, e) => e?.tagName === "SPAN" && flat(e.textContent ?? "") === flat(amount))[0]!;
      expect(inMoney(el), amount).toBe(true);
    }
  });
});

describe("the Signal card", () => {
  it("states an over-cap Signal in four parts: label, sentence with its numbers, lawful explanations, and what it consists of", () => {
    show(overCapSignal);
    const card = screen.getByRole("article", { name: "Over cap" });
    expect(within(card).getByRole("heading", { level: 3, name: "Over cap" })).toBeVisible();
    expect(within(card).getByText(sentence("One direct purchase was awarded for RON 300,000.00, 1.11 times the direct-purchase cap of RON 270,120.00."))).toBeVisible();
    expect(within(card).getByText(/^Possible lawful explanations: a call-off under a framework agreement/)).toBeVisible();
    expect(within(card).getByText("Latest Record: 19 January 2024 · 1 Record")).toBeVisible();
  });

  it("fills a splitting Signal with its purchases, group, window and sums", () => {
    show(splittingSignal);
    expect(
      screen.getByText(sentence("2 direct purchases in CPV group 770 between 1 July 2024 and 19 July 2024 add up to RON 290,000.00, above the single-purchase cap of RON 270,120.00.")),
    ).toBeVisible();
    expect(screen.getByText(/separate needs, separate budget lines/)).toBeVisible();
  });

  it("fills a framework-overrun Signal with the ceiling, what was reported and the ratio", () => {
    show(frameworkOverrunSignal);
    expect(screen.getByText(sentence(/Subsequent contracts reported under one framework agreement add up to RON 112,400,000.00, against a ceiling of RON 100,000,000.00: 112.4% of it\./))).toBeVisible();
    expect(screen.getByText(/indexation of prices, or modifications the law allows/)).toBeVisible();
  });

  it("names the procedure of a no-publication Signal as SEAP publishes it", () => {
    show(noPublicationSignal);
    expect(screen.getByText(/Awarded by the procedure "Negociere fără publicare prealabilă"/)).toBeVisible();
    expect(screen.getByText(/an emergency, a single possible supplier, or another legal ground/)).toBeVisible();
  });

  it("says the same in Romanian, with the numbers in Romanian format", () => {
    show(splittingSignal, "ro");
    expect(screen.getByRole("heading", { level: 3, name: "Fracționare" })).toBeVisible();
    expect(
      screen.getByText(sentence("2 achiziții directe din grupa CPV 770, între 1 iulie 2024 și 19 iulie 2024, însumează 290.000,00 RON, peste plafonul de 270.120,00 RON al unei singure achiziții.")),
    ).toBeVisible();
    expect(screen.getByText(/Explicații legale posibile: nevoi distincte/)).toBeVisible();
  });

  it("names the authority and the suppliers with links to their pages", () => {
    show(splittingSignal);
    expect(screen.getByRole("link", { name: "MUNICIPIUL BRAȘOV" })).toHaveAttribute("href", "/explore/authority/4000001");
    expect(screen.getByRole("link", { name: "HACHI INVEST S.R.L." })).toHaveAttribute("href", "/explore/supplier/30000001");
  });

  it("names five suppliers and counts the rest", () => {
    show(manySuppliersSignal);
    expect(screen.getAllByRole("link", { name: /S\.R\.L\.|GMBH/ })).toHaveLength(5);
    expect(screen.getByText("and 6 more")).toBeVisible();
  });

  it("links the Signal's Records, the one Record in SEAP, and the methodology", () => {
    show(overCapSignal, "en", { seapHref: "/source/seap/DA12345678" });
    expect(screen.getByRole("link", { name: "See the Record" })).toHaveAttribute("href", "/explore/authority/4000001/records?signal=splitting");
    expect(screen.getByRole("link", { name: "Check in SEAP" })).toHaveAttribute("href", "/source/seap/DA12345678");
    expect(screen.getByRole("link", { name: "How this Signal is detected" })).toHaveAttribute("href", "/explore/methodology#signal-splitting");
  });

  it("says to check each Record in SEAP when there are several (no single link)", () => {
    show(frameworkOverrunSignal);
    expect(screen.getByRole("link", { name: "See the 13 Records" })).toBeVisible();
    expect(screen.queryByRole("link", { name: "Check in SEAP" })).toBeNull();
    expect(screen.getByText("Check each Record in SEAP")).toBeVisible();
  });

  it("hands a plain click on the Records link to onNavigate and leaves a modified click to the browser", async () => {
    const onNavigate = vi.fn();
    show(splittingSignal, "en", { onNavigate });
    await userEvent.setup().click(screen.getByRole("link", { name: "See the 2 Records" }));
    expect(onNavigate).toHaveBeenCalledWith("/explore/authority/4000001/records?signal=splitting");
  });

  it("shows no score, rank or percentage of suspicion", () => {
    show(frameworkOverrunSignal);
    expect(screen.queryByText(/score|rank|\/ 100/i)).toBeNull();
  });

  it("writes Romanian counts of 20 or more with \"de\" (25 de achiziții, 25 de înregistrări)", () => {
    const many: SignalData = {
      ...splittingSignal, recordCount: 25,
      numbers: { __typename: "SplittingNumbers", purchases: 25, sum: "29000000", cap: "27012000", cpvGroup: "770", from: "2024-07-01", to: "2024-07-19" },
    };
    show(many, "ro");
    expect(screen.getByText(/^25 de achiziții directe din grupa CPV 770/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Vezi cele 25 de înregistrări" })).toBeVisible();
  });

  it("writes Romanian counts under 20 without \"de\" and a framework sentence that names the subsequent contracts", () => {
    show(frameworkOverrunSignal, "ro");
    expect(screen.getByRole("link", { name: "Vezi cele 13 înregistrări" })).toBeVisible();
    expect(screen.getByText(/^Contractele subsecvente raportate pentru un acord-cadru însumează/)).toBeVisible();
  });
});
