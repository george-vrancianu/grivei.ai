import type { RecordFilter } from "@grivei/contract";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityRecords, supplierNoMatches, supplierRecords } from "../../../../samples/fixtureData.ts";
import type { EntityRole, RecordFacetData } from "../../../../types.ts";
import { FacetPanel } from "./index.ts";

function show(facets: RecordFacetData, role: EntityRole, filter: RecordFilter = {}, locale: "en" | "ro" = "en") {
  const onFilterChange = vi.fn();
  render(<FacetPanel facets={facets} filter={filter} role={role} onFilterChange={onFilterChange} locale={locale} copy={sampleCopy.recordsFacets(locale)} />);
  return onFilterChange;
}
const click = (name: string | RegExp) => userEvent.setup().click(screen.getByRole("button", { name }));

describe("the facet panel", () => {
  it("lists each group with its values and counts", () => {
    show(authorityRecords.facets, "authority");
    expect(screen.getByRole("complementary", { name: "Filter by facet" })).toBeVisible();
    for (const group of ["Signal", "Channel", "Procedure", "Award year", "Supplier", "Badges"]) expect(screen.getByRole("group", { name: group })).toBeVisible();
    expect(screen.getByRole("button", { name: "Direct purchase (5)" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Licitație deschisă (1)" })).toBeVisible();
    expect(screen.getByRole("button", { name: "2023 (2)" })).toBeVisible();
    expect(screen.getByRole("button", { name: "CONSTRUCȚII TRANSILVANIA S.A. (1)" })).toBeVisible();
  });

  it("leaves out a group with nothing to choose", () => {
    show(supplierRecords.facets, "supplier"); // no badges in this fixture
    expect(screen.queryByRole("group", { name: "Badges" })).toBeNull();
  });

  describe("selecting a facet emits the matching RecordFilter change", () => {
    it("Signal sets signal", async () => {
      const onChange = show(authorityRecords.facets, "authority");
      await click(/^Splitting/);
      expect(onChange).toHaveBeenCalledWith({ signal: "SPLITTING" });
    });
    it("channel sets channel", async () => {
      const onChange = show(authorityRecords.facets, "authority");
      await click(/^Contract/);
      expect(onChange).toHaveBeenCalledWith({ channel: "CONTRACT" });
    });
    it("procedure adds to the procedure list", async () => {
      const onChange = show(authorityRecords.facets, "authority", { procedure: ["Achiziție directă"] });
      await click(/^Licitație deschisă/);
      expect(onChange).toHaveBeenCalledWith({ procedure: ["Achiziție directă", "Licitație deschisă"] });
    });
    it("year sets from and to to that year's Jan 1 and Dec 31", async () => {
      const onChange = show(authorityRecords.facets, "authority");
      await click(/^2023/);
      expect(onChange).toHaveBeenCalledWith({ from: "2023-01-01", to: "2023-12-31" });
    });
    it("a counterparty on an authority's page sets supplier", async () => {
      const onChange = show(authorityRecords.facets, "authority");
      await click(/^CONSTRUCȚII/);
      expect(onChange).toHaveBeenCalledWith({ supplier: "30000002" });
    });
    it("a counterparty on a supplier's page sets authority", async () => {
      const onChange = show(supplierRecords.facets, "supplier");
      await click(/^MUNICIPIUL BRAȘOV/);
      expect(onChange).toHaveBeenCalledWith({ authority: "4000001" });
    });
    it("a badge adds to badges", async () => {
      const onChange = show(authorityRecords.facets, "authority", { badges: ["NO_VALUE"] });
      await click(/^Name differs from ANAF/);
      expect(onChange).toHaveBeenCalledWith({ badges: ["NO_VALUE", "NAME_DIFFERS_FROM_ANAF"] });
    });
  });

  describe("selecting an active value again clears it", () => {
    it.each<[string, RecordFilter, RegExp, RecordFilter]>([
      ["Signal", { signal: "SPLITTING" }, /^Splitting/, {}],
      ["channel", { channel: "CONTRACT" }, /^Contract/, {}],
      ["procedure", { procedure: ["Licitație deschisă"] }, /^Licitație deschisă/, {}],
      ["year", { from: "2023-01-01", to: "2023-12-31" }, /^2023/, {}],
      ["counterparty", { supplier: "30000002" }, /^CONSTRUCȚII/, {}],
      ["badge", { badges: ["CUI_MISMATCH"] }, /^CUI mismatch/, {}],
    ])("%s", async (_kind, filter, name, expected) => {
      const onChange = show(authorityRecords.facets, "authority", filter);
      expect(screen.getByRole("button", { name, pressed: true })).toBeVisible();
      await click(name);
      expect(onChange).toHaveBeenCalledWith(expected);
    });
  });

  it("passes every field it does not own through untouched", async () => {
    const other: RecordFilter = { q: "străzi", county: "RO-BV", uat: "40198", countySide: "SUPPLIER", valueBucket: "UP_TO_900K", hasSignals: true, cpv: "770" };
    const onChange = show(authorityRecords.facets, "authority", other);
    await click(/^Contract/);
    expect(onChange).toHaveBeenCalledWith({ ...other, channel: "CONTRACT" });
  });

  it("keeps an active value the facets did not list, without a count, and can switch it off", async () => {
    const onChange = show(supplierNoMatches.facets, "supplier", { channel: "CONTRACT", signal: "OVER_CAP", authority: "4000001" });
    const channel = within(screen.getByRole("group", { name: "Channel" }));
    expect(channel.getByRole("button", { name: "Contract", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Over cap", pressed: true })).toBeVisible();
    expect(screen.getByRole("button", { name: "Counterparty 4000001", pressed: true })).toBeVisible();
    await click("Contract");
    expect(onChange).toHaveBeenCalledWith({ signal: "OVER_CAP", authority: "4000001" });
  });

  it("is in Romanian under the ro locale", () => {
    show(authorityRecords.facets, "authority", {}, "ro");
    expect(screen.getByRole("group", { name: "Anul atribuirii" })).toBeVisible();
    expect(screen.getByRole("group", { name: "Furnizor" })).toBeVisible();
    expect(within(screen.getByRole("group", { name: "Canal" })).getByRole("button", { name: "Achiziție directă (5)" })).toBeVisible();
  });
});
