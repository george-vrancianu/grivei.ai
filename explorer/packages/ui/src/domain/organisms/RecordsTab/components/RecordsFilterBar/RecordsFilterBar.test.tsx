import type { RecordFilter } from "@grivei/contract";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderInUi } from "../../../../../testing/render.tsx";
import { sampleCopy } from "../../../../samples/copy.ts";
import { authorityRecords, authorityWithSignalsRecords, supplierNoMatches, supplierRecords } from "../../../../samples/fixtureData.ts";
import type { EntityRole, RecordFacetData } from "../../../../types.ts";
import { RecordsFilterBar } from "./index.ts";

function show(facets: RecordFacetData, role: EntityRole, filter: RecordFilter = {}, locale: "en" | "ro" = "en") {
  const onFilterChange = vi.fn();
  renderInUi(<RecordsFilterBar facets={facets} filter={filter} role={role} onFilterChange={onFilterChange} locale={locale} copy={sampleCopy.recordsFacets(locale)} />, locale);
  return onFilterChange;
}
/** Opens a menu by its name, then picks one of its items. */
async function pick(menu: string | RegExp, item: RegExp, role: "menuitemradio" | "menuitemcheckbox") {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: menu }));
  await user.click(screen.getByRole(role, { name: item }));
}

describe("the Records filter bar", () => {
  it("offers a menu per facet, Signal first, in a bar named by its copy", () => {
    show(authorityWithSignalsRecords.facets, "authority");
    const bar = within(screen.getByRole("region", { name: "Filter by facet" }));
    const names = bar.getAllByRole("button", { name: /Any$/ }).map((button) => button.textContent?.replace(/\s*Any$/, ""));
    expect(names).toEqual(["Signal", "Channel", "Procedure", "Award year", "Supplier", "Badges"]);
  });

  it("keeps each option's count in its menu", async () => {
    show(authorityWithSignalsRecords.facets, "authority");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Channel/ }));
    expect(screen.getByRole("menuitemradio", { name: "Direct purchase (8)" })).toBeVisible();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /^Award year/ }));
    expect(screen.getByRole("menuitemradio", { name: "2023 (12)" })).toBeVisible();
  });

  it("leads an estimated count with ≈", async () => {
    show({ ...supplierRecords.facets, channel: supplierRecords.facets.channel.map((f) => ({ ...f, total: { ...f.total, estimated: true, records: 12_400 } })) }, "supplier");
    await userEvent.setup().click(screen.getByRole("button", { name: /^Channel/ }));
    expect(screen.getAllByRole("menuitemradio").some((item) => /\(≈\s12,400\)$/.test(item.textContent ?? ""))).toBe(true);
  });

  it("leaves out a menu with nothing to choose", () => {
    show(supplierRecords.facets, "supplier"); // no Record of this supplier is in a Signal
    expect(screen.queryByRole("button", { name: /^Signal/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^Badges/ })).toBeVisible();
  });

  describe("choosing an option emits the matching RecordFilter change", () => {
    it("Signal sets signal", async () => {
      const onChange = show(authorityWithSignalsRecords.facets, "authority");
      await pick(/^Signal/, /^Over cap/, "menuitemradio");
      expect(onChange).toHaveBeenCalledWith({ signal: "OVER_CAP" });
    });
    it("channel sets channel", async () => {
      const onChange = show(authorityRecords.facets, "authority");
      await pick(/^Channel/, /^Contract/, "menuitemradio");
      expect(onChange).toHaveBeenCalledWith({ channel: "CONTRACT" });
    });
    it("procedure adds to the procedure list", async () => {
      const onChange = show(authorityRecords.facets, "authority", { procedure: ["Negociere"] });
      await pick(/^Procedure/, /^Licitatie deschisa/, "menuitemcheckbox");
      expect(onChange).toHaveBeenCalledWith({ procedure: ["Negociere", "Licitatie deschisa"] });
    });
    it("year sets from and to to that year's Jan 1 and Dec 31", async () => {
      const onChange = show(authorityRecords.facets, "authority");
      await pick(/^Award year/, /^2023/, "menuitemradio");
      expect(onChange).toHaveBeenCalledWith({ from: "2023-01-01", to: "2023-12-31" });
    });
    it("a counterparty on an authority's page sets supplier", async () => {
      const onChange = show(authorityRecords.facets, "authority");
      await pick(/^Supplier/, /^ALFA/, "menuitemradio");
      expect(onChange).toHaveBeenCalledWith({ supplier: "2000007" });
    });
    it("a counterparty on a supplier's page sets authority", async () => {
      const onChange = show(supplierRecords.facets, "supplier");
      await pick(/^Contracting authority/, /^SPITALUL EXEMPLU/, "menuitemradio");
      expect(onChange).toHaveBeenCalledWith({ authority: "1000017" });
    });
    it("a badge adds to badges", async () => {
      const onChange = show(authorityRecords.facets, "authority", { badges: ["NO_VALUE"] });
      await pick(/^Badges|^Badge/, /^Suspect value/, "menuitemcheckbox");
      expect(onChange).toHaveBeenCalledWith({ badges: ["NO_VALUE", "SUSPECT_VALUE"] });
    });
  });

  it("choosing the active value again clears it", async () => {
    const onChange = show(authorityWithSignalsRecords.facets, "authority", { channel: "CONTRACT" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Channel/ }));
    expect(screen.getByRole("menuitemradio", { name: /^Contract/, checked: true })).toBeVisible();
    await user.click(screen.getByRole("menuitemradio", { name: /^Contract/ }));
    expect(onChange).toHaveBeenCalledWith({});
  });

  it("passes every field it does not own through untouched", async () => {
    const other: RecordFilter = { county: "RO-BV", uat: "40198", countySide: "SUPPLIER", valueBucket: "UP_TO_900K", hasSignals: true };
    const onChange = show(authorityRecords.facets, "authority", other);
    await pick(/^Channel/, /^Contract/, "menuitemradio");
    expect(onChange).toHaveBeenCalledWith({ ...other, channel: "CONTRACT" });
  });

  it("keeps an active value the facets did not list, without a count, and can switch it off", async () => {
    const onChange = show(supplierNoMatches.facets, "supplier", { channel: "CONTRACT", signal: "OVER_CAP" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Channel/ }));
    await user.click(screen.getByRole("menuitemradio", { name: "Contract", checked: true }));
    expect(onChange).toHaveBeenCalledWith({ signal: "OVER_CAP" });
  });

  describe("the active row", () => {
    const reproduction: RecordFilter = { signal: "NO_PUBLICATION", supplier: "2000007", from: "2024-03-01", to: "2024-05-31", cpv: "45210000" };

    it("shows one chip per reproduced parameter, each removing only its own", async () => {
      const onChange = show(authorityRecords.facets, "authority", reproduction);
      const row = within(screen.getByRole("group", { name: "Active filters" }));
      const labels = ["Signal: No publication", "ALFA DEMO SRL", "1 Mar 2024 – 31 May 2024", "CPV: 45210000"];
      for (const label of labels) expect(row.getByRole("button", { name: `Remove ${label}` })).toBeVisible();
      const user = userEvent.setup();
      await user.click(row.getByRole("button", { name: "Remove CPV: 45210000" }));
      expect(onChange).toHaveBeenLastCalledWith({ signal: "NO_PUBLICATION", supplier: "2000007", from: "2024-03-01", to: "2024-05-31" });
      await user.click(row.getByRole("button", { name: "Remove 1 Mar 2024 – 31 May 2024" }));
      expect(onChange).toHaveBeenLastCalledWith({ signal: "NO_PUBLICATION", supplier: "2000007", cpv: "45210000" });
    });

    it("clears every filter the row shows, the carried value bucket and county included", async () => {
      const onChange = show(authorityRecords.facets, "authority", { ...reproduction, valueBucket: "UP_TO_900K", county: "RO-BV" });
      await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters" }));
      expect(onChange).toHaveBeenCalledWith({});
    });

    it("is absent when no filter is on", () => {
      show(authorityRecords.facets, "authority", { countySide: "SUPPLIER" });
      expect(screen.queryByRole("group", { name: "Active filters" })).toBeNull();
    });
  });

  it("is in Romanian under the ro locale", async () => {
    show(authorityRecords.facets, "authority", { signal: "NO_PUBLICATION", cpv: "7" }, "ro");
    expect(screen.getByRole("button", { name: /^Anul atribuirii/ })).toBeVisible();
    expect(screen.getByRole("button", { name: "Elimină Semnal: Fără publicare" })).toBeVisible();
    await userEvent.setup().click(screen.getByRole("button", { name: /^Canal/ }));
    expect(screen.getByRole("menuitemradio", { name: "Achiziție directă (8)" })).toBeVisible();
  });
});
