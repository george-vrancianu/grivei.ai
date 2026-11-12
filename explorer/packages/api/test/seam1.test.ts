/**
 * Seam 1 (the main seam): raw archive fixture -> `pipeline rebuild` -> the app's persisted query through the API.
 *
 * Why it lives here and not in pytest: the assertions are about GraphQL responses, so the harness is the API's own
 * (in-process `createApi`, the contract's `validateResponse`), and it drives the Python rebuild as a subprocess, exactly
 * as an operator would. The Python side has no Node dependency.
 *
 * It starts ONE throwaway ParadeDB container (named `pp37-seam1-*`, 3 GB cap, removed at the end and on process exit)
 * and rebuilds into two fresh databases inside it. Skipped, with the reason printed, when Docker or the pipeline's
 * Python (psycopg) is missing. Env: PIPELINE_PYTHON (default watchdog/.venv/bin/python), PARADEDB_IMAGE, SEAM1_REQUIRED (fail instead of skip).
 */
import { execFileSync, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { parse } from "graphql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema, validateResponse } from "@grivei/contract/node";
import type { MainScreenQuery, RecordPageQuery } from "@grivei/contract";
import { createApi } from "../src/server.ts";
import { postgresStore } from "../src/store.ts";

const here = dirname(fileURLToPath(import.meta.url));
const watchdog = resolve(here, "../../../../watchdog");
const fixtureArchive = join(watchdog, "tests/fixtures/archive");
const bulkArchive = join(watchdog, "tests/fixtures/archive-bulk"); // DA + DAN: renamed headers, quirks, a quarantined file (#63)
const contractsArchive = join(watchdog, "tests/fixtures/archive-contracts"); // Contracte + "fara anunt": recurring contract, lots, winners (#64)
const crawlArchive = join(watchdog, "tests/fixtures/archive-crawl"); // a Q1 bulk file + crawl days: superseded, crawl-only, provisional, re-crawl, an unfinished day (#77)
const python = process.env.PIPELINE_PYTHON ?? join(watchdog, ".venv/bin/python");
const image = process.env.PARADEDB_IMAGE ?? readImagePin();
const container = `pp37-seam1-${process.pid}`;

function readImagePin(): string {
  // the single source of truth for the pin is the compose file
  const compose = readFileSync(resolve(here, "../../../../compose.yaml"), "utf8");
  const m = /image:\s*(paradedb\/paradedb:\S+)/.exec(compose);
  if (!m?.[1]) throw new Error("no paradedb image pin in compose.yaml");
  return m[1];
}

function skipReason(): string | null {
  if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) return "Docker is not available";
  // run the interpreter (not existsSync): PIPELINE_PYTHON may be a bare command name such as `python`
  if (spawnSync(python, ["-c", "import psycopg"], { stdio: "ignore" }).status !== 0) return `pipeline Python (${python}) is missing or lacks psycopg (set PIPELINE_PYTHON)`;
  return null;
}
const reason = skipReason();
// SEAM1_REQUIRED=1 (the CI seam-1 job): a skip is a failure, never a silent green.
if (reason && process.env.SEAM1_REQUIRED) throw new Error(`seam 1 is required but cannot run: ${reason}`);
if (reason) console.warn(`seam 1 skipped: ${reason}`);

const mainScreen = allowlist.operations.find((o) => o.name === "MainScreen")!;
const recordPage = allowlist.operations.find((o) => o.name === "RecordPage")!;
const schema = loadSchema();
const EMPTY_FILTER = { filter: {} };

