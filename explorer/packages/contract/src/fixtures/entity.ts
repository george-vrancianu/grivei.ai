import type {
  EntityOverviewQuery, EntityOverviewQueryVariables, EntityRecordsQuery, EntityRecordsQueryVariables,
  EntityRelationshipsQuery, EntityRelationshipsQueryVariables, EntityHeaderFieldsFragment, MoneyMapFieldsFragment, SignalFieldsFragment,
} from "../generated/operations.ts";
import { entityHeader, entityRef, moneyMap, ron, total, zeroTotal } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import { recordedEntityRecords } from "./recorded/records.ts";
import * as w from "./world.ts";

type Role = "AUTHORITY" | "SUPPLIER";
type Row = { record: { code: string; channel: string; value?: string | null } };
const withSeap = <R>(header: EntityHeaderFieldsFragment, role: R) => ({ ...header, seap: { ...header.seap, role } });
/** The EntityOverview's entity: the header, the SEAP role, the ONRC section (`onrc`, null when ONRC lists no registration) and the AMEPIP mark (`publicEnterprise`, #183: null here, the recorded cases carry the listed ones). */
const withOverview = <R>(header: EntityHeaderFieldsFragment, role: R) => ({ ...withSeap(header, role), onrc: null, publicEnterprise: null });

/** An Overview Signal as the query reads it: the Signal and its first Record (for the card's "Check in SEAP"). */
const overviewSignal = (s: SignalFieldsFragment) => ({ ...s, records: [{ code: "DA12345678", provenance: { url: "/source/seap/DA12345678" } }] });

const noFramework = { count: 0, ceilings: "0", subsequentReported: "0" };
const emptyOverview = (role: Role) => ({
  role, total: zeroTotal, counterparties: { count: 0, topShare: null, rows: [] }, directPurchaseShare: 0,
  procedures: [], consortia: [], frameworks: noFramework, largestRecords: [], signals: { count: 0, rows: [] },
});

/**
 * The EntityOverview states a small recorded archive cannot cheaply produce (the rest are recorded: `recorded/EntityOverview.json`):
 * 220 counterparties ("and N more"), eight spellings of one name, an ANAF status of RADIERE, a curated identity with a framework and
 * a framework-overrun Signal, asked with a date filter.
 * `supplier-typical` stays until #87 and #88 record the Records and Relationships tabs: it is the one entity (30000001) whose three
 * tabs all exist as fixtures, so the tab-navigation tests (Overview -> Records) walk it.
 */
