import type {
  FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables,
  FullResultsRecordsQuery, FullResultsRecordsQueryVariables,
  FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables,
} from "../generated/operations.ts";
import { ron, total } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import * as w from "./world.ts";

/** `n` distinct Records for a long list: the same Record states cycled, each with its own public code. */
const rowsFrom = (start: number, n: number) =>
  Array.from({ length: n }, (_, i) => {
    const base = [w.rDirect, w.rContract, w.rConsortium, w.rNoValue][(start + i) % 4]!;
    return { record: { ...base, code: `CAN${2_000_000 + start + i}` }, matchedField: null, areaShare: null };
  });

export const fullResultsAuthoritiesHand: FixtureSet<FullResultsAuthoritiesQuery, FullResultsAuthoritiesQueryVariables> = [
  {
    name: "typical-page-2", kind: "typical", description: "page 2 of authorities (offset 50), national and unplaced-adjacent rows",
    variables: { filter: { from: "2024-01-01", to: "2024-12-31" }, limit: 50, offset: 50 },
    data: { seap: { search: {
      total: total({ awarded: ron(9_000_000_000), records: 12_000 }),
      authorities: { count: 5_100, countEstimated: false, rows: [
        { entity: w.drumuriNationaleRow, matched: total({ awarded: ron(900_000_000), records: 80 }) },
        { entity: w.autoritateNeplasataRow, matched: total({ awarded: ron(12_000), records: 1, noValue: 0 }) },
        { entity: w.primariaFaraUatRow, matched: total({ awarded: ron(36_000), records: 1 }) },
      ] },
    } } },
  },
  {
    name: "extreme-estimated", kind: "extreme", description: "a huge matching set: the distinct count is a HyperLogLog estimate",
    variables: { filter: { from: "2021-01-01" }, limit: 50, offset: 0 },
    data: { seap: { search: {
      total: total({ awarded: ron(86_000_000_000), records: 410_000 }),
      authorities: { count: 70_000, countEstimated: true, rows: [{ entity: w.drumuriNationaleRow, matched: total({ awarded: ron(9_000_000_000), records: 1_200 }) }] },
    } } },
  },
  {
    name: "empty-past-the-end", kind: "empty", description: "an offset beyond the last row: no rows, count still reported",
    variables: { filter: { q: "deszapezire" }, limit: 50, offset: 100 },
    data: { seap: { search: { total: total({ awarded: ron(1_420_000), records: 9 }), authorities: { count: 2, countEstimated: false, rows: [] } } } },
  },
];

export const fullResultsSuppliersHand: FixtureSet<FullResultsSuppliersQuery, FullResultsSuppliersQueryVariables> = [
];

export const fullResultsRecordsHand: FixtureSet<FullResultsRecordsQuery, FullResultsRecordsQueryVariables> = [
  {
    name: "page-1-of-3", kind: "typical", description: "the default page size of 50: page 1 of 120 Records, fifty full rows",
    variables: { filter: { from: "2021-01-01" }, limit: 50, offset: 0 },
    data: { seap: { search: { total: total({ awarded: ron(86_000_000), records: 120 }), records: { count: 120, rows: rowsFrom(0, 50) } } } },
  },
  {
    name: "page-1-by-date", kind: "typical", description: "the same 120 Records ordered by date, newest first (the order control's choice): page 1 of 120",
    variables: { filter: { from: "2021-01-01" }, limit: 50, offset: 0, order: "DATE_DESC" },
    data: { seap: { search: { total: total({ awarded: ron(86_000_000), records: 120 }), records: { count: 120, rows: rowsFrom(0, 50) } } } },
  },
  {
    name: "page-2-of-3-middle", kind: "typical", description: "a middle page: Records 51 to 100 of 120",
    variables: { filter: { from: "2021-01-01" }, limit: 50, offset: 50 },
    data: { seap: { search: { total: total({ awarded: ron(86_000_000), records: 120 }), records: { count: 120, rows: rowsFrom(50, 50) } } } },
  },
  {
    name: "page-3-of-3-last", kind: "typical", description: "the last page is partial: Records 101 to 120",
    variables: { filter: { from: "2021-01-01" }, limit: 50, offset: 100 },
    data: { seap: { search: { total: total({ awarded: ron(86_000_000), records: 120 }), records: { count: 120, rows: rowsFrom(100, 20) } } } },
  },
  {
    name: "page-4-past-the-end", kind: "empty", description: "a stale URL's page 4 of 120 Records: no rows, the count says why",
    variables: { filter: { from: "2021-01-01" }, limit: 50, offset: 150 },
    data: { seap: { search: { total: total({ awarded: ron(86_000_000), records: 120 }), records: { count: 120, rows: [] } } } },
  },
  {
    name: "typical-by-value", kind: "typical", description: "Records ordered by value, with every Record state in the list",
    variables: { filter: { hasSignals: true }, limit: 100, offset: 0, order: "VALUE_DESC" },
    data: { seap: { search: {
      total: total({ awarded: ron(60_000_000), records: 11, suspectLeftOut: 1, noValue: 1, frameworkCeilings: ron(100_000_000) }),
      records: { count: 11, rows: [
        w.rConsortium, w.rFrameworkCeiling, w.rSubsequent, w.rSuspect, w.rDirect, w.rNoValue, w.rNaturalPerson, w.rMismatch,
      ].map((record) => ({ record, matchedField: null, areaShare: null })) },
    } } },
  },
  {
    name: "by-date-matched-field", kind: "typical", description: "ordered by date, with the matched field highlighted on each row",
    variables: { filter: { q: "spatii verzi" }, limit: 100, offset: 0, order: "DATE_DESC" },
    data: { seap: { search: {
      total: total({ awarded: ron(290_000), records: 2 }),
      records: { count: 2, rows: [
        { record: w.rSplit2, matchedField: { field: "TITLE", text: "Servicii de întreținere spații verzi (2)", highlights: [[24, 30], [31, 36]] }, areaShare: null },
        { record: w.rSplit1, matchedField: { field: "TITLE", text: "Servicii de întreținere spații verzi (1)", highlights: [[24, 30], [31, 36]] }, areaShare: null },
      ] },
    } } },
  },
  {
    name: "extreme-large-set", kind: "extreme", description: "millions of Records, counted exactly",
    variables: { filter: {}, limit: 100, offset: 99_900, order: "DATE_ASC" },
    data: { seap: { search: {
      total: total({ awarded: ron(86_000_000_000), records: 2_400_000 }),
      records: { count: 2_400_000, rows: [{ record: w.rDirectSmall, matchedField: null, areaShare: null }] },
    } } },
  },
];
