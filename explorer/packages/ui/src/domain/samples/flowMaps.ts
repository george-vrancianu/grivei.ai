// Invented Flow lens data (a `MoneyMap` on the counterparty's side) for the stories and tests, over the sample county outlines (`geo/counties.topo.ts`).
// Counties: Argeș, Brașov, Cluj, Constanța, Galați, Iași, Maramureș, Suceava, Timiș. Fixture codes like RO-SB are not in the outlines.
import type { MoneyMap, Total } from "../types.ts";

const total = (ron: number, records: number): Total => ({ awarded: String(ron * 100), records, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false });
const county = (area: string, name: string, ron: number, records: number) => ({ area, name, entities: 1, total: total(ron, records) });
const zero = total(0, 0);

/** The supplier's own county in the nationwide and local samples. */
export const supplierHome = "RO-CJ";
/** The authority's own county in the nationwide and local samples. */
export const authorityHome = "RO-BV";

/** A supplier (home Cluj): authority counties across the country, National and Unplaced tiles. Timiș holds no money. */
export const supplierNationwideFlow: MoneyMap = {
  side: "AUTHORITY",
  counties: [
    county("RO-BV", "Brașov", 2_800_000, 40),
    county("RO-IS", "Iași", 700_000, 9),
    county("RO-TM", "Timiș", 0, 0),
    county("RO-SV", "Suceava", 175_000, 3),
    county("RO-CJ", "Cluj", 1_200_000, 18),
  ],
  national: total(300_000, 4),
  unplaced: { authorities: 1, total: total(36_000, 1) },
  unknownSupplierCounty: null,
};

/** A supplier whose money all comes from its own county: one bubble, no arcs. */
export const supplierLocalFlow: MoneyMap = {
  side: "AUTHORITY",
  counties: [county("RO-CJ", "Cluj", 1_200_000, 18)],
  national: zero,
  unplaced: null,
  unknownSupplierCounty: null,
};

/** An authority (home Brașov): supplier counties across the country, National and the unknown-supplier-county bucket. */
export const authorityNationwideFlow: MoneyMap = {
  side: "SUPPLIER",
  counties: [
    county("RO-CJ", "Cluj", 112_400_000, 13),
    county("RO-BV", "Brașov", 28_000_000, 61),
    county("RO-IS", "Iași", 9_300_000, 7),
    county("RO-AG", "Argeș", 1_100_000, 5),
    county("RO-MM", "Maramureș", 120_000, 1),
  ],
  national: total(4_000_000, 3),
  unplaced: null,
  unknownSupplierCounty: total(1_200_000, 2),
};

/** An authority whose suppliers are all in its own county: one bubble, no arcs. */
export const authorityLocalFlow: MoneyMap = {
  side: "SUPPLIER",
  counties: [county("RO-BV", "Brașov", 28_000_000, 61)],
  national: zero,
  unplaced: null,
  unknownSupplierCounty: null,
};

/** No counterparties in the filter: no county, nothing on any tile. */
export const emptyAuthorityFlow: MoneyMap = { side: "SUPPLIER", counties: [], national: zero, unplaced: null, unknownSupplierCounty: null };
export const emptySupplierFlow: MoneyMap = { ...emptyAuthorityFlow, side: "AUTHORITY" };
