import type {
  MainScreenQuery, MainScreenQueryVariables, ZoomedCountyQuery, ZoomedCountyQueryVariables,
} from "../generated/operations.ts";
import { moneyMap, ron, total, zeroTotal } from "./builders.ts";
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
          authorities: { count: 5, countEstimated: false, rows: [{ entity: w.autoritateNeplasataRow, matched: total({ awarded: ron(12_000), records: 1 }) }] },
          suppliers: { count: 6, countEstimated: false, rows: [{ entity: w.foreignFirmRow, matched: total({ awarded: ron(2_250_000), records: 2, noValue: 1 }) }] },
          records: { count: 11, rows: [
            w.rConsortium, w.rConsortiumNameOnly, w.rFrameworkCeiling, w.rSubsequent, w.rSuspect, w.rNoValue,
            w.rNaturalPerson, w.rProvisional, w.rMismatch,
          ].map((record) => ({ record, matchedField: null })) },
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
          total: total({ awarded: "9007199254740993000", records: 2_400_000, suspectLeftOut: 4_100, noValue: 88_000, frameworkCeilings: ron(900_000_000_000) }),
          map: moneyMap({
            counties: [{ area: "RO-B", name: "București", entities: 12_000, total: total({ awarded: "9007199254740993", records: 1_000_000 }) }],
            national: total({ awarded: ron(1), records: 1 }),
          }),
          goTo: null,
          facets: { procedure: procedureFacet },
          authorities: { count: 66_000, countEstimated: true, rows: [{ entity: w.primariaBrasovRow, matched: total({ awarded: ron(1), records: 1 }) }] },
          suppliers: { count: 240_000, countEstimated: true, rows: [{ entity: w.hachiRow, matched: total({ awarded: ron(1), records: 1 }) }] },
          records: { count: 2_400_000, rows: [{ record: w.rDirectSmall, matchedField: { field: "TITLE", text: "Consumabile birotică", highlights: [[0, 2]] } }] },
        },
      },
    },
  },
];

const uat = (siruta: string, name: string, county = { code: "RO-BV", name: "Brașov" }) => ({ siruta, name, county });

export const zoomedCounty: FixtureSet<ZoomedCountyQuery, ZoomedCountyQueryVariables> = [
  {
    name: "typical-brasov",
    kind: "typical",
    description: "UAT choropleth for Brașov: some UATs bought, one is absent (grey), an unknown-UAT row",
    variables: { filter: { county: "RO-BV" }, county: "RO-BV" },
    data: {
      uats: [uat("40198", "Brașov"), uat("40302", "Codlea"), uat("40081", "Bran")],
      seap: {
        search: {
          total: total({ awarded: ron(2_100_000_000), records: 11_000 }),
          uatMap: {
            uats: [
              { area: "40198", name: "Brașov", entities: 62, total: total({ awarded: ron(1_500_000_000), records: 7_000 }) },
              { area: "40302", name: "Codlea", entities: 8, total: total({ awarded: ron(80_000_000), records: 600 }) },
            ],
            unknownUat: total({ awarded: ron(5_000_000), records: 40 }),
          },
        },
      },
    },
  },
  {
    name: "bucharest-sectors",
    kind: "typical",
    description: "Bucharest zooms into its six sectors",
    variables: { filter: { county: "RO-B" }, county: "RO-B" },
    data: {
      uats: [1, 2, 3, 4, 5, 6].map((n) => uat(String(179132 + n), `Sector ${n}`, { code: "RO-B", name: "București" })),
      seap: {
        search: {
          total: total({ awarded: ron(14_000_000_000), records: 60_000 }),
          uatMap: {
            uats: [1, 2, 3, 4, 5, 6].map((n) => ({ area: String(179132 + n), name: `Sector ${n}`, entities: 20 + n, total: total({ awarded: ron(n * 400_000_000), records: n * 1_000 }) })),
            unknownUat: null,
          },
        },
      },
    },
  },
  {
    name: "empty-county-no-purchases",
    kind: "empty",
    description: "a county where no authority bought anything in the filter: every UAT grey, no unknown-UAT row",
    variables: { filter: { county: "RO-SB", from: "2019-01-01", to: "2019-12-31" }, county: "RO-SB" },
    data: {
      uats: [uat("143450", "Sibiu", { code: "RO-SB", name: "Sibiu" })],
      seap: { search: { total: zeroTotal, uatMap: { uats: [], unknownUat: null } } },
    },
  },
];
