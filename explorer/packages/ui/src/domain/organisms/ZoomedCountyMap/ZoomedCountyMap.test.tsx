import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "../../../theme/index.ts";
import { sampleCopy } from "../../samples/copy.ts";
import { bucharestTopology } from "../../samples/geo/bucharest.topo.ts";
import { countyUatsTopology } from "../../samples/geo/countyUats.topo.ts";
import { uatsTopology } from "../../samples/geo/uats.topo.ts";
import { bucharest, noPurchases, typicalCounty, withUnknownUat } from "../../samples/uatMaps.ts";
import { ZoomedCountyMap, type ZoomedCountyMapProps } from "./index.ts";

/** The formatted amount as the page renders it: a no-break space after the currency code. */
const ron = (amount: string) => `RON\u00a0${amount}`;

function setup(props: Partial<ZoomedCountyMapProps> = {}, locale: Locale = "en") {
  const onSelect = vi.fn();
  const view = render(
    <ZoomedCountyMap map={typicalCounty} topology={countyUatsTopology} onSelect={onSelect} locale={locale} copy={sampleCopy.zoomedCountyMap(locale)} {...props} />,
  );
  return { onSelect, ...view };
}

describe("ZoomedCountyMap", () => {
  it("names each UAT with its awarded value", () => {
    setup();
    expect(screen.getByRole("button", { name: `Cluj-Napoca: ${ron("2,400,000,000")}` })).toBeVisible();
    expect(screen.getByRole("button", { name: `Aiud: ${ron("0")}` })).toBeVisible();
  });

  it("emits the SIRUTA of a clicked UAT", async () => {
    const { onSelect } = setup();
    await userEvent.click(screen.getByRole("button", { name: /^Turda/ }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("990210");
  });

  it("emits the SIRUTA on Enter and on Space", async () => {
    const { onSelect } = setup();
    await userEvent.tab();
    const first = document.activeElement as HTMLElement;
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    expect(first).toHaveAttribute("aria-pressed");
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect.mock.calls[0]![0]).toMatch(/^9902\d\d$/);
    expect(onSelect.mock.calls[1]![0]).toBe(onSelect.mock.calls[0]![0]);
  });

  it("highlights the selected UAT", () => {
    setup({ selected: "990210" });
    expect(screen.getByRole("button", { name: /^Turda/, pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Dej/, pressed: false })).toBeVisible();
  });

  it("draws a UAT of the topology that the map lacks grey, saying no authority bought anything", async () => {
    setup();
    const absent = screen.getByRole("button", { name: "Gilău: No authority bought anything" });
    expect(absent).toBeVisible();
    expect(screen.getByRole("button", { name: "Mociu: No authority bought anything" })).toBeVisible();
    expect(screen.queryByText("No data")).toBeNull();
    await userEvent.hover(absent);
    expect(screen.getByRole("tooltip")).toHaveTextContent("No authority bought anything");
  });

  it("renders Bucharest's six sectors, named from the outlines", () => {
    setup({ map: bucharest, topology: bucharestTopology });
    for (const n of [1, 2, 3, 4, 5, 6]) expect(screen.getByRole("button", { name: new RegExp(`^Sector ${n}:`) })).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(6);
  });

  it("draws every UAT grey, with no row and no \"No data\", when no authority bought anything", () => {
    setup({ map: noPurchases });
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) expect(button).toHaveAccessibleName(/: No authority bought anything$/);
    expect(screen.queryByRole("group", { name: "County known, UAT unknown" })).toBeNull();
    expect(screen.queryByText("No data")).toBeNull();
  });

  describe("the row for authorities with a known county and no UAT", () => {
    it("is hidden when the map has none", () => {
      setup();
      expect(screen.queryByRole("group", { name: "County known, UAT unknown" })).toBeNull();
    });

    it("shows its Total when present, and is not interactive", async () => {
      const { onSelect } = setup({ map: withUnknownUat, topology: uatsTopology });
      const row = screen.getByRole("group", { name: "County known, UAT unknown" });
      expect(row).toHaveTextContent("RON 18,400,000");
      expect(row).toHaveTextContent("142 Records");
      expect(row).toHaveTextContent("2 suspect values left out");
      expect(screen.queryByRole("button", { name: /UAT unknown/ })).toBeNull();
      await userEvent.click(row);
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe("authority circles", () => {
    it("are not drawn by default", () => {
      const { container } = setup();
      expect(container.querySelector("circle")).toBeNull();
      expect(screen.queryByText("Circle size: number of authorities")).toBeNull();
    });

    it("are drawn per UAT with authorities when enabled, hidden from assistive tech, with a key", () => {
      const { container } = setup({ showAuthorityCircles: true });
      const circles = container.querySelectorAll("circle");
      expect(circles).toHaveLength(typicalCounty.uats.length);
      expect(container.querySelector("[data-authority-circles]")).toHaveAttribute("aria-hidden", "true");
      expect(screen.getByText("Circle size: number of authorities")).toBeVisible();
    });

    it("add the authority count to the tooltip only when enabled", async () => {
      const first = setup();
      await userEvent.hover(screen.getByRole("button", { name: /^Cluj-Napoca/ }));
      expect(screen.getByRole("tooltip")).not.toHaveTextContent("authorities");
      first.unmount();
      setup({ showAuthorityCircles: true });
      await userEvent.hover(screen.getByRole("button", { name: /^Cluj-Napoca/ }));
      expect(screen.getByRole("tooltip")).toHaveTextContent("74 authorities");
    });
  });

  it("shows the UAT name, its formatted Total and its Records in the tooltip", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: /^Turda/ }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Turda");
    expect(tooltip).toHaveTextContent("RON 180,000,000");
    expect(tooltip).toHaveTextContent("640 Records");
  });

  it("reads in Romanian with Romanian money formatting", () => {
    setup({ map: withUnknownUat, topology: uatsTopology }, "ro");
    expect(screen.getByRole("button", { name: `Brașov: ${"960.000.000\u00a0RON"}` })).toBeVisible();
    expect(screen.getByRole("button", { name: "Predeal: Nicio autoritate nu a cumpărat" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Județ cunoscut, UAT necunoscut" })).toHaveTextContent("142 de înregistrări");
  });
});
