import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "../../../theme/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import {
  authorityHome, authorityLocalFlow, authorityNationwideFlow, emptyAuthorityFlow, emptySupplierFlow, supplierHome, supplierLocalFlow, supplierNationwideFlow,
} from "../../samples/flowMaps.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { FlowLensMap, HOME_COLOR, MAX_ARC_WIDTH, MAX_BUBBLE_RADIUS, MIN_ARC_WIDTH, OTHER_COLOR, type FlowLensMapProps } from "./index.ts";

const supplier = { flow: supplierNationwideFlow, role: "supplier", home: supplierHome } as const;
const authority = { flow: authorityNationwideFlow, role: "authority", home: authorityHome } as const;

function setup(props: Pick<FlowLensMapProps, "flow" | "role"> & Partial<FlowLensMapProps> = supplier, locale: Locale = "en") {
  const onSelect = vi.fn();
  render(<FlowLensMap topology={countiesTopology} onSelect={onSelect} locale={locale} copy={sampleCopy.flowLensMap(locale)} {...props} />);
  return { onSelect };
}

const radii = () => Object.fromEntries([...document.querySelectorAll("[data-bubble]")].map((c) => [c.getAttribute("data-county"), Number(c.getAttribute("r"))]));
const arcs = () => [...document.querySelectorAll("[data-arc]")].map((a) => ({
  county: a.getAttribute("data-county"), from: a.getAttribute("data-from"), to: a.getAttribute("data-to"),
  width: Number(a.querySelector("path")?.getAttribute("stroke-width")),
}));
const fillOf = (code: string) => document.querySelector(`path[data-code="${code}"]`)?.getAttribute("fill");

describe("FlowLensMap bubbles", () => {
  it("draws a bubble per county with money and none for a county at zero", () => {
    setup();
    expect(Object.keys(radii()).sort()).toEqual(["RO-BV", "RO-CJ", "RO-IS", "RO-SV"]);
  });

  it("sizes the bubbles by the fixture Totals: area proportional (sqrt), largest at the maximum, ordered", () => {
    setup();
    const r = radii();
    // Brașov 2,800,000 > Cluj 1,200,000 > Iași 700,000 > Suceava 175,000
    expect(r["RO-BV"]).toBe(MAX_BUBBLE_RADIUS);
    expect(r["RO-BV"]).toBeGreaterThan(r["RO-CJ"]!);
    expect(r["RO-CJ"]).toBeGreaterThan(r["RO-IS"]!);
    expect(r["RO-IS"]).toBeGreaterThan(r["RO-SV"]!);
    expect(r["RO-IS"]! / r["RO-BV"]!).toBeCloseTo(Math.sqrt(700_000 / 2_800_000), 3);
    expect(r["RO-SV"]! / r["RO-BV"]!).toBeCloseTo(Math.sqrt(175_000 / 2_800_000), 3);
    expect((r["RO-CJ"]! / r["RO-BV"]!) ** 2).toBeCloseTo(1_200_000 / 2_800_000, 3);
  });

  it("sizes an authority's bubbles by its own Totals just the same", () => {
    setup(authority);
    const r = radii();
    expect(r["RO-CJ"]).toBe(MAX_BUBBLE_RADIUS);
    expect((r["RO-BV"]! / r["RO-CJ"]!) ** 2).toBeCloseTo(28_000_000 / 112_400_000, 3);
    expect(r["RO-MM"]).toBeGreaterThan(0);
  });
});

