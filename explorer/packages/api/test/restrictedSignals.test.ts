// Restricted enforcement for the SOE-board Signal (ADR 0011, ADR 0015, ticket #185), beside restricted.test.ts: the people world (archive-onrc-people) with archive-cross-soe laid
// over it (AMEPIP's list and the enterprises' Records, see watchdog/tests/fixtures/build_cross_signals_archive.py) is rebuilt once and served by four APIs, with
// `GRIVEI_RESTRICTED` unset, set to another value, to `SHOW` (not the exact value) and to `show`. The rule exists in the data in every mode (the rebuild computes it); it may be
// served only when the value is exactly `show`: no Signal, no Record behind the Signals filter or the has-Signals chip, no count, no rule row (so no firing rate and no methodology
// section), and no trace of its name or its numbers in any answer. Needs Docker and the pipeline's Python (as seam1.test.ts); SEAM1_REQUIRED=1 turns a skip into a failure.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parse } from "graphql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema, validateResponse } from "@grivei/contract/node";
import { createApi } from "../src/server.ts";
import { postgresStore } from "../src/store.ts";
import { RESTRICTED_RULES } from "../src/restricted.ts";

const here = dirname(fileURLToPath(import.meta.url));
const watchdog = resolve(here, "../../../../watchdog");
const python = process.env.PIPELINE_PYTHON ?? join(watchdog, ".venv/bin/python");
const image = process.env.PARADEDB_IMAGE ?? /image:\s*(paradedb\/paradedb:\S+)/.exec(readFileSync(resolve(here, "../../../../compose.yaml"), "utf8"))![1]!;
const container = `pp37-restricted-soe-${process.pid}`;
const SECRET = "dummy-secret-for-tests-only-0123456789";
const schema = loadSchema();
const op = (name: string) => allowlist.operations.find((o) => o.name === name)!;

const reason = ((): string | null => {
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) return "Docker is not available";
  if (spawnSync(python, ["-c", "import psycopg"], { stdio: "ignore" }).status !== 0) return `pipeline Python (${python}) is missing or lacks psycopg (set PIPELINE_PYTHON)`;
  return null;
})();
if (reason && process.env.SEAM1_REQUIRED) throw new Error(`the Restricted Signal test is required but cannot run: ${reason}`);

const MODES = [
  { name: "unset", value: undefined, shown: false },
  { name: "another value", value: "true", shown: false },
  { name: "SHOW (not the exact value)", value: "SHOW", shown: false },
  { name: "show", value: "show", shown: true },
] as const;

const RULE = "SOE_BOARD_IN_SUPPLIER";
const NUMBERS = "SoeBoardInSupplierNumbers";

