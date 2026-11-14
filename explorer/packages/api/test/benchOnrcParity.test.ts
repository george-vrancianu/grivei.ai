// Parity of ONRC's latency benchmark mirror (watchdog/pipeline/bench_onrc.py) with this package: the filter -> WHERE mapping over every shipped benchmark
// query plus a few chips the list does not use. The expectations live in watchdog/tests/fixtures/bench_onrc_parity.json; this test fails when
// `buildOnrcWhere` no longer produces them, and watchdog/tests/test_bench_onrc.py fails when bench_onrc.py no longer does. After an intended change here:
// `UPDATE_BENCH_PARITY=1 npm test` in this package rewrites the file, then fix bench_onrc.py until the pytest is green again. No database.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildOnrcWhere, type OnrcSearchFilter } from "../src/onrcSearch.ts";

const watchdog = fileURLToPath(new URL("../../../../watchdog/", import.meta.url));
const queriesFile = `${watchdog}pipeline/bench_onrc_queries.json`;
const parityFile = `${watchdog}tests/fixtures/bench_onrc_parity.json`;

interface Query {
  label: string;
  filter: OnrcSearchFilter;
}

/** Filters the benchmark list does not use, so every predicate of `buildOnrcWhere` is pinned. */
const EXTRA: Query[] = [
  { label: "extra: RO-prefixed CUI and a legal form", filter: { q: "ALFA S.R.L. RO3100020" } },
  { label: "extra: regex metacharacters", filter: { q: "a+b (c)", caen: "4.2" } },
  { label: "extra: one status", filter: { status: [1107] } },
  { label: "extra: open date range", filter: { registeredFrom: "2025-03-01" } },
  { label: "extra: seapCounterparty false", filter: { seapCounterparty: false } },
  { label: "extra: blank CAEN and an empty status list", filter: { caen: "", status: [] } },
];

describe("benchmark parity (watchdog/pipeline/bench_onrc.py)", () => {
  it("buildOnrcWhere gives the expectations the Python mirror is tested against", () => {
    const shipped = (JSON.parse(readFileSync(queriesFile, "utf8")) as Array<string | Query>).map((q) => (typeof q === "string" ? { label: q, filter: { q } } : q));
    const actual = [...shipped, ...EXTRA].map(({ label, filter }) => {
      const w = buildOnrcWhere(filter);
      return { label, filter, where: { sql: w.sql.replace(/\$\d+/g, "%s"), params: w.params, text: w.text, qFolded: w.qFolded } };
    });
    if (process.env.UPDATE_BENCH_PARITY) writeFileSync(parityFile, JSON.stringify(actual, null, 1) + "\n");
    expect(actual).toEqual(JSON.parse(readFileSync(parityFile, "utf8")));
  });
});
