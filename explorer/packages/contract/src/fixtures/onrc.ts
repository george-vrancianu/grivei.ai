// Hand-written fixtures of ONRC's persisted operations (#176). Every name, CUI and registration number is invented. Seam 1 asserts the API's real answers
// beside them; the ONRC screens (#178) are built against these.
import type { OnrcCountQuery, OnrcCountQueryVariables, OnrcCoverageQuery, OnrcCoverageQueryVariables, OnrcRecordQuery, OnrcRecordQueryVariables, OnrcSearchQuery, OnrcSearchQueryVariables } from "../generated/operations.ts";
import { entityRef } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import * as w from "./world.ts";

type Result = OnrcSearchQuery["onrc"]["search"]["organisations"]["rows"][number];
const result = (o: Partial<Result> & Pick<Result, "registrationNumber" | "name">): Result => ({
  cui: null, legalForm: "SRL", registrationDate: "2015-03-10", seat: { county: "Cluj", locality: "Cluj-Napoca" }, statuses: [{ code: 1048, name: "funcțiune" }],
  caen: [{ code: "4211", version: 2 }], seapCounterparty: false, entity: null, matched: [], ...o,
});

const alfa = result({
  registrationNumber: "J40/1001/2015", name: "ALFA ONRC SRL", cui: "3100020", seapCounterparty: true, entity: entityRef("3100020", "ALFA ONRC SRL"),
  statuses: [{ code: 1048, name: "funcțiune" }, { code: 1107, name: "insolvență" }], caen: [{ code: "4120", version: 2 }, { code: "4211", version: 2 }],
  matched: [{ field: "NAME", text: "ALFA ONRC SRL", highlights: [[0, 4]] }],
});
const beta = result({
  registrationNumber: "J40/1002/2012", name: "BETA NOU SRL", cui: "3100039", seapCounterparty: true, entity: entityRef("3100039", "BETA ONRC SRL"),
  seat: { county: "Bucureşti", locality: "Bucureşti Sectorul 3" }, caen: [{ code: "4321", version: 2 }],
  matched: [{ field: "ALIAS", text: "BETA VECHI SRL", highlights: [[5, 10]] }],
});
const omega = result({ registrationNumber: "J12/1007/2020", name: "OMEGA ONLY SRL", cui: "3100071", registrationDate: "2020-06-03", caen: [{ code: "6201", version: 2 }], entity: entityRef("3100071", "OMEGA ONLY SRL") });
const zeta = result({
  registrationNumber: "J99/1008/2021", name: "ZETA FARA JUDET SRL", cui: "3100080", registrationDate: "2021-01-11", seat: { county: null, locality: null },
  statuses: [{ code: 1048, name: "funcțiune" }, { code: 2110, name: "bilanțul anual nedepus la registrul comerțului" }], caen: [], entity: entityRef("3100080", "ZETA FARA JUDET SRL"),
});
const legacy = result({ registrationNumber: "J40/1010/2017", name: "FIRMA FARA DATA SRL", registrationDate: null, caen: [] });

export const onrcSearchHand: FixtureSet<OnrcSearchQuery, OnrcSearchQueryVariables> = [
  {
    name: "typical-name-and-alias-hits", kind: "typical",
    description: "a text query: a hit on the registered name and a hit on an earlier name (an alias), the count lens with a county, and the Unplaced tile",
    variables: { filter: { q: "alfa beta" }, limit: 50, offset: 0 },
    data: {
      onrc: {
        search: {
          filter: { qFolded: "alfa beta" }, count: 2, defaultTab: "ORGANISATIONS",
          organisations: { count: 2, rows: [alfa, beta] },
          map: { counties: [{ area: "RO-B", name: "București", registrations: 1 }, { area: "RO-CJ", name: "Cluj", registrations: 1 }], unplacedRegistrations: 0 },
        },
      },
    },
  },
  {
    name: "typical-filters-unplaced-and-undated", kind: "typical",
    description: "no text, every chip set (status, CAEN prefix, a dated range, not a SEAP counterparty): the results are newest first, an undated registration last, a registration with no county in the Unplaced tile",
    variables: { filter: { status: [1048], caen: "62", county: "UNPLACED", registeredFrom: "2020-01-01", registeredTo: "2026-12-31", seapCounterparty: false }, limit: 50, offset: 0 },
    data: {
      onrc: {
        search: {
          filter: { qFolded: null }, count: 3, defaultTab: "ORGANISATIONS",
          organisations: { count: 3, rows: [zeta, omega, legacy] },
          map: { counties: [{ area: "RO-CJ", name: "Cluj", registrations: 1 }], unplacedRegistrations: 2 },
        },
      },
    },
  },
  {
    name: "empty-nothing-matches", kind: "empty",
    description: "a query nothing matches: no count, no rows, an empty count lens",
    variables: { filter: { q: "inexistent" }, limit: 50, offset: 0 },
    data: { onrc: { search: { filter: { qFolded: "inexistent" }, count: 0, defaultTab: "ORGANISATIONS", organisations: { count: 0, rows: [] }, map: { counties: [], unplacedRegistrations: 0 } } } },
  },
];

