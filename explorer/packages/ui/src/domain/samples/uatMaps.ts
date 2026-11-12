// Invented UAT maps for the zoomed county stories and tests. SIRUTA codes are fictional and match `geo/countyUats.topo.ts`,
// `geo/uats.topo.ts` and `geo/bucharest.topo.ts`. A topology UAT missing from `uats` is one where no authority bought anything.
import type { Total, UatMap } from "../types.ts";

const total = (awarded: string, records: number): Total => ({ awarded, records, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false });
const bani = (ron: number) => String(ron * 100);
const uat = (area: string, name: string, ron: number, records: number, entities: number) => ({ area, name, entities, total: total(bani(ron), records) });

/** A typical county (`countyUatsTopology`): Gilău and Mociu are absent (grey); one UAT has a Total of zero. */
export const typicalCounty: UatMap = {
  uats: [
    uat("990206", "Cluj-Napoca", 2_400_000_000, 5_210, 74),
    uat("990210", "Turda", 180_000_000, 640, 19),
    uat("990203", "Dej", 96_000_000, 402, 14),
    uat("990211", "Câmpia Turzii", 41_000_000, 233, 9),
    uat("990204", "Gherla", 22_500_000, 151, 8),
    uat("990205", "Florești", 15_300_000, 120, 6),
    uat("990201", "Huedin", 4_800_000, 58, 5),
    uat("990207", "Apahida", 1_200_000, 31, 3),
    uat("990212", "Aiud", 0, 0, 1),
    uat("990209", "Baciu", 250_000, 7, 2),
  ],
  unknownUat: null,
};

/** Bucharest by sector (`bucharestTopology`): all six sectors have purchases. */
export const bucharest: UatMap = {
  uats: [
    uat("990301", "Sector 1", 3_100_000_000, 2_800, 41),
    uat("990302", "Sector 2", 1_450_000_000, 1_930, 37),
    uat("990303", "Sector 3", 2_050_000_000, 2_410, 39),
    uat("990304", "Sector 4", 720_000_000, 1_120, 28),
    uat("990305", "Sector 5", 640_000_000, 990, 26),
    uat("990306", "Sector 6", 1_800_000_000, 2_050, 33),
  ],
  unknownUat: null,
};

/** A county (`uatsTopology`) with the row for authorities placed in the county but in no UAT; Râșnov and Predeal are absent. */
export const withUnknownUat: UatMap = {
  uats: [
    uat("990102", "Brașov", 960_000_000, 3_300, 52),
    uat("990103", "Săcele", 31_000_000, 280, 11),
    uat("990101", "Zărnești", 6_200_000, 90, 6),
    uat("990106", "Codlea", 2_900_000, 61, 4),
  ],
  unknownUat: { ...total(bani(18_400_000), 142), suspectLeftOut: 2 },
};

/** A county where no authority bought anything (every UAT of its topology is grey), with no row for authorities without a UAT. */
export const noPurchases: UatMap = { uats: [], unknownUat: null };
