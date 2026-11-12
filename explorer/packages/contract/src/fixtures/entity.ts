import type {
  EntityOverviewQuery, EntityOverviewQueryVariables, EntityRecordsQuery, EntityRecordsQueryVariables,
  EntityRelationshipsQuery, EntityRelationshipsQueryVariables, EntityHeaderFieldsFragment, MoneyMapFieldsFragment,
} from "../generated/operations.ts";
import { moneyMap, ron, total, zeroTotal } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import * as w from "./world.ts";

type Role = "AUTHORITY" | "SUPPLIER";
const withSeap = <R>(header: EntityHeaderFieldsFragment, role: R) => ({ ...header, seap: { ...header.seap, role } });

const noFramework = { count: 0, ceilings: "0", subsequentReported: "0" };
const emptyOverview = (role: Role) => ({
  role, total: zeroTotal, counterparties: { count: 0, topShare: null, rows: [] }, directPurchaseShare: 0,
  procedures: [], consortia: [], frameworks: noFramework, largestRecords: [], signals: { count: 0, rows: [] },
});

export const entityOverview: FixtureSet<EntityOverviewQuery, EntityOverviewQueryVariables> = [
  {
    name: "supplier-typical", kind: "typical",
    description: "a supplier with Signals, a consortium, a framework line, aliases (one differing from ANAF) and a natural-person-free counterparty list",
    variables: { key: "30000001", role: "SUPPLIER", filter: {} },
    data: { entity: withSeap(w.hachiHeader, {
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
      signals: { count: 2, rows: [w.sSplitting, w.sOverCap] },
    }) },
  },
  {
    name: "supplier-signals-by-value", kind: "typical",
    description: "the Signals list ordered by RON (VALUE_DESC) and read from the first row: the over-cap Signal outranks the splitting one",
    variables: { key: "30000001", role: "SUPPLIER", filter: {}, signalOrder: "VALUE_DESC", signalOffset: 0 },
    data: { entity: withSeap(w.hachiHeader, {
      role: "SUPPLIER" as Role,
      total: total({ awarded: ron(3_400_000), records: 49 }),
      counterparties: { count: 1, topShare: 1, rows: [{ entity: w.primariaBrasov, naturalPerson: false, total: total({ awarded: ron(3_400_000), records: 49 }) }] },
      directPurchaseShare: 1,
      procedures: [{ value: "Achiziție directă", total: total({ awarded: ron(3_400_000), records: 49 }) }],
      consortia: [],
      frameworks: noFramework,
      largestRecords: [w.rDirect],
      signals: { count: 2, rows: [w.sOverCap, w.sSplitting] },
    }) },
  },
  {
    name: "authority-both-roles", kind: "typical",
    description: "an entity that buys and sells (roles has both), identity curated, with a framework and a framework-overrun Signal",
    variables: { key: "4000002", role: "AUTHORITY", filter: { from: "2021-01-01" } },
    data: { entity: withSeap(w.cnairHeader, {
      role: "AUTHORITY" as Role,
      total: total({ awarded: ron(9_000_000_000), records: 1_200, noValue: 14, frameworkCeilings: ron(100_000_000) }),
      counterparties: { count: 220, topShare: 0.12, rows: [
        { entity: w.drumarii, naturalPerson: false, total: total({ awarded: ron(1_080_000_000), records: 90 }) },
        { entity: w.constructii, naturalPerson: false, total: total({ awarded: ron(900_000_000), records: 41 }) },
      ] },
      directPurchaseShare: 0.03,
      procedures: [{ value: "Licitație deschisă", total: total({ awarded: ron(8_000_000_000), records: 300 }) }],
      consortia: [{ members: [w.constructii, w.drumarii].map((e) => ({ naturalPerson: false, publishedName: e.displayName, share: ron(15_000_000), entity: e })), total: total({ awarded: ron(30_000_000), records: 1 }) }],
      frameworks: { count: 4, ceilings: ron(100_000_000), subsequentReported: ron(112_400_000) },
      largestRecords: [w.rConsortium, w.rSubsequent],
      signals: { count: 1, rows: [w.sFrameworkOverrun] },
    }) },
  },
  {
    name: "name-only-supplier-no-publication", kind: "typical",
    description: "a name-only foreign supplier (identified by VAT id), one no-publication Signal, no CUI",
    variables: { key: "vat-DE811128135", role: "SUPPLIER" },
    data: { entity: withSeap(w.foreignFirmHeader, {
      role: "SUPPLIER" as Role,
      total: total({ awarded: ron(2_290_000), records: 3, noValue: 1 }),
      counterparties: { count: 1, topShare: 1, rows: [{ entity: w.spitalSibiu, naturalPerson: false, total: total({ awarded: ron(2_290_000), records: 3, noValue: 1 }) }] },
      directPurchaseShare: 0,
      procedures: [{ value: "Negociere fără publicare prealabilă", total: total({ awarded: "0", records: 1, noValue: 1 }) }],
      consortia: [],
      frameworks: noFramework,
      largestRecords: [w.rNoValue],
      signals: { count: 1, rows: [w.sNoPublication] },
    }) },
  },
  {
    name: "deregistered-supplier-extreme-concentration", kind: "extreme",
    description: "ANAF status RADIERE, a single counterparty with the whole total (topShare 1)",
    variables: { key: "30000003", role: "SUPPLIER" },
    data: { entity: withSeap(w.drumariiHeader, {
      role: "SUPPLIER" as Role,
      total: total({ awarded: ron(112_400_000), records: 13 }),
      counterparties: { count: 1, topShare: 1, rows: [{ entity: w.drumuriNationale, naturalPerson: false, total: total({ awarded: ron(112_400_000), records: 13 }) }] },
      directPurchaseShare: 0,
      procedures: [{ value: "Cu acord-cadru subsecvent", total: total({ awarded: ron(112_400_000), records: 12 }) }],
      consortia: [],
      frameworks: { count: 1, ceilings: ron(100_000_000), subsequentReported: ron(112_400_000) },
      largestRecords: [w.rSubsequent],
      signals: { count: 1, rows: [w.sFrameworkOverrun] },
    }) },
  },
  {
    name: "role-without-records-in-filter", kind: "empty",
    description: "the entity exists, but the side-panel filter matches none of its Records: zero totals, no counterparties, no Signals",
    variables: { key: "4000001", role: "AUTHORITY", filter: { from: "2019-01-01", to: "2019-12-31" } },
    data: { entity: withSeap(w.primariaBrasovHeader, emptyOverview("AUTHORITY")) },
  },
  {
    name: "unknown-key", kind: "empty", description: "no entity under that key: the page shows not-found",
    variables: { key: "name-does-not-exist", role: "SUPPLIER" },
    data: { entity: null },
  },
];