export const entityOverviewHand: FixtureSet<EntityOverviewQuery, EntityOverviewQueryVariables> = [
  {
    name: "supplier-typical", kind: "typical",
    description: "a supplier with Signals, a consortium, a framework line, aliases (one differing from ANAF) and a natural-person-free counterparty list",
    variables: { key: "30000001", role: "SUPPLIER", filter: {} },
    data: { entity: withOverview(w.hachiHeader, {
      role: "SUPPLIER" as Role,
      total: total({ awarded: ron(3_400_000), records: 49, suspectLeftOut: 1, noValue: 2 }),
      counterparties: { count: 3, topShare: 0.82, rows: [
        { entity: w.primariaBrasov, naturalPerson: false, total: total({ awarded: ron(2_800_000), records: 40 }) },
        { entity: w.spitalSibiu, naturalPerson: false, total: total({ awarded: ron(600_000), records: 9 }) },
      ] },
      directPurchaseShare: 0.64,
      procedures: [
        { value: "Achiziție directă", total: total({ awarded: ron(2_176_000), records: 41 }) },
        { value: "Licitație deschisă", total: total({ awarded: ron(1_224_000), records: 8 }) },
      ],
      consortia: [{ members: [w.hachi, w.constructii].map((e) => ({ naturalPerson: false, publishedName: e.displayName, share: ron(500_000), entity: e })), total: total({ awarded: ron(500_000), records: 1 }) }],
      frameworks: noFramework,
      largestRecords: [w.rDirect, w.rSplit2],
      signals: { count: 2, rows: [overviewSignal(w.sSplitting), overviewSignal(w.sOverCap)] },
    }) },
  },
  {
    name: "authority-both-roles", kind: "typical",
    description: "an entity that buys and sells (roles has both), identity curated, with a framework and a framework-overrun Signal",
    variables: { key: "4000002", role: "AUTHORITY", filter: { from: "2021-01-01" } },
    data: { entity: withOverview(w.cnairHeader, {
      role: "AUTHORITY" as Role,
      total: total({ awarded: ron(9_000_000_000), records: 1_200, noValue: 14, frameworkCeilings: ron(100_000_000) }),
      counterparties: { count: 220, topShare: 0.12, rows: [
        { entity: w.drumarii, naturalPerson: false, total: total({ awarded: ron(1_080_000_000), records: 90 }) },
        { entity: w.constructii, naturalPerson: false, total: total({ awarded: ron(900_000_000), records: 41 }) },
      ] },
      directPurchaseShare: 0.03,
      procedures: [{ value: "Licitație deschisă", total: total({ awarded: ron(8_617_600_000), records: 300 }) }],
      consortia: [{ members: [w.constructii, w.drumarii].map((e) => ({ naturalPerson: false, publishedName: e.displayName, share: ron(15_000_000), entity: e })), total: total({ awarded: ron(30_000_000), records: 1 }) }],
      frameworks: { count: 4, ceilings: ron(100_000_000), subsequentReported: ron(112_400_000) },
      largestRecords: [w.rConsortium, w.rSubsequent],
      signals: { count: 1, rows: [overviewSignal(w.sFrameworkOverrun)] },
    }) },
  },
  {
    name: "deregistered-supplier-extreme-concentration", kind: "extreme",
    description: "ANAF status RADIERE, a single counterparty with the whole total (topShare 1)",
    variables: { key: "30000003", role: "SUPPLIER" },
    data: { entity: withOverview(w.drumariiHeader, {
      role: "SUPPLIER" as Role,
      total: total({ awarded: ron(112_400_000), records: 13 }),
      counterparties: { count: 1, topShare: 1, rows: [{ entity: w.drumuriNationale, naturalPerson: false, total: total({ awarded: ron(112_400_000), records: 13 }) }] },
      directPurchaseShare: 0,
      procedures: [{ value: "Cu acord-cadru subsecvent", total: total({ awarded: ron(112_400_000), records: 12 }) }],
      consortia: [],
      frameworks: { count: 1, ceilings: ron(100_000_000), subsequentReported: ron(112_400_000) },
      largestRecords: [w.rSubsequent],
      signals: { count: 1, rows: [overviewSignal(w.sFrameworkOverrun)] },
    }) },
  },
  {
    name: "supplier-many-aliases", kind: "extreme",
    description: "a supplier SEAP spells eight ways (five differ from ANAF's name), no Signals",
    variables: { key: "30000002", role: "SUPPLIER", filter: {} },
    data: { entity: withOverview(w.constructiiHeader, {
      ...emptyOverview("SUPPLIER"),
      total: total({ awarded: ron(14_200_000), records: 98 }),
      counterparties: { count: 2, topShare: 0.9, rows: [
        { entity: w.primariaBrasov, naturalPerson: false, total: total({ awarded: ron(12_800_000), records: 1 }) },
        { entity: w.drumuriNationale, naturalPerson: false, total: total({ awarded: ron(1_400_000), records: 97 }) },
      ] },
      directPurchaseShare: 0.1,
      procedures: [
        { value: "Licitație deschisă", total: total({ awarded: ron(12_800_000), records: 1 }) },
        { value: "Achiziție directă", total: total({ awarded: ron(1_400_000), records: 97 }) },
      ],
      largestRecords: [w.rContract, w.rProvisional],
    }) },
  },
  {
    name: "authority-many-counterparties", kind: "extreme",
    description: "an authority with 220 counterparties (the first rows sent, a natural person among them), a consortium, a framework line and suspect and ceiling Records left out of the largest list",
    variables: { key: "4000002", role: "AUTHORITY", filter: {} },
    data: { entity: withOverview(w.cnairHeader, {
      role: "AUTHORITY" as Role,
      total: total({ awarded: ron(9_000_000_000), records: 1_200, suspectLeftOut: 2, noValue: 14, frameworkCeilings: ron(100_000_000) }),
      counterparties: { count: 220, topShare: 0.12, rows: [
        { entity: w.drumarii, naturalPerson: false, total: total({ awarded: ron(1_080_000_000), records: 90 }) },
        { entity: w.constructii, naturalPerson: false, total: total({ awarded: ron(900_000_000), records: 41 }) },
        { entity: w.foreignFirm, naturalPerson: false, total: total({ awarded: ron(450_000_000), records: 12 }) },
        { entity: null, naturalPerson: true, total: total({ awarded: ron(36_000), records: 1 }) },
      ] },
      directPurchaseShare: 0.03,
      procedures: [
        { value: "Licitație deschisă", total: total({ awarded: ron(8_617_600_000), records: 300 }) },
        { value: "Cu acord-cadru subsecvent", total: total({ awarded: ron(112_400_000), records: 12 }) },
        { value: "Achiziție directă", total: total({ awarded: ron(270_000_000), records: 888 }) },
      ],
      consortia: [{ members: [w.constructii, w.drumarii].map((e) => ({ naturalPerson: false, publishedName: e.displayName, share: ron(15_000_000), entity: e })), total: total({ awarded: ron(30_000_000), records: 1 }) }],
      frameworks: { count: 4, ceilings: ron(100_000_000), subsequentReported: ron(112_400_000) },
      largestRecords: [w.rConsortium, w.rSubsequent, w.rDirect],
      signals: { count: 3, rows: [overviewSignal(w.sFrameworkOverrun)] },
    }) },
  },
];