describe.skipIf(reason !== null)("seam 1: fixture archive -> rebuild -> GraphQL", () => {
  let scratch = "";
  let admin: pg.Pool;
  let baseUrl = "";
  const pools: pg.Pool[] = [];

  const cleanup = () => {
    spawnSync("docker", ["rm", "-f", "-v", container], { stdio: "ignore" });
  };

  beforeAll(async () => {
    process.on("exit", cleanup); // also when the run is killed half way
    scratch = mkdtempSync(join(here, "..", ".seam1-"));
    cpSync(fixtureArchive, join(scratch, "archive"), { recursive: true }); // a rebuild may quarantine: never touch the checked-in archive
    cpSync(bulkArchive, join(scratch, "archive-bulk"), { recursive: true });
    cpSync(contractsArchive, join(scratch, "archive-contracts"), { recursive: true });
    cpSync(crawlArchive, join(scratch, "archive-crawl"), { recursive: true });
    execFileSync("docker", [
      "run", "-d", "--name", container, "--memory=3g", "--cpus=2", "--label", "pp37=seam1",
      "-e", "POSTGRES_PASSWORD=seam1", "-p", "127.0.0.1::5432", image,
    ], { stdio: "pipe" });
    const port = execFileSync("docker", ["port", container, "5432/tcp"]).toString().trim().split("\n")[0]!.split(":").pop();
    baseUrl = `postgresql://postgres:seam1@127.0.0.1:${port}`;
    admin = new pg.Pool({ connectionString: `${baseUrl}/postgres`, max: 1 });
    await waitForPostgres(admin);
    await admin.query("CREATE DATABASE rebuild_a");
    await admin.query("CREATE DATABASE rebuild_b");
    await admin.query("CREATE DATABASE bulk_a");
    await admin.query("CREATE DATABASE bulk_b");
    await admin.query("CREATE DATABASE contracts_a");
    await admin.query("CREATE DATABASE contracts_b");
    await admin.query("CREATE DATABASE crawl_a");
    await admin.query("CREATE DATABASE crawl_b");
  });

  afterAll(async () => {
    await Promise.all(pools.map((p) => p.end().catch(() => undefined)));
    await admin?.end().catch(() => undefined);
    cleanup();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  const rebuild = (db: string, archive = "archive") => {
    const r = spawnSync(python, ["-m", "pipeline", "--archive", join(scratch, archive), "rebuild", "--db", `${baseUrl}/${db}`], {
      cwd: watchdog, encoding: "utf8",
    });
    if (r.status !== 0) throw new Error(`pipeline rebuild failed:\n${r.stdout}\n${r.stderr}`);
    return r.stdout;
  };

  const byDb = new Map<string, pg.Pool>(); // one small pool per database: a pool per question ran into Postgres' connection limit
  const ask = async (db: string, id: string, variables: unknown = EMPTY_FILTER) => {
    let pool = byDb.get(db);
    if (!pool) {
      pool = new pg.Pool({ connectionString: `${baseUrl}/${db}`, max: 2 });
      pools.push(pool);
      byDb.set(db, pool);
    }
    return createApi(postgresStore(pool), schema).respond({ id, variables });
  };

  it("shows the fixture's Total and Records, valid for the contract", async () => {
    const out = rebuild("rebuild_a");
    expect(out).toContain("loaded 4 records from 1 file(s)");
    expect(out).toContain("quarantined:"); // the 2022 Q2 file has the wrong headers

    const r = await ask("rebuild_a", mainScreen.sha256);
    expect(r.status).toBe(200);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(mainScreen.document), r.body.data, EMPTY_FILTER)).toEqual([]);

    const data = r.body.data as MainScreenQuery;
    expect(data.sources).toEqual([{ id: "SEAP", name: "SEAP", harvested: true, dataThrough: [{ kind: "DA", date: "2022-03-31" }] }]);
    expect(data.seap.search.total).toEqual({
      awarded: "1995075", // 120050 + 300000 + 1575025 bani; the blank-valued Record adds nothing
      records: 4,
      suspectLeftOut: 0,
      noValue: 1,
      frameworkCeilings: "0",
      estimated: false,
    });
    const { count, rows } = data.seap.search.records;
    expect(count).toBe(4);
    expect(rows.map((x) => x.record.code)).toEqual(["DA90000004", "DA90000002", "DA90000001", "DA90000003"]); // by value, then code
    expect(rows[0]!.record).toEqual({
      code: "DA90000004", title: "Lucrări de întreținere drumuri", date: "2022-03-31", kind: "DA",
      channel: "DIRECT_PURCHASE", procedure: null, value: "1575025", counted: "1575025", badges: [],
      authority: { key: "1000001", displayName: "COMUNA EXEMPLU (PRIMARIA COMUNEI EXEMPLU,JUDETUL TEST)", identity: "CUI" },
      winners: [{ naturalPerson: false, publishedName: "DRUMURI DEMO S.A.", share: null, entity: { key: "2000002", displayName: "DRUMURI DEMO S.A.", identity: "CUI" } }],
      signals: [],
    });
    expect(rows[3]!.record).toMatchObject({ code: "DA90000003", value: null, counted: null, badges: ["NO_VALUE"] });
    // nothing from the quarantined file (DA90000005) or from the unit whose manifest was never written (DA90000009)
    expect(JSON.stringify(data)).not.toMatch(/DA90000005|DA90000009/);
  });

  it("gives identical responses after a second rebuild into a fresh database (ADR 0004)", async () => {
    rebuild("rebuild_b"); // same archive, now with the failing unit already in quarantine
    const a = await ask("rebuild_a", mainScreen.sha256);
    const b = await ask("rebuild_b", mainScreen.sha256);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    rebuild("rebuild_a"); // and a rebuild over the same database
    expect(JSON.stringify(await ask("rebuild_a", mainScreen.sha256))).toBe(JSON.stringify(a));
  });

  it("serves a DA and a DAN by public code through the persisted RecordPage operation (#63)", async () => {
    const out = rebuild("bulk_a", "archive-bulk");
    expect(out).toContain("loaded 13 records from 5 file(s)");
    expect(out).toContain("quarantined:"); // the 2023 Q2 DA file has unknown headers
    const variables = (code: string) => ({ code });
    const page = async (code: string) => {
      const r = await ask("bulk_a", recordPage.sha256, variables(code));
      expect(r.body.errors).toBeUndefined();
      expect(validateResponse(schema, parse(recordPage.document), r.body.data, variables(code))).toEqual([]);
      return (r.body.data as RecordPageQuery).seap.record;
    };

    // a DA whose title holds a `|`, loaded from a pipe-shaped CSV
    expect(await page("DA91000002")).toMatchObject({
      code: "DA91000002", title: "Tub PVC 3|4 toli", date: "2022-03-29", kind: "DA", channel: "DIRECT_PURCHASE", value: "30000", counted: "30000",
      authority: { displayName: "SCOALA GIMNAZIALA EXEMPLU", identity: "CUI", key: "1000002" },
      winners: [{ publishedName: "CURAT EXEMPLU SRL", entity: { key: "2000001" } }],
      provenance: { source: "SEAP", kind: "BULK", via: "Achizitii directe 2022 - T1", fetchedAt: "2022-06-15T09:00:00Z" },
    });
    // a DAN from the 2024 CSV: "5,089" is 5089 RON, award date from `Data atribuire`
    expect(await page("DAN9100001")).toMatchObject({
      code: "DAN9100001", title: "SERVICII VULCANIZARE", date: "2024-01-02", kind: "DAN", channel: "DIRECT_PURCHASE", value: "508900",
      contractType: "Servicii", cpv: { code: "50112200-5", description: "Servicii de intretinere a automobilelor (Rev.2)" },
      winners: [{ publishedName: "S.C. BODIMPEX S.R.L.", entity: { key: "8499780" } }],
      provenance: { via: "Notificari de atribuire la cumpararea directa T I 2024" },
    });
    // a DAN from the 2025 XLSX: numeric CUIs come out as clean digit strings
    expect(await page("DAN9100020")).toMatchObject({
      kind: "DAN", value: "37313", authority: { key: "18308578" }, winners: [{ entity: { key: "12458924" } }],
    });
    // a Record from the quarantined file, and an unknown code: no such Record
    expect(await page("DA91000099")).toBeNull();
    expect(await page("DAN0000000")).toBeNull();
  });

  it("gives identical responses after a second rebuild of the bulk archive and after a byte-identical re-upload (#63)", async () => {
    const codes = ["DA91000002", "DA91000011", "DAN9100001", "DAN9100002", "DAN9100020", "DAN9100022", "DA91000099"];
    const snapshot = async (db: string) => {
      const out: unknown[] = [JSON.stringify(await ask(db, mainScreen.sha256))];
      for (const code of codes) out.push(JSON.stringify(await ask(db, recordPage.sha256, { code })));
      return out;
    };
    rebuild("bulk_a", "archive-bulk"); // a second rebuild over the same database (the first is in the previous test)
    const first = await snapshot("bulk_a");
    expect(first.filter((x) => (x as string).includes('"record":null')).length).toBe(1); // only the quarantined code is missing
    rebuild("bulk_a", "archive-bulk");
    expect(await snapshot("bulk_a")).toEqual(first);

    // the same DAN file fetched again on a later day: nothing changes in what the API says (only its fetch day differs)
    const again = join(scratch, "archive-bulk", "seap/bulk/dan/2024Q1");
    const dest = join(again, "2026-01-01");
    cpSync(join(again, "2024-06-20"), dest, { recursive: true });
    const manifest = join(dest, "manifest.json");
    writeFileSync(manifest, readFileSync(manifest, "utf8").replace(/"fetchedAt":\s*"[^"]*"/, '"fetchedAt": "2026-01-01T09:00:00Z"'));
    expect(rebuild("bulk_b", "archive-bulk")).toContain("skipped, same file already loaded");
    expect(await snapshot("bulk_b")).toEqual(first);
  });

  const contractPage = async (db: string, code: string) => {
    const variables = { code };
    const r = await ask(db, recordPage.sha256, variables);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(recordPage.document), r.body.data, variables)).toEqual([]);
    return (r.body.data as RecordPageQuery).seap.record;
  };

  it("serves contracts and award notices with their winners through the persisted RecordPage operation (#64)", async () => {
    const out = rebuild("contracts_a", "archive-contracts");
    expect(out).toContain("loaded 12 records from 6 file(s)");
    expect(out).toContain("quarantined:"); // the 2023 Q1 Contracte file has unknown headers

    // a contract recurring in a later quarter: ONE Record, carrying the newer notice version. The 2022 Q1 file, fetched again
    // last with the old version (value 999), changed nothing.
    expect(await contractPage("contracts_a", "CAN9000003~5")).toMatchObject({
      code: "CAN9000003~5", title: "Combustibil (actualizat)", date: "2021-12-27", kind: "CONTRACT", channel: "CONTRACT", procedure: "Licitatie deschisa",
      value: "15000", counted: "15000", authority: { displayName: "SPITALUL EXEMPLU", key: "1000001" },
      winners: [{ publishedName: "PETROL NOU SA", entity: { key: "2000005" } }],
      provenance: { source: "SEAP", kind: "BULK", via: "Contracte 2022 - T2", fetchedAt: "2022-09-15T09:00:00Z" },
    });
    // three lots of the same value count once; the second winner of lot 1 does not add it again
    const equal = await contractPage("contracts_a", "CAN9000001~C-100");
    expect(equal).toMatchObject({ value: "100000", counted: "100000" });
    expect(equal!.winners.map((w) => w.publishedName)).toEqual(["ALFA MOBILA SRL", "GAMMA LEMN SRL"]);
    // two lots of different values add; the winners come in the order of the file, not alphabetically
    const summed = await contractPage("contracts_a", "CAN9000002~77/2022");
    expect(summed).toMatchObject({ value: "120025", counted: "120025" });
    expect(summed!.winners.map((w) => w.publishedName)).toEqual(["BETA CHIMIE SRL", "ALFA CHIMIE SRL"]);
    // a contract number that holds a slash, from the 2025 XLSX (numeric CUIs, a float amount)
    expect(await contractPage("contracts_a", "CAN9000010~1398514/1")).toMatchObject({
      kind: "CONTRACT", value: "28963700", authority: { key: "4267117" }, winners: [{ entity: { key: "18165761" } }],
    });
    // an award notice, identified by its code: its two contracts add; the second notice has one contract and two winners
    expect(await contractPage("contracts_a", "CAN9100001")).toMatchObject({ kind: "AWARD_NOTICE", value: "3548058", date: "2024-11-11" });
    const notice = await contractPage("contracts_a", "CAN9100002");
    expect(notice).toMatchObject({ kind: "AWARD_NOTICE", value: "9880000" });
    expect(notice!.winners.map((w) => w.publishedName)).toEqual(["CENTRUL TOPMED DEMO", "ASOCIEREA DEMO"]);
    // no value in SEAP; and a contract of the quarantined file is not there
    expect(await contractPage("contracts_a", "CAN9000020~36181")).toMatchObject({ value: null, badges: ["NO_VALUE"] });
    expect(await contractPage("contracts_a", "CAN9000099~1")).toBeNull();
  });

  it("gives identical responses after a second rebuild of the contracts archive (#64)", async () => {
    const codes = ["CAN9000003~5", "CAN9000001~C-100", "CAN9000002~77/2022", "CAN9000010~21", "CAN9100001", "CAN9100002", "CAN9000099~1"];
    const snapshot = async (db: string) => {
      const out: unknown[] = [JSON.stringify(await ask(db, mainScreen.sha256))];
      for (const code of codes) out.push(JSON.stringify(await ask(db, recordPage.sha256, { code })));
      return out;
    };
    rebuild("contracts_a", "archive-contracts"); // over the database of the previous test
    const first = await snapshot("contracts_a");
    expect(first.filter((x) => (x as string).includes('"record":null')).length).toBe(1);
    rebuild("contracts_b", "archive-contracts"); // and into a fresh one (ADR 0004)
    expect(await snapshot("contracts_b")).toEqual(first);
  });

  const crawlRecord = async (code: string) => {
    const r = await ask("crawl_a", recordPage.sha256, { code });
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(recordPage.document), r.body.data, { code })).toEqual([]);
    return (r.body.data as RecordPageQuery).seap.record;
  };

  it("lets the bulk supersede a crawled Record, badges the survivors and gives them crawl provenance (#77)", async () => {
    const out = rebuild("crawl_a", "archive-crawl");
    expect(out).toContain("loaded 5 records from");
    expect(out).toContain("skipped, incomplete"); // the crawl day that was killed before its manifest

    // Q1, which the bulk has: its contract (150000 lei) was fetched BEFORE the crawl of the same contract (100000 lei) and still stands
    expect(await crawlRecord("CAN9200001~C-1")).toMatchObject({
      value: "15000000", counted: "15000000", badges: [], provenance: { source: "SEAP", kind: "BULK", via: "Contracte 2026 - T1", url: null },
    });
    // Q1: a crawled contract the bulk does not have survives, counts, and is badged crawl-only
    expect(await crawlRecord("CAN9200002~C-7")).toMatchObject({
      kind: "CONTRACT", channel: "CONTRACT", value: "2000050", counted: "2000050", badges: ["CRAWL_ONLY"], date: "2026-02-02",
      authority: { key: "1000001", displayName: "SPITALUL EXEMPLU" }, winners: [{ publishedName: "DRUMURI DEMO SA", entity: { key: "2000012" } }],
      provenance: { kind: "CRAWL", via: null, url: "https://e-licitatie.ro/pub/notices/ca-notices/view-c/92000012", fetchedAt: "2026-11-11T09:00:00Z" },
    });
    // Q2, which the bulk has not reached: provisional, with crawl provenance; the day's later re-crawl (80000, not 75000 lei) is the version served
    expect(await crawlRecord("CAN9200003~9/2026")).toMatchObject({
      value: "8000000", counted: "8000000", badges: ["CRAWLED_PROVISIONAL"], date: "2026-03-30",
      provenance: { kind: "CRAWL", via: null, url: "https://e-licitatie.ro/pub/notices/ca-notices/view-c/92000013", fetchedAt: "2026-11-12T09:00:00Z" },
    });
    // an SCNA links to its own route; a notice without a procedure is one award notice whose value adds its two contracts
    expect(await crawlRecord("SCNA9200004~S-1")).toMatchObject({ badges: ["CRAWLED_PROVISIONAL"], provenance: { url: "https://e-licitatie.ro/pub/notices/ca-notices/view-rfq/92000014" } });
    expect(await crawlRecord("CAN9200005")).toMatchObject({ kind: "AWARD_NOTICE", value: "350050", badges: ["CRAWLED_PROVISIONAL"], provenance: { kind: "CRAWL" } });
    // the day that never got its manifest is not in the graph
    expect(await crawlRecord("CAN9200009~G-1")).toBeNull();

    // the Records list shows the same badges, and the Total counts every Record once (the crawled survivors included)
    const main = await ask("crawl_a", mainScreen.sha256);
    expect(main.body.errors).toBeUndefined();
    const data = main.body.data as MainScreenQuery;
    expect(data.seap.search.total).toMatchObject({ awarded: "25650125", records: 5, noValue: 0 }); // 15000000 + 2000050 + 8000000 + 300025 + 350050
    const badges = Object.fromEntries(data.seap.search.records.rows.map((x) => [x.record.code, x.record.badges]));
    expect(badges).toEqual({
      "CAN9200001~C-1": [], "CAN9200002~C-7": ["CRAWL_ONLY"], "CAN9200003~9/2026": ["CRAWLED_PROVISIONAL"],
      "SCNA9200004~S-1": ["CRAWLED_PROVISIONAL"], CAN9200005: ["CRAWLED_PROVISIONAL"],
    });
  });

  it("reports a data-through date per record kind, the crawled kinds up to the first hole in the crawl (#77)", async () => {
    rebuild("crawl_a", "archive-crawl");
    const main = await ask("crawl_a", mainScreen.sha256);
    expect(validateResponse(schema, parse(mainScreen.document), main.body.data, EMPTY_FILTER)).toEqual([]);
    // the cursor is 2026-04-02. Contracts: the Contracte bulk covers 2026 Q1, so the crawl is complete through 04-02. Award notices: no
    // "fara anunt" bulk, so 2026-02-10 is followed by a hole (02-11..03-31 never crawled): complete only through 2026-02-10;
    // the crawled Records' own dates (up to 04-01) do not hide the hole, and the unfinished 2026-04-03 does not count
    expect((main.body.data as MainScreenQuery).sources).toEqual([{
      id: "SEAP", name: "SEAP", harvested: true,
      dataThrough: [{ kind: "AWARD_NOTICE", date: "2026-02-10" }, { kind: "CONTRACT", date: "2026-04-02" }],
    }]);
    // and a bulk-only archive keeps reporting its latest publication date, as before
    const bulkOnly = await ask("bulk_a", mainScreen.sha256);
    expect((bulkOnly.body.data as MainScreenQuery).sources[0]!.dataThrough.map((d) => d.kind)).toEqual(["DA", "DAN"]);
  });

  it("gives identical responses after a second rebuild of the crawl archive, over it and into a fresh database (#77, ADR 0004)", async () => {
    const codes = ["CAN9200001~C-1", "CAN9200002~C-7", "CAN9200003~9/2026", "SCNA9200004~S-1", "CAN9200005", "CAN9200009~G-1"];
    const snapshot = async (db: string) => {
      const out: unknown[] = [JSON.stringify(await ask(db, mainScreen.sha256))];
      for (const code of codes) out.push(JSON.stringify(await ask(db, recordPage.sha256, { code })));
      return out;
    };
    rebuild("crawl_a", "archive-crawl");
    const first = await snapshot("crawl_a");
    rebuild("crawl_a", "archive-crawl");
    expect(await snapshot("crawl_a")).toEqual(first);
    rebuild("crawl_b", "archive-crawl");
    expect(await snapshot("crawl_b")).toEqual(first);
  });

  it("refuses a query that is not on the allowlist, even against loaded data", async () => {
    const pool = new pg.Pool({ connectionString: `${baseUrl}/rebuild_a`, max: 1 });
    pools.push(pool);
    const api = createApi(postgresStore(pool), schema);
    const text = await api.respond({ query: "{ seap { search(filter: {}) { total { awarded } } } }" });
    expect(text.status).toBe(400);
    expect(text.body.data).toBeUndefined();
    expect((await api.respond({ id: "f".repeat(64), variables: EMPTY_FILTER })).status).toBe(400);
  });
});

async function waitForPostgres(pool: pg.Pool): Promise<void> {
  const deadline = Date.now() + 90_000;
  for (;;) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (e) {
      if (Date.now() > deadline) throw new Error("Postgres did not come up", { cause: e });
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
