import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { map } from "../../../theme/tokens.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { uatsTopology } from "../../samples/geo/uats.topo.ts";
import { BaseMap, createColorScale, NO_DATA_COLOR, type BaseMapProps } from "./index.ts";

const copy = sampleCopy.baseMap("en");
const formatValue = (value: number) => `${value} RON`;
const values = { "RO-BV": 100, "RO-CJ": 1000, "RO-TM": 0 };

function setup(props: Partial<BaseMapProps> = {}) {
  return render(<BaseMap topology={countiesTopology} values={values} formatValue={formatValue} copy={copy} onSelect={() => {}} {...props} />);
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

  it("shows areas as images, not buttons, when nothing can be selected", () => {
    setup({ onSelect: undefined, selected: "RO-CJ" });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    const area = screen.getByRole("img", { name: "Cluj: 1000 RON" });
    expect(area).not.toHaveAttribute("aria-pressed");
  });

  it("starts the linear legend at zero, so colour tracks absolute size", () => {
    setup({ values: { "RO-BV": 300, "RO-CJ": 310 } });
    const legend = screen.getByRole("region", { name: "Contracted value" });
    expect(within(legend).getByText("0 RON")).toBeVisible();
    const near = screen.getByRole("button", { name: "Brașov: 300 RON" }).getAttribute("fill");
    expect(near).not.toBe(createColorScale("linear", [0, 310]).color(0));
  });

  it("marks the log legend's low end as 'up to' when zeros take the lowest colour", () => {
    setup({ scale: "log" });
    const legend = screen.getByRole("region", { name: "Contracted value" });
    expect(within(legend).getByText("up to 100 RON")).toBeVisible();
  });

  it("tells formatValue which area it formats, so a lens can use an exact amount", () => {
    const exact: Record<string, string> = { "RO-CJ": "1000,00 RON exact" };
    setup({ formatValue: (value, code) => (code ? (exact[code] ?? `${value} RON`) : `${value} RON`) });
    expect(screen.getByRole("button", { name: "Cluj: 1000,00 RON exact" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Brașov: 100 RON" })).toBeVisible();
    const legend = screen.getByRole("region", { name: "Contracted value" });
    expect(within(legend).getByText("1000,00 RON exact")).toBeVisible();
  });

  it("lets a lens colour areas itself (categorical fill) and supply its own legend", () => {
    setup({
      colorOf: (code) => (code === "RO-CJ" ? "#2e7d32" : code === "RO-BV" ? "#f9a825" : null),
      legend: <p>Harvested / partial</p>,
    });
    expect(screen.getByRole("button", { name: "Cluj: 1000 RON" })).toHaveAttribute("fill", "#2e7d32");
    expect(screen.getByRole("button", { name: "Brașov: 100 RON" })).toHaveAttribute("fill", "#f9a825");
    expect(screen.getByRole("button", { name: "Suceava: No data" })).toHaveAttribute("fill", NO_DATA_COLOR);
    expect(screen.getByText("Harvested / partial")).toBeVisible();
    expect(screen.queryByRole("region", { name: "Contracted value" })).not.toBeInTheDocument();
  });

  it("names areas after their category when the lens describes them", async () => {
    const user = userEvent.setup();
    setup({
      values: {},
      colorOf: (code) => (code === "RO-CJ" ? "#2e7d32" : null),
      describeArea: ({ code }) => (code === "RO-CJ" ? "Harvested" : null),
    });
    expect(screen.getByRole("button", { name: "Cluj: Harvested" })).toHaveAttribute("fill", "#2e7d32");
    expect(screen.getByRole("button", { name: "Brașov: No data" })).toBeVisible();
    await user.hover(screen.getByRole("button", { name: "Cluj: Harvested" }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Cluj: Harvested");
  });

  it("draws overlay marks at projected area centres, without taking pointer events", () => {
    const seen: { width: number; height: number; codes: string[]; projected: boolean }[] = [];
    setup({
      renderOverlay: ({ centroids, project, width, height }) => {
        seen.push({ width, height, codes: [...centroids.keys()], projected: project([25, 46]) !== null });
        return [...centroids].map(([code, [x, y]]) => <circle key={code} data-testid="mark" cx={x} cy={y} r={3} />);
      },
    });
    expect(screen.getAllByTestId("mark")).toHaveLength(9);
    expect(screen.getAllByTestId("mark")[0]!.parentElement).toHaveAttribute("pointer-events", "none");
    expect(seen[0]).toMatchObject({ width: 640, height: 420, projected: true });
    expect(seen[0]!.codes).toContain("RO-CJ");
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

  it("draws the default tooltip and the legend ends from renderValue when given", async () => {
    setup({ renderValue: (value) => <b data-testid="amount">{value} lei</b> });
    await userEvent.hover(screen.getByRole("button", { name: "Cluj: 1000 RON" }));
    expect(within(screen.getByRole("tooltip")).getByTestId("amount")).toHaveTextContent("1000 lei");
    expect(within(screen.getByRole("region", { name: copy.legendTitle })).getAllByTestId("amount").length).toBeGreaterThan(0);
  });

  it("separates areas by a stroke in the panel colour and sits the tooltip above the hovered area", async () => {
    setup();
    expect(screen.getByRole("group", { name: "Map of counties" })).toHaveStyle({ display: "block" });
    const area = screen.getByRole("button", { name: "Cluj: 1000 RON" });
    expect(getComputedStyle(area).stroke).toBe("rgb(20, 25, 32)"); // map.gap, the panel colour
    expect(map.gap).toBe("#141920");
    await userEvent.hover(area);
    expect(getComputedStyle(screen.getByRole("tooltip")).transform).toContain("-100%");
  });
});
