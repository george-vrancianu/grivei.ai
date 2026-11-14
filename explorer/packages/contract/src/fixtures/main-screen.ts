import type { MainScreenQuery, MainScreenQueryVariables, ZoomedCountyQuery, ZoomedCountyQueryVariables } from "../generated/operations.ts";
import { moneyMap, ron, searchTotal, total } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import { recordedMainScreen } from "./recorded/index.ts";
import * as w from "./world.ts";

const { sources } = w;

/** Procedure names as SEAP publishes them (the chips offer these). */
/** The lists the Party chip offers (#181), as AEP registers them (source data): a recorded run has no AEP archive, so its answers offer none. */
const partyOptions = [
  { party: "PARTIDUL SOCIAL DEMOCRAT", records: 4200 },
  { party: "PARTIDUL NAȚIONAL LIBERAL", records: 3900 },
  { party: "ALIANȚA USR PLUS", records: 800 },
  { party: "UNIUNEA DEMOCRATĂ MAGHIARĂ DIN ROMÂNIA", records: 640 },
];

const procedureFacet = [{ value: "Achiziție directă" }, { value: "Licitație deschisă" }, { value: "Negociere fără publicare prealabilă" }];

/** What a recorded run cannot produce (a record state of every kind, counts a fixture archive cannot reach). The rest is `recorded/`. */
export const mainScreenHand: FixtureSet<MainScreenQuery, MainScreenQueryVariables> = [
  {
    // the recorded "text-query-with-chip" rows under a chip-only filter (no query): a search whose entity links carry chips and no query (#106)
    ...recordedMainScreen.find((f) => f.name === "text-query-with-chip")!,
    name: "chip-only-direct-purchase",
    description: "a channel chip and no text query (rows as the recorded text-query-with-chip, test data for the carried-search link, #106)",
    variables: { filter: { channel: "DIRECT_PURCHASE" } },
  },
  {
    name: "records-variety",
    kind: "typical",
    description: "every Record state in one result list: consortium, framework, subsequent, suspect, no value, natural person, provisional, mismatch",
    variables: { filter: { q: "contract" } },
    data: {
      sources,
      seap: {
        partyOptions,
        search: {
          filter: { qFolded: "contract", authority: null, supplier: null },
          total: searchTotal({ awarded: ron(60_000_000), records: 11, suspectLeftOut: 1, noValue: 1, frameworkCeilings: ron(100_000_000) }),
          map: moneyMap({ national: total({ awarded: ron(52_000_000), records: 6 }), unplaced: { authorities: 1, total: total({ awarded: ron(12_000), records: 1 }) } }),
          goTo: null,
          facets: { procedure: procedureFacet },
          authorities: { count: 5, countEstimated: false, rows: [
            // the Signal: sNoPublication (spitalSibiu / foreignFirm) on rNoValue, one of this set's Records; the other rows' Records carry none
            { entity: w.spitalSibiuRow, matched: total({ awarded: ron(4_500_000), records: 2, noValue: 1 }), signalCount: 1 },
            { entity: w.autoritateNeplasataRow, matched: total({ awarded: ron(12_000), records: 1 }), signalCount: 0 },
          ] },
          suppliers: { count: 6, countEstimated: false, rows: [{ entity: w.foreignFirmRow, matched: total({ awarded: ron(2_250_000), records: 2, noValue: 1 }), signalCount: 1 }] },
          records: { count: 11, rows: [
            w.rConsortium, w.rConsortiumNameOnly, w.rFrameworkCeiling, w.rSubsequent, w.rSuspect, w.rNoValue,
            w.rNaturalPerson, w.rProvisional, w.rMismatch,
          ].map((record) => ({ record, matchedField: null, areaShare: null })) },
        },
      },
    },
  },
  {
    // #181: a Party-filtered search. The Total is direct + subordinate; the other three slices are what the filter leaves out (here 3 of 11 Records of the set have no Mandate)
    name: "party-psd",
    kind: "typical",
    description: "the Party filter on a list as registered: the Total is the Records of authorities led by it, direct and through subordinate bodies, and it states what the filter covers",
    variables: { filter: { party: "PARTIDUL SOCIAL DEMOCRAT" } },
    data: {
      sources,
      seap: {
        partyOptions,
        search: {
          filter: { qFolded: null, authority: null, supplier: null },
          total: searchTotal({ awarded: ron(30_000_000), records: 5 }, {
            party: "PARTIDUL SOCIAL DEMOCRAT",
            direct: { records: 3, awarded: ron(22_000_000) },
            subordinate: { records: 2, awarded: ron(8_000_000) },
            otherParties: { records: 2, awarded: ron(14_000_000) },
            independent: { records: 1, awarded: ron(1_000_000) },
            unattributed: { records: 3, awarded: ron(15_000_000) },
          }),
          map: moneyMap({ national: total({ awarded: ron(30_000_000), records: 5 }) }),
          goTo: null,
          facets: { procedure: procedureFacet },
          authorities: { count: 2, countEstimated: false, rows: [
            { entity: w.primariaBrasovRow, matched: total({ awarded: ron(22_000_000), records: 3 }), signalCount: 0 },
            { entity: w.spitalSibiuRow, matched: total({ awarded: ron(8_000_000), records: 2 }), signalCount: 0 },
          ] },
          suppliers: { count: 1, countEstimated: false, rows: [{ entity: w.constructiiRow, matched: total({ awarded: ron(30_000_000), records: 5 }), signalCount: 0 }] },
          records: { count: 5, rows: [w.rContract, w.rConsortium].map((record) => ({ record, matchedField: null, areaShare: null })) },
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
        partyOptions,
        search: {
          filter: { qFolded: null, authority: null, supplier: null },
          total: searchTotal({ awarded: ron(27_800_000), records: 2 }),
          map: moneyMap({ side: "SUPPLIER", counties: [{ area: "RO-CJ", name: "Cluj", entities: 1, total: total({ awarded: ron(27_800_000), records: 2 }) }] }),
          goTo: null,
          facets: { procedure: procedureFacet },
          authorities: { count: 2, countEstimated: false, rows: [
            { entity: w.drumuriNationaleRow, matched: total({ awarded: ron(15_000_000), records: 1 }), signalCount: 0 },
            { entity: w.primariaBrasovRow, matched: total({ awarded: ron(12_800_000), records: 1 }), signalCount: 0 },
          ] },
          suppliers: { count: 1, countEstimated: false, rows: [{ entity: w.constructiiRow, matched: total({ awarded: ron(27_800_000), records: 2 }), signalCount: 0 }] },
          records: { count: 2, rows: [
            { record: w.rConsortium, matchedField: null, areaShare: ron(15_000_000) },
            { record: w.rContract, matchedField: null, areaShare: null },
          ] },
        },
      },
    },
  },
  {
    name: "empty-no-match-county-dates",
    kind: "empty",
    description: "nothing matches inside a supplier-side county and a date chip: zero totals and empty tabs, so the empty state's Coverage link has a county and dates to keep",
    variables: { filter: { q: "zzzzzz", county: "RO-CJ", countySide: "SUPPLIER", from: "2023-01-01", to: "2023-12-31" } },
    data: {
      sources,
      seap: {
        partyOptions,
        search: {
          filter: { qFolded: "zzzzzz", authority: null, supplier: null },
          total: searchTotal(),
          map: moneyMap({ side: "SUPPLIER" }),
          goTo: null,
          facets: { procedure: [] },
          authorities: { count: 0, countEstimated: false, rows: [] },
          suppliers: { count: 0, countEstimated: false, rows: [] },
          records: { count: 0, rows: [] },
        },
      },
    },
  },
  {
    name: "county-dates-no-query",
    kind: "typical",
    description: "Cluj with a date chip and no query: what the Coverage lens link of the empty state lands on, so the screen behind the followed link has its answers",
    variables: { filter: { county: "RO-CJ", from: "2023-01-01", to: "2023-12-31" } },
    data: {
      sources,
      seap: {
        partyOptions,
        search: {
          filter: { qFolded: null, authority: null, supplier: null },
          total: searchTotal({ awarded: ron(15_000_000), records: 1 }),
          map: moneyMap({ counties: [{ area: "RO-CJ", name: "Cluj", entities: 1, total: total({ awarded: ron(15_000_000), records: 1 }) }] }),
          goTo: null,
          facets: { procedure: procedureFacet },
          authorities: { count: 1, countEstimated: false, rows: [{ entity: w.drumuriNationaleRow, matched: total({ awarded: ron(15_000_000), records: 1 }), signalCount: 0 }] },
          suppliers: { count: 1, countEstimated: false, rows: [{ entity: w.constructiiRow, matched: total({ awarded: ron(15_000_000), records: 1 }), signalCount: 0 }] },
          records: { count: 1, rows: [{ record: w.rConsortium, matchedField: null, areaShare: null }] },
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
        partyOptions,
        search: {
          filter: { qFolded: "ro", authority: null, supplier: null },
          total: searchTotal({ awarded: "9007199254740993000", records: 2_400_000, suspectLeftOut: 4_100, noValue: 88_000, estimated: true, frameworkCeilings: ron(900_000_000_000) }),
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

/** The zoomed-county answers a recorded run does not hold (a county with a date chip). */
export const zoomedCountyHand: FixtureSet<ZoomedCountyQuery, ZoomedCountyQueryVariables> = [
  {
    name: "county-dates-no-query",
    kind: "typical",
    description: "Cluj inside a date chip and no query, with no UAT money: the zoomed answer behind the empty state's Coverage link, so the followed link has every request answered",
    variables: { filter: { county: "RO-CJ", from: "2023-01-01", to: "2023-12-31" }, county: "RO-CJ" },
    data: {
      uats: [{ siruta: "990001", name: "Cluj-Napoca", county: { code: "RO-CJ", name: "Cluj" } }],
      seap: { search: { total: total({ awarded: ron(15_000_000), records: 1 }), uatMap: { uats: [], unknownUat: null } } },
    },
  },
];
