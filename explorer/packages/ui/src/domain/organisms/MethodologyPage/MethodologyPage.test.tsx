import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installIntersectionObserver } from "../../../testing/intersectionObserverStub.ts";
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
  it("has one section for each of the general sections, the Signal rules and each rule, with the anchor as its id and a heading (H2 or H3) as its name", () => {
    show();
    for (const anchor of allMethodologyAnchors(SIGNAL_RULES)) {
      const el = document.getElementById(anchor);
      expect(el, anchor).not.toBeNull();
      expect(el?.tagName).toBe("SECTION");
      const heading = within(el!).getAllByRole("heading")[0]!;
      expect(heading.tagName).toMatch(/^H[23]$/);
      expect(within(el!.parentElement!).getByRole("region", { name: heading.textContent! })).toBe(el);
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
  it("is a titled panel: an h2 over the navigation landmark", () => {
    show();
    expect(screen.getByRole("heading", { level: 2, name: "On this page" })).toBeVisible();
    expect(screen.getByRole("region", { name: "On this page" })).toContainElement(screen.getByRole("navigation", { name: "On this page" }));
  });

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
    for (const baseRates of [{ status: "ready", rules: methodologyRates("typical-after-backfill") }, { status: "loading" }, { status: "error", retry: () => {} }] as const) {
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

describe("the Signal rules' panels", () => {
  it("puts each rule's definition, conditions, figures and lawful explanations in its own panel, named by the rule", () => {
    show();
    const over = within(screen.getByRole("region", { name: "Over cap" }));
    expect(over.getByRole("heading", { level: 3, name: "Over cap" })).toBeVisible();
    expect(over.getByText("Over cap: the rule in one sentence.")).toBeVisible();
    expect(over.getAllByRole("listitem").length).toBeGreaterThan(0);
    for (const label of ["Time window", "How often it fires nationally", "Data through"]) expect(over.getByText(label)).toBeVisible();
    expect(over.getByText("Possible lawful explanations: a sample line.")).toBeVisible();
  });

  it("puts each rule's window and rate in its own panel", () => {
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

  it("keeps the prose and the real labels on first load, with one loading status for the group and no figures", () => {
    show({ baseRates: { status: "loading" } });
    expect(screen.getByText("Over cap: the rule in one sentence.")).toBeVisible();
    expect(within(screen.getByRole("region", { name: "Over cap" })).getByText("Time window")).toBeVisible();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(within(document.getElementById("signals")!).getByRole("status")).toHaveTextContent("Loading the window and the national figure…");
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("shows one error note with its retry under the Signal rules' heading, keeps every rule's prose and drops the figures", async () => {
    const retry = vi.fn();
    show({ baseRates: { status: "error", retry } });
    const group = within(document.getElementById("signals")!);
    expect(group.getByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    await userEvent.setup().click(group.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
    for (const rule of SIGNAL_RULES) expect(screen.getByText(`${sampleMethodologyCopy("en").rules[rule].heading}: the rule in one sentence.`)).toBeVisible();
    expect(screen.queryByText("Time window")).toBeNull();
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("dims the figures of the held answer with aria-busy while the next loads, and shows the loading status", () => {
    show({ baseRates: { status: "ready", rules: methodologyRates("typical-after-backfill"), stale: true } });
    const over = screen.getByRole("region", { name: "Over cap" });
    expect(over.querySelectorAll("[aria-busy='true']").length).toBeGreaterThan(0);
    expect(within(over).getByText("5.7% of contracting authorities had at least one in 2024.")).toBeVisible();
    expect(within(over).queryByText("Loading the window and the national figure…")).toBeNull();
    expect(within(document.getElementById("signals")!).getByText("Loading the window and the national figure…")).toBeVisible();
  });

  it("is not busy when the answer is current", () => {
    show();
    expect(document.querySelector("[aria-busy]")).toBeNull();
    expect(screen.queryByText("Loading the window and the national figure…")).toBeNull();
  });
});

describe("the section in view (scroll-spy)", () => {
  let observer: ReturnType<typeof installIntersectionObserver>;
  beforeEach(() => {
    observer = installIntersectionObserver();
  });
  afterEach(() => observer.uninstall());

  const link = (name: string) => within(screen.getByRole("navigation", { name: "On this page" })).getByRole("link", { name });
  const section = (anchor: string) => document.getElementById(anchor)!;

  it("marks exactly one link current: the first section when there is no hash", () => {
    show();
    const current = within(screen.getByRole("navigation", { name: "On this page" })).getAllByRole("link").filter((l) => l.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName("Awarded value");
    expect(current[0]).toHaveAttribute("aria-current", "location");
  });

  it("starts at the hash's section", () => {
    show({ anchor: "signal-splitting" });
    expect(link("Splitting")).toHaveAttribute("aria-current", "location");
    expect(link("Awarded value")).not.toHaveAttribute("aria-current");
  });

  it("observes every section and rule panel, and nothing before they exist", () => {
    show();
    expect(observer.observers).toHaveLength(1);
    const observed = [...observer.observers[0]!.observed];
    expect(observed).toEqual(allMethodologyAnchors(SIGNAL_RULES).map((a) => section(a)));
  });

  it("marks a section current when it scrolls into view, and the topmost one when several are", () => {
    show();
    act(() => observer.seeing([[section("suspect-values"), true]]));
    expect(link("Suspect values")).toHaveAttribute("aria-current", "location");
    expect(link("Awarded value")).not.toHaveAttribute("aria-current");
    act(() => observer.seeing([[section("signal-splitting"), true]]));
    expect(link("Suspect values")).toHaveAttribute("aria-current", "location");
    act(() => observer.seeing([[section("suspect-values"), false]]));
    expect(link("Splitting")).toHaveAttribute("aria-current", "location");
    expect(within(screen.getByRole("navigation", { name: "On this page" })).getAllByRole("link").filter((l) => l.getAttribute("aria-current"))).toHaveLength(1);
  });

  it("marks a Signal rule current while its parent Signal rules section is in view too, and the group only when no rule is", () => {
    show();
    act(() => observer.seeing([[section("signals"), true]]));
    expect(link("Signal rules")).toHaveAttribute("aria-current", "location");
    act(() => observer.seeing([[section("signal-splitting"), true]]));
    expect(link("Splitting")).toHaveAttribute("aria-current", "location");
    expect(link("Signal rules")).not.toHaveAttribute("aria-current");
    act(() => observer.seeing([[section("signal-splitting"), false]]));
    expect(link("Signal rules")).toHaveAttribute("aria-current", "location");
  });

  it("keeps a clicked link current while the page scrolls to it, even when an earlier section is reported", async () => {
    show({ onNavigate: vi.fn() });
    await userEvent.setup().click(link("No publication"));
    act(() => observer.seeing([[section("signals"), true], [section("signal-framework-overrun"), true]]));
    expect(link("No publication")).toHaveAttribute("aria-current", "location");
  });

  it("does not mark a link current for a click that opens it elsewhere", async () => {
    show({ onNavigate: vi.fn() });
    const user = userEvent.setup();
    await user.keyboard("{Control>}");
    await user.click(link("Placement"));
    expect(link("Placement")).not.toHaveAttribute("aria-current");
  });

  it("keeps the last current section when none is in view", () => {
    show();
    act(() => observer.seeing([[section("suspect-values"), true]]));
    act(() => observer.seeing([[section("suspect-values"), false]]));
    expect(link("Suspect values")).toHaveAttribute("aria-current", "location");
  });

  it("marks a link current at once when it is clicked", async () => {
    show({ onNavigate: vi.fn() });
    await userEvent.setup().click(link("Placement"));
    expect(link("Placement")).toHaveAttribute("aria-current", "location");
  });

  it("follows a new hash", () => {
    const { rerender } = show();
    rerender(<MethodologyPage baseRates={{ status: "ready", rules: methodologyRates("typical-after-backfill") }} sectionHref={(a) => `/explore/methodology#${a}`} anchor="placement" locale="en" copy={sampleMethodologyCopy("en")} />);
    expect(link("Placement")).toHaveAttribute("aria-current", "location");
  });

  it("disconnects its observer when the page goes away", () => {
    const { unmount } = show();
    unmount();
    expect(observer.observers.every((o) => o.disconnected)).toBe(true);
  });

  it("falls back to the hash alone, without throwing, when the browser has no IntersectionObserver", () => {
    observer.uninstall();
    expect(() => show({ anchor: "placement" })).not.toThrow();
    expect(link("Placement")).toHaveAttribute("aria-current", "location");
  });
});