const record = {
  registrationNumber: "J40/1001/2015", registrationDate: "2015-03-10", legalForm: "SRL", name: "ALFA ONRC SRL", cui: "3100020", entity: entityRef("3100020", "ALFA ONRC SRL"),
  statuses: [
    { code: 1048, name: "funcțiune", firstSeen: "2025-03-18", sinceAtLeast: true },
    { code: 1107, name: "insolvență", firstSeen: "2026-04-03", sinceAtLeast: false },
  ],
  caen: [{ code: "4120", version: 2 }, { code: "4211", version: 2 }],
  seat: { county: "Cluj", locality: "Cluj-Napoca", address: "Cluj-Napoca, Str. EXEMPLU, Nr. 1", postalCode: "400001" },
  aliases: [{ name: "ALFA ONRC SRL", firstSeen: "2025-03-18", lastSeen: "2026-05-06", sinceAtLeast: true, current: true }],
  snapshot: "2026-05-06",
  provenance: { source: "ONRC" as const, url: "https://data.gov.ro/dataset/firme-06-05-2026", via: "Firme înregistrate la Registrul Comerțului până la data de 06.05.2026", kind: "BULK" as const, fetchedAt: "2026-11-13T04:00:00Z" },
};

export const onrcCountHand: FixtureSet<OnrcCountQuery, OnrcCountQueryVariables> = [
  {
    name: "typical-text-query", kind: "typical",
    description: "the picker's count for a text query: the match count alone (the same set as the typical OnrcSearch of this query)",
    variables: { filter: { q: "alfa beta" } },
    data: { onrc: { search: { count: 2 } } },
  },
  {
    name: "empty-no-match", kind: "empty",
    description: "a text query nothing in ONRC matches: a count of zero",
    variables: { filter: { q: "nimic" } },
    data: { onrc: { search: { count: 0 } } },
  },
];

export const onrcRecordHand: FixtureSet<OnrcRecordQuery, OnrcRecordQueryVariables> = [
  { name: "typical-registration", kind: "typical", description: "a registration with a status change, CAEN codes and its entity page", variables: { registrationNumber: "J40/1001/2015" }, data: { onrc: { record: record } } },
  { name: "empty-unknown-number", kind: "empty", description: "a registration number ONRC does not list (also what a sole trader's registration answers)", variables: { registrationNumber: "J00/0/2000" }, data: { onrc: { record: null } } },
];

type Cell = OnrcCoverageQuery["coverage"]["grid"][number];
const cell = (quarter: string, state: Cell["state"], records: number, dataThrough: string | null): Cell => ({ quarter, kind: "REGISTRATION", state, rule: null, note: null, records, crawlOnly: 0, dataThrough });
const onrcSources = w.sources.map((s) => (s.id === "ONRC" ? { ...s, harvested: true, dataThrough: [{ kind: "REGISTRATION", date: "2026-05-06" }] } : s));
const county = (code: string, status: "HARVESTED" | "HARVESTED_WITH_KNOWN_GAPS") => ({ county: code, status, withRecords: 0, publicEntities: 0, otherAuthorities: 0 });

export const onrcCoverageHand: FixtureSet<OnrcCoverageQuery, OnrcCoverageQueryVariables> = [
  {
    name: "typical-snapshots-and-a-known-gap", kind: "typical",
    description: "one cell per snapshot (the period is its date) and a known gap for the month with none; the data-through date is the newest snapshot's; the denominator is none, so every county shows its status only",
    variables: { window: { from: "2026-03-01", to: "2026-05-31" } },
    data: {
      sources: onrcSources,
      coverage: {
        window: { from: "2026-03-01", to: "2026-05-31" }, denominator: "NONE",
        counties: [county("RO-BV", "HARVESTED_WITH_KNOWN_GAPS"), county("RO-CJ", "HARVESTED_WITH_KNOWN_GAPS")],
        grid: [cell("2026-03-02", "LOADED", 13, "2026-03-02"), { ...cell("2026-04", "KNOWN_GAP", 0, null) }, cell("2026-05-06", "LOADED", 13, "2026-05-06")],
      },
    },
  },
  {
    name: "empty-no-snapshot", kind: "empty",
    description: "no ONRC snapshot is held: no cell, no county harvested, the Source not harvested",
    variables: { window: null },
    data: { sources: w.sources, coverage: { window: { from: null, to: null }, denominator: "NONE", counties: [], grid: [] } },
  },
];
