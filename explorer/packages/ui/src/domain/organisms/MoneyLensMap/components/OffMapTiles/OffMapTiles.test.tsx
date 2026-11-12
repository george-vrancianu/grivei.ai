import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Locale } from "../../../../../theme/index.ts";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authoritySide, authoritySideNoUnplaced, authoritySideSuspectLeftOut, supplierSide, supplierSideSuspectLeftOut } from "../../../../samples/moneyMaps.ts";
import type { MoneyMap } from "../../../../types.ts";
import { OffMapTiles } from "./index.ts";

function setup(map: MoneyMap, props: { selected?: string; locale?: Locale } = {}) {
  const locale = props.locale ?? "en";
  const onSelect = vi.fn();
  render(<OffMapTiles map={map} selected={props.selected} onSelect={onSelect} locale={locale} copy={sampleCopy.moneyLensMap(locale).tiles} />);
  return { onSelect };
}

describe("OffMapTiles", () => {
  it("draws National alone when the map has no Unplaced or unknown-supplier-county bucket", () => {
    setup(authoritySideNoUnplaced);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /^National/ })).toBeVisible();
  });

  it("draws the Unplaced tile with its authority count when the map has one", () => {
    setup(authoritySide);
    expect(screen.getByRole("button", { name: /^Unplaced authorities/ })).toHaveTextContent("3 authorities without a county");
  });

  it("draws the unknown-supplier-county tile when the map has one", () => {
    setup(supplierSide);
    expect(screen.getByRole("button", { name: /^Unknown supplier county/ })).toHaveTextContent("5,100 Records");
  });

  it("emits the area of the tile clicked", async () => {
    const { onSelect } = setup(supplierSide);
    await userEvent.click(screen.getByRole("button", { name: /^Unknown supplier county/ }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("UNKNOWN_SUPPLIER_COUNTY");
  });

  it("marks only the selected tile as pressed", () => {
    setup(authoritySide, { selected: "UNPLACED" });
    expect(screen.getByRole("button", { name: /^Unplaced authorities/, pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: /^National/, pressed: false })).toBeVisible();
  });

  it("says how many suspect Records a tile's Total left out, and nothing when none", () => {
    setup(supplierSideSuspectLeftOut);
    expect(screen.getByRole("button", { name: /^National/ })).toHaveTextContent("12 suspect values left out");
    expect(screen.getByRole("button", { name: /^Unknown supplier county/ })).toHaveTextContent("1 suspect value left out");
  });

  it("says nothing about suspect Records when no Total left any out", () => {
    setup(authoritySide);
    expect(screen.queryByText(/left out/)).not.toBeInTheDocument();
  });

  it("states the left-out count on the Unplaced tile too, in Romanian", () => {
    setup(authoritySideSuspectLeftOut, { locale: "ro" });
    expect(screen.getByRole("button", { name: /^Autorități neplasate/ })).toHaveTextContent("2 valori suspecte excluse");
  });
});
