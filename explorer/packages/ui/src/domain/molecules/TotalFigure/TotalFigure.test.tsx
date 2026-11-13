import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
import { color } from "../../../theme/tokens.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { totalExtreme, totalTypical, totalWithLeftOut } from "../../samples/fixtureData.ts";
import type { Total } from "../../types.ts";
import { TotalFigure } from "./index.ts";
import { sentence } from "../../../testing/sentence.ts";

const base = { methodologyHref: "/methodology/", suspectHref: "/explore/?badge=SUSPECT_VALUE" };
const empty: Total = { awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false };

describe("TotalFigure", () => {
  it("shows how many suspect Records were left out and links to them", () => {
    renderInUi(<TotalFigure total={{ ...empty, awarded: "6000000000", records: 11, suspectLeftOut: 3 }} locale="en" copy={sampleCopy.total("en")} {...base} />);
    expect(screen.getByRole("link", { name: "3 suspect values left out" })).toHaveAttribute("href", base.suspectHref);
  });
  it("says it in Romanian, with the singular", () => {
    renderInUi(<TotalFigure total={{ ...empty, suspectLeftOut: 1 }} locale="ro" copy={sampleCopy.total("ro")} {...base} />, "ro");
    expect(screen.getByRole("link", { name: "1 valoare suspectă exclusă" })).toHaveAttribute("href", base.suspectHref);
  });
  it("links the ⓘ to the methodology page with an accessible name", () => {
    renderInUi(<TotalFigure total={totalTypical} locale="en" copy={sampleCopy.total("en")} {...base} />);
    expect(screen.getByRole("link", { name: "How this total is counted" })).toHaveAttribute("href", "/methodology/");
  });
  it("sizes the amount by the width of its own box (container units), so a long total fits a 390 px card; jsdom cannot lay out, so the stylesheet is read", () => {
    renderInUi(<TotalFigure total={totalExtreme} locale="en" copy={sampleCopy.total("en")} {...base} />);
    const rulesOf = (el: Element) =>
      [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]).filter((rule) => [...el.classList].some((c) => (rule as CSSStyleRule).selectorText?.includes(`.${c}`))).map((rule) => rule.cssText).join("\n");
    const amount = document.querySelector("p.MuiTypography-total")!; // the amount's own paragraph (the framework line repeats the text)
    const css = rulesOf(amount);
    const ancestors = (el: Element | null): Element[] => (el ? [el, ...ancestors(el.parentElement)] : []);
    // the box the amount is measured against is one of its own ancestors
    expect(ancestors(amount.parentElement).map(rulesOf).join("\n")).toMatch(/container-type:\s*inline-size/);
    expect(css).toMatch(/font-size:\s*clamp\(18px,\s*9cqi,\s*40px\)/);
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
  });
  it("shows the awarded value and the Record count", () => {
    renderInUi(<TotalFigure total={totalTypical} locale="en" copy={sampleCopy.total("en")} {...base} />);
    expect(screen.getByText(/^RON\s7,600$/)).toBeVisible();
    expect(screen.getByText("8 Records")).toBeVisible();
  });
  it("shows no-value Records and framework ceilings, and stays silent about zero parts", () => {
    renderInUi(<TotalFigure total={totalWithLeftOut} locale="en" copy={sampleCopy.total("en")} {...base} />);
    expect(screen.getByText("1 Record with no value")).toBeVisible();
    expect(screen.getByText(sentence(/Framework ceilings not counted: RON 100,000,000/))).toBeVisible();
    expect(screen.getByRole("link", { name: "1 suspect value left out" })).toBeVisible();
  });
  it("hides every left-out line when nothing was left out", () => {
    renderInUi(<TotalFigure total={{ ...empty, awarded: "100", records: 1 }} locale="en" copy={sampleCopy.total("en")} {...base} />);
    expect(screen.queryByText(/suspect/)).toBeNull();
    expect(screen.queryByText(/no value/)).toBeNull();
    expect(screen.queryByText(/ceilings/)).toBeNull();
  });
  it("shows an extreme total with an estimated Record count", () => {
    renderInUi(<TotalFigure total={{ ...totalExtreme, estimated: true }} locale="en" copy={sampleCopy.total("en")} {...base} />);
    expect(screen.getByText(/^RON\s90,071,992,547,409,930$/)).toBeVisible();
    expect(screen.getByText(/^≈\s2,400,000 Records$/)).toBeVisible();
  });
});

describe("TotalFigure accent", () => {
  const hex = (value: string) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  const accent = (element: Element) => getComputedStyle(element).color.match(/\d+/g)?.slice(0, 3).map(Number).join() === hex(color.accent).join();
  it("colours the headline Total amber and nothing else: the ⓘ, the count, the suspect link, the no-value count and the ceilings stay neutral", () => {
    const { container } = renderInUi(<TotalFigure total={totalWithLeftOut} locale="en" copy={sampleCopy.total("en")} {...base} />);
    const figure = container.querySelector("p")!;
    const accented = [...container.querySelectorAll<HTMLElement>("*")].filter((el) => accent(el) && [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE));
    expect(accented.length).toBeGreaterThan(0);
    expect(accented.filter((el) => !figure.contains(el)).map((el) => el.textContent)).toEqual([]);
    expect(accent(figure)).toBe(true);
    expect(accent(screen.getByRole("link", { name: "How this total is counted" }))).toBe(false);
    expect(accent(screen.getByRole("link", { name: /suspect/ }))).toBe(false);
  });
});