describe.skipIf(reason !== null)("the SOE-board Signal is served only when GRIVEI_RESTRICTED is `show`", () => {
  let scratch = "";
  let admin: pg.Pool;
  let pool: pg.Pool;
  const keys = new Map<string, string>(); // display name -> entity key
  const apis = new Map<string, ReturnType<typeof createApi>>();
  const cleanup = () => void spawnSync("docker", ["rm", "-f", "-v", container], { stdio: "ignore" });
  const chips = new Map<string, number>(); // per mode, the Records the has-Signals chip finds
  const unfiltered = new Map<string, string[]>(); // per mode, the bodies of every answer that names no rule in its filter: they must hold no trace of the rule when hidden

  beforeAll(async () => {
    process.on("exit", cleanup);
    scratch = mkdtempSync(join(here, "..", ".restricted-soe-"));
    cpSync(join(watchdog, "tests/fixtures/archive-onrc-people"), join(scratch, "archive"), { recursive: true });
    cpSync(join(watchdog, "tests/fixtures/archive-cross-soe"), join(scratch, "archive"), { recursive: true });
    execFileSync("docker", ["run", "-d", "--name", container, "--memory=3g", "--cpus=2", "--label", "pp37=restricted-soe", "-e", "POSTGRES_PASSWORD=restricted", "-p", "127.0.0.1::5432", image], { stdio: "pipe" });
    const port = execFileSync("docker", ["port", container, "5432/tcp"]).toString().trim().split("\n")[0]!.split(":").pop();
    const base = `postgresql://postgres:restricted@127.0.0.1:${port}`;
    admin = new pg.Pool({ connectionString: `${base}/postgres`, max: 1 });
    for (const deadline = Date.now() + 90_000; ; await new Promise((r) => setTimeout(r, 500))) {
      try { await admin.query("SELECT 1"); break; } catch (e) { if (Date.now() > deadline) throw e; }
    }
    await admin.query("CREATE DATABASE soe_a");
    const r = spawnSync(python, ["-m", "pipeline", "--archive", join(scratch, "archive"), "rebuild", "--db", `${base}/soe_a`, "--in-place"], {
      cwd: watchdog, encoding: "utf8", env: { ...process.env, GRIVEI_PERSON_ID_SECRET: SECRET },
    });
    if (r.status !== 0) throw new Error(`pipeline rebuild failed:\n${r.stdout}\n${r.stderr}`);
    expect(r.stdout).toContain(`${RULE} 2`); // the rule is in the data whatever the switch says
    pool = new pg.Pool({ connectionString: `${base}/soe_a`, max: 2 });
    for (const { key, display_name } of (await pool.query("SELECT key, display_name FROM core.entity")).rows) keys.set(display_name, key);
    for (const mode of MODES) {
      const previous = process.env.GRIVEI_RESTRICTED;
      if (mode.value === undefined) delete process.env.GRIVEI_RESTRICTED;
      else process.env.GRIVEI_RESTRICTED = mode.value;
      apis.set(mode.name, createApi(postgresStore(pool), schema)); // the store and the API read the switch once, here
      if (previous === undefined) delete process.env.GRIVEI_RESTRICTED;
      else process.env.GRIVEI_RESTRICTED = previous;
    }
  }, 300_000);

  afterAll(async () => {
    await pool?.end().catch(() => undefined);
    await admin?.end().catch(() => undefined);
    cleanup();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ask = async (mode: string, operation: string, variables: Record<string, unknown>, record = true): Promise<any> => {
    const o = op(operation);
    const r = await apis.get(mode)!.respond({ id: o.sha256, variables });
    expect(r.status, `${operation} ${JSON.stringify(variables)}`).toBe(200);
    expect(r.body.errors, `${operation} ${JSON.stringify(variables)}`).toBeUndefined();
    expect(validateResponse(schema, parse(o.document), r.body.data, variables)).toEqual([]);
    if (record) unfiltered.set(mode, [...(unfiltered.get(mode) ?? []), JSON.stringify(r.body)]);
    return r.body.data;
  };
  const signals = async (mode: string, name: string, role: "AUTHORITY" | "SUPPLIER", filter: Record<string, unknown> = {}, record = true) =>
    (await ask(mode, "EntityOverview", { key: keys.get(name)!, role, filter, signalOrder: "DATE_DESC", signalOffset: 0 }, record)).entity.seap.role.signals as {
      count: number; rows: { rule: string; date: string; numbers: Record<string, unknown> }[];
    };
  const records = async (mode: string, filter: Record<string, unknown>, record = true) =>
    (await ask(mode, "MainScreen", { filter }, record)).seap.search.total.records as number;

  it("rebuilt the fixture: the enterprise, its suppliers and the rule's data exist in the graph", async () => {
    for (const name of ["BETA ONRC SRL", "ALFA ONRC SRL", "GAMMA ONRC SRL", "DUBLA ONRC SA", "OMEGA ONLY SRL", "FAM TOMA IF"]) expect(keys.has(name), name).toBe(true);
    const stored = await pool.query("SELECT rule, count(*)::int AS n FROM seap.signal WHERE rule = $1 GROUP BY rule", [RULE]);
    expect(stored.rows).toEqual([{ rule: RULE, n: 2 }]);
    // and the public search rows never carry it (the pipeline keeps it off `signals` and `has_signals`)
    expect((await pool.query("SELECT count(*)::int AS n FROM seap.search WHERE signals && ARRAY[$1]::text[]", [RULE])).rows[0].n).toBe(0);
    expect((await pool.query("SELECT count(*)::int AS n FROM seap.search WHERE restricted_signals @> ARRAY[$1]::text[]", [RULE])).rows[0].n).toBe(3); // on its own column
  });

  it("every rule the pipeline keeps off the public search rows is on the API's own Restricted list (the API's list is the one that gates)", async () => {
    const kept = (await pool.query("SELECT DISTINCT unnest(restricted_signals) AS rule FROM seap.search")).rows.map((r) => r.rule as string);
    expect(kept.length).toBeGreaterThan(0);
    for (const rule of kept) expect(RESTRICTED_RULES, rule).toContain(rule);
  });

  for (const mode of MODES) {
    describe(`GRIVEI_RESTRICTED ${mode.name}`, () => {
      it(mode.shown ? "serves the Signals of the enterprise's page, their numbers and their count" : "serves no Signal, no Signal count and no row on the enterprise's page", async () => {
        // the world has public Signals too (e.g. INSOLVENCY); the rule is told apart by the rule filter and by the rows' own rule
        const all = await signals(mode.name, "BETA ONRC SRL", "AUTHORITY");
        const ofRule = await signals(mode.name, "BETA ONRC SRL", "AUTHORITY", { signal: RULE }, false);
        const rows = all.rows.filter((s) => s.rule === RULE);
        expect(all.count).toBe(all.rows.length); // few enough to be one page: the count is the rows
        if (mode.shown) {
          expect(ofRule.count).toBe(2);
          expect(ofRule.rows.map((s) => [s.rule, s.date, s.numbers])).toEqual([[RULE, "2026-04-27", { __typename: NUMBERS, persons: 1 }], [RULE, "2026-04-20", { __typename: NUMBERS, persons: 1 }]]);
          expect(rows).toHaveLength(2);
        } else {
          expect(ofRule).toEqual({ count: 0, rows: [] });
          expect(rows).toEqual([]);
        }
        // the supplier's side is the same
        expect((await signals(mode.name, "ALFA ONRC SRL", "SUPPLIER", { signal: RULE }, false)).count).toBe(mode.shown ? 2 : 0);
      });

      it(mode.shown ? "finds the Records by the Signals filter and the has-Signals chip" : "finds no Record by the Signals filter or the has-Signals chip, and the same total as a world without the rule", async () => {
        const all = await records(mode.name, {});
        const byChip = await records(mode.name, { hasSignals: true });
        const without = await records(mode.name, { hasSignals: false });
        const bySignal = await records(mode.name, { signal: RULE }, false); // names the rule in the request: not recorded as an unfiltered answer
        const onEntity = await signals(mode.name, "BETA ONRC SRL", "AUTHORITY", { signal: RULE }, false);
        expect(all).toBeGreaterThan(0);
        expect(byChip + without).toBe(all);
        chips.set(mode.name, byChip);
        if (mode.shown) {
          expect(bySignal).toBe(3); // ALFA's three Records of the enterprise
          expect(byChip).toBeGreaterThanOrEqual(3);
          expect(onEntity.count).toBe(2);
        } else {
          expect([bySignal, onEntity.count]).toEqual([0, 0]);
        }
      });

      it(mode.shown ? "lists the rule, with its window and firing rate, in the methodology answer" : "lists no rule row: no window, no firing rate", async () => {
        const rules = (await ask(mode.name, "MethodologyBaseRates", {})).signalRules as { slug: string; baseRate: number; baseRateYear: number }[];
        expect(rules.some((r) => r.slug === RULE)).toBe(mode.shown);
        if (mode.shown) expect(rules.find((r) => r.slug === RULE)!.baseRate).toBeGreaterThan(0);
      });

      it(mode.shown ? "names the Signal on its Record's page" : "names no Signal on a Record's page", async () => {
        const code = (await pool.query("SELECT code FROM seap.record WHERE code = 'DA96000001'")).rows[0]?.code as string;
        expect(code).toBe("DA96000001");
        const page = await ask(mode.name, "RecordPage", { code });
        expect(page.seap.record.signals.map((s: { rule: string }) => s.rule).includes(RULE)).toBe(mode.shown); // its other (public) Signals are there in every mode
      });

      if (!mode.shown) {
        it("leaves no trace of the rule's name or numbers in any answer", () => {
          const bodies = unfiltered.get(mode.name) ?? [];
          const text = bodies.join("\n");
          expect(bodies.length).toBeGreaterThan(0);
          expect(text).not.toContain(RULE);
          expect(text).not.toContain(NUMBERS);
        });
      }
    });
  }

  it("the has-Signals chip counts the same in every hidden mode, and the shown mode adds only the Records the Restricted rule alone marks", () => {
    const hidden = MODES.filter((m) => !m.shown).map((m) => chips.get(m.name));
    expect(new Set(hidden).size).toBe(1);
    const extra = chips.get("show")! - hidden[0]!;
    expect(extra).toBeGreaterThanOrEqual(0);
    expect(extra).toBeLessThanOrEqual(3);
  });

  it("with the switch on, the rule's firing rate is computed from the loaded graph (the share of all contracting authorities with a Record of its kinds that year that have a Signal)", async () => {
    const rule = (await pool.query("SELECT base_rate, base_rate_year FROM seap.signal_rule WHERE slug = $1", [RULE])).rows[0];
    expect(rule.base_rate).toBeGreaterThan(0);
    expect(rule.base_rate).toBeLessThanOrEqual(1);
    expect(rule.base_rate_year).toBe(2026);
  });
});
