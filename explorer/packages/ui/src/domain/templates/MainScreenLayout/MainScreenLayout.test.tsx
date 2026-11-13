import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import type { Locale } from "../../../theme/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { MainScreenLayout, toMapLens, type MainScreenLayoutProps, type MapLens } from "./index.ts";

const slots = {
  search: <input aria-label="the search" />,
  filters: <p>the chips</p>,
  maps: { money: <p>the money map</p>, coverage: <p>the coverage map</p> },
  summary: <p>the total</p>,
  results: <p>the results</p>,
};
const props = (locale: Locale = "en"): MainScreenLayoutProps => ({ ...slots, copy: sampleCopy.mainScreenLayout(locale) });

describe("MainScreenLayout", () => {
  it("puts every slot in its place (search, map and results are named regions)", () => {
    renderInUi(<MainScreenLayout {...props()} />);
    expect(within(screen.getByRole("region", { name: "Search" })).getByRole("textbox", { name: "the search" })).toBeVisible();
    expect(screen.getByText("the chips")).toBeVisible();
    // the filter chips name themselves; a second "Filters" region would be announced twice
    expect(screen.queryByRole("region", { name: /filter/i })).toBeNull();
    const map = screen.getByRole("region", { name: "Map" });
    expect(within(map).getByRole("group", { name: "Map lens" })).toBeVisible();
    expect(within(map).getByText("the money map")).toBeVisible();
    const results = screen.getByRole("region", { name: "Results" });
    // the Total is a band across the page, above both columns, not inside the results column
    expect(screen.getByText("the total")).toBeVisible();
    expect(within(results).queryByText("the total")).toBeNull();
    expect(within(map).queryByText("the total")).toBeNull();
    expect(within(results).getByText("the results")).toBeVisible();
  });

  it("puts the map note at the foot of the map panel", () => {
    renderInUi(<MainScreenLayout {...props()} mapNote={<p>data through</p>} />);
    expect(within(screen.getByRole("region", { name: "Map" })).getByText("data through")).toBeVisible();
  });

  it("works without the optional summary", () => {
    renderInUi(<MainScreenLayout {...props()} summary={undefined} />);
    expect(screen.queryByText("the total")).toBeNull();
    expect(screen.getByText("the results")).toBeVisible();
  });

  it("shows the Money lens first and switches the map slot when Coverage is clicked", async () => {
    renderInUi(<MainScreenLayout {...props()} />);
    expect(screen.getByRole("button", { name: "Money", pressed: true })).toBeVisible();
    expect(screen.queryByText("the coverage map")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Coverage" }));
    expect(screen.getByText("the coverage map")).toBeVisible();
    expect(screen.queryByText("the money map")).toBeNull();
    expect(screen.getByRole("button", { name: "Coverage", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Money", pressed: false })).toBeVisible();
  });

  it("controlled: reports the click and follows the lens prop", async () => {
    const onLensChange = vi.fn();
    const { rerender } = renderInUi(<MainScreenLayout {...props()} lens="money" onLensChange={onLensChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Coverage" }));
    expect(onLensChange).toHaveBeenCalledExactlyOnceWith("coverage");
    // the caller has not moved the prop: still Money
    expect(screen.getByText("the money map")).toBeVisible();
    rerender(<MainScreenLayout {...props()} lens="coverage" onLensChange={onLensChange} />);
    expect(screen.getByText("the coverage map")).toBeVisible();
    expect(screen.getByRole("button", { name: "Coverage", pressed: true })).toBeVisible();
  });

  it("controlled by state, like a page driving it from the URL", async () => {
    function Page() {
      const [lens, setLens] = useState<MapLens>("coverage");
      return <MainScreenLayout {...props()} lens={lens} onLensChange={setLens} />;
    }
    renderInUi(<Page />);
    expect(screen.getByText("the coverage map")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Money" }));
    expect(screen.getByText("the money map")).toBeVisible();
  });

  it("names the regions and the lenses in Romanian", () => {
    renderInUi(<MainScreenLayout {...props("ro")} />, "ro");
    for (const name of ["Căutare", "Harta", "Rezultate"]) expect(screen.getByRole("region", { name })).toBeVisible();
    expect(screen.getByRole("group", { name: "Lentila hărții" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Bani", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Acoperire" })).toBeVisible();
  });

  it("is two columns from md and one column below (the layout's breakpoint rule)", () => {
    renderInUi(<MainScreenLayout {...props()} />);
    const grid = screen.getByRole("region", { name: "Map" }).parentElement!;
    // jsdom resolves no media queries; the generated stylesheet carries the rule, so read it.
    const css = [...document.querySelectorAll("style")].map((s) => s.textContent).join("");
    const cls = [...grid.classList].find((c) => c.startsWith("css-"))!;
    expect(css).toMatch(new RegExp(`\\.${cls}\\{[^}]*grid-template-columns:minmax\\(0, ?1fr\\)`));
    expect(css).toMatch(/@media \(min-width:900px\)\{\.[\w-]+\{grid-template-columns:minmax\(0, ?1fr\) minmax\(0, ?1\.15fr\)/);
  });
});

describe("toMapLens", () => {
  it("reads a known lens and falls back to Money", () => {
    expect(toMapLens("coverage")).toBe("coverage");
    expect(toMapLens("money")).toBe("money");
    expect(toMapLens("flow")).toBe("money");
    expect(toMapLens(undefined)).toBe("money");
    expect(toMapLens(null)).toBe("money");
  });
});
