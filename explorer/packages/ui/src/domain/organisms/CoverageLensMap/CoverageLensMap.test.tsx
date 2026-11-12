import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "../../../theme/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { nothingHarvestedCoverage, openWindowCoverage, typicalCoverage } from "../../samples/coverageLenses.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import type { CoverageLens } from "../../types.ts";
import { CoverageLensMap, COVERAGE_COLORS, NO_STATUS_COLOR, PLANNED_MARK_COLOR, type CoverageLensMapProps } from "./index.ts";

function setup(lens: CoverageLens = typicalCoverage, props: Partial<CoverageLensMapProps> = {}, locale: Locale = "en") {
  const onSelect = vi.fn();
  render(<CoverageLensMap lens={lens} topology={countiesTopology} onSelect={onSelect} locale={locale} copy={sampleCopy.coverageLensMap(locale)} {...props} />);
  return { onSelect };
}

/** The marks' titles (Testing Library's title queries only see an `svg`'s direct title child). */
const marksTitled = (text: string) => [...document.querySelectorAll("[data-source-marks] title")].filter((title) => title.textContent === text);

const fillOf = (code: string) => document.querySelector(`path[data-code="${code}"]`)?.getAttribute("fill");

describe("CoverageLensMap", () => {
  it("gives each status its own fill and its own word in the county's accessible name", () => {
    setup();
    const seen = new Map<string, [string, RegExp]>([
      ["RO-BV", ["HARVESTED", /^Brașov: Harvested\. /]],
      ["RO-CJ", ["HARVESTED_WITH_KNOWN_GAPS", /^Cluj: Harvested, with known gaps\. /]],
      ["RO-TM", ["PARTIAL", /^Timiș: Partial\. /]],
      ["RO-MM", ["NOT_HARVESTED", /^Maramureș: Not harvested\. /]],
    ]);
    for (const [code, [status, name]] of seen) {
      expect(screen.getByRole("button", { name })).toBeVisible();
      expect(fillOf(code)).toBe(COVERAGE_COLORS[status as keyof typeof COVERAGE_COLORS]);
    }
    expect(new Set(Object.values(COVERAGE_COLORS)).size).toBe(4);
  });

  it("puts N of M in the county's accessible name, for assistive tech", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cluj: Harvested, with known gaps. 400 of 480 public entities have SEAP records since 1 Jan 2021, plus 20 other contracting authorities" })).toBeVisible();
  });

  it("fills a county without a coverage row with its own fill, worded as no status and not as not harvested", () => {
    setup();
    expect(screen.getByRole("button", { name: "Galați: No coverage status" })).toBeVisible();
    expect(fillOf("RO-GL")).toBe(NO_STATUS_COLOR);
    expect(Object.values(COVERAGE_COLORS)).not.toContain(NO_STATUS_COLOR);
  });

  it("fills not harvested with the grey of the planned Sources' marks", () => {
    expect(COVERAGE_COLORS.NOT_HARVESTED).toBe(PLANNED_MARK_COLOR);
  });

  it("draws one mark per Source on every county, planned Sources labelled not harvested", () => {
    setup();
    const counties = document.querySelectorAll("[data-source-marks] > g");
    expect(counties).toHaveLength(9);
    for (const county of counties) expect(county.querySelectorAll("rect")).toHaveLength(5);
    expect(marksTitled("ONRC: not harvested")).toHaveLength(9);
    expect(marksTitled("portal.just.ro: not harvested")).toHaveLength(9);
    expect(marksTitled("SEAP: Partial")).toHaveLength(2);
    expect(marksTitled("SEAP: No coverage status")).toHaveLength(1);
  });

  it("explains the statuses and the marks in a legend", () => {
    setup();
    const legend = screen.getByRole("region", { name: "Coverage" });
    for (const word of ["Harvested", "Harvested, with known gaps", "Partial", "Not harvested", "No coverage status"]) expect(within(legend).getByText(word)).toBeVisible();
    expect(within(legend).getByText("Not harvested yet: ONRC, ANI, Ministerul Finanțelor, portal.just.ro")).toBeVisible();
  });

  it("emits the county code on click, Enter and Space", async () => {
    const { onSelect } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Brașov/ }));
    expect(onSelect).toHaveBeenLastCalledWith("RO-BV");
    screen.getByRole("button", { name: /^Cluj/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith("RO-CJ");
    await userEvent.keyboard(" ");
    expect(onSelect).toHaveBeenCalledTimes(3);
  });

  it("highlights the selected county, and only it", () => {
    setup(typicalCoverage, { selected: "RO-CJ" });
    expect(screen.getByRole("button", { name: /^Cluj/, pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Iași/, pressed: false })).toBeVisible();
  });

  it("shows N of M and the other authorities in the tooltip, with the may-have-bought-nothing note", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: /^Cluj/ }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Cluj");
    expect(tooltip).toHaveTextContent("Harvested, with known gaps");
    expect(tooltip).toHaveTextContent("400 of 480 public entities have SEAP records since 1 Jan 2021, plus 20 other contracting authorities");
    expect(tooltip).toHaveTextContent("An entity without records may simply have bought nothing.");
  });

  it("tells the same in Romanian, with Romanian number and date formats", async () => {
    setup(typicalCoverage, {}, "ro");
    await userEvent.hover(screen.getByRole("button", { name: /^Cluj/ }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Colectat, cu lacune cunoscute");
    expect(tooltip).toHaveTextContent("400 din 480 de entități publice au înregistrări SEAP începând cu 1 ian. 2021, plus 20 de alte autorități contractante");
    expect(tooltip).toHaveTextContent("O entitate fără înregistrări poate pur și simplu să nu fi cumpărat nimic.");
  });

  it("says since 2021 when the window has no start", async () => {
    setup(openWindowCoverage);
    await userEvent.hover(screen.getByRole("button", { name: /^Brașov/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("since 2021");
  });

  it("drops the plus clause when there are no other authorities", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: /^Argeș/ }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("90 of 300 public entities have SEAP records since 1 Jan 2021");
    expect(tooltip).not.toHaveTextContent("plus");
  });

  it("says no status in the tooltip of a county without a row", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: /^Galați/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("No coverage status");
  });

  it("shows National's status and N of M, and emits NATIONAL", async () => {
    const { onSelect } = setup();
    const tile = screen.getByRole("button", { name: /^National/ });
    expect(tile).toHaveTextContent("Harvested");
    expect(tile).toHaveTextContent("12,450 of 13,200 public entities have SEAP records since 1 Jan 2021, plus 480 other contracting authorities");
    await userEvent.click(tile);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("NATIONAL");
  });

  it("shows the Unplaced authorities count and their formatted Total, and emits UNPLACED", async () => {
    const { onSelect } = setup();
    const tile = screen.getByRole("button", { name: /^Unplaced authorities/ });
    expect(tile).toHaveTextContent("17 authorities without a county");
    expect(tile).toHaveTextContent("RON 12,000,000");
    expect(tile).toHaveTextContent("130 Records");
    await userEvent.click(tile);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("UNPLACED");
  });

  it("presses the selected tile", () => {
    setup(typicalCoverage, { selected: "UNPLACED" });
    expect(screen.getByRole("button", { name: /^Unplaced authorities/, pressed: true })).toBeVisible();
  });

  it("draws no Unplaced tile when there are none, and every county not harvested when nothing is", () => {
    setup(nothingHarvestedCoverage);
    expect(screen.queryByRole("button", { name: /^Unplaced/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Brașov: Not harvested\. / })).toBeVisible();
    expect(screen.getByRole("button", { name: "Galați: No coverage status" })).toBeVisible();
  });
});
