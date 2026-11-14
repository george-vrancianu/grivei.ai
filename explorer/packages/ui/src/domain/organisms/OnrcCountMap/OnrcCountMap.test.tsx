import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderInUi } from "../../../testing/render.tsx";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { sampleOnrcCopy } from "../../samples/onrcCopy.ts";
import { OnrcCountMap } from "./index.ts";

const map = { counties: [{ area: "RO-CJ", name: "Cluj", registrations: 12 }, { area: "RO-BV", name: "Brașov", registrations: 1 }], unplacedRegistrations: 3 };

describe("OnrcCountMap", () => {
  it("names each county with its registration count, and leaves counties with none as no registrations", () => {
    renderInUi(<OnrcCountMap map={map} topology={countiesTopology} onSelect={() => {}} locale="en" copy={sampleOnrcCopy.countMap("en")} />);
    expect(screen.getByRole("button", { name: "Cluj: 12 registrations" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Brașov: 1 registration" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Galați: No registrations" })).toBeVisible();
  });

  it("emits a county's code on a click, and UNPLACED from the Unplaced tile, which carries its count", async () => {
    const onSelect = vi.fn();
    renderInUi(<OnrcCountMap map={map} topology={countiesTopology} onSelect={onSelect} locale="en" copy={sampleOnrcCopy.countMap("en")} />);
    await userEvent.click(screen.getByRole("button", { name: "Cluj: 12 registrations" }));
    expect(onSelect).toHaveBeenLastCalledWith("RO-CJ");
    const tile = screen.getByRole("button", { name: /^No county/ });
    expect(tile).toHaveTextContent("3 registrations");
    await userEvent.click(tile);
    expect(onSelect).toHaveBeenLastCalledWith("UNPLACED");
  });

  it("marks the selected area and reads in Romanian", () => {
    renderInUi(<OnrcCountMap map={map} topology={countiesTopology} selected="UNPLACED" onSelect={() => {}} locale="ro" copy={sampleOnrcCopy.countMap("ro")} />, "ro");
    expect(screen.getByRole("button", { name: /^Fără județ/, pressed: true })).toHaveTextContent("3 înmatriculări");
    expect(screen.getByRole("button", { name: "Cluj: 12 înmatriculări" })).toBeVisible();
  });
});
