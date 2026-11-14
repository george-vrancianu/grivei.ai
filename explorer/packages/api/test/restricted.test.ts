// Restricted enforcement (ADR 0015, ticket #177), beside the no-withheld guard: the same fixture archive (archive-onrc-people: ONRC's people, SEAP counterparties and an
// ONRC-only company) is rebuilt once and served by three APIs, with `GRIVEI_RESTRICTED` unset, set to another value, and set to `show`. No Restricted field, hit or count
// may be served unless the value is exactly `show`: person pages, the person link of an administrator, and the cross-organisation role lists with their counts.
// Whatever the mode, a possible match, a birthplace, a full birth date and a sole trader's or an IF's holders are never served.
// Needs Docker and the pipeline's Python (as seam1.test.ts); SEAM1_REQUIRED=1 turns a skip into a failure.
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parse } from "graphql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema, validateResponse } from "@grivei/contract/node";
import { createApi } from "../src/server.ts";
import { postgresStore } from "../src/store.ts";

const here = dirname(fileURLToPath(import.meta.url));
const watchdog = resolve(here, "../../../../watchdog");
const archive = join(watchdog, "tests/fixtures/archive-onrc-people");
const python = process.env.PIPELINE_PYTHON ?? join(watchdog, ".venv/bin/python");
const image = process.env.PARADEDB_IMAGE ?? /image:\s*(paradedb\/paradedb:\S+)/.exec(readFileSync(resolve(here, "../../../../compose.yaml"), "utf8"))![1]!;
const container = `pp37-restricted-${process.pid}`;
const SECRET = "dummy-secret-for-tests-only-0123456789";
const schema = loadSchema();
const op = (name: string) => allowlist.operations.find((o) => o.name === name)!;

const reason = ((): string | null => {
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) return "Docker is not available";
  if (spawnSync(python, ["-c", "import psycopg"], { stdio: "ignore" }).status !== 0) return `pipeline Python (${python}) is missing or lacks psycopg (set PIPELINE_PYTHON)`;
  return null;
})();
if (reason && process.env.SEAM1_REQUIRED) throw new Error(`the Restricted test is required but cannot run: ${reason}`);

// every value of the switch the three APIs are started with: unset, another value, and the one that shows
const MODES = [{ name: "unset", value: undefined, shown: false }, { name: "another value", value: "true", shown: false }, { name: "SHOW (not the exact value)", value: "SHOW", shown: false }, { name: "show", value: "show", shown: true }] as const;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? sourceFiles(join(dir, name)) : [join(dir, name)]));
}

