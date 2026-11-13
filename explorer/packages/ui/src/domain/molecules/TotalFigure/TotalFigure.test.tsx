import { screen } from "@testing-library/react";
import { renderInUi } from "../../../testing/render.tsx";
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