const facetsFull = {
  channel: [{ value: "DIRECT_PURCHASE", total: total({ awarded: ron(290_000), records: 2 }) }],
  procedure: [{ value: "Achiziție directă", total: total({ awarded: ron(290_000), records: 2 }) }],
  year: [{ value: "2024", total: total({ awarded: ron(290_000), records: 2 }) }],
  signal: [{ value: "SPLITTING", total: total({ awarded: ron(290_000), records: 2 }) }],
  badge: [],
  counterparty: [{ entity: w.hachi, matched: total({ awarded: ron(290_000), records: 2 }) }],
};
const noFacets = { channel: [], procedure: [], year: [], signal: [], badge: [], counterparty: [] };

export const entityRecords: FixtureSet<EntityRecordsQuery, EntityRecordsQueryVariables> = [
  {
    name: "signal-reproduction", kind: "typical",
    description: "the Records-tab filter a splitting Signal reproduces: authority + supplier + signal + CPV + dates; facets and a counterparty list",
    variables: {
      key: "4000001", role: "AUTHORITY", limit: 100, offset: 0, order: "DATE_DESC",
      filter: { signal: "SPLITTING", supplier: "30000001", cpv: "770", from: "2024-07-01", to: "2024-07-19" },
    },
    data: { entity: withSeap(w.primariaBrasovHeader, {
      role: "AUTHORITY" as Role,
      records: {
        total: total({ awarded: ron(290_000), records: 2 }),
        facets: facetsFull,
        records: { count: 2, rows: [w.rSplit2, w.rSplit1].map((record) => ({ record, matchedField: null })) },
      },
    }) },
  },
  {
    name: "record-states", kind: "typical",
    description: "supplier Records tab with a suspect value, a no-value Record, a consortium share, a framework ceiling and a natural-person winner",
    variables: { key: "30000003", role: "SUPPLIER", limit: 100, offset: 0, order: "VALUE_DESC", filter: { badges: ["SUSPECT_VALUE", "NO_VALUE"], channel: "CONTRACT", valueBucket: "UP_TO_1B" } },
    data: { entity: withSeap(w.drumariiHeader, {
      role: "SUPPLIER" as Role,
      records: {
        total: total({ awarded: ron(24_300_000), records: 5, suspectLeftOut: 1, noValue: 1, frameworkCeilings: ron(100_000_000) }),
        facets: { ...facetsFull, badge: [{ value: "SUSPECT_VALUE", total: total({ awarded: "0", records: 1, suspectLeftOut: 1 }) }, { value: "NO_VALUE", total: total({ awarded: "0", records: 1, noValue: 1 }) }] },
        records: { count: 5, rows: [w.rFrameworkCeiling, w.rConsortium, w.rSuspect, w.rNoValue, w.rNaturalPerson].map((record) => ({ record, matchedField: null })) },
      },
    }) },
  },
  {
    name: "no-matches", kind: "empty",
    description: "filters that match nothing: zero total, empty facets, no rows",
    variables: { key: "4000001", role: "AUTHORITY", limit: 100, offset: 0, filter: { q: "zzzzzz", hasSignals: true } },
    data: { entity: withSeap(w.primariaBrasovHeader, { role: "AUTHORITY" as Role, records: { total: zeroTotal, facets: noFacets, records: { count: 0, rows: [] } } }) },
  },
  {
    name: "unknown-key", kind: "empty", description: "no entity under that key",
    variables: { key: "0", role: "AUTHORITY", limit: 100, offset: 0, filter: {} },
    data: { entity: null },
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

export const entityRelationships: FixtureSet<EntityRelationshipsQuery, EntityRelationshipsQueryVariables> = [
  {
    name: "supplier-typical", kind: "typical",
    description: "radial graph rows (a natural person, a consortium partner, a Signal marker), a monthly timeline for one counterparty, and a Flow lens with National and Unplaced tiles",
    variables: { key: "30000001", role: "SUPPLIER", filter: {}, counterparty: "4000001" },
    data: { entity: withSeap(w.hachiHeader, {
      role: "SUPPLIER" as Role,
      counterparties: {
        count: 4, topShare: 0.7,
        rows: [
          { entity: w.primariaBrasov, naturalPerson: false, total: total({ awarded: ron(2_800_000), records: 40 }), viaDirectPurchase: total({ awarded: ron(2_000_000), records: 38 }), viaContract: total({ awarded: ron(800_000), records: 2 }), wonTogether: false, hasSignals: true },
          { entity: w.constructii, naturalPerson: false, total: total({ awarded: ron(500_000), records: 1 }), viaDirectPurchase: zeroTotal, viaContract: total({ awarded: ron(500_000), records: 1 }), wonTogether: true, hasSignals: false },
          { entity: null, naturalPerson: true, total: total({ awarded: ron(36_000), records: 1 }), viaDirectPurchase: total({ awarded: ron(36_000), records: 1 }), viaContract: zeroTotal, wonTogether: false, hasSignals: false },
        ],
      } satisfies RelCounterparties,
      timeline: [
        { month: "2024-01", total: total({ awarded: ron(300_000), records: 1 }) },
        { month: "2024-02", total: zeroTotal },
        { month: "2024-07", total: total({ awarded: ron(290_000), records: 2 }) },
      ],
      flow: flowOfSupplier,
    }) },
  },
  {
    name: "authority-flow-national", kind: "typical",
    description: "an authority's Flow lens: money going to supplier counties, with the unknown-supplier-county bucket",
    variables: { key: "4000002", role: "AUTHORITY" },
    data: { entity: withSeap(w.cnairHeader, {
      role: "AUTHORITY" as Role,
      counterparties: { count: 1, topShare: 1, rows: [{ entity: w.drumarii, naturalPerson: false, total: total({ awarded: ron(112_400_000), records: 13 }), viaDirectPurchase: zeroTotal, viaContract: total({ awarded: ron(112_400_000), records: 13 }), wonTogether: false, hasSignals: true }] },
      timeline: [{ month: "2024-03", total: total({ awarded: ron(9_300_000), records: 1 }) }],
      flow: moneyMap({
        side: "SUPPLIER",
        counties: [{ area: "RO-MS", name: "Mureș", entities: 1, total: total({ awarded: ron(112_400_000), records: 13 }) }],
        national: zeroTotal,
        unknownSupplierCounty: total({ awarded: ron(1_200_000), records: 2 }),
      }),
    }) },
  },
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
    name: "unknown-key", kind: "empty", description: "no entity under that key",
    variables: { key: "0", role: "SUPPLIER" },
    data: { entity: null },
  },
];