describe.skipIf(reason !== null)("Restricted content is served only when GRIVEI_RESTRICTED is `show`", () => {
  let scratch = "";
  let admin: pg.Pool;
  let pool: pg.Pool;
  const keys = new Map<string, string>(); // display name -> entity key
  const persons = new Map<string, string>(); // holder name -> person id
  const apis = new Map<string, ReturnType<typeof createApi>>();
  const cleanup = () => void spawnSync("docker", ["rm", "-f", "-v", container], { stdio: "ignore" });
  const everything: string[] = []; // every response body of every mode, to search for what must never be served

  beforeAll(async () => {
    process.on("exit", cleanup);
    scratch = mkdtempSync(join(here, "..", ".restricted-"));
    cpSync(archive, join(scratch, "archive"), { recursive: true });
    execFileSync("docker", ["run", "-d", "--name", container, "--memory=3g", "--cpus=2", "--label", "pp37=restricted", "-e", "POSTGRES_PASSWORD=restricted", "-p", "127.0.0.1::5432", image], { stdio: "pipe" });
    const port = execFileSync("docker", ["port", container, "5432/tcp"]).toString().trim().split("\n")[0]!.split(":").pop();
    const base = `postgresql://postgres:restricted@127.0.0.1:${port}`;
    admin = new pg.Pool({ connectionString: `${base}/postgres`, max: 1 });
    for (const deadline = Date.now() + 90_000; ; await new Promise((r) => setTimeout(r, 500))) {
      try { await admin.query("SELECT 1"); break; } catch (e) { if (Date.now() > deadline) throw e; }
    }
    await admin.query("CREATE DATABASE people_a");
    const r = spawnSync(python, ["-m", "pipeline", "--archive", join(scratch, "archive"), "rebuild", "--db", `${base}/people_a`, "--in-place"], {
      cwd: watchdog, encoding: "utf8", env: { ...process.env, GRIVEI_PERSON_ID_SECRET: SECRET },
    });
    if (r.status !== 0) throw new Error(`pipeline rebuild failed:\n${r.stdout}\n${r.stderr}`);
    pool = new pg.Pool({ connectionString: `${base}/people_a`, max: 2 });
    for (const { key, display_name } of (await pool.query("SELECT key, display_name FROM core.entity")).rows) keys.set(display_name, key);
    for (const { id, name } of (await pool.query("SELECT id, name FROM onrc.person")).rows) persons.set(name, id);
    for (const mode of MODES) {
      const previous = process.env.GRIVEI_RESTRICTED;
      if (mode.value === undefined) delete process.env.GRIVEI_RESTRICTED;
      else process.env.GRIVEI_RESTRICTED = mode.value;
      apis.set(mode.name, createApi(postgresStore(pool), schema)); // read once, here
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

  const ask = async (mode: string, operation: string, variables: unknown) => {
    const o = op(operation);
    const r = await apis.get(mode)!.respond({ id: o.sha256, variables });
    expect(r.status, `${operation} ${JSON.stringify(variables)}`).toBe(200);
    expect(r.body.errors, `${operation} ${JSON.stringify(variables)}`).toBeUndefined();
    expect(validateResponse(schema, parse(o.document), r.body.data, variables as Record<string, unknown>)).toEqual([]);
    everything.push(JSON.stringify(r.body));
    return r.body.data as any;
  };
  const overview = (mode: string, name: string, role: "SUPPLIER" | "AUTHORITY" = "SUPPLIER") => ask(mode, "EntityOverview", { key: keys.get(name)!, role, filter: {} });
  const holdersOf = async (mode: string, name: string, role: "SUPPLIER" | "AUTHORITY" = "SUPPLIER") => (await overview(mode, name, role)).entity.people?.holders as { name: string; role: string; birthYear: number | null; person: { id: string } | null }[] | undefined;

  it("rebuilt the fixture: the persons, the possible match and the entities exist in the graph", () => {
    expect([...persons.keys()].sort()).toEqual(["DUMITRESCU ȘTEFAN-VLAD", "ION POPESCU", "IONESCU MARIA", "POPESCU ION", "TOMA ELENA", "TOMA GHEORGHE"].sort());
    expect(keys.size).toBeGreaterThan(8);
  });

  for (const mode of MODES) {
    describe(`GRIVEI_RESTRICTED ${mode.name}`, () => {
      it(mode.shown ? "serves person pages and the person links of administrators" : "serves no person page, no person link, no id and no count", async () => {
        const alfa = (await holdersOf(mode.name, "ALFA ONRC SRL"))!;
        const popescu = persons.get("ION POPESCU")!; // the 1975 person: the most frequent spelling ties, so the alphabetically first wins
        if (mode.shown) {
          expect(alfa.filter((h) => h.birthYear !== null).every((h) => h.person !== null)).toBe(true);
          const page = (await ask(mode.name, "PersonPage", { id: popescu })).person;
          expect(page).toMatchObject({ id: popescu, birthYear: 1975, roleCount: 2 });
          expect(page.roles.map((r: any) => r.organisationName).sort()).toEqual(["ALFA ONRC SRL", "BETA ONRC SRL"]);
        } else {
          expect(alfa.every((h) => h.person === null)).toBe(true);
          for (const id of persons.values()) expect((await ask(mode.name, "PersonPage", { id })).person).toBeNull();
          expect((await ask(mode.name, "PersonPage", { id: "0".repeat(32) })).person).toBeNull(); // an unknown id answers the same as a known one: nothing
        }
      });

      it("lists the same public-tier holders in every mode: name, role and birth year, on SEAP counterparties only", async () => {
        expect((await holdersOf(mode.name, "ALFA ONRC SRL"))!.map(({ name, role, birthYear }) => ({ name, role, birthYear }))).toEqual([
          { name: "IONESCU MARIA", role: "administrator", birthYear: 1980 }, { name: "POPESCU ION", role: "administrator", birthYear: 1975 }]);  // RADU GHEORGHE is a possible match: never
        expect((await holdersOf(mode.name, "GAMMA ONRC SRL"))!.map((h) => [h.name, h.birthYear])).toEqual([["POPESCU ION", 1962]]); // the namesake is another person
        expect((await holdersOf(mode.name, "DELTA ONRC SRL"))!.map((h) => [h.name, h.birthYear, h.person])).toEqual([["NEGRU TUDOR", null, null]]); // an unlinked role holder, and no possible match
        expect((await holdersOf(mode.name, "OMEGA ONLY SRL"))).toBeUndefined(); // exists only in ONRC: its people are not named
        expect((await holdersOf(mode.name, "VASILESCU DEMO PFA"))).toEqual([]); // a PFA's holder is the registration itself: never listed
        expect((await holdersOf(mode.name, "FAM TOMA IF"))).toEqual([]); // an IF's members are not listed on the public page
        expect((await holdersOf(mode.name, "PRIMARIA EXEMPLU ONRC", "AUTHORITY"))).toEqual([]); // an authority is a counterparty too; ONRC lists no one for it
      });

      it("serves a possible match, a birthplace, a full birth date and a CNP in no answer", async () => {
        for (const name of keys.keys()) await overview(mode.name, name, ["PRIMARIA EXEMPLU ONRC", "DUBLA ONRC SA"].includes(name) ? "AUTHORITY" : "SUPPLIER");
        const text = everything.join("\n");
        expect(text).not.toContain("RADU GHEORGHE");
        for (const secret of ["Bihor", "Oradea", "BISTRA", "1975-03-12", "12/03/1975", "1965-02-02", "01/02/1970", "POPESCU DEMO"]) {
          expect(text, secret).not.toContain(secret);
        }
        expect(text).not.toMatch(/\b[1-8]\d{12}\b/); // no CNP-shaped number
      });
    });
  }

  it("with the switch on, the person pages join roles across organisations, an IF and an ONRC-only company included", async () => {
    const toma = (await ask("show", "PersonPage", { id: persons.get("TOMA GHEORGHE")! })).person;
    expect(toma.roleCount).toBe(2);
    expect(toma.roles.map((r: any) => [r.organisationName, r.role]).sort()).toEqual([["BETA ONRC SRL", "administrator"], ["FAM TOMA IF", "reprezentant întreprindere familiala"]]);
    const dumitrescu = (await ask("show", "PersonPage", { id: persons.get("DUMITRESCU ȘTEFAN-VLAD")! })).person;
    expect(dumitrescu.roleCount).toBe(2);
    expect(dumitrescu.roles.map((r: any) => r.organisationName).sort()).toEqual(["DUBLA ONRC SA", "OMEGA ONLY SRL"]); // the ONRC-only company's role is on the Private view only
    expect(dumitrescu.roles.every((r: any) => typeof r.entityKey === "string")).toBe(true);
    expect([...persons.keys()].some((n) => n.includes("RADU") || n.includes("NEGRU") || n.includes("DEMO"))).toBe(false); // no page for a possible match, an unlinked holder or a sole trader
  });

  it("the API's source never reads the review queue or the birthplace", () => {
    const hits = sourceFiles(join(here, "..", "src")).filter((f) => /possible_match|person_override|birth_date|birth_area/i.test(readFileSync(f, "utf8")) && !f.endsWith(".test.ts"));
    expect(hits).toEqual([]);
  });
});
