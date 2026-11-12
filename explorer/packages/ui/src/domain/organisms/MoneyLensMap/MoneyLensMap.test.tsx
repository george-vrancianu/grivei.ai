import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../samples/copy.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { authoritySide, authoritySideNoUnplaced, supplierSide } from "../../samples/moneyMaps.ts";
import type { Locale } from "../../../theme/index.ts";
import type { MoneyMap } from "../../types.ts";
import { MoneyLensMap, type MoneyLensMapProps } from "./index.ts";

/** The formatted amount as the page renders it: a no-break space after the currency code. */
const ron = (amount: string) => `RON\u00a0${amount}`;

function setup(map: MoneyMap = authoritySide, props: Partial<MoneyLensMapProps> = {}, locale: Locale = "en") {
  const onSelect = vi.fn();
  const onSideChange = vi.fn();
  render(
    <MoneyLensMap map={map} topology={countiesTopology} onSelect={onSelect} side={map.side} onSideChange={onSideChange} locale={locale} copy={sampleCopy.moneyLensMap(locale)} {...props} />,
  );
  return { onSelect, onSideChange };
}

describe("MoneyLensMap", () => {
  it("names each county with its awarded value, and leaves counties the map lacks as no data", () => {
    setup();
    expect(screen.getByRole("button", { name: `Cluj: ${ron("310,000,000")}` })).toBeVisible();
    expect(screen.getByRole("button", { name: `Timiș: ${ron("0")}` })).toBeVisible();
    expect(screen.getByRole("button", { name: "Galați: No data" })).toBeVisible();
  });

  it("emits the county code when a county is clicked", async () => {
    const { onSelect } = setup();
    await userEvent.click(screen.getByRole("button", { name: `Brașov: ${ron("95,000,000")}` }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("RO-BV");
  });

  it("emits NATIONAL when the National tile is clicked, and shows its Total", async () => {
    const { onSelect } = setup();
    const tile = screen.getByRole("button", { name: /^National/ });
    expect(tile).toHaveTextContent("RON 86,000,000,000");
    expect(tile).toHaveTextContent("410,000 Records");
    await userEvent.click(tile);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("NATIONAL");
  });

  it("shows the Unplaced tile with its authorities, Records and RON, and emits UNPLACED", async () => {
    const { onSelect } = setup();
    const tile = screen.getByRole("button", { name: /^Unplaced authorities/ });
    expect(tile).toHaveTextContent("3 authorities without a county");
    expect(tile).toHaveTextContent("RON 1,250,000");
    expect(tile).toHaveTextContent("17 Records");
    await userEvent.click(tile);
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("UNPLACED");
  });

  it("hides the Unplaced tile when there is none, and the unknown-supplier-county tile on the authority side", () => {
    setup(authoritySideNoUnplaced);
    expect(screen.getByRole("button", { name: /^National/ })).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Unplaced/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Unknown supplier county/ })).toBeNull();
  });

  it("shows the unknown-supplier-county tile only when the map has it, and emits its area", async () => {
    const { onSelect } = setup(supplierSide);
    expect(screen.queryByRole("button", { name: /^Unplaced/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /^Unknown supplier county/ }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("UNKNOWN_SUPPLIER_COUNTY");
  });

  it("omits the unknown-supplier-county tile on the supplier side when it is null", () => {
    setup({ ...supplierSide, unknownSupplierCounty: null });
    expect(screen.queryByRole("button", { name: /^Unknown supplier county/ })).toBeNull();
  });

  it("presses the selected tile, and only that one", () => {
    setup(authoritySide, { selected: "UNPLACED" });
    expect(screen.getByRole("button", { name: /^Unplaced authorities/, pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /^National/, pressed: false })).toBeVisible();
  });

  it("highlights the selected county", () => {
    setup(authoritySide, { selected: "RO-CJ" });
    expect(screen.getByRole("button", { name: /^Cluj/, pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Iași/, pressed: false })).toBeVisible();
  });

  it("shows the area name, its formatted Total and its Records in the tooltip", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: /^Cluj/ }));
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Cluj");
    expect(tooltip).toHaveTextContent("RON 310,000,000");
    expect(tooltip).toHaveTextContent("1,204 Records");
  });

  it("says no data in the tooltip of a county the map lacks", async () => {
    setup();
    await userEvent.hover(screen.getByRole("button", { name: /^Galați/ }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("No data");
  });

  it("emits the other side from the toggle", async () => {
    const { onSideChange } = setup();
    expect(screen.getByRole("button", { name: "Authorities", pressed: true })).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Suppliers" }));
    expect(onSideChange).toHaveBeenCalledExactlyOnceWith("SUPPLIER");
  });

  it("reads in Romanian with Romanian money formatting", () => {
    setup(authoritySide, {}, "ro");
    expect(screen.getByRole("button", { name: /^Autorități neplasate/ })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Național/ })).toHaveTextContent("86.000.000.000 RON");
    expect(screen.getByRole("group", { name: "Arată județele după" })).toBeVisible();
  });
});