const facetsOfSupplier = {
  channel: [{ value: "DIRECT_PURCHASE", total: total({ awarded: ron(590_000), records: 3 }) }],
  procedure: [{ value: "Achiziție directă", total: total({ awarded: ron(590_000), records: 3 }) }],
  year: [{ value: "2024", total: total({ awarded: ron(590_000), records: 3 }) }],
  signal: [
    { value: "SPLITTING", total: total({ awarded: ron(290_000), records: 2 }) },
    { value: "OVER_CAP", total: total({ awarded: ron(300_000), records: 1 }) },
  ],
  badge: [],
  counterparty: [{ entity: w.primariaBrasov, matched: total({ awarded: ron(590_000), records: 3 }) }],
};
const facetsOfAuthority = {
  channel: [
    { value: "DIRECT_PURCHASE", total: total({ awarded: ron(693_400), records: 5 }) },
    { value: "CONTRACT", total: total({ awarded: ron(12_800_000), records: 1 }) },
  ],
  procedure: [
    { value: "Achiziție directă", total: total({ awarded: ron(693_400), records: 5 }) },
    { value: "Licitație deschisă", total: total({ awarded: ron(12_800_000), records: 1 }) },
  ],
  year: [
    { value: "2024", total: total({ awarded: ron(598_400), records: 4 }) },
    { value: "2023", total: total({ awarded: ron(12_895_000), records: 2 }) },
  ],
  signal: [
    { value: "SPLITTING", total: total({ awarded: ron(290_000), records: 2 }) },
    { value: "OVER_CAP", total: total({ awarded: ron(300_000), records: 1 }) },
  ],
  badge: [
    { value: "CUI_MISMATCH", total: total({ awarded: ron(95_000), records: 1 }) },
    { value: "NAME_DIFFERS_FROM_ANAF", total: total({ awarded: ron(95_000), records: 1 }) },
  ],
  counterparty: [
    { entity: w.hachi, matched: total({ awarded: ron(598_400), records: 4 }) },
    { entity: w.constructii, matched: total({ awarded: ron(12_800_000), records: 1 }) },
  ],
};
const rowsOf = (...records: (typeof w.rDirect)[]) => ({ count: records.length, rows: records.map((record) => ({ record, matchedField: null, areaShare: null })) });