describe("FlowLensMap arcs", () => {
  it("draws one arc per non-home county with money, none to the home county or to a zero county", () => {
    setup();
    expect(arcs().map((a) => a.county).sort()).toEqual(["RO-BV", "RO-IS", "RO-SV"]);
    expect(arcs().filter((a) => a.from === "RO-CJ" || a.to === supplierHome && a.county === "RO-CJ")).toEqual([]);
  });

  it("makes the widths follow the Totals: linear, widest at the largest, never below the minimum", () => {
    setup();
    const width = Object.fromEntries(arcs().map((a) => [a.county, a.width]));
    expect(width["RO-BV"]).toBe(MAX_ARC_WIDTH);
    expect(width["RO-IS"]).toBeCloseTo(MAX_ARC_WIDTH * (700_000 / 2_800_000), 5);
    expect(width["RO-SV"]).toBe(MIN_ARC_WIDTH);
    expect(width["RO-BV"]).toBeGreaterThan(width["RO-IS"]!);
    expect(width["RO-IS"]).toBeGreaterThan(width["RO-SV"]!);
  });

  it("points into the home county on a supplier's page, with an arrowhead per arc", () => {
    setup(supplier);
    for (const arc of arcs()) {
      expect(arc.to).toBe("RO-CJ");
      expect(arc.from).toBe(arc.county);
    }
    expect(document.querySelectorAll("[data-arc] [data-arrowhead]")).toHaveLength(3);
  });

  it("points out of the home county on an authority's page", () => {
    setup(authority);
    expect(arcs().map((a) => a.county).sort()).toEqual(["RO-AG", "RO-CJ", "RO-IS", "RO-MM"]);
    for (const arc of arcs()) {
      expect(arc.from).toBe("RO-BV");
      expect(arc.to).toBe(arc.county);
    }
  });

  it("draws no arcs for a local-only entity, only the home bubble, and says so", () => {
    setup({ flow: supplierLocalFlow, role: "supplier", home: supplierHome });
    expect(arcs()).toEqual([]);
    expect(Object.keys(radii())).toEqual(["RO-CJ"]);
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("All of the money placed in a county comes from Cluj: a single bubble and no arcs.");
  });

  it("draws no arcs for a local-only authority either", () => {
    setup({ flow: authorityLocalFlow, role: "authority", home: authorityHome });
    expect(arcs()).toEqual([]);
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("All of the money placed in a county goes to suppliers in Brașov");
  });

  it("does not call a flow local-only when no county holds money but a tile does", () => {
    const flow = { ...supplierLocalFlow, counties: [], national: supplierNationwideFlow.national };
    setup({ flow, role: "supplier", home: supplierHome });
    expect(Object.keys(radii())).toEqual([]);
    expect(document.querySelector("[data-flow-caption]")).not.toHaveTextContent("single bubble");
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("Where this supplier's money comes from");
  });

  it("limits the local-only caption to the money placed in a county when a tile also holds money", () => {
    const flow = { ...supplierLocalFlow, national: supplierNationwideFlow.national };
    setup({ flow, role: "supplier", home: supplierHome });
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("All of the money placed in a county comes from Cluj");
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("Money that no county holds is on the tiles");
  });

  it("claims no direction in the tooltip of a county at zero", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: /^Timiș/ }));
    expect(screen.getByRole("tooltip")).not.toHaveTextContent("Money flows");
  });

  it("draws bubbles only, and says why, without a home county", () => {
    setup({ ...authority, home: null });
    expect(arcs()).toEqual([]);
    expect(Object.keys(radii())).toHaveLength(5);
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("This authority's county is not known: bubbles only, no arcs.");
  });

  it("treats a home county the outlines do not have as unknown", () => {
    setup({ ...supplier, home: "RO-ZZ" });
    expect(arcs()).toEqual([]);
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("not known");
  });

  it("rejects a flow drawn on the wrong side for the role", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => setup({ flow: authorityNationwideFlow, role: "supplier", home: supplierHome })).toThrow(/AUTHORITY side/);
    quiet.mockRestore();
  });
});

