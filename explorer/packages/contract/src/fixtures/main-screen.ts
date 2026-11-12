import type {
  MainScreenQuery, MainScreenQueryVariables, ZoomedCountyQuery, ZoomedCountyQueryVariables,
} from "../generated/operations.ts";
import { moneyMap, ron, total, zeroTotal } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import * as w from "./world.ts";

const { sources } = w;

const emptyFilter = { qFolded: null, authority: null, supplier: null };

export const mainScreen: FixtureSet<MainScreenQuery, MainScreenQueryVariables> = [
  {
    name: "typical-text-county",
    kind: "typical",
    description: "q=deszapezire in Brașov, authority side: map, Go-to card absent, ranked tabs, matched field highlighted",
    variables: { filter: { q: "deszapezire", county: "RO-BV", from: "2024-01-01" } },
    data: {
      sources,
      seap: {
        search: {
          filter: { ...emptyFilter, qFolded: "deszapezire" },
          total: total({ awarded: ron(1_420_000), records: 9, suspectLeftOut: 1, noValue: 1 }),
          map: moneyMap({
            counties: [
              { area: "RO-BV", name: "Brașov", entities: 4, total: total({ awarded: ron(1_020_000), records: 6 }) },
              { area: "RO-SB", name: "Sibiu", entities: 1, total: total({ awarded: ron(400_000), records: 3 }) },
            ],
            national: total({ awarded: "0", records: 0 }),
          }),
          goTo: null,
          authorities: { count: 2, countEstimated: false, rows: [
            { entity: w.primariaBrasovRow, matched: total({ awarded: ron(1_020_000), records: 6 }) },
            { entity: w.spitalSibiuRow, matched: total({ awarded: ron(400_000), records: 3 }) },
          ] },
          suppliers: { count: 2, countEstimated: false, rows: [
            { entity: w.hachiRow, matched: total({ awarded: ron(1_020_000), records: 6 }) },
            { entity: w.constructiiRow, matched: total({ awarded: ron(400_000), records: 3 }) },
          ] },
          records: { count: 9, rows: [
            { record: w.rDirect, matchedField: { field: "TITLE", text: "Deszăpezire străzi, sezon rece 2023-2024", highlights: [[0, 10]] } },
            { record: w.rDirectSmall, matchedField: { field: "TITLE", text: "Deszăpezire căi de acces", highlights: [[0, 10]] } },
          ] },
        },
      },
    },
  },
  {
    name: "empty-search-national",
    kind: "typical",
    description: "no filter: national totals, the National and Unplaced tiles, national top tabs",
    variables: { filter: {} },
    data: {
      sources,
      seap: {
        search: {
          filter: emptyFilter,
          total: total({ awarded: ron(86_000_000_000), records: 410_000, suspectLeftOut: 312, noValue: 5_400, frameworkCeilings: ron(40_000_000_000) }),
          map: moneyMap({
            counties: [
              { area: "RO-B", name: "București", entities: 900, total: total({ awarded: ron(14_000_000_000), records: 60_000 }) },
              { area: "RO-BV", name: "Brașov", entities: 310, total: total({ awarded: ron(2_100_000_000), records: 11_000 }) },
            ],
            national: total({ awarded: ron(51_000_000_000), records: 90_000 }),
            unplaced: { authorities: 17, total: total({ awarded: ron(12_000_000), records: 130 }) },
          }),
          goTo: null,
          authorities: { count: 5_100, countEstimated: false, rows: [{ entity: w.drumuriNationaleRow, matched: total({ awarded: ron(9_000_000_000), records: 1_200 }) }] },
          suppliers: { count: 41_000, countEstimated: false, rows: [{ entity: w.constructiiRow, matched: total({ awarded: ron(1_800_000_000), records: 320 }) }] },
          records: { count: 410_000, rows: [{ record: w.rConsortium, matchedField: null }] },
        },
      },
    },
  },
  {
    name: "supplier-side-unknown-county",
    kind: "typical",
    description: "county side SUPPLIER: the unknown-supplier-county bucket, a Go-to card for an exact CUI",
    variables: { filter: { q: "30000001", countySide: "SUPPLIER" } },
    data: {
      sources,
      seap: {
        search: {
          filter: { qFolded: "30000001", authority: null, supplier: w.hachi },
          total: total({ awarded: ron(1_200_000), records: 5 }),
          map: moneyMap({
            side: "SUPPLIER",
            counties: [{ area: "RO-BV", name: "Brașov", entities: 1, total: total({ awarded: ron(900_000), records: 4 }) }],
            national: zeroTotal,
            unknownSupplierCounty: total({ awarded: ron(300_000), records: 1 }),
          }),
          goTo: w.hachi,
          authorities: { count: 1, countEstimated: false, rows: [{ entity: w.primariaBrasovRow, matched: total({ awarded: ron(1_200_000), records: 5 }) }] },
          suppliers: { count: 1, countEstimated: false, rows: [{ entity: w.hachiRow, matched: total({ awarded: ron(1_200_000), records: 5 }) }] },
          records: { count: 5, rows: [{ record: w.rDirect, matchedField: { field: "CUI", text: "30000001", highlights: [[0, 8]] } }] },
        },
      },
    },
  },
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
          authorities: { count: 66_000, countEstimated: true, rows: [{ entity: w.primariaBrasovRow, matched: total({ awarded: ron(1), records: 1 }) }] },
          suppliers: { count: 240_000, countEstimated: true, rows: [{ entity: w.hachiRow, matched: total({ awarded: ron(1), records: 1 }) }] },
          records: { count: 2_400_000, rows: [{ record: w.rDirectSmall, matchedField: { field: "TITLE", text: "Consumabile birotică", highlights: [[0, 2]] } }] },
        },
      },
    },
  },
  {
    name: "empty-no-match",
    kind: "empty",
    description: "a query nothing matches: zero totals, no tiles, no rows, no Go-to card",
    variables: { filter: { q: "zzzzzz" } },
    data: {
      sources,
      seap: {
        search: {
          filter: { qFolded: "zzzzzz", authority: null, supplier: null },
          total: zeroTotal,
          map: moneyMap(),
          goTo: null,
          authorities: { count: 0, countEstimated: false, rows: [] },
          suppliers: { count: 0, countEstimated: false, rows: [] },
          records: { count: 0, rows: [] },
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