/**
 * The recorded unfiltered Records of an entity narrowed to `rows`, as the answer to `filter` (#106's "only Records matching ...": the search an
 * entity link carries, applied as the Records tab's filter). Test data: the rows are recorded ones and the total follows them (their count and
 * values); the facets stay the unfiltered ones. A text query cannot be evaluated here, so its fixtures take the first `n` rows as placeholders.
 */
function narrowed(key: string, role: Role, filter: EntityRecordsQueryVariables["filter"], rows: number | ((row: Row) => boolean), name: string, description: string): FixtureSet<EntityRecordsQuery, EntityRecordsQueryVariables>[number] {
  const full = recordedEntityRecords.find((f) => f.variables.key === key && f.variables.role === role && Object.keys(f.variables.filter ?? {}).length === 0 && !f.variables.order)!;
  const records = full.data.entity!.seap.role!.records!;
  const picked = typeof rows === "number" ? records.records.rows.slice(0, rows) : records.records.rows.filter(rows);
  const n = picked.length;
  const awarded = picked.reduce((sum, r) => sum + BigInt(r.record.value ?? 0), 0n).toString();
  return {
    name, kind: "typical", description,
    variables: { key, role, limit: 100, offset: 0, filter },
    data: { entity: { ...full.data.entity!, seap: { ...full.data.entity!.seap, role: { ...full.data.entity!.seap.role!, records: { ...records, total: total({ awarded, records: n }), records: { count: n, rows: picked } } } } } },
  } as FixtureSet<EntityRecordsQuery, EntityRecordsQueryVariables>[number];
}

/**
 * The EntityRecords states a small recorded archive cannot cheaply produce (the rest are recorded: `recorded/EntityRecords.json`,
 * `recorded/signals/EntityRecords.json` for every Signal's reproducing filter): an estimated total (> 65,000 Records) and its second page (offset 100). The
 * three counterparty-picked ones belong to the Relationships tab's side panel (#88 records them).
 */
