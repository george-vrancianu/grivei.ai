// Invented money maps for the Money lens stories and tests, over the sample county outlines (`geo/counties.topo.ts`).
import type { MoneyMap, Total } from "../types.ts";

const total = (awarded: string, records: number): Total => ({ awarded, records, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false });
const bani = (ron: number) => String(ron * 100);

const county = (area: string, name: string, ron: number, records: number, entities: number) => ({ area, name, entities, total: total(bani(ron), records) });

/** Authority side: Timiș has no money at all, Galați and Constanța are absent (grey, no data). */
const authorityCounties = [
  county("RO-CJ", "Cluj", 310_000_000, 1_204, 88),
  county("RO-IS", "Iași", 41_000_000, 530, 61),
  county("RO-BV", "Brașov", 95_000_000, 702, 47),
  county("RO-SV", "Suceava", 8_500_000, 211, 50),
  county("RO-AG", "Argeș", 2_400_000, 96, 33),
  county("RO-MM", "Maramureș", 120_000, 4, 3),
  county("RO-TM", "Timiș", 0, 0, 0),
];

export const authoritySide: MoneyMap = {
  side: "AUTHORITY",
  counties: authorityCounties,
  national: total(bani(86_000_000_000), 410_000),
  unplaced: { authorities: 3, total: total(bani(1_250_000), 17) },
  unknownSupplierCounty: null,
};

/** Authority side, every authority placed: no Unplaced tile. */
export const authoritySideNoUnplaced: MoneyMap = { ...authoritySide, unplaced: null };

export const supplierSide: MoneyMap = {
  side: "SUPPLIER",
  counties: [
    county("RO-CJ", "Cluj", 1_020_000_000, 3_400, 210),
    county("RO-BV", "Brașov", 410_000_000, 1_900, 120),
    county("RO-IS", "Iași", 38_000_000, 480, 55),
    county("RO-TM", "Timiș", 900_000, 12, 4),
  ],
  national: total(bani(86_000_000_000), 410_000),
  unplaced: null,
  unknownSupplierCounty: total(bani(2_300_000_000), 5_100),
};