describe("FlowLensMap home county, names and caption", () => {
  it("highlights the home county, fills the other counties with money, and leaves the rest grey", () => {
    setup();
    expect(fillOf("RO-CJ")).toBe(HOME_COLOR);
    expect(fillOf("RO-BV")).toBe(OTHER_COLOR);
    expect(fillOf("RO-TM")).not.toBe(OTHER_COLOR);
    expect(fillOf("RO-TM")).not.toBe(HOME_COLOR);
  });

  it("explains the direction in the caption, naming the home county", () => {
    setup(supplier);
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("Where this supplier's money comes from: authorities across Romania, flowing in to Cluj.");
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("Money that no county holds is on the tiles beside the map.");
  });

  it("explains an authority's direction the other way", () => {
    setup(authority);
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("Where this authority's money goes: suppliers across Romania, flowing out of Brașov.");
  });

  it("gives each county an accessible name with its exact money and Records, the home county marked", () => {
    setup();
    expect(screen.getByRole("button", { name: "Brașov: RON 2,800,000, 40 Records" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Suceava: RON 175,000, 3 Records" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cluj: RON 1,200,000, 18 Records. The entity's county" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Timiș: RON\u00a00, 0 Records" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Galați: No money" })).toBeVisible();
  });

  it("names them in Romanian, with Romanian number formats and plurals", () => {
    setup(supplier, "ro");
    expect(screen.getByRole("button", { name: "Brașov: 2.800.000 RON, 40 de înregistrări" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Suceava: 175.000 RON, 3 înregistrări" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cluj: 1.200.000 RON, 18 înregistrări. Județul entității" })).toBeVisible();
    expect(document.querySelector("[data-flow-caption]")).toHaveTextContent("De unde vin banii furnizorului: autorități din toată țara, către Cluj.");
  });

  it("shows the county, exact money, Records and direction in the tooltip", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: /^Brașov/ }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Brașov");
    expect(tooltip).toHaveTextContent("RON 2,800,000");
    expect(tooltip).toHaveTextContent("40 Records");
    expect(tooltip).toHaveTextContent("Money flows in to Cluj");
  });

  it("says the money flows out in an authority's tooltip, and marks the home county in its own", async () => {
    setup(authority);
    await userEvent.hover(screen.getByRole("button", { name: /^Iași/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Money flows out of Brașov");
    await userEvent.hover(screen.getByRole("button", { name: /^Brașov/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("The entity's county");
  });

  it("explains bubbles, arcs, arrow and home county in a legend", () => {
    setup(supplier);
    const legend = screen.getByRole("region", { name: "Flow" });
    for (const text of ["Bubble area: money in the county", "Arc width: money between the two counties", "Arrow: money flows in to the supplier's county", "The entity's county", "Other counties with money"]) {
      expect(within(legend).getByText(text)).toBeVisible();
    }
  });

  it("leaves the arc, arrow and home entries out of the legend without a home county", () => {
    setup({ ...supplier, home: null });
    const legend = screen.getByRole("region", { name: "Flow" });
    expect(within(legend).queryByText(/^Arc width/)).toBeNull();
    expect(within(legend).queryByText(/^Arrow/)).toBeNull();
  });
});

describe("FlowLensMap tiles", () => {
  it("shows the supplier page's National and Unplaced tiles with the fixture's exact formatted Totals", () => {
    setup(supplier);
    const national = screen.getByRole("button", { name: /^National/ });
    expect(national).toHaveTextContent("RON 300,000");
    expect(national).toHaveTextContent("4 Records");
    const unplaced = screen.getByRole("button", { name: /^Unplaced authorities/ });
    expect(unplaced).toHaveTextContent("1 authority without a county");
    expect(unplaced).toHaveTextContent("RON 36,000");
    expect(unplaced).toHaveTextContent("1 Record");
    expect(screen.queryByRole("button", { name: /^Unknown supplier county/ })).toBeNull();
  });

  it("shows the authority page's National and unknown-supplier-county tiles, and no Unplaced tile", () => {
    setup(authority);
    expect(screen.getByRole("button", { name: /^National/ })).toHaveTextContent("RON 4,000,000");
    const unknown = screen.getByRole("button", { name: /^Unknown supplier county/ });
    expect(unknown).toHaveTextContent("RON 1,200,000");
    expect(unknown).toHaveTextContent("2 Records");
    expect(screen.queryByRole("button", { name: /^Unplaced/ })).toBeNull();
  });

  it("emits the county code and the tile areas, and presses the selected one", async () => {
    const { onSelect } = setup(authority, "en");
    await userEvent.click(screen.getByRole("button", { name: /^Iași/ }));
    expect(onSelect).toHaveBeenLastCalledWith("RO-IS");
    await userEvent.click(screen.getByRole("button", { name: /^Unknown supplier county/ }));
    expect(onSelect).toHaveBeenLastCalledWith("UNKNOWN_SUPPLIER_COUNTY");
    await userEvent.click(screen.getByRole("button", { name: /^National/ }));
    expect(onSelect).toHaveBeenLastCalledWith("NATIONAL");
  });

  it("highlights the selected county and tile", () => {
    setup({ ...supplier, selected: "UNPLACED" });
    expect(screen.getByRole("button", { name: /^Unplaced authorities/, pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Brașov/, pressed: false })).toBeVisible();
  });
});

describe("FlowLensMap empty state", () => {
  it.each([
    ["authority", emptyAuthorityFlow],
    ["supplier", emptySupplierFlow],
  ] as const)("says there is no flow, instead of a blank map, for an empty %s flow", (role, flow) => {
    setup({ flow, role, home: supplierHome });
    expect(screen.getByText("No money flow for the current filter.")).toBeVisible();
    expect(document.querySelector("svg")).toBeNull();
  });

  it("says it in Romanian", () => {
    setup({ flow: emptyAuthorityFlow, role: "authority", home: null }, "ro");
    expect(screen.getByText("Niciun flux de bani pentru filtrul curent.")).toBeVisible();
  });
});
