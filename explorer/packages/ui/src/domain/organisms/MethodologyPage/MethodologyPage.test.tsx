import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { methodologyRates, sampleMethodologyCopy } from "../../samples/methodology.ts";
import { METHODOLOGY_ANCHORS, METHODOLOGY_SECTIONS, allMethodologyAnchors, signalAnchor } from "../../utils/methodologyAnchors.ts";
import { RESTRICTED_SIGNAL_RULES, SIGNAL_RULES as ALL_SIGNAL_RULES } from "../../utils/signalWording.ts";
import { MethodologyPage, type MethodologyPageProps } from "./index.ts";

/** The rules the default answers show: a Restricted rule's section needs the API to return the rule (tested below). */
const SIGNAL_RULES = ALL_SIGNAL_RULES.filter((r) => !RESTRICTED_SIGNAL_RULES.includes(r));

const show = (props: Partial<MethodologyPageProps> = {}, locale: Locale = "en") =>
  renderInUi(
    <MethodologyPage
      baseRates={{ status: "ready", rules: methodologyRates("typical-after-backfill") }}
      sectionHref={(a) => `/explore/methodology#${a}`}
      locale={locale}
      copy={sampleMethodologyCopy(locale)}
      {...props}
    />,
    locale,
  );

describe("the methodology page's anchors", () => {
  it("has one heading for each of the general sections, the Signal rules and each rule, with the anchor as its id", () => {
    show();
    for (const anchor of allMethodologyAnchors(SIGNAL_RULES)) {
      const el = document.getElementById(anchor);
      expect(el, anchor).not.toBeNull();
      expect(el?.tagName).toMatch(/^H[23]$/);
    }
    expect(allMethodologyAnchors(SIGNAL_RULES)).toHaveLength(METHODOLOGY_SECTIONS.length + 1 + SIGNAL_RULES.length);
  });

  it("names the Signal rules' anchors after their slugs", () => {
    expect(SIGNAL_RULES.map(signalAnchor)).toEqual([
      "signal-over-cap", "signal-splitting", "signal-framework-overrun", "signal-no-publication",
      "signal-young-firm", "signal-no-construction-caen", "signal-after-strike-off", "signal-insolvency", "signal-few-employees", "signal-no-financial-statement",
      "signal-donor-to-party",
    ]);
    expect(ALL_SIGNAL_RULES.map(signalAnchor)).toContain("signal-soe-board-in-supplier");
    expect(METHODOLOGY_ANCHORS.awardedValue).toBe("awarded-value");
  });

  it.each(["en", "ro"] as const)("uses the same ids in %s", (locale) => {
    show({}, locale);
    expect(allMethodologyAnchors(SIGNAL_RULES).every((a) => document.getElementById(a))).toBe(true);
  });
});

describe("the contents", () => {
  it("links to every section's anchor and follows a plain click without a load", async () => {
    const onNavigate = vi.fn();
    show({ onNavigate });
    const nav = screen.getByRole("navigation", { name: "On this page" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(allMethodologyAnchors(SIGNAL_RULES).map((a) => `/explore/methodology#${a}`));
    await userEvent.setup().click(within(nav).getByRole("link", { name: "Suspect values" }));
    expect(onNavigate).toHaveBeenCalledWith("/explore/methodology#suspect-values");
  });
});

describe("a Restricted rule's section (#185)", () => {
  const SOE = { slug: "SOE_BOARD_IN_SUPPLIER" as const, window: { from: "2021-01-01", to: "2024-11-30" }, baseRate: 0.02, baseRateYear: 2024, dataThrough: "2024-11-30" };
  const soeHeading = "Public-enterprise board member in a supplier";

  it("is absent (section, contents entry, anchor) unless the API returned the rule", () => {
    for (const baseRates of [{ status: "ready", rules: methodologyRates("typical-after-backfill") }, { status: "loading" }, { status: "error" }] as const) {
      const { unmount } = show({ baseRates });
      expect(document.getElementById("signal-soe-board-in-supplier")).toBeNull();
      expect(screen.queryByText(soeHeading)).toBeNull();
      unmount();
    }
  });

  it("appears with its own window and firing rate when the API returned the rule", () => {
    show({ baseRates: { status: "ready", rules: [...methodologyRates("typical-after-backfill"), SOE] } });
    expect(document.getElementById("signal-soe-board-in-supplier")).not.toBeNull();
    expect(within(screen.getByRole("region", { name: soeHeading })).getByText("2% of contracting authorities had at least one in 2024.")).toBeVisible();
    expect(within(screen.getByRole("navigation", { name: "On this page" })).getByRole("link", { name: soeHeading })).toBeVisible();
  });
});

/** jsdom has no `scrollIntoView`: a stand-in that records the elements it was called on. */
function stubScroll() {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  return scroll;
}

describe("scrolling to a section", () => {
  afterEach(() => {
    // @ts-expect-error jsdom does not define it; remove the stand-in again
    delete Element.prototype.scrollIntoView;
  });

  it("brings the section named by the anchor into view when the page renders", () => {
    const scroll = stubScroll();
    show({ anchor: "signal-splitting" });
    expect(scroll).toHaveBeenCalledOnce();
    expect(scroll.mock.contexts[0]).toBe(document.getElementById("signal-splitting"));
  });

  it("does nothing for no anchor or an anchor the page does not have", () => {
    const scroll = stubScroll();
    show({ anchor: "no-such-section" });
    expect(scroll).not.toHaveBeenCalled();
  });
});

describe("the Signal rules' base-rate slots", () => {
  it("puts each rule's window and rate in its own section", () => {
    show();
    const over = within(screen.getByRole("region", { name: "Over cap" }));
    expect(over.getByText("5.7% of contracting authorities had at least one in 2024.")).toBeVisible();
    const frame = within(screen.getByRole("region", { name: "Framework overrun" }));
    expect(frame.getByText("0.4% of contracting authorities had at least one in 2024.")).toBeVisible();
  });

  it("reads the before-backfill answer: an open start, a zero rate and a window that starts in 2023", () => {
    show({ baseRates: { status: "ready", rules: methodologyRates("before-backfill") } });
    const frame = within(screen.getByRole("region", { name: "Framework overrun" }));
    expect(frame.getByText("From the first Record loaded to 30 November 2024")).toBeVisible();
    expect(frame.getByText("No contracting authority had one in 2024.")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "No publication" })).getByText("1 January 2023 to 30 November 2024")).toBeVisible();
  });

  it.each([["loading"], ["error"]] as const)("keeps the prose when the figures are %s", (status) => {
    show({ baseRates: { status } });
    expect(screen.getByText("Over cap: the rule in one sentence.")).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(SIGNAL_RULES.length);
    expect(screen.queryByText(/%/)).toBeNull();
  });
});
