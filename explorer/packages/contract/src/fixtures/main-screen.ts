import type { MainScreenQuery, MainScreenQueryVariables } from "../generated/operations.ts";
import { moneyMap, ron, total } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import * as w from "./world.ts";

const { sources } = w;

/** Procedure names as SEAP publishes them (the chips offer these). */
const procedureFacet = [{ value: "Achiziție directă" }, { value: "Licitație deschisă" }, { value: "Negociere fără publicare prealabilă" }];

/** What a recorded run cannot produce (a record state of every kind, counts a fixture archive cannot reach). The rest is `recorded/`. */
export const mainScreenHand: FixtureSet<MainScreenQuery, MainScreenQueryVariables> = [
  {
    name: "records-variety",
    kind: "typical",
    description: "every Record state in one result list: consortium, framework, subsequent, suspect, no value, natural person, provisional, mismatch",
    variables: { filter: { q: "contract" } },
    data: {
      sources,
      seap: {
        search: {
          filter: { qFolded: "contract", authority: null, supplier: null },
          total: total({ awarded: ron(60_000_000), records: 11, suspectLeftOut: 1, noValue: 1, frameworkCeilings: ron(100_000_000) }),
          map: moneyMap({ national: total({ awarded: ron(52_000_000), records: 6 }), unplaced: { authorities: 1, total: total({ awarded: ron(12_000), records: 1 }) } }),
          goTo: null,
          facets: { procedure: procedureFacet },
          authorities: { count: 5, countEstimated: false, rows: [{ entity: w.autoritateNeplasataRow, matched: total({ awarded: ron(12_000), records: 1 }), signalCount: 0 }] },
          suppliers: { count: 6, countEstimated: false, rows: [{ entity: w.foreignFirmRow, matched: total({ awarded: ron(2_250_000), records: 2, noValue: 1 }), signalCount: 0 }] },
          records: { count: 11, rows: [
            w.rConsortium, w.rConsortiumNameOnly, w.rFrameworkCeiling, w.rSubsequent, w.rSuspect, w.rNoValue,
            w.rNaturalPerson, w.rProvisional, w.rMismatch,
          ].map((record) => ({ record, matchedField: null, areaShare: null })) },
        },
      },
    },
  },
  {
    name: "supplier-county-consortium-share",
    kind: "typical",
    description: "a supplier-side county click (Cluj): a consortium Record whose winners sit in two supplier counties (Cluj and Mureș) shows its Cluj share as areaShare; the single-winner Record shows none; the shares add up to the Total",
    variables: { filter: { county: "RO-CJ", countySide: "SUPPLIER" } },
    data: {
      sources,
      seap: {
        search: {
          filter: { qFolded: null, authority: null, supplier: null },
          total: total({ awarded: ron(27_800_000), records: 2 }),
          map: moneyMap({ side: "SUPPLIER", counties: [{ area: "RO-CJ", name: "Cluj", entities: 1, total: total({ awarded: ron(27_800_000), records: 2 }) }] }),
          goTo: null,
          facets: { procedure: procedureFacet },
          authorities: { count: 2, countEstimated: false, rows: [
            { entity: w.drumuriNationaleRow, matched: total({ awarded: ron(15_000_000), records: 1 }), signalCount: 1 },
            { entity: w.primariaBrasovRow, matched: total({ awarded: ron(12_800_000), records: 1 }), signalCount: 0 },
          ] },
          suppliers: { count: 1, countEstimated: false, rows: [{ entity: w.constructiiRow, matched: total({ awarded: ron(27_800_000), records: 2 }), signalCount: 2 }] },
          records: { count: 2, rows: [
            { record: w.rConsortium, matchedField: null, areaShare: ron(15_000_000) },
            { record: w.rContract, matchedField: null, areaShare: null },
          ] },
        },
      },
    },
  },
  {
    name: "extreme-estimated-counts",
    kind: "extreme",
    description: "very large numbers and HyperLogLog estimates: countEstimated true on both tabs; a sum above 2^53 bani, which only survives as a string",
    variables: { filter: { q: "ro" } },
    data: {
      sources,
      seap: {
        search: {
          filter: { qFolded: "ro", authority: null, supplier: null },
          total: total({ awarded: "9007199254740993000", records: 2_400_000, suspectLeftOut: 4_100, noValue: 88_000, estimated: true, frameworkCeilings: ron(900_000_000_000) }),
          map: moneyMap({
            counties: [{ area: "RO-B", name: "București", entities: 12_000, total: total({ awarded: "9007199254740993", records: 1_000_000 }) }],
            national: total({ awarded: ron(1), records: 1 }),
          }),
          goTo: null,
          facets: { procedure: procedureFacet },
          authorities: { count: 66_000, countEstimated: true, rows: [{ entity: w.primariaBrasovRow, matched: total({ awarded: ron(1), records: 1 }), signalCount: 0 }] },
          suppliers: { count: 240_000, countEstimated: true, rows: [{ entity: w.hachiRow, matched: total({ awarded: ron(1), records: 1 }), signalCount: 0 }] },
          records: { count: 2_400_000, rows: [{ record: w.rDirectSmall, matchedField: { field: "TITLE", text: "Consumabile birotică", highlights: [[0, 2]] }, areaShare: null }] },
        },
      },
    },
  },
];
