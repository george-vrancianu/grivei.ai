import type {
  CoverageLensQuery, CoverageLensQueryVariables, CoveragePageQuery, CoveragePageQueryVariables,
  CoverageStatus, GapState,
} from "../generated/operations.ts";
import { ron, total, zeroTotal } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import * as w from "./world.ts";

const { sources } = w;

const county = (code: string, status: CoverageStatus, withRecords: number, publicEntities: number, otherAuthorities: number) =>
  ({ county: code, status, withRecords, publicEntities, otherAuthorities });

// One county per status, plus the National tile.
const counties = [
  county("RO-BV", "HARVESTED", 310, 340, 12),
  county("RO-CJ", "HARVESTED_WITH_KNOWN_GAPS", 400, 480, 20),
  county("RO-TM", "PARTIAL", 150, 520, 9),
  county("RO-TL", "NOT_HARVESTED", 0, 130, 0),
  county("NATIONAL", "HARVESTED", 210, 230, 4),
];

const unplaced = { authorities: 17, total: total({ awarded: ron(12_000_000), records: 130 }) };

export const coverageLens: FixtureSet<CoverageLensQuery, CoverageLensQueryVariables> = [
  {
    name: "typical-every-status", kind: "typical",
    description: "one county in each coverage status plus National; later Sources not harvested; the Unplaced authorities' tally",
    variables: { window: { from: "2021-01-01", to: "2024-12-31" } },
    data: { sources, coverage: { window: { from: "2021-01-01", to: "2024-12-31" }, counties, unplacedAuthorities: unplaced } },
  },
  {
    name: "empty-nothing-harvested-in-window", kind: "empty",
    description: "a window before the harvest: every county not harvested, no unplaced authorities, no date bounds echoed",
    variables: { window: { from: "2019-01-01", to: "2019-12-31" } },
    data: {
      sources,
      coverage: {
        window: { from: "2019-01-01", to: "2019-12-31" },
        counties: counties.map((c) => ({ ...c, status: "NOT_HARVESTED" as const, withRecords: 0, otherAuthorities: 0 })),
        unplacedAuthorities: { authorities: 0, total: zeroTotal },
      },
    },
  },
  {
    name: "open-window", kind: "typical",
    description: "no date chip: the window comes back open-ended",
    variables: {},
    data: { sources, coverage: { window: { from: null, to: null }, counties, unplacedAuthorities: unplaced } },
  },
];

const states: GapState[] = ["LOADED", "KNOWN_GAP", "POSSIBLY_INCOMPLETE", "NOT_IN_SOURCE", "CRAWLED_PROVISIONAL", "NOT_YET_LOADED"];
type Cell = NonNullable<CoveragePageQuery["coverage"]>["grid"][number];
const cell = (quarter: string, kind: string, state: GapState, records: number, o: Partial<Cell> = {}): Cell => ({
  quarter, kind, state, rule: null, note: null, records, dataThrough: null, ...o,
});

export const coveragePage: FixtureSet<CoveragePageQuery, CoveragePageQueryVariables> = [
  {
    name: "typical-every-gap-state", kind: "typical",
    description: "a quarter x kind grid showing every gap state, with a published rule (and, for the hand-entered gap, the gap file's own note), the current quarter crawled-provisional (direct purchases: not yet loaded, awaiting the bulk file; a quarantined file shows the same state with no rule) and the 2021-22 no-prior-call contracts not in the source",
    variables: { window: { from: "2021-01-01", to: "2024-12-31" } },
    data: {
      sources,
      coverage: {
        window: { from: "2021-01-01", to: "2024-12-31" },
        counties,
        grid: [
          cell("2021-Q1", "CONTRACT", "NOT_IN_SOURCE", 0, { rule: "NO_PRIOR_CALL_BEFORE_BACKFILL" }),
          cell("2022-Q3", "DA", "KNOWN_GAP", 0, { rule: "HAND_ENTERED", note: "Exportul ADR pentru acest trimestru a fost republicat fără achizițiile directe" }),
          cell("2023-Q2", "DAN", "POSSIBLY_INCOMPLETE", 4_210, { rule: "COUNT_BELOW_NEIGHBOURS" }),
          cell("2023-Q3", "DAN", "NOT_YET_LOADED", 0),
          cell("2024-Q3", "CONTRACT", "LOADED", 18_400, { dataThrough: "2024-09-30" }),
          cell("2024-Q4", "DA", "NOT_YET_LOADED", 0, { rule: "AWAITING_BULK_FILE" }),
          cell("2024-Q4", "AWARD_NOTICE", "CRAWLED_PROVISIONAL", 2_900, { dataThrough: "2024-11-30" }),
        ],
        unplacedAuthorities: unplaced,
        referenceSnapshot: "2024-09-15",
      },
    },
  },
  {
    name: "extreme-full-grid", kind: "extreme",
    description: "every quarter of the window for every record kind: 16 quarters x 4 kinds, cycling through the gap states",
    variables: { window: { from: "2021-01-01", to: "2024-12-31" } },
    data: {
      sources,
      coverage: {
        window: { from: "2021-01-01", to: "2024-12-31" },
        counties,
        grid: Array.from({ length: 16 }, (_, q) => ["DA", "DAN", "CONTRACT", "AWARD_NOTICE"].map((kind, k) => {
          const state = states[(q + k) % states.length]!;
          return cell(`${2021 + Math.floor(q / 4)}-Q${(q % 4) + 1}`, kind, state, state === "LOADED" ? 1_000 + q : 0, state === "LOADED" ? {} : { rule: "COUNT_BELOW_NEIGHBOURS" });
        })).flat(),
        unplacedAuthorities: unplaced,
        referenceSnapshot: "2024-09-15",
      },
    },
  },
  {
    name: "empty-window", kind: "empty",
    description: "a window with no data: empty grid, no reference snapshot",
    variables: { window: { from: "2019-01-01", to: "2019-12-31" } },
    data: {
      sources,
      coverage: {
        window: { from: "2019-01-01", to: "2019-12-31" },
        counties: counties.map((c) => ({ ...c, status: "NOT_HARVESTED" as const, withRecords: 0 })),
        grid: [],
        unplacedAuthorities: { authorities: 0, total: zeroTotal },
        referenceSnapshot: null,
      },
    },
  },
];