export const entityRecordsHand: FixtureSet<EntityRecordsQuery, EntityRecordsQueryVariables> = [
  narrowed("2000007", "SUPPLIER", { q: "comuna" }, 3, "supplier-carried-query", "a supplier's Records tab narrowed to the search an entity link carried: a text query only (#106)"),
  narrowed("2000007", "SUPPLIER", { q: "comuna", channel: "DIRECT_PURCHASE" }, (r) => ["DA96000005", "DA96000001"].includes(r.record.code), "supplier-carried-query-and-chip", "a supplier's Records tab narrowed to a carried text query and a channel chip (#106)"),
  narrowed("2000007", "SUPPLIER", { channel: "DIRECT_PURCHASE" }, (r) => r.record.channel === "DIRECT_PURCHASE", "supplier-carried-chip", "a supplier's Records tab narrowed to a carried channel chip, no query (#106)"),
  {
    name: "authority-one-supplier", kind: "typical",
    description: "an authority's Records tab with one supplier chosen from the counterparty facet (RecordFilter.supplier)",
    variables: { key: "4000001", role: "AUTHORITY", limit: 100, offset: 0, filter: { supplier: "30000001" } },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role,
      records: {
        total: total({ awarded: ron(598_400), records: 4 }),
        facets: { ...facetsOfAuthority, channel: [facetsOfAuthority.channel[0]!], procedure: [facetsOfAuthority.procedure[0]!], counterparty: [facetsOfAuthority.counterparty[0]!] },
        records: rowsOf(w.rDirect, w.rSplit1, w.rSplit2, w.rDirectSmall),
      },
    }) },
  },
  {
    name: "authority-text-search", kind: "typical",
    description: "an authority's Records tab with a text search (RecordFilter.q): the row says which field matched and where (matchedField)",
    variables: { key: "4000001", role: "AUTHORITY", limit: 100, offset: 0, filter: { q: "deszăpezire" } },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role,
      records: {
        total: total({ awarded: ron(300_000), records: 1 }),
        facets: { ...facetsOfAuthority, channel: [facetsOfAuthority.channel[0]!], procedure: [facetsOfAuthority.procedure[0]!], counterparty: [facetsOfAuthority.counterparty[0]!] },
        records: { count: 1, rows: [{ record: w.rDirect, matchedField: { field: "TITLE", text: "Deszăpezire străzi, sezon rece 2023-2024", highlights: [[0, 11]] }, areaShare: null }] },
      },
    }) },
  },
  {
    name: "authority-estimated-total", kind: "extreme",
    description: "an authority with a huge Records set: the total and the count are estimates (≈), on page 1 of many",
    variables: { key: "4000001", role: "AUTHORITY", limit: 100, offset: 0, filter: { to: "2030-12-31" } },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role,
      records: {
        total: total({ awarded: ron(8_400_000_000), records: 1_240_000, suspectLeftOut: 12, noValue: 3_100, estimated: true }),
        facets: {
          ...facetsOfAuthority,
          channel: facetsOfAuthority.channel.map((f) => ({ ...f, total: { ...f.total, estimated: true } })),
        },
        records: { count: 1_240_000, rows: [w.rContract, w.rDirect, w.rSplit1].map((record) => ({ record, matchedField: null, areaShare: null })) },
      },
    }) },
  },
  {
    name: "authority-estimated-total-page-2", kind: "extreme",
    description: "an authority with a huge Records set: the total and the count are estimates (≈), on page 2 of many (offset 100)",
    variables: { key: "4000001", role: "AUTHORITY", limit: 100, offset: 100, filter: { to: "2030-12-31" } },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role,
      records: {
        total: total({ awarded: ron(8_400_000_000), records: 1_240_000, suspectLeftOut: 12, noValue: 3_100, estimated: true }),
        facets: {
          ...facetsOfAuthority,
          channel: facetsOfAuthority.channel.map((f) => ({ ...f, total: { ...f.total, estimated: true } })),
        },
        records: { count: 1_240_000, rows: [w.rContract, w.rDirect, w.rSplit1].map((record) => ({ record, matchedField: null, areaShare: null })) },
      },
    }) },
  },
  {
    name: "supplier-one-authority", kind: "typical",
    description: "a supplier's Records with one authority picked in the Relationships tab's graph (RecordFilter.authority): the side panel's list",
    variables: { key: "30000001", role: "SUPPLIER", limit: 100, offset: 0, filter: { authority: "4000001" } },
    data: { entity: withSeap(w.hachiHeader, {
      role: "SUPPLIER" as Role,
      records: {
        total: total({ awarded: ron(598_400), records: 4 }),
        facets: { ...facetsOfSupplier, counterparty: [{ entity: w.primariaBrasov, matched: total({ awarded: ron(598_400), records: 4 }) }] },
        records: rowsOf(w.rDirect, w.rSplit1, w.rSplit2, w.rDirectSmall),
      },
    }) },
  },
  {
    name: "authority-one-supplier-contract", kind: "typical",
    description: "an authority's Records with a contract supplier picked in the Relationships tab's graph (RecordFilter.supplier)",
    variables: { key: "4000001", role: "AUTHORITY", limit: 100, offset: 0, filter: { supplier: "30000002" } },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role,
      records: {
        total: total({ awarded: ron(12_800_000), records: 1 }),
        facets: { ...facetsOfAuthority, channel: [facetsOfAuthority.channel[1]!], procedure: [facetsOfAuthority.procedure[1]!], counterparty: [facetsOfAuthority.counterparty[1]!] },
        records: rowsOf(w.rContract),
      },
    }) },
  },
];

