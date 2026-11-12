// Parity of the latency benchmark's Python mirror (watchdog/pipeline/bench.py) with this package: the filter -> WHERE mapping and the
// rollup plan, over every shipped benchmark query plus a few chips the list does not use. The expectations live in
// watchdog/tests/fixtures/bench_parity.json; this test fails when `buildWhere` / `rollupPlan` no longer produce them, and
// watchdog/tests/test_bench_parity.py fails when bench.py no longer does. After an intended change here: `UPDATE_BENCH_PARITY=1 npm test`
// in this package rewrites the file, then fix bench.py until the pytest is green again. No database.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { rollupPlan } from "../src/rollup.ts";
import { buildWhere, type SearchFilter } from "../src/search.ts";

const watchdog = fileURLToPath(new URL("../../../../watchdog/", import.meta.url));
const queriesFile = `${watchdog}pipeline/bench_queries.json`;
const parityFile = `${watchdog}tests/fixtures/bench_parity.json`;

interface Query {
  label: string;
  filter: SearchFilter;
}

/** Filters the benchmark list does not use, so every predicate of `buildWhere` and every refusal of `rollupPlan` is pinned. */
const EXTRA: Query[] = [
  { label: "extra: legal-form word only", filter: { q: "SRL" } },
  { label: "extra: RO-prefixed CUI and a legal form", filter: { q: "ALFA S.R.L. RO4384206" } },
  { label: "extra: regex metacharacters", filter: { q: "a+b (c)" } },
  { label: "extra: authority and supplier", filter: { authority: "4384206", supplier: "27272953" } },
  { label: "extra: supplier county", filter: { county: "RO-BV", countySide: "SUPPLIER" } },
  { label: "extra: authority county", filter: { county: "RO-BV" } },
  { label: "extra: UAT and Signal", filter: { uat: "40198", signal: "OVER_CAP" } },
  { label: "extra: procedure and badges", filter: { procedure: ["x", "y"], badges: ["NO_VALUE", "SUSPECT_VALUE"] } },
  { label: "extra: partial dates", filter: { from: "2025-03-01", to: "2025-06-30" } },
  { label: "extra: hasSignals false", filter: { hasSignals: false, channel: "CONTRACT", valueBucket: "OVER_1B" } },
];

function compute(queries: Query[]) {
  return queries.map(({ label, filter }) => {
    const w = buildWhere(filter);
    return {
      label,
      filter,
      where: { sql: w.sql.replace(/\$\d+/g, "%s"), params: w.params, winnerSide: w.winnerSide, empty: w.empty, qFolded: w.qFolded },
      rollup: rollupPlan(filter),
    };
  });
}

describe("benchmark parity (watchdog/pipeline/bench.py)", () => {
  it("buildWhere and rollupPlan give the expectations the Python mirror is tested against", () => {
    const shipped = (JSON.parse(readFileSync(queriesFile, "utf8")) as Array<string | Query>).map((q) => (typeof q === "string" ? { label: q, filter: { q } } : q));
    const actual = compute([...shipped, ...EXTRA]);
    if (process.env.UPDATE_BENCH_PARITY) writeFileSync(parityFile, JSON.stringify(actual, null, 1) + "\n");
    expect(actual).toEqual(JSON.parse(readFileSync(parityFile, "utf8")));
  });
});
