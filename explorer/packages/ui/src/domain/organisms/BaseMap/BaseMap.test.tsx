import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { uatsTopology } from "../../samples/geo/uats.topo.ts";
import { BaseMap, createColorScale, NO_DATA_COLOR, type BaseMapProps } from "./index.ts";

const copy = sampleCopy.baseMap("en");
const formatValue = (value: number) => `${value} RON`;
const values = { "RO-BV": 100, "RO-CJ": 1000, "RO-TM": 0 };

function setup(props: Partial<BaseMapProps> = {}) {
  return render(<BaseMap topology={countiesTopology} values={values} formatValue={formatValue} copy={copy} {...props} />);
}

describe("BaseMap", () => {
  it("draws every county as a named button, and one county's UATs from the other outlines", () => {
    setup();
    expect(screen.getAllByRole("button")).toHaveLength(9);
    expect(screen.getByRole("button", { name: "Brașov: 100 RON" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Map of counties" })).toBeVisible();
  });

  it("draws UATs from SIRUTA-keyed outlines", () => {
    setup({ topology: uatsTopology, values: { "990102": 5 } });
    expect(screen.getAllByRole("button")).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Săcele: No data" })).toBeVisible();
  });

  it("emits the code of a clicked area", async () => {
    const onSelect = vi.fn();
    setup({ onSelect });
    await userEvent.click(screen.getByRole("button", { name: "Cluj: 1000 RON" }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("RO-CJ");
  });

  it("selects the focused area with Enter and with Space", async () => {
    const onSelect = vi.fn();
    setup({ onSelect });
    await userEvent.tab();
    expect(screen.getAllByRole("button")[0]).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(onSelect.mock.calls.map(([code]) => code)).toEqual(["RO-MM", "RO-MM"]);
  });

  it("shows a tooltip with the area's name and formatted value on hover, and hides it after", async () => {
    setup();
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    await userEvent.hover(screen.getByRole("button", { name: "Brașov: 100 RON" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Brașov: 100 RON");
    await userEvent.unhover(screen.getByRole("button", { name: "Brașov: 100 RON" }));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("shows the tooltip on keyboard focus too, and says no data for an area without a value", async () => {
    setup();
    screen.getByRole("button", { name: "Suceava: No data" }).focus();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Suceava: No data");
  });

  it("lets a lens render its own tooltip content", async () => {
    setup({ renderTooltip: ({ name, value }) => `${name} has ${value ?? "nothing"}` });
    await userEvent.hover(screen.getByRole("button", { name: "Cluj: 1000 RON" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Cluj has 1000");
  });

  it("renders an area without a value grey, and the legend shows the grey no-data swatch with its label", () => {
    setup();
    expect(screen.getByRole("button", { name: "Suceava: No data" })).toHaveAttribute("fill", NO_DATA_COLOR);
    const withValue = screen.getByRole("button", { name: "Cluj: 1000 RON" });
    expect(withValue).not.toHaveAttribute("fill", NO_DATA_COLOR);
    const legend = screen.getByRole("region", { name: "Contracted value" });
    expect(within(legend).getByText("No data")).toBeVisible();
    expect(within(legend).getByRole("img", { name: "No data" })).toHaveStyle({ backgroundColor: NO_DATA_COLOR });
    expect(within(legend).getByText("0 RON")).toBeVisible();
    expect(within(legend).getByText("1000 RON")).toBeVisible();
  });

  it("colours by the chosen scale: a log scale gives a zero its lowest colour, not grey", () => {
    setup({ scale: "log" });
    const lowest = createColorScale("log", [100, 1000]).color(0);
    expect(screen.getByRole("button", { name: "Timiș: 0 RON" })).toHaveAttribute("fill", lowest);
    expect(screen.getByRole("button", { name: "Brașov: 100 RON" })).toHaveAttribute("fill", lowest);
  });

  it("highlights the selected area", () => {
    setup({ selected: "RO-CJ" });
    expect(screen.getByRole("button", { name: "Cluj: 1000 RON" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Brașov: 100 RON" })).toHaveAttribute("aria-pressed", "false");
  });

  it("lays out the tiles slot beside the map", () => {
    setup({ tiles: <p>Off-map tile</p> });
    expect(screen.getByText("Off-map tile")).toBeVisible();
  });

  it("takes every string from copy", () => {
    setup({ copy: sampleCopy.baseMap("ro") });
    expect(screen.getByRole("group", { name: "Harta județelor" })).toBeVisible();
    expect(screen.getByText("Fără date")).toBeVisible();
    expect(screen.getByRole("button", { name: "Suceava: Fără date" })).toBeVisible();
  });
});