type RelCounterparties = NonNullable<NonNullable<NonNullable<EntityRelationshipsQuery["entity"]>["seap"]["role"]>["counterparties"]>;
// A supplier's Flow lens is drawn on the authority side: where in Romania its money comes from.
const flowOfSupplier: MoneyMapFieldsFragment = moneyMap({
  side: "AUTHORITY",
  counties: [
    { area: "RO-BV", name: "Brașov", entities: 1, total: total({ awarded: ron(2_800_000), records: 40 }) },
    { area: "RO-SB", name: "Sibiu", entities: 1, total: total({ awarded: ron(600_000), records: 9 }) },
  ],
  national: total({ awarded: ron(300_000), records: 4 }),
  unplaced: { authorities: 1, total: total({ awarded: ron(36_000), records: 1 }) },
});

const relRow = (
  entity: typeof w.hachi, direct: number, directRecords: number, contract: number, contractRecords: number,
  o: { wonTogether?: boolean; hasSignals?: boolean } = {},
): RelCounterparties["rows"][number] => ({
  entity, naturalPerson: false,
  total: total({ awarded: ron(direct + contract), records: directRecords + contractRecords }),
  viaDirectPurchase: direct === 0 ? zeroTotal : total({ awarded: ron(direct), records: directRecords }),
  viaContract: contract === 0 ? zeroTotal : total({ awarded: ron(contract), records: contractRecords }),
  wonTogether: o.wonTogether ?? false, hasSignals: o.hasSignals ?? false,
});
// Invented authorities for the consortium-heavy supplier's graph (a supplier's counterparties are authorities).
const authorityClujNapoca = entityRef("4000011", "MUNICIPIUL CLUJ-NAPOCA");
const authorityJudetSibiu = entityRef("4000012", "CONSILIUL JUDEȚEAN SIBIU");
const authoritySinaia = entityRef("4000013", "ORAȘUL SINAIA");
const authorityBragadiru = entityRef("4000014", "COMUNA BRAGADIRU");
const authorityScoala = entityRef("4000015", "ȘCOALA GIMNAZIALĂ NR. 1 TÂRGU MUREȘ");
const consortiumPartner3 = entityRef("30000013", "GEOTEHNICA PROIECT S.A.");
const electro = entityRef("30000010", "ELECTRO SERV S.R.L.");
const verde = entityRef("30000015", "VERDE URBAN S.R.L.");
const typicalCounterparties: RelCounterparties = {
  count: 13, topShare: 0.81,
  rows: [
    relRow(w.constructii, 0, 0, 12_800_000, 1),
    relRow(w.drumarii, 300_000, 3, 3_100_000, 2, { hasSignals: true }),
    relRow(w.hachi, 598_400, 4, 0, 0, { hasSignals: true }),
    relRow(electro, 410_000, 6, 0, 0),
    relRow(verde, 120_000, 2, 100_000, 1),
    relRow(consortiumPartner3, 0, 0, 64_000, 1),
    { ...relRow(w.hachi, 36_000, 1, 0, 0), entity: null, naturalPerson: true },
    // The unidentified group: money no Entity could be linked to. It is not a natural person.
    { ...relRow(w.hachi, 24_000, 1, 0, 0), entity: null },
  ],
};
// The overall months: every shown row's money in its months, plus the five counterparties not shown (about 19% of the money, topShare 0.81).
const monthly = (rows: [string, number, number][]) =>
  rows.map(([month, amount, records]) => ({ month, total: amount === 0 ? zeroTotal : total({ awarded: ron(amount), records }) }));
const typicalTimeline = monthly([
  ["2023-07", 95_000, 1], ["2023-09", 300_000, 3], ["2023-10", 410_000, 6], ["2023-11", 12_800_000, 1], ["2023-12", 120_000, 2],
  ["2024-01", 300_000, 1], ["2024-02", 2_008_400, 3], ["2024-03", 3_100_000, 2], ["2024-04", 124_000, 2], ["2024-05", 64_000, 1],
  ["2024-06", 2_058_600, 4], ["2024-07", 290_000, 2],
]);

export const entityRelationships: FixtureSet<EntityRelationshipsQuery, EntityRelationshipsQueryVariables> = [
  {
    name: "no-relationships", kind: "empty",
    description: "no counterparties in the filter: empty graph, empty timeline, empty Flow lens",
    variables: { key: "4000001", role: "AUTHORITY", filter: { from: "2019-01-01", to: "2019-12-31" } },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role,
      counterparties: { count: 0, topShare: null, rows: [] }, timeline: [], flow: moneyMap({ side: "SUPPLIER" }),
    }) },
  },
  {
    name: "authority-typical-view", kind: "typical",
    description: "an authority's Relationships tab: eight top counterparties of thirteen (contract, direct purchase and mixed, a Signal ring, a natural person, an unidentified group), a monthly timeline",
    variables: { key: "4000001", role: "AUTHORITY", filter: {} },
    data: { entity: withSeap(w.primariaBrasovHeader, { role: "AUTHORITY" as Role, counterparties: typicalCounterparties, timeline: typicalTimeline, flow: moneyMap({ side: "SUPPLIER" }) }) },
  },
  {
    name: "authority-typical-picked", kind: "typical",
    description: "the same tab with the contract supplier picked: the timeline is that supplier's own months",
    variables: { key: "4000001", role: "AUTHORITY", filter: {}, counterparty: "30000002" },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role, counterparties: typicalCounterparties,
      timeline: [{ month: "2023-11", total: total({ awarded: ron(12_800_000), records: 1 }) }],
      flow: moneyMap({ side: "SUPPLIER" }),
    }) },
  },
  {
    name: "authority-typical-picked-direct", kind: "typical",
    description: "the same tab with the direct-purchase supplier picked: its months (a part of 2024-01, 2024-02 and 2024-07 of the overall timeline)",
    variables: { key: "4000001", role: "AUTHORITY", filter: {}, counterparty: "30000001" },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role, counterparties: typicalCounterparties,
      timeline: monthly([["2024-01", 300_000, 1], ["2024-02", 8_400, 1], ["2024-07", 290_000, 2]]),
      flow: moneyMap({ side: "SUPPLIER" }),
    }) },
  },
  {
    name: "supplier-picked-authority", kind: "typical",
    description: "a supplier's Relationships tab with its largest authority picked: that authority's months only",
    variables: { key: "30000001", role: "SUPPLIER", filter: {}, counterparty: "4000001" },
    data: { entity: withSeap(w.hachiHeader, {
      role: "SUPPLIER" as Role,
      counterparties: { count: 1, topShare: 1, rows: [relRow(w.primariaBrasov, 598_400, 4, 0, 0, { hasSignals: true })] },
      timeline: [
        { month: "2024-01", total: total({ awarded: ron(300_000), records: 1 }) },
        { month: "2024-02", total: total({ awarded: ron(8_400), records: 1 }) },
        { month: "2024-07", total: total({ awarded: ron(290_000), records: 2 }) },
      ],
      flow: flowOfSupplier,
    }) },
  },
  {
    name: "authority-one-counterparty", kind: "extreme",
    description: "an authority with a single counterparty: a graph of one node",
    variables: { key: "4000003", role: "AUTHORITY", filter: {} },
    data: { entity: withSeap(entityHeader(w.spitalSibiuRow, { seap: { roles: ["AUTHORITY"] } }), {
      role: "AUTHORITY" as Role,
      counterparties: { count: 1, topShare: 1, rows: [relRow(w.constructii, 0, 0, 650_000, 1)] },
      timeline: [{ month: "2024-11", total: total({ awarded: ron(650_000), records: 1 }) }],
      flow: moneyMap({ side: "SUPPLIER" }),
    }) },
  },
  {
    name: "supplier-consortium-heavy", kind: "extreme",
    description: "a supplier that mostly wins in consortia: eight authorities, six of them with Records that had several winners (wonTogether); its co-winners are the Overview's consortia, not nodes here",
    variables: { key: "30000002", role: "SUPPLIER", filter: {} },
    data: { entity: withSeap(entityHeader(w.constructiiRow, { seap: { roles: ["SUPPLIER"] } }), {
      role: "SUPPLIER" as Role,
      counterparties: {
        count: 8, topShare: 1,
        rows: [
          relRow(w.drumuriNationale, 0, 0, 15_000_000, 1, { hasSignals: true, wonTogether: true }),
          relRow(w.primariaBrasov, 0, 0, 12_800_000, 1, { wonTogether: true }),
          relRow(authorityClujNapoca, 0, 0, 9_000_000, 2, { wonTogether: true }),
          relRow(authorityJudetSibiu, 0, 0, 6_500_000, 2, { wonTogether: true }),
          relRow(authoritySinaia, 0, 0, 4_200_000, 1, { wonTogether: true }),
          relRow(authorityScoala, 0, 0, 2_250_000, 1),
          relRow(authorityBragadiru, 0, 0, 1_100_000, 1, { wonTogether: true }),
          relRow(w.spitalSibiu, 0, 0, 650_000, 1),
        ],
      } satisfies RelCounterparties,
      timeline: monthly([
        ["2023-11", 12_800_000, 1], ["2024-02", 3_350_000, 2], ["2024-05", 24_000_000, 3], ["2024-08", 10_700_000, 3], ["2024-11", 650_000, 1],
      ]),
      flow: moneyMap({ side: "AUTHORITY", counties: [
        { area: "RO-BV", name: "Brașov", entities: 1, total: total({ awarded: ron(12_800_000), records: 1 }) },
        { area: "RO-CJ", name: "Cluj", entities: 1, total: total({ awarded: ron(9_000_000), records: 2 }) },
        { area: "RO-SB", name: "Sibiu", entities: 2, total: total({ awarded: ron(7_150_000), records: 3 }) },
        { area: "RO-PH", name: "Prahova", entities: 1, total: total({ awarded: ron(4_200_000), records: 1 }) },
        { area: "RO-MS", name: "Mureș", entities: 1, total: total({ awarded: ron(2_250_000), records: 1 }) },
        { area: "RO-IF", name: "Ilfov", entities: 1, total: total({ awarded: ron(1_100_000), records: 1 }) },
      ], national: total({ awarded: ron(15_000_000), records: 1 }) }),
    }) },
  },
  {
    name: "authority-natural-person-only", kind: "extreme",
    description: "an authority whose only counterparty is a natural person: no name, no link, nothing to pick",
    variables: { key: "4000004", role: "AUTHORITY", filter: {} },
    data: { entity: withSeap(entityHeader(w.primariaFaraUatRow, { seap: { roles: ["AUTHORITY"] } }), {
      role: "AUTHORITY" as Role,
      counterparties: { count: 1, topShare: 1, rows: [{ ...relRow(w.hachi, 36_000, 1, 0, 0), entity: null, naturalPerson: true }] },
      timeline: [{ month: "2024-06", total: total({ awarded: ron(36_000), records: 1 }) }],
      flow: moneyMap({ side: "SUPPLIER" }),
    }) },
  },
  {
    name: "unknown-key", kind: "empty", description: "no entity under that key",
    variables: { key: "0", role: "SUPPLIER" },
    data: { entity: null },
  },
];
