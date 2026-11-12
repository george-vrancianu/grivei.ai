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
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { graphql, parse } from "graphql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema, validateResponse } from "@grivei/contract/node";
import type { EntityOverviewQuery, FullResultsSuppliersQuery, MainScreenQuery, RecordPageQuery } from "@grivei/contract";
import { createApi } from "../src/server.ts";
import { rootValue } from "../src/resolvers.ts";
import { cancellableQuery } from "../src/search.ts";
import { cachedStore, canonicalFilter } from "../src/cache.ts";
import { postgresStore } from "../src/store.ts";

const here = dirname(fileURLToPath(import.meta.url));
const watchdog = resolve(here, "../../../../watchdog");
const fixtureArchive = join(watchdog, "tests/fixtures/archive");
const bulkArchive = join(watchdog, "tests/fixtures/archive-bulk"); // DA + DAN: renamed headers, quirks, a quarantined file (#63)
const contractsArchive = join(watchdog, "tests/fixtures/archive-contracts"); // Contracte + "fara anunt": recurring contract, lots, winners (#64)
const crawlArchive = join(watchdog, "tests/fixtures/archive-crawl"); // a Q1 bulk file + crawl days: superseded, crawl-only, provisional, re-crawl, an unfinished day (#77)
const backfillArchive = join(watchdog, "tests/fixtures/archive-backfill"); // backfilled weeks (2021-22 and 2023-today) beside a 2023 Q1 bulk (#78)
const identityArchive = join(watchdog, "tests/fixtures/archive-identity"); // every identity case, with archived ANAF answers (#66)
const identityOverrides = join(watchdog, "tests/fixtures/identity-overrides.toml");
const placementArchive = join(watchdog, "tests/fixtures/archive-placement"); // authorities placed by commune, village, sector, SEAP; national ones; the geography snapshots (#67)
const placementData = join(watchdog, "tests/fixtures/placement-data"); // the UAT table `geo-table` made of those snapshots, and the reviewed files
const countingArchive = join(watchdog, "tests/fixtures/archive-counting"); // every case of the counting rule, with archived estimated-value answers (#65)
const coverageArchive = join(watchdog, "tests/fixtures/archive-coverage"); // one cell of every Coverage grid state, rebuilt as of 2025-09-20 (#79)
const coverageGaps = join(watchdog, "tests/fixtures/coverage-known-gaps.csv");
const searchArchive = join(watchdog, "tests/fixtures/archive-search"); // one Record per matching rule, a consortium, tied sums (#68)
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
const fullSuppliers = allowlist.operations.find((o) => o.name === "FullResultsSuppliers")!;
const entityOverview = allowlist.operations.find((o) => o.name === "EntityOverview")!;
const zoomedCounty = allowlist.operations.find((o) => o.name === "ZoomedCounty")!;
// The authorities of the placement fixture (watchdog/tests/fixtures/build_placement_archive.py): CUIs with valid check digits, invented.
const P = {
  sanpetru: "51000005", caragiale: "51000102", apahida: "51000200", rasnov: "51000307", sinca: "51000404", brasov: "51000501", bucharest3: "51000609",
  unmatched: "51000706", seap: "51000803", unplaced: "51000900", ministry: "51001000", agency: "51001108", dsp: "51001205", huedin: "51001302",
} as const;
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
    cpSync(backfillArchive, join(scratch, "archive-backfill"), { recursive: true });
    cpSync(identityArchive, join(scratch, "archive-identity"), { recursive: true });
    cpSync(placementArchive, join(scratch, "archive-placement"), { recursive: true });
    cpSync(countingArchive, join(scratch, "archive-counting"), { recursive: true });
    cpSync(coverageArchive, join(scratch, "archive-coverage"), { recursive: true });
    cpSync(searchArchive, join(scratch, "archive-search"), { recursive: true });
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
    await admin.query("CREATE DATABASE backfill_a");
    await admin.query("CREATE DATABASE backfill_b");
    await admin.query("CREATE DATABASE identity_a");
    await admin.query("CREATE DATABASE identity_b");
    await admin.query("CREATE DATABASE placement_a");
    await admin.query("CREATE DATABASE placement_b");
    await admin.query("CREATE DATABASE counting_a");
    await admin.query("CREATE DATABASE counting_b");
    await admin.query("CREATE DATABASE coverage_a");
    await admin.query("CREATE DATABASE coverage_b");
    await admin.query("CREATE DATABASE search_a");
    await admin.query("CREATE DATABASE rollup_a");
    await admin.query("CREATE DATABASE rollup_b");
  });

  afterAll(async () => {
    await Promise.all(pools.map((p) => p.end().catch(() => undefined)));
    await admin?.end().catch(() => undefined);
    cleanup();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  const rebuild = (db: string, archive = "archive", extra: string[] = []) => {
    const r = spawnSync(python, ["-m", "pipeline", "--archive", join(scratch, archive), "rebuild", "--db", `${baseUrl}/${db}`, ...extra], {
      cwd: watchdog, encoding: "utf8",
    });
    if (r.status !== 0) throw new Error(`pipeline rebuild failed:\n${r.stdout}\n${r.stderr}`);
    return r.stdout;
  };

  const apis = new Map<string, ReturnType<typeof createApi>>(); // one pool per database: a response needs a few connections, a test asks for many
  const ask = async (db: string, id: string, variables: unknown = EMPTY_FILTER) => {
    let api = apis.get(db);
    if (!api) {
      const pool = new pg.Pool({ connectionString: `${baseUrl}/${db}`, max: 2 });
      pools.push(pool);
      api = createApi(postgresStore(pool), schema);
      apis.set(db, api);
    }
    return api.respond({ id, variables });
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
      // the fixture's CUIs fail the check digit (and no ANAF answer confirms them): the authority and the winner are name-keyed (ADR 0003)
      authority: { key: "name-comuna-exemplu-primaria-comunei-exemplu-judetul-test", displayName: "COMUNA EXEMPLU (PRIMARIA COMUNEI EXEMPLU,JUDETUL TEST)", identity: "NAME_ONLY" },
      winners: [{ naturalPerson: false, publishedName: "DRUMURI DEMO S.A.", share: null, entity: { key: "name-drumuri-demo-sa", displayName: "DRUMURI DEMO S.A.", identity: "NAME_ONLY" } }],
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
      authority: { displayName: "SCOALA GIMNAZIALA EXEMPLU", identity: "NAME_ONLY", key: "name-scoala-gimnaziala-exemplu" },
      winners: [{ publishedName: "CURAT EXEMPLU SRL", entity: { key: "name-curat-exemplu-srl" } }],
      provenance: { source: "SEAP", kind: "BULK", via: "Achizitii directe 2022 - T1", fetchedAt: "2022-06-15T09:00:00Z" },
    });
    // a DAN from the 2024 CSV: "5,089" is 5089 RON, award date from `Data atribuire`
    expect(await page("DAN9100001")).toMatchObject({
      code: "DAN9100001", title: "SERVICII VULCANIZARE", date: "2024-01-02", kind: "DAN", channel: "DIRECT_PURCHASE", value: "508900",
      contractType: "Servicii", cpv: { code: "50112200-5", description: "Servicii de intretinere a automobilelor (Rev.2)" },
      winners: [{ publishedName: "S.C. BODIMPEX S.R.L.", entity: { key: "name-sc-bodimpex-srl" } }],
      provenance: { via: "Notificari de atribuire la cumpararea directa T I 2024" },
    });
    // a DAN from the 2025 XLSX: the authority's numeric CUI (it passes the check digit) is its key; the winner's is no ANAF answer, so name-keyed
    expect(await page("DAN9100020")).toMatchObject({
      kind: "DAN", value: "37313", authority: { key: "18308578" }, winners: [{ entity: { key: "name-sc-trans-sped-sa" } }],
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
      value: "15000", counted: "15000", authority: { displayName: "SPITALUL EXEMPLU", key: "name-spitalul-exemplu" },
      winners: [{ publishedName: "PETROL NOU SA", entity: { key: "name-petrol-nou-sa" } }],
      provenance: { source: "SEAP", kind: "BULK", via: "Contracte 2022 - T2", fetchedAt: "2022-09-15T09:00:00Z" },
    });
    // three lots of the same value count once; the second winner of lot 1 does not add it again
    const equal = await contractPage("contracts_a", "CAN9000001~C-100");
    expect(equal).toMatchObject({ value: "100000", counted: "100000" });
    expect(equal!.winners.map((w) => w.publishedName)).toEqual(["ALFA MOBILA SRL", "GAMMA LEMN SRL"]);
    // two lots of different values add; the winners come in the order of the file, not alphabetically
    const summed = await contractPage("contracts_a", "CAN9000002~77/2022");
    expect(summed).toMatchObject({ value: "120025", counted: null, badges: ["FRAMEWORK_CEILING", "CONSORTIUM_SHARE"] }); // a framework ceiling (Cu acord cadru): shown, never counted (#65)
    expect(summed!.winners.map((w) => w.publishedName)).toEqual(["BETA CHIMIE SRL", "ALFA CHIMIE SRL"]);
    // a contract number that holds a slash, from the 2025 XLSX (numeric CUIs, a float amount)
    expect(await contractPage("contracts_a", "CAN9000010~1398514/1")).toMatchObject({
      kind: "CONTRACT", value: "28963700", authority: { key: "4267117" }, winners: [{ entity: { key: "name-uti-facility-sa" } }],
    });
    // an award notice, identified by its code: its two contracts add; the second notice has one contract and two winners
    expect(await contractPage("contracts_a", "CAN9100001")).toMatchObject({ kind: "AWARD_NOTICE", value: "3548058", date: "2024-11-11" });
    const notice = await contractPage("contracts_a", "CAN9100002");
    expect(notice).toMatchObject({ kind: "AWARD_NOTICE", value: "9880000", counted: "9880000", badges: ["CONSORTIUM_SHARE"] });
    expect(notice!.winners.map((w) => w.share)).toEqual(["4940000", "4940000"]); // equal shares that sum back to the value (#65)
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
      authority: { key: "name-spitalul-exemplu", displayName: "SPITALUL EXEMPLU" }, winners: [{ publishedName: "DRUMURI DEMO SA", entity: { key: "name-drumuri-demo-sa" } }],
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

  const backfillRecord = async (code: string) => {
    const r = await ask("backfill_a", recordPage.sha256, { code });
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(recordPage.document), r.body.data, { code })).toEqual([]);
    return (r.body.data as RecordPageQuery).seap.record;
  };

  it("loads backfilled Records into the totals with crawl provenance and the procedure type, and lets the 2023+ bulk supersede (#78)", async () => {
    const out = rebuild("backfill_a", "archive-backfill");
    expect(out).toContain("loaded 7 records from");
    expect(out).toContain("skipped, incomplete"); // the 2021 week that was killed before its manifest

    // 2021-22: awards without a prior call, as crawled (value as of the crawl date), counted although the bulk has no 2021-22 file of the kind
    expect(await backfillRecord("CAN9400001")).toMatchObject({
      kind: "AWARD_NOTICE", channel: "CONTRACT", procedure: "Negociere fara publicare prealabila", value: "350050", counted: "350050", date: "2021-04-02",
      badges: ["CRAWL_ONLY"], winners: [{ publishedName: "AVOCATI DEMO" }],
      provenance: { source: "SEAP", kind: "CRAWL", via: null, url: "https://e-licitatie.ro/pub/notices/ca-notices/view-c/94000011", fetchedAt: "2026-11-11T09:00:00Z" },
    });
    expect(await backfillRecord("CAN9400002")).toMatchObject({ procedure: "Procedura simplificata proprie", value: "5000000", provenance: { kind: "CRAWL", fetchedAt: "2026-11-11T09:00:00Z" } });
    expect(await backfillRecord("CAN9400004")).toMatchObject({
      kind: "AWARD_NOTICE", procedure: "Norme proprii (Anexa 2)", value: "1200000", date: "2022-12-27", provenance: { kind: "CRAWL", fetchedAt: "2026-11-12T09:00:00Z" },
    });
    // listed but dropped (it has a procedure), and a week without a manifest: neither is in the graph
    expect(await backfillRecord("CAN9400003")).toBeNull();
    expect(await backfillRecord("CAN9400003~M-1")).toBeNull();
    expect(await backfillRecord("CAN9400009")).toBeNull();

    // 2023-today pass: the bulk (fetched after the backfill) has the same identity with another value and wins; the one it lacks survives
    // (Pass 2 only lists a week once its bulk is archived, so a Record is superseded only when a bulk file is fetched or re-uploaded later: not a selection bug.)
    expect(await backfillRecord("CAN9300001~B-1")).toMatchObject({
      kind: "CONTRACT", value: "15000000", counted: "15000000", badges: [], provenance: { kind: "BULK", via: "Contracte 2023 - T1", url: null },
    });
    expect(await backfillRecord("CAN9300002~B-2")).toMatchObject({
      kind: "CONTRACT", value: "2000050", badges: ["CRAWL_ONLY"], provenance: { kind: "CRAWL", fetchedAt: "2026-11-11T09:00:00Z" },
    });

    // the totals count every Record once: 3 backfilled 2021-22 + the backfilled survivor + 3 bulk (the superseded one counted once)
    const main = await ask("backfill_a", mainScreen.sha256);
    expect(main.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(mainScreen.document), main.body.data, EMPTY_FILTER)).toEqual([]);
    const data = main.body.data as MainScreenQuery;
    expect(data.seap.search.total).toMatchObject({ awarded: "24280100", records: 7, noValue: 0 }); // 350050 + 5000000 + 1200000 + 2000050 + 15000000 + 30000 + 700000

    // `no-publication` (#74) selects award notices by procedure type. The API has no procedure filter yet (a non-empty filter is NOT_IMPLEMENTED),
    // so this asserts what the Records list carries for the rule to select on: the kind and the procedure, on the backfilled Records only
    const rows = data.seap.search.records.rows.map((x) => x.record);
    expect(rows.filter((r) => r.kind === "AWARD_NOTICE" && r.procedure === "Negociere fara publicare prealabila").map((r) => r.code)).toEqual(["CAN9400001"]);
    expect(rows.filter((r) => r.kind === "AWARD_NOTICE").map((r) => [r.code, r.procedure]).sort()).toEqual([
      ["CAN9300011", "Norme proprii (Anexa 2B)"], ["CAN9400001", "Negociere fara publicare prealabila"], ["CAN9400002", "Procedura simplificata proprie"],
      ["CAN9400004", "Norme proprii (Anexa 2)"],
    ]);

    // the backfill is not the nightly crawl: no crawl day, so the data-through dates are the bulk's alone (the backfilled 2021-22 dates do not move them)
    expect(data.sources).toEqual([{ id: "SEAP", name: "SEAP", harvested: true, dataThrough: [{ kind: "AWARD_NOTICE", date: "2023-01-05" }, { kind: "CONTRACT", date: "2023-01-06" }] }]);
  });

  it("gives identical responses after a second rebuild of the backfill archive, over it and into a fresh database (#78, ADR 0004)", async () => {
    const codes = ["CAN9400001", "CAN9400002", "CAN9400003", "CAN9400004", "CAN9400009", "CAN9300001~B-1", "CAN9300002~B-2", "CAN9300003~B-3", "CAN9300011"];
    const snapshot = async (db: string) => {
      const out: unknown[] = [JSON.stringify(await ask(db, mainScreen.sha256))];
      for (const code of codes) out.push(JSON.stringify(await ask(db, recordPage.sha256, { code })));
      return out;
    };
    rebuild("backfill_a", "archive-backfill");
    const first = await snapshot("backfill_a");
    rebuild("backfill_a", "archive-backfill");
    expect(await snapshot("backfill_a")).toEqual(first);
    rebuild("backfill_b", "archive-backfill");
    expect(await snapshot("backfill_b")).toEqual(first);
  });

  // ---- supplier identity (#66, ADR 0003) ----------------------------------------------------------------------------------

  const CNPS = ["1990101123456", "2950202123456", "199010112", "295020212"]; // the fixture's invented CNPs, whole and in part
  const PEOPLE = ["POPESCU ION FICTIV", "IONESCU MARIA FICTIV", "POPESCU X FICTIV"];
  const IDENTITY_CODES = [
    "DA93000001", "DA93000002", "DA93000003", "DA93000004", "DA93000005", "DA93000006", "DA93000007", "DA93000008", "DA93000009", "DA93000010",
    "DA93000011", "DA93000012", "DA93000013", "DA93000014", "DA93000015", "DA93000016", "DA93000017", "DA93000018", "CAN9700001~C-1",
  ];
  const identityRecord = async (db: string, code: string) => {
    const variables = { code };
    const r = await ask(db, recordPage.sha256, variables);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(recordPage.document), r.body.data, variables)).toEqual([]);
    return (r.body.data as RecordPageQuery).seap.record!;
  };
  const entityPage = async (db: string, key: string, role: "AUTHORITY" | "SUPPLIER" = "SUPPLIER") => {
    const variables = { key, role };
    const r = await ask(db, entityOverview.sha256, variables);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(entityOverview.document), r.body.data, variables)).toEqual([]);
    return (r.body.data as EntityOverviewQuery).entity;
  };

  it("resolves every identity case through the persisted RecordPage operation (#66)", async () => {
    const out = rebuild("identity_a", "archive-identity", ["--identity-overrides", identityOverrides]);
    expect(out).toContain("loaded 19 records from 2 file(s)");
    expect(out).toContain("anaf: 8 CUIs found, 2 not found");

    const winner = async (code: string, i = 0) => (await identityRecord("identity_a", code)).winners[i]!;
    // an ANAF-confirmed CUI: the key, whatever the SEAP spelling (three spellings, one entity)
    for (const code of ["DA93000001", "DA93000002", "DA93000003"]) {
      expect((await winner(code)).entity).toEqual({ key: "2000007", displayName: "ȘANTIERUL ȚARA DEMO SRL", identity: "CUI" });
    }
    expect(await winner("DA93000002")).toMatchObject({ publishedName: "S.C. SANTIERUL TARA DEMO S.R.L.", naturalPerson: false });
    expect((await identityRecord("identity_a", "DA93000001")).badges).toEqual([]);
    expect((await identityRecord("identity_a", "DA93000003")).badges).toEqual(["NAME_DIFFERS_FROM_ANAF"]); // the old name
    expect((await identityRecord("identity_a", "DA93000010")).badges).toEqual(["NAME_DIFFERS_FROM_ANAF"]); // RCS & RDS -> DIGI
    // a CUI ANAF does not know, a bad check digit, a foreign VAT id, a name: name-only suppliers
    expect((await winner("DA93000004")).entity).toEqual({ key: "name-furnizor-necunoscut-srl", displayName: "FURNIZOR NECUNOSCUT SRL", identity: "NAME_ONLY" });
    expect((await winner("DA93000005")).entity).toMatchObject({ key: "name-cifra-gresita-srl", identity: "NAME_ONLY" });
    expect((await winner("DA93000006")).entity).toEqual({ key: "vat-bg103029862", displayName: "BALKAN TRADING OOD", identity: "NAME_ONLY" });
    expect((await winner("DA93000007")).entity).toMatchObject({ key: "name-servicii-fara-cui-srl", identity: "NAME_ONLY" });
    // a CNP: a natural person, no entity, no name; the Record still has its authority
    const person = await identityRecord("identity_a", "DA93000008");
    expect(person.winners).toEqual([{ naturalPerson: true, publishedName: null, share: null, entity: null }]);
    expect(person.authority).toEqual({ key: "1000009", displayName: "COMUNA EXEMPLU", identity: "CUI" });
    // a supplier CUI equal to the authority's: unresolved, with the CUI mismatch badge
    expect((await winner("DA93000009")).entity).toMatchObject({ key: "name-primaria-comuna-exemplu", identity: "NAME_ONLY" });
    expect((await identityRecord("identity_a", "DA93000009")).badges).toEqual(["CUI_MISMATCH"]);
    // the override file: a pinned key, and a wrong CUI mapped to the entity it really is; both Records say so
    expect((await winner("DA93000012")).entity).toEqual({ key: "consortium-podul-exemplu", displayName: "Asocierea pentru Podul Exemplu", identity: "NAME_ONLY" });
    expect((await identityRecord("identity_a", "DA93000012")).badges).toEqual(["IDENTITY_CURATED"]);
    expect((await winner("DA93000013")).entity).toMatchObject({ key: "2000066", displayName: "DESTINATAR DEMO SRL" });
    expect((await identityRecord("identity_a", "DA93000013")).badges).toEqual(["NAME_DIFFERS_FROM_ANAF", "IDENTITY_CURATED"]);
    // a consortium keeps its members in file order, the person among them unnamed
    const consortium = await identityRecord("identity_a", "CAN9700001~C-1");
    expect(consortium.winners.map((w) => [w.naturalPerson, w.publishedName, w.entity?.key ?? null])).toEqual([
      [false, "SANTIERUL TARA DEMO SRL", "2000007"], [true, null, null], [false, "BALKAN TRADING OOD", "vat-bg103029862"],
    ]);
    expect(consortium.authority.key).toBe("1000017");
  });

  it("serves entity(key) with identity, aliases, ANAF status, curation, provenance and roles through the persisted EntityOverview operation (#66)", async () => {
    const renamed = (await entityPage("identity_a", "2000007"))!;
    expect(renamed).toMatchObject({
      key: "2000007", displayName: "ȘANTIERUL ȚARA DEMO SRL", identity: "CUI", cui: "2000007", foreignVatId: null, anafStatus: "ACTIV", identityCurated: false,
      seap: { roles: ["SUPPLIER"] },
    });
    expect(renamed.provenance).toEqual([{ source: "ANAF", url: null, via: null, kind: "API", fetchedAt: "2026-11-01T08:00:00Z" }]);
    expect(renamed.aliases).toEqual([
      { name: "SANTIERUL TARA DEMO SRL", records: 3, first: "2023-02-20", last: "2023-03-26", differsFromAnaf: false },
      { name: "S.C. SANTIERUL TARA DEMO S.R.L.", records: 1, first: "2023-03-11", last: "2023-03-11", differsFromAnaf: false },
      { name: "TARA VECHE CONSTRUCT SA", records: 1, first: "2023-03-12", last: "2023-03-12", differsFromAnaf: true },
    ]);
    // ANAF status RADIERE; a foreign VAT id; a pinned and curated key
    expect(await entityPage("identity_a", "2000031")).toMatchObject({ anafStatus: "RADIERE", identity: "CUI" });
    expect(await entityPage("identity_a", "vat-bg103029862")).toMatchObject({
      identity: "NAME_ONLY", cui: null, foreignVatId: "BG103029862", anafStatus: null, provenance: [{ source: "SEAP", kind: "BULK", url: null }],
    });
    expect(await entityPage("identity_a", "consortium-podul-exemplu")).toMatchObject({ identityCurated: true, anafStatus: null });
    expect(await entityPage("identity_a", "2000066")).toMatchObject({ identityCurated: true, seap: { roles: ["SUPPLIER"] } });
    // both roles in one entity (the authority of the contract and of DA93000017, and the winner of DA93000016)
    expect((await entityPage("identity_a", "1000017"))!.seap.roles).toEqual(["AUTHORITY", "SUPPLIER"]);
    // no such entity
    expect(await entityPage("identity_a", "name-nobody")).toBeNull();
  });

  it("keeps two homonymous suppliers with different CUIs as two entities (#66)", async () => {
    const [one, two] = [(await entityPage("identity_a", "2000074"))!, (await entityPage("identity_a", "2000082"))!];
    expect(one.displayName).toBe("DRUM CONSTRUCT DEMO SRL");
    expect(two.displayName).toBe(one.displayName);
    expect(one.key).not.toBe(two.key);
    expect(one.aliases).toHaveLength(1);
    expect(two.aliases).toHaveLength(1);
    expect((await identityRecord("identity_a", "DA93000014")).winners[0]!.entity!.key).toBe("2000074");
    expect((await identityRecord("identity_a", "DA93000015")).winners[0]!.entity!.key).toBe("2000082");
  });

  it("never serves a CNP or a natural person's name in any response (#66)", async () => {
    const keys = ["1000009", "1000017", "2000007", "2000023", "2000031", "2000066", "2000074", "2000082", "vat-bg103029862", "consortium-podul-exemplu",
      "name-furnizor-necunoscut-srl", "name-cifra-gresita-srl", "name-servicii-fara-cui-srl", "name-primaria-comuna-exemplu"];
    const responses: unknown[] = [await ask("identity_a", mainScreen.sha256)];
    for (const code of IDENTITY_CODES) responses.push(await ask("identity_a", recordPage.sha256, { code }));
    for (const key of keys) for (const role of ["AUTHORITY", "SUPPLIER"] as const) responses.push(await ask("identity_a", entityOverview.sha256, { key, role }));
    const text = JSON.stringify(responses);
    expect(text.length).toBeGreaterThan(5000); // the scan has something to scan
    for (const needle of [...CNPS, ...PEOPLE]) expect(text).not.toContain(needle);
    // and the person is not reachable by a made-up key either
    for (const key of ["name-popescu-ion-fictiv", "name-popescu-x-fictiv", "1990101123456", "name-ionescu-maria-fictiv"]) expect(await entityPage("identity_a", key)).toBeNull();
  });

  it("gives identical responses after a second rebuild of the identity archive into a fresh database (#66, ADR 0004)", async () => {
    const snapshot = async (db: string) => {
      const out: unknown[] = [JSON.stringify(await ask(db, mainScreen.sha256))];
      for (const code of IDENTITY_CODES) out.push(JSON.stringify(await ask(db, recordPage.sha256, { code })));
      for (const key of ["2000007", "vat-bg103029862", "consortium-podul-exemplu", "1000017"]) out.push(JSON.stringify(await ask(db, entityOverview.sha256, { key, role: "SUPPLIER" })));
      return out;
    };
    rebuild("identity_b", "archive-identity", ["--identity-overrides", identityOverrides]);
    expect(await snapshot("identity_b")).toEqual(await snapshot("identity_a"));
  });

  // ---- placement (#67) ------------------------------------------------------------------------------------------------------
  const placementRebuild = (db: string, geo: string) =>
    rebuild(db, "archive-placement", ["--placement-data", placementData, "--geo-dir", join(scratch, geo)]);
  /** A query the persisted operations do not carry (`locality`, `counties`): run in-process against the same resolvers, not through the HTTP door. */
  interface Placed {
    county: { code: string; name: string } | null;
    uat: { siruta: string; name: string; county: { code: string } } | null;
    locality: string | null;
    national: boolean;
    placedBy: string;
  }
  interface AdhocData {
    entity: { placement: Placed | null };
    counties: { code: string; name: string }[];
  }
  const adhoc = async (db: string, source: string, variableValues?: Record<string, unknown>) => {
    await ask(db, mainScreen.sha256); // makes the database's pool
    const pool = pools.find((p) => (p.options as { connectionString?: string }).connectionString === `${baseUrl}/${db}`)!;
    const r = await graphql({ schema, source, rootValue: rootValue(postgresStore(pool)), variableValues });
    expect(r.errors).toBeUndefined();
    return r.data as unknown as AdhocData;
  };
  const placementOf = async (db: string, key: string) =>
    (await adhoc(db, `query($k: ID!) { entity(key: $k) { placement { county { code name } uat { siruta name county { code } } locality national placedBy } } }`, { k: key })).entity.placement as Placed | null;
  const BV = { code: "RO-BV", name: "Brașov" };

  it("places authorities by commune, village, town, municipality and Bucharest sector, and via SEAP with the postal-code tiebreak (#67)", async () => {
    const out = placementRebuild("placement_a", "geo-a");
    expect(out).toContain("placement: ");
    expect(out).toContain("geo: 3 county outlines and 15 UAT outlines");
    // a commune; and a village of the commune: the village SIRUTA is stored (`locality`), the UAT is what is plotted
    expect(await placementOf("placement_a", P.apahida)).toEqual({ county: { code: "RO-CJ", name: "Cluj" }, uat: { siruta: "990020", name: "Apahida", county: { code: "RO-CJ" } }, locality: null, national: false, placedBy: "ANAF" });
    expect(await placementOf("placement_a", P.sanpetru)).toEqual({ county: BV, uat: { siruta: "880010", name: "Sânpetru", county: { code: "RO-BV" } }, locality: "880011", national: false, placedBy: "ANAF" });
    // a town (Î for Â), a municipality, comma-below against cedilla, initials
    expect((await placementOf("placement_a", P.rasnov))?.uat).toMatchObject({ siruta: "880030", name: "Râșnov" });
    expect((await placementOf("placement_a", P.brasov))?.uat).toMatchObject({ siruta: "880001", name: "Brașov" });
    expect((await placementOf("placement_a", P.sinca))?.uat).toMatchObject({ siruta: "880060", name: "Șinca Nouă" });
    expect((await placementOf("placement_a", P.caragiale))?.uat).toMatchObject({ siruta: "990010", name: "I. L. Caragiale" });
    // a Bucharest sector
    expect(await placementOf("placement_a", P.bucharest3)).toEqual({ county: { code: "RO-B", name: "București" }, uat: { siruta: "179169", name: "Sector 3", county: { code: "RO-B" } }, locality: null, national: false, placedBy: "ANAF" });
    // a CUI ANAF misses: SEAP's entity view says `Sanpetru`, Brasov; the postal code 507301 picks the village of Ucea, not the commune
    expect(await placementOf("placement_a", P.seap)).toEqual({ county: BV, uat: { siruta: "880050", name: "Ucea", county: { code: "RO-BV" } }, locality: "880052", national: false, placedBy: "SEAP" });
    // the same persisted operation the app uses, valid for the contract
    const variables = { key: P.sanpetru, role: "AUTHORITY" as const };
    const r = await ask("placement_a", entityOverview.sha256, variables);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(entityOverview.document), r.body.data, variables)).toEqual([]);
    expect((r.body.data as EntityOverviewQuery).entity!.placement).toEqual({ county: BV, uat: { siruta: "880010", name: "Sânpetru" }, national: false, placedBy: "ANAF" });
    // a supplier ANAF places is placed too
    expect((await placementOf("placement_a", "2000007"))?.uat).toMatchObject({ siruta: "880001" });
  });

  it("keeps the county when the UAT does not match, and leaves an authority neither source places unplaced (#67)", async () => {
    expect(await placementOf("placement_a", P.unmatched)).toEqual({ county: BV, uat: null, locality: null, national: false, placedBy: "ANAF" });
    expect(await placementOf("placement_a", P.unplaced)).toBeNull();
    expect((await entityPage("placement_a", P.unplaced, "AUTHORITY"))!.placement).toBeNull();
  });

  it("flags a national authority from the award notice or the reviewed file and does not place it in Bucharest (#67)", async () => {
    // both have their seat in a Bucharest sector; neither is served a county or a UAT
    for (const key of [P.ministry, P.agency]) {
      expect(await placementOf("placement_a", key)).toEqual({ county: null, uat: null, locality: null, national: true, placedBy: "ANAF" });
      expect((await entityPage("placement_a", key, "AUTHORITY"))!.placement).toEqual({ county: null, uat: null, national: true, placedBy: "ANAF" });
    }
    // a county unit whose notice says "central" and "deconcentrated": no file line needed, it plots in its own county
    expect(await placementOf("placement_a", P.dsp)).toMatchObject({ county: BV, uat: { siruta: "880001" }, national: false });
    // a town whose notice wrongly says central: the reviewed file overrides it
    expect(await placementOf("placement_a", P.huedin)).toMatchObject({ national: false, uat: { name: "Huedin" } });
    // a local authority's notice says local
    expect((await placementOf("placement_a", P.brasov))?.national).toBe(false);
  });

  it("serves counties, and the UATs of a county: Bucharest's are its six sectors (#67)", async () => {
    const { counties } = await adhoc("placement_a", "{ counties { code name } }");
    expect(counties).toHaveLength(42);
    expect(counties[0]).toEqual({ code: "RO-AB", name: "Alba" });
    expect(counties).toContainEqual({ code: "RO-B", name: "București" });
    expect(counties.map((c: { code: string }) => c.code)).toEqual([...counties.map((c: { code: string }) => c.code)].sort());
    const zoom = async (county: string) => {
      const variables = { filter: {}, county };
      const r = await ask("placement_a", zoomedCounty.sha256, variables);
      expect(r.body.errors).toBeUndefined();
      expect(validateResponse(schema, parse(zoomedCounty.document), r.body.data, variables)).toEqual([]);
      return (r.body.data as { uats: { siruta: string; name: string; county: { code: string; name: string } }[] }).uats;
    };
    const sectors = await zoom("RO-B");
    expect(sectors.map((u) => [u.siruta, u.name])).toEqual([["179141", "Sector 1"], ["179150", "Sector 2"], ["179169", "Sector 3"], ["179178", "Sector 4"], ["179187", "Sector 5"], ["179196", "Sector 6"]]);
    expect(sectors.every((u) => u.county.code === "RO-B" && u.county.name === "București")).toBe(true);
    expect((await zoom("RO-BV")).map((u) => u.name)).toEqual(["Brașov", "Râșnov", "Șinca Nouă", "Sânpetru", "Ucea"]);
    expect(await zoom("RO-IS")).toEqual([]); // a county with no UAT in this fixture's table
  });

  it("filters the main screen by the county and the UAT of the authority's placement (#67)", async () => {
    const keys = async (filter: Record<string, unknown>) => {
      const r = await ask("placement_a", mainScreen.sha256, { filter });
      expect(r.status).toBe(200);
      const rows = (r.body.data as MainScreenQuery).seap.search.records.rows;
      return { total: (r.body.data as MainScreenQuery).seap.search.total.records, authorities: new Set(rows.map((x) => x.record.authority.key)) };
    };
    const bv = await keys({ county: "RO-BV" });
    expect(bv.total).toBeGreaterThan(0);
    expect(bv.authorities.has(P.sanpetru)).toBe(true);
    expect(bv.authorities.has(P.caragiale)).toBe(false); // Cluj
    expect(bv.authorities.has(P.unplaced)).toBe(false);
    const uat = await keys({ uat: "880010" });
    expect(uat.total).toBeGreaterThan(0);
    expect([...uat.authorities]).toEqual([P.sanpetru]);
    // a national authority seated in a Bucharest sector is not counted in Bucharest
    const b = await keys({ county: "RO-B" });
    expect(b.authorities.has(P.bucharest3)).toBe(true);
    for (const key of [P.ministry, P.agency]) expect(b.authorities.has(key)).toBe(false);
  });

  it("gives identical placements and identical TopoJSON after a second rebuild into a fresh database (#67, ADR 0004)", async () => {
    const keys = Object.values(P);
    const snapshot = async (db: string) => ({
      placements: await Promise.all(keys.map((k) => placementOf(db, k))),
      counties: (await adhoc(db, "{ counties { code name } }")).counties,
      zoom: JSON.stringify((await ask(db, zoomedCounty.sha256, { filter: {}, county: "RO-BV" })).body),
    });
    placementRebuild("placement_b", "geo-b");
    expect(await snapshot("placement_b")).toEqual(await snapshot("placement_a"));
    const files = (dir: string) => readdirSync(join(scratch, dir), { recursive: true }).map(String).filter((f) => f.endsWith(".json")).sort();
    expect(files("geo-a")).toEqual(["counties.topo.json", "index.json", "uats/RO-B.topo.json", "uats/RO-BV.topo.json", "uats/RO-CJ.topo.json"]);
    expect(files("geo-b")).toEqual(files("geo-a"));
    for (const f of files("geo-a")) expect(readFileSync(join(scratch, "geo-b", f))).toEqual(readFileSync(join(scratch, "geo-a", f)));
    const counties = JSON.parse(readFileSync(join(scratch, "geo-a", "counties.topo.json"), "utf8"));
    expect(Object.keys(counties.objects)).toEqual(["counties"]);
    expect(counties.objects.counties.geometries.map((g: { properties: { code: string } }) => g.properties.code)).toEqual(["RO-B", "RO-BV", "RO-CJ"]);
  });

  // ---- the counting rule (#65) ---------------------------------------------------------------------------------------------
  const BANI = 100n;
  const bani = (ron: number | bigint) => String(BigInt(ron) * BANI);

  it("sums only counted and reports what it left out in the Total: suspect, no value, framework ceilings (#65)", async () => {
    const out = rebuild("counting_a", "archive-counting");
    expect(out).toContain("loaded 29 records from 2 file(s)");
    expect(out).toContain("estimates: 5 archived answers read; 2 notice(s) of 1 bn RON or more have none yet");
    const r = await ask("counting_a", mainScreen.sha256);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(mainScreen.document), r.body.data, EMPTY_FILTER)).toEqual([]);
    // counted: DA 1,350,599 + 2,000,000 + 5,000,000 + 50,000,000; contracts 5,000,000 + 2,500,000 + 700,000 + 300,000 + 500,000 + 1,000 + 2,000;
    // mega 2 bn + 3 bn + 4 bn + 70 bn. Left out: 4 suspect DA + 3 suspect mega contracts; no value: 2 DA + the blank ceiling; ceilings 10M + 6M + 4M.
    expect((r.body.data as MainScreenQuery).seap.search.total).toEqual({
      awarded: bani(58_350_599n + 9_003_000n + 79_000_000_000n), records: 29, suspectLeftOut: 7, noValue: 3, frameworkCeilings: bani(20_000_000), estimated: false,
    });
  });

  it("badges and counts each Record by the one rule: suspect caps of both eras, works, CPV 70, estimates, no value (#65)", async () => {
    const page = (code: string) => contractPage("counting_a", code);
    const suspect = (rule: string, threshold: string | null) => ({ badges: ["SUSPECT_VALUE"], counted: null, suspect: { rule, threshold } });
    expect(await page("DA94000001")).toMatchObject({ value: bani(2_000_000), ...suspect("DIRECT_PURCHASE_10X_CAP", bani(135_060)) });
    expect(await page("DA94000002")).toMatchObject({ value: bani(1_350_599), counted: bani(1_350_599), badges: [], suspect: null });
    expect(await page("DA94000003")).toMatchObject(suspect("DIRECT_PURCHASE_10X_CAP", bani(135_060))); // the last day of the old caps
    expect(await page("DA94000004")).toMatchObject({ counted: bani(2_000_000), suspect: null }); // the first day of the new ones
    expect(await page("DA94000005")).toMatchObject(suspect("DIRECT_PURCHASE_10X_CAP", bani(270_120))); // exactly 10x
    expect(await page("DA94000006")).toMatchObject({ counted: bani(5_000_000), suspect: null }); // works (CPV 45)
    expect(await page("DA94000007")).toMatchObject(suspect("DIRECT_PURCHASE_10X_CAP", bani(900_400)));
    expect(await page("DA94000008")).toMatchObject({ counted: bani(50_000_000), badges: [], suspect: null }); // CPV 70: never flagged
    for (const code of ["DA94000009", "DA94000010"]) expect(await page(code)).toMatchObject({ value: null, counted: null, badges: ["NO_VALUE"], suspect: null });
    expect(await page("CAN9810001~1")).toMatchObject(suspect("CONTRACT_100X_ESTIMATE", bani(10_000_000)));
    expect(await page("CAN9810002~1")).toMatchObject({ counted: bani(2_000_000_000), suspect: null }); // 1.33x its estimate
    expect(await page("CAN9810003~1")).toMatchObject(suspect("CONTRACT_100X_ESTIMATE", bani(10_000_000))); // exactly 100x
    expect(await page("CAN9810004~1")).toMatchObject(suspect("CONTRACT_OVER_50BN", null)); // no estimate, above 50 bn
    expect(await page("CAN9810005~1")).toMatchObject({ counted: bani(3_000_000_000), suspect: null }); // looked up, no estimate, below 50 bn
    expect(await page("CAN9810007~1")).toMatchObject({ counted: bani(70_000_000_000), suspect: null }); // never looked up: counted until `pipeline estimates` has run
  });

  it("shows a framework Record's ceiling, what its subsequent contracts reported and the ratio; a subsequent contract links back (#65)", async () => {
    const framework = await contractPage("counting_a", "CAN9800001~1");
    expect(framework).toMatchObject({ value: bani(10_000_000), counted: null, badges: ["FRAMEWORK_CEILING"] });
    expect(framework!.framework).toMatchObject({ agreement: null, ceiling: bani(10_000_000), subsequentReported: bani(5_000_000), ratio: 0.5 });
    expect(framework!.framework!.subsequent.map((s) => [s.code, s.counted, s.badges])).toEqual([
      ["CAN9800001~2", bani(4_000_000), ["SUBSEQUENT_CONTRACT"]], ["CAN9800001~3", bani(1_000_000), ["SUBSEQUENT_CONTRACT"]]]);
    const sub = await contractPage("counting_a", "CAN9800001~2");
    expect(sub).toMatchObject({ counted: bani(4_000_000), badges: ["SUBSEQUENT_CONTRACT"] });
    expect(sub!.framework).toMatchObject({ agreement: { code: "CAN9800001~1" }, ceiling: bani(10_000_000), subsequentReported: bani(5_000_000), ratio: 0.5 });
    // two framework contracts under one notice: the agreement is the notice, its ceiling the sum
    expect((await contractPage("counting_a", "CAN9800002~2"))!.framework).toMatchObject({ ceiling: bani(10_000_000), subsequentReported: bani(2_500_000), ratio: 0.25 });
    expect((await contractPage("counting_a", "CAN9800002~3"))!.framework).toMatchObject({ agreement: { code: "CAN9800002~1" }, ratio: 0.25 });
    // a blank ceiling has no ratio; a subsequent contract whose framework is not in the archive still counts, with no agreement and no ceiling
    expect((await contractPage("counting_a", "CAN9800005~1"))!.framework).toMatchObject({ ceiling: null, subsequentReported: bani(500_000), ratio: null });
    const orphan = await contractPage("counting_a", "CAN9800003~1");
    expect(orphan).toMatchObject({ counted: bani(700_000), badges: ["SUBSEQUENT_CONTRACT"] });
    expect(orphan!.framework).toMatchObject({ agreement: null, ceiling: null, subsequentReported: bani(700_000), ratio: null });
    // standalone: no framework link
    expect(await contractPage("counting_a", "CAN9800004~1")).toMatchObject({ counted: bani(300_000), badges: [], framework: null });
  });

  it("counts a consortium once on the authority side and gives each member an equal share that sums back to the value (#65)", async () => {
    const trio = await contractPage("counting_a", "CAN9800006~1");
    expect(trio).toMatchObject({ value: "100000", counted: "100000", badges: ["CONSORTIUM_SHARE"] });
    expect(trio!.winners.map((w) => [w.naturalPerson, w.publishedName, w.share])).toEqual([
      [false, "ALFA DEMO SRL", "33334"], [true, null, "33333"], [false, "BALKAN TRADING OOD", "33333"]]); // the person takes a slot, and no name
    expect(trio!.winners.reduce((sum, w) => sum + BigInt(w.share!), 0n)).toBe(BigInt(trio!.value!));
    // The supplier-side invariant (sum of share_bani = counted_bani per Record) is checked on the tables in tests/test_counting_db.py:
    // nothing in the API serves a supplier-side Total yet. TODO: assert it here through entity.seap.role(SUPPLIER).total once served.
  });

  it("gives identical responses after a second rebuild of the counting archive into a fresh database (#65, ADR 0004)", async () => {
    const codes = ["DA94000001", "DA94000009", "CAN9800001~1", "CAN9800001~2", "CAN9800003~1", "CAN9800006~1", "CAN9810001~1", "CAN9810007~1"];
    const snapshot = async (db: string) => {
      const out: unknown[] = [JSON.stringify(await ask(db, mainScreen.sha256))];
      for (const code of codes) out.push(JSON.stringify(await ask(db, recordPage.sha256, { code })));
      return out;
    };
    rebuild("counting_b", "archive-counting");
    expect(await snapshot("counting_b")).toEqual(await snapshot("counting_a"));
  });

  // ---- the Coverage grid (#79) ---------------------------------------------------------------------------------------------
  // The persisted CoveragePage also selects #80's fields (counties, unplaced authorities, snapshot), which are not served yet, so the grid is asked
  // for through an ad-hoc query against the same resolvers (the grid fields are the ones CoveragePage selects).
  interface GridCell { quarter: string; kind: string; state: string; rule: string | null; note: string | null; records: number; dataThrough: string | null }
  const GRID_QUERY = `query($w: DateRange) { coverage(source: SEAP, window: $w) { source { id } window { from to } grid { quarter kind state rule note records dataThrough } } }`;
  const coverageGrid = async (db: string, window?: { from?: string; to?: string }) => {
    await ask(db, mainScreen.sha256); // makes the database's pool
    const pool = pools.find((p) => (p.options as { connectionString?: string }).connectionString === `${baseUrl}/${db}`)!;
    const r = await graphql({ schema, source: GRID_QUERY, rootValue: rootValue(postgresStore(pool)), variableValues: { w: window } });
    expect(r.errors).toBeUndefined();
    expect(validateResponse(schema, parse(GRID_QUERY), r.data, { w: window })).toEqual([]);
    return (r.data as { coverage: { window: { from: string | null; to: string | null }; grid: GridCell[] } }).coverage;
  };
  const rebuildCoverage = (db: string) => rebuild(db, "archive-coverage", ["--today", "2025-09-20", "--known-gaps", coverageGaps]);

  it("serves every Coverage grid state from the fixture miniature archive (#79)", async () => {
    const out = rebuildCoverage("coverage_a");
    expect(out).toContain("coverage: 2024-Q4 CONTRACT possibly incomplete");
    const { grid } = await coverageGrid("coverage_a");
    expect(grid).toHaveLength(19 * 4); // 2021 Q1 .. 2025 Q3, four kinds
    const cell = (quarter: string, kind: string) => grid.find((c) => c.quarter === quarter && c.kind === kind)!;
    const shape = ({ state, rule, note, records, dataThrough }: GridCell) => ({ state, rule, note, records, dataThrough });

    expect(shape(cell("2022-Q1", "DA"))).toEqual({ state: "LOADED", rule: null, note: null, records: 3, dataThrough: "2022-03-31" }); // a bulk file
    expect(shape(cell("2021-Q2", "AWARD_NOTICE"))).toEqual({ state: "LOADED", rule: null, note: null, records: 2, dataThrough: "2021-05-06" }); // covered via e-licitatie
    expect(shape(cell("2025-Q2", "DAN"))).toEqual({
      state: "KNOWN_GAP", rule: "HAND_ENTERED", records: 0, dataThrough: null,
      note: "Fișier încărcat greșit (fixture), conținutul nu corespunde trimestrului; raportat la sursă, trimestrul rămâne gol", // verbatim, diacritics and comma included
    });
    // the 2024 Q4 Contracte shape, scaled down: 9 rows against neighbours 12, 18, 23, 15 (median 16.5, 60% = 9.9): flagged by the rule, not by hand
    expect(shape(cell("2024-Q4", "CONTRACT"))).toEqual({ state: "POSSIBLY_INCOMPLETE", rule: "COUNT_BELOW_NEIGHBOURS", note: null, records: 9, dataThrough: "2024-11-09" });
    expect(["2024-Q2", "2024-Q3", "2025-Q1", "2025-Q2"].map((q) => cell(q, "CONTRACT").state)).toEqual(["LOADED", "LOADED", "LOADED", "LOADED"]);
    expect(cell("2025-Q2", "CONTRACT").records).toBe(16); // 15 file rows + 1 crawl-only Record
    expect(shape(cell("2021-Q1", "AWARD_NOTICE"))).toEqual({ state: "NOT_IN_SOURCE", rule: "NO_PRIOR_CALL_BEFORE_BACKFILL", note: null, records: 0, dataThrough: null });
    expect(cell("2021-Q3", "AWARD_NOTICE")).toMatchObject({ state: "NOT_IN_SOURCE", records: 1 }); // one backfilled week is not the quarter
    expect(shape(cell("2025-Q3", "CONTRACT"))).toEqual({ state: "CRAWLED_PROVISIONAL", rule: "AWAITING_BULK_FILE", note: null, records: 3, dataThrough: "2025-07-02" });
    expect(shape(cell("2025-Q3", "AWARD_NOTICE"))).toEqual({ state: "CRAWLED_PROVISIONAL", rule: "AWAITING_BULK_FILE", note: null, records: 2, dataThrough: "2025-07-02" });
    expect(shape(cell("2022-Q2", "DA"))).toEqual({ state: "NOT_YET_LOADED", rule: null, note: null, records: 0, dataThrough: null }); // the quarantined file
    expect(shape(cell("2025-Q3", "DA"))).toEqual({ state: "NOT_YET_LOADED", rule: "AWAITING_BULK_FILE", note: null, records: 0, dataThrough: null }); // direct purchases await the bulk file
    expect(new Set(grid.map((c) => c.state))).toEqual(new Set(["LOADED", "KNOWN_GAP", "POSSIBLY_INCOMPLETE", "NOT_IN_SOURCE", "CRAWLED_PROVISIONAL", "NOT_YET_LOADED"]));
    // a quarantined unit's reason is never served
    expect(JSON.stringify(grid)).not.toMatch(/header|quarantin|reason|unknown/i);
  });

  it("gives the same grid after a second rebuild, with the failing unit already in quarantine (#79, ADR 0004)", async () => {
    rebuildCoverage("coverage_b");
    expect(await coverageGrid("coverage_b")).toEqual(await coverageGrid("coverage_a"));
  });

  it("narrows the grid to the quarters that overlap the window, and serves all of it without one (#79)", async () => {
    const all = await coverageGrid("coverage_a");
    expect(all.window).toEqual({ from: null, to: null });
    const some = await coverageGrid("coverage_a", { from: "2024-11-15", to: "2025-04-01" });
    expect(some.window).toEqual({ from: "2024-11-15", to: "2025-04-01" });
    expect([...new Set(some.grid.map((c) => c.quarter))]).toEqual(["2024-Q4", "2025-Q1", "2025-Q2"]);
    expect(some.grid).toHaveLength(12);
    expect(some.grid).toEqual(all.grid.filter((c) => ["2024-Q4", "2025-Q1", "2025-Q2"].includes(c.quarter)));
    expect((await coverageGrid("coverage_a", { from: "2025-09-20" })).grid.map((c) => c.quarter)).toEqual(Array(4).fill("2025-Q3"));
  });

  describe("search (#68): archive-search -> rebuild -> MainScreen with a filter", () => {
    type Filter = Record<string, unknown>;
    let searchData: (filter: Filter) => Promise<MainScreenQuery["seap"]["search"]>;
    const codes = (d: MainScreenQuery["seap"]["search"]) => d.records.rows.map((r) => r.record.code);
    const keys = (rows: { entity: { key: string } }[]) => rows.map((r) => r.entity.key);

    beforeAll(() => {
      rebuild("search_a", "archive-search");
      searchData = async (filter) => {
        const variables = { filter };
        const r = await ask("search_a", mainScreen.sha256, variables);
        expect(r.body.errors).toBeUndefined();
        expect(validateResponse(schema, parse(mainScreen.document), r.body.data, variables)).toEqual([]);
        return (r.body.data as MainScreenQuery).seap.search;
      };
    });

    it("folds diacritics, both ş/ș and ţ/ț, in the query and in the documents", async () => {
      for (const q of ["stefan", "Ștefan", "Ştefan", "ȘTEFAN"]) expect(codes(await searchData({ q })), q).toEqual(["DA95000001"]);
      for (const q of ["tara", "Țara", "Ţara"]) expect(codes(await searchData({ q })), q).toEqual(["DA95000001", "CAN9500002~1"]); // a winner's name, by value
      expect((await searchData({ q: "Şantier" })).filter.qFolded).toBe("santier");
    });

    it("joins dotted legal forms and drops legal-form words; a query of only those is the empty query", async () => {
      const plain = codes(await searchData({ q: "santier" }));
      expect(plain).toEqual(["DA95000001", "CAN9500002~1"]);
      for (const q of ["santier srl", "santier S.R.L.", "S.C. santier S.A."]) expect(codes(await searchData({ q })), q).toEqual(plain);
      for (const q of ["SRL", "S.R.L. SA", "  "]) {
        const all = await searchData({ q });
        expect(all.filter.qFolded, q).toBeNull();
        expect(all.total.records, q).toBe(13);
        expect(all.total.awarded).toBe("57412100"); // every Record, as for no query at all
      }
    });

    it("requires every token and takes the last as a prefix", async () => {
      expect(codes(await searchData({ q: "hartie copiator" }))).toEqual(["DA95000002"]);
      expect(codes(await searchData({ q: "hartie zzz" }))).toEqual([]);
      expect(codes(await searchData({ q: "desz" }))).toEqual(["DA95000006", "DA95000005", "CAN9500001~1"]); // a prefix; by value
      expect(codes(await searchData({ q: "servicii dez" }))).toEqual(["DA95000007"]); // "dez" is no prefix of deszapezire
      expect(codes(await searchData({ q: "serv dez" }))).toEqual([]); // only the LAST token is a prefix
      expect(codes(await searchData({ q: "deszapezire serv" }))).toEqual(["DA95000006", "DA95000005", "CAN9500001~1"]);
    });

    it("matches a CPV code by prefix: 45 finds every 45xxxxxx Record", async () => {
      expect(codes(await searchData({ q: "45" }))).toEqual(["DA95000001", "DA95000005"]);
      expect(codes(await searchData({ q: "4523" }))).toEqual(["DA95000001"]);
      expect(codes(await searchData({ cpv: "30" }))).toEqual(["DA95000008", "DA95000009", "DA95000010", "DA95000002", "DA95000011"]); // the cpv filter; no value last
    });

    it("matches a CUI with or without RO", async () => {
      const comuna = ["DA95000004", "DA95000003", "DA95000001", "DA95000006", "DA95000005", "DA95000002", "DA95000007", "DA95000011"];
      expect(codes(await searchData({ q: "RO1000009" }))).toEqual(comuna);
      expect(codes(await searchData({ q: "1000009" }))).toEqual(comuna);
      expect(codes(await searchData({ q: "ro1000017" })).sort()).toEqual(["CAN9500001~1", "CAN9500002~1", "DA95000008"]); // the authority's CUI, and a RO CUI typed in a title
    });

    it("never matches a natural person", async () => {
      const r = await searchData({ q: "ionescu" });
      expect(r.total.records).toBe(0);
      expect(r.suppliers.rows).toEqual([]);
    });

    it("ranks the tabs by matched RON, ties by key, and the Records by value", async () => {
      const all = await searchData({});
      expect(keys(all.authorities.rows)).toEqual(["1000009", "1000017", "name-primaria-echivalent-a", "name-primaria-echivalent-b"]); // the last two tie at 20,000 RON
      expect(all.authorities.rows.map((r) => r.matched.awarded)).toEqual(["48612100", "4800000", "2000000", "2000000"]);
      expect(keys(all.suppliers.rows)).toEqual([
        "name-petrol-beta-srl", "name-zapada-demo-srl", "name-santier-tara-srl", "name-papetarie-alfa-sa", "name-birou-echivalent-srl", "name-delta-consort-sa", "name-gamma-consort-srl",
      ]);
      expect(all.suppliers).toMatchObject({ count: 7, countEstimated: false });
      expect(codes(all).slice(0, 3)).toEqual(["DA95000004", "DA95000003", "DA95000001"]);
      // the matched set of a text query: by summed RON, with what each entity matched
      const snow = await searchData({ q: "deszapezire" });
      expect(snow.total).toMatchObject({ awarded: "11100000", records: 3, suspectLeftOut: 0, noValue: 0 });
      expect(snow.authorities.rows.map((r) => [r.entity.key, r.matched.awarded, r.matched.records])).toEqual([["1000009", "11000000", 2], ["1000017", "100000", 1]]);
    });

    it("sums each winner's share, not the full value, in the supplier ranking (consortium)", async () => {
      const snow = await searchData({ q: "deszapezire" });
      // CAN9500001~1 is 1,000 RON won by three: 333.34 + 333.33 + 333.33. The match on the Record matches every winner.
      expect(snow.suppliers.rows.map((r) => [r.entity.key, r.matched.awarded, r.matched.records])).toEqual([
        ["name-zapada-demo-srl", "11000000", 2],
        ["name-papetarie-alfa-sa", "33334", 1],
        ["name-delta-consort-sa", "33333", 1], // ties by key
        ["name-gamma-consort-srl", "33333", 1],
      ]);
      expect(snow.suppliers.rows.reduce((n, r) => n + BigInt(r.matched.awarded), 0n)).toBe(11000000n + 100000n); // the shares add back up to the value, nothing twice
      // a winner of a consortium AND of other Records: only its share of the consortium Record
      const alfa = await searchData({ supplier: "name-papetarie-alfa-sa" });
      expect(alfa.total).toMatchObject({ awarded: String(500000 + 4000000 + 33334), records: 4, noValue: 1 });
      // a consortium counts once on the authority side: its whole value, one Record
      expect((await searchData({ q: "consortiu" })).authorities.rows.map((r) => [r.entity.key, r.matched.awarded, r.matched.records])).toEqual([["1000017", "100000", 1]]);
      expect(codes(await searchData({ supplier: "name-gamma-consort-srl" }))).toEqual(["CAN9500001~1"]); // a Record once, whichever winner matched
    });

    it("pages the tabs with offset and limit, and says how many entities there are", async () => {
      const variables = (limit: number, offset: number) => ({ filter: {}, limit, offset });
      const page = async (limit: number, offset: number) => {
        const r = await ask("search_a", fullSuppliers.sha256, variables(limit, offset));
        expect(r.body.errors).toBeUndefined();
        return (r.body.data as FullResultsSuppliersQuery).seap.search.suppliers;
      };
      const second = await page(2, 2);
      expect(second.count).toBe(7);
      expect(keys(second.rows)).toEqual(["name-santier-tara-srl", "name-papetarie-alfa-sa"]);
      expect(await page(2, 20)).toMatchObject({ count: 7, rows: [] });
    });

    it("estimates the distinct counts above the exact limit, and flags it", async () => {
      const pool = new pg.Pool({ connectionString: `${baseUrl}/search_a`, max: 2 });
      pools.push(pool);
      const hll = createApi(postgresStore(pool, { exactGroupLimit: 3, rollup: false }), schema); // 7 suppliers is above 3 "groups"
      const variables = { filter: {} };
      const r = await hll.respond({ id: mainScreen.sha256, variables });
      expect(r.body.errors).toBeUndefined();
      const search = (r.body.data as MainScreenQuery).seap.search;
      expect(search.suppliers.countEstimated).toBe(true);
      expect(Math.abs(search.suppliers.count - 7)).toBeLessThanOrEqual(1);
      expect(search.authorities.countEstimated).toBe(true); // 4 authorities, also above 3
      expect(keys(search.suppliers.rows).slice(0, 3)).toEqual(["name-petrol-beta-srl", "name-zapada-demo-srl", "name-santier-tara-srl"]); // still ranked by matched RON
      expect(search.suppliers.rows[0]!.matched.awarded).toBe("27012100");
    });

    it("pages the estimated path too: exactly `limit` rows, no overlap, the same order as the exact path", async () => {
      const pool = new pg.Pool({ connectionString: `${baseUrl}/search_a`, max: 2 });
      pools.push(pool);
      const hll = postgresStore(pool, { exactGroupLimit: 1, rollup: false }); // every side is above 1 "group": the terms-aggregation path
      const exact = postgresStore(pool);
      const filter = {} as Parameters<typeof hll.searchEntities>[1];
      for (const side of ["AUTHORITY", "SUPPLIER"] as const) {
        const all = (await exact.searchEntities(side, filter, { limit: 50, offset: 0 })).rows.map((r) => r.entity.key);
        const first = await hll.searchEntities(side, filter, { limit: 2, offset: 0 });
        const second = await hll.searchEntities(side, filter, { limit: 2, offset: 2 });
        expect(first.estimated).toBe(true);
        expect(first.rows.map((r) => r.entity.key)).toEqual(all.slice(0, 2));
        expect(second.rows.map((r) => r.entity.key)).toEqual(all.slice(2, 4));
        // the exact per-key sum, not the aggregation's float
        expect(second.rows.every((r) => /^\d+$/.test(r.matched.awarded))).toBe(true);
      }
      // past the bucket cap: an empty page, not an error
      const far = await hll.searchEntities("SUPPLIER", filter, { limit: 50, offset: 1_000_000 });
      expect(far.rows).toEqual([]);
      expect(far.estimated).toBe(true);
    });

    it("narrows by the chips and the entity filters", async () => {
      expect((await searchData({ from: "2023-01-01" })).total.records).toBe(12); // DA95000003 is of 2022
      expect((await searchData({ to: "2022-12-31" })).total.records).toBe(1);
      expect(codes(await searchData({ channel: "CONTRACT" })).sort()).toEqual(["CAN9500001~1", "CAN9500002~1"]);
      // preset buckets, upper edge inclusive (13,506,000 bani = 135,060 RON sits in the bucket below the next one)
      expect(codes(await searchData({ valueBucket: "UP_TO_270K" }))).toEqual(["DA95000004"]);
      expect((await searchData({ valueBucket: "UP_TO_135K" })).total.records).toBe(7);
      expect((await searchData({ valueBucket: "UP_TO_10K" })).total.records).toBe(4);
      expect(codes(await searchData({ badges: ["CONSORTIUM_SHARE"] })).sort()).toEqual(["CAN9500001~1", "CAN9500002~1"]);
      expect(codes(await searchData({ badges: ["NO_VALUE"] }))).toEqual(["DA95000011"]);
      expect(codes(await searchData({ procedure: ["Negociere"] }))).toEqual(["CAN9500002~1"]);
      expect((await searchData({ authority: "1000017" })).total.records).toBe(3);
      expect(codes(await searchData({ q: "birou", authority: "1000017" }))).toEqual(["DA95000008"]);
      expect((await searchData({ authority: "1000017" })).filter.authority).toMatchObject({ key: "1000017" });
    });

    it("says plainly that a filter that waits for another ticket is not served yet", async () => {
      const r = await ask("search_a", mainScreen.sha256, { filter: { q: "stefan", signal: "OVER_CAP" } });
      expect(r.body.errors?.[0]?.extensions?.code).toBe("NOT_IMPLEMENTED");
    });

    it("cancels the running statement when the client disconnects", async () => {
      const pool = new pg.Pool({ connectionString: `${baseUrl}/search_a`, max: 4 });
      pools.push(pool);
      const server = await createApi(postgresStore(pool), schema).listen(0, "127.0.0.1");
      const locker = new pg.Client({ connectionString: `${baseUrl}/search_a` });
      const watcher = new pg.Pool({ connectionString: `${baseUrl}/search_a`, max: 1 });
      pools.push(watcher);
      await locker.connect();
      const searching = () => watcher.query("SELECT pid FROM pg_stat_activity WHERE datname = 'search_a' AND state = 'active' AND query LIKE '%FROM seap.search%' AND pid <> pg_backend_pid()");
      try {
        // a lock nobody releases: every search statement queues behind it, so it is running (waiting) when the client leaves
        await locker.query("BEGIN");
        await locker.query("LOCK TABLE seap.search IN ACCESS EXCLUSIVE MODE");
        const abort = new AbortController();
        const port = (server.address() as import("node:net").AddressInfo).port;
        const request = fetch(`http://127.0.0.1:${port}/graphql`, {
          method: "POST", headers: { "content-type": "application/json" }, signal: abort.signal,
          body: JSON.stringify({ id: mainScreen.sha256, variables: { filter: { q: "deszapezire" } } }),
        }).catch(() => "aborted");
        const deadline = Date.now() + 20_000;
        while (!(await searching()).rows.length) {
          if (Date.now() > deadline) throw new Error("the search statement never started");
          await new Promise((r) => setTimeout(r, 50));
        }
        abort.abort(); // the client disconnects
        expect(await request).toBe("aborted");
        while ((await searching()).rows.length) {
          if (Date.now() > deadline) throw new Error("the statement was not cancelled although the client left (the lock is still held)");
          await new Promise((r) => setTimeout(r, 50));
        }
      } finally {
        await locker.query("ROLLBACK").catch(() => undefined);
        await locker.end().catch(() => undefined);
        await new Promise((r) => server.close(r));
      }
    });

    it("cancels a statement longer than track_activity_query_size too (pg_stat_activity truncates its text)", async () => {
      const pool = new pg.Pool({ connectionString: `${baseUrl}/search_a`, max: 2 });
      pools.push(pool);
      const locker = new pg.Client({ connectionString: `${baseUrl}/search_a` });
      await locker.connect();
      try {
        await locker.query("BEGIN");
        await locker.query("LOCK TABLE seap.search IN ACCESS EXCLUSIVE MODE");
        const text = `SELECT count(*) FROM seap.search /* ${"x".repeat(3000)} */`;
        const abort = new AbortController();
        const running = cancellableQuery(pool, abort.signal, text).then(() => "finished", (e: Error) => e.name);
        await new Promise((r) => setTimeout(r, 300)); // let it start and queue behind the lock
        abort.abort();
        const outcome = await Promise.race([running, new Promise((r) => setTimeout(() => r("still running"), 15_000))]);
        expect(outcome).toBe("AbortError");
      } finally {
        await locker.query("ROLLBACK").catch(() => undefined);
        await locker.end().catch(() => undefined);
      }
    });
  });

  describe("filter chips, rollup and result cache (#70)", () => {
    type Filter = Record<string, unknown>;
    type Search = MainScreenQuery["seap"]["search"];
    const YEAR_2023 = { from: "2023-01-01", to: "2023-12-31" };
    const answer = async (api: ReturnType<typeof createApi>, filter: Filter): Promise<Search> => {
      const variables = { filter };
      const r = await api.respond({ id: mainScreen.sha256, variables });
      expect(r.body.errors, JSON.stringify(filter)).toBeUndefined();
      expect(validateResponse(schema, parse(mainScreen.document), r.body.data, variables)).toEqual([]);
      return (r.body.data as MainScreenQuery).seap.search;
    };
    const codes = (d: Search) => d.records.rows.map((r) => r.record.code);

    let pool: pg.Pool;
    let rolled: ReturnType<typeof createApi>; // empty and chips-only states from the rollup
    let scanned: ReturnType<typeof createApi>; // the same store with the rollup off: the full scan

    beforeAll(() => {
      rebuild("rollup_a", "archive-search");
      pool = new pg.Pool({ connectionString: `${baseUrl}/rollup_a`, max: 3 });
      pools.push(pool);
      rolled = createApi(postgresStore(pool), schema);
      scanned = createApi(postgresStore(pool, { rollup: false }), schema);
    });

    it("narrows the set with each chip", async () => {
      const total = async (filter: Filter) => (await answer(rolled, filter)).total.records;
      expect(await total({})).toBe(13);
      expect(await total({ channel: "CONTRACT" })).toBe(2);
      expect(await total({ channel: "DIRECT_PURCHASE" })).toBe(11);
      expect(await total({ from: "2022-01-01", to: "2022-12-31" })).toBe(1); // award year
      expect(await total(YEAR_2023)).toBe(12);
      expect(await total({ from: "2023-02-05" })).toBeLessThan(12); // a date that is not a year edge: the scan serves it
      expect(await total({ to: "2022-12-31" })).toBe(1);
      expect(await total({ valueBucket: "UP_TO_10K" })).toBe(4);
      expect(await total({ valueBucket: "UP_TO_135K" })).toBe(7); // 135,060 RON exactly is in it; the Record with no value is in none
      expect(await total({ valueBucket: "UP_TO_270K" })).toBe(1);
      expect(await total({ valueBucket: "OVER_1B" })).toBe(0);
      expect(await total({ procedure: ["Negociere"] })).toBe(1);
      expect(await total({ procedure: ["Negociere", "Licitatie deschisa"] })).toBe(2);
      expect(await total({ badges: ["NO_VALUE"] })).toBe(1);
      expect(await total({ badges: ["CONSORTIUM_SHARE"] })).toBe(2);
      // combined chips narrow further, and the entity tabs follow the set
      const both = await answer(rolled, { channel: "DIRECT_PURCHASE", valueBucket: "UP_TO_10K" });
      expect(codes(both)).toEqual(["DA95000002", "DA95000007"]);
      expect(both.suppliers.rows.map((r) => r.entity.key)).toEqual(["name-papetarie-alfa-sa", "name-zapada-demo-srl"]);
    });

    it("wires has-Signals to the has_signals column (false everywhere until Signals exist)", async () => {
      expect((await answer(rolled, { hasSignals: true })).total.records).toBe(0);
      expect((await answer(rolled, { hasSignals: false })).total.records).toBe(13);
      expect((await answer(scanned, { hasSignals: true, q: "deszapezire" })).total.records).toBe(0);
      await pool.query("UPDATE seap.search SET has_signals = true WHERE record_code = 'DA95000002'"); // what a Signals load will do
      try {
        expect(codes(await answer(scanned, { hasSignals: true }))).toEqual(["DA95000002"]);
      } finally {
        await pool.query("UPDATE seap.search SET has_signals = false");
      }
    });

    it("answers the empty and chips-only states from the rollup exactly as the full scan does", async () => {
      const filters: Filter[] = [
        {}, { q: "SRL" }, { channel: "CONTRACT" }, { channel: "DIRECT_PURCHASE" }, YEAR_2023, { from: "2022-01-01" }, { to: "2022-12-31" },
        { valueBucket: "UP_TO_10K" }, { valueBucket: "UP_TO_135K" }, { valueBucket: "UP_TO_270K" }, { valueBucket: "OVER_1B" }, { hasSignals: false }, { hasSignals: true },
        { channel: "CONTRACT", valueBucket: "UP_TO_10K", ...YEAR_2023 }, { channel: "DIRECT_PURCHASE", hasSignals: false, from: "2022-01-01", to: "2023-12-31" },
        { procedure: ["Negociere"] }, { badges: ["NO_VALUE"] }, { from: "2023-02-05", channel: "DIRECT_PURCHASE" },
      ];
      for (const filter of filters) expect(await answer(rolled, filter), JSON.stringify(filter)).toEqual(await answer(scanned, filter));
      // the Records tab pages and counts the same too
      const page = (api: ReturnType<typeof createApi>) => api.respond({ id: fullSuppliers.sha256, variables: { filter: { channel: "DIRECT_PURCHASE" }, limit: 2, offset: 2 } });
      expect(await page(rolled)).toEqual(await page(scanned));
    });

    it("really reads the rollup for those states, and the scan for a text query", async () => {
      await pool.query("UPDATE seap.rollup_cube SET records = records * 2");
      await pool.query("UPDATE seap.rollup_entity SET records = records * 2");
      try {
        const empty = await answer(rolled, {});
        expect(empty.total.records).toBe(26); // not the 13 of the table: served from the (tampered) cube
        expect(empty.authorities.rows[0]!.matched.records).toBe(2 * (await answer(scanned, {})).authorities.rows[0]!.matched.records);
        expect((await answer(scanned, {})).total.records).toBe(13);
        expect((await answer(rolled, { q: "desz" })).total.records).toBe(3); // a text query never reads the rollup
        expect((await answer(rolled, { procedure: ["Negociere"] })).total.records).toBe(1); // nor does a chip that is not a dimension
      } finally {
        await pool.query("UPDATE seap.rollup_cube SET records = records / 2");
        await pool.query("UPDATE seap.rollup_entity SET records = records / 2");
      }
    });

    it("gives equal filters one cache key: sorted chips, folded query, defaults filled", () => {
      const a = canonicalFilter({ q: "  Șantier S.R.L. ", badges: ["NO_VALUE", "CUI_MISMATCH", "NO_VALUE"], procedure: ["b", "a"] });
      const b = canonicalFilter({ q: "santier", badges: ["CUI_MISMATCH", "NO_VALUE"], procedure: ["a", "b"], countySide: "AUTHORITY", channel: null });
      expect(a).toBe(b);
      expect(canonicalFilter({ hasSignals: false })).not.toBe(canonicalFilter({}));
      expect(canonicalFilter({ q: "srl" })).toBe(canonicalFilter({}));
    });

    it("caches by the normalised filter, warms every 2-character prefix, and a load flushes it and rebuilds the rollup", async () => {
      rebuild("rollup_b", "archive-search");
      const p = new pg.Pool({ connectionString: `${baseUrl}/rollup_b`, max: 3 });
      pools.push(p);
      const cache = cachedStore(postgresStore(p), p, { autoWarm: false });
      const api = createApi(cache, schema);
      const first = await answer(api, { q: "Șantier" });
      expect(cache.stats()).toMatchObject({ hits: 0, flushes: 0 });
      const misses = cache.stats().misses;
      expect(await answer(api, { q: "santier srl" })).toEqual(first); // the same normalised filter: all hits
      expect(cache.stats()).toMatchObject({ misses, hits: 4 });

      const report = await cache.warm();
      expect(report).toMatchObject({ failed: 0 });
      expect(report.prefixes).toBeGreaterThan(20);
      const before = cache.stats();
      const de = await answer(api, { q: "De" }); // a 2-character prefix with no chips: already cached
      expect(cache.stats()).toMatchObject({ misses: before.misses, hits: before.hits + 4 });
      expect(de.total.records).toBeGreaterThan(0);
      const empty = await answer(api, {});
      expect(empty.total.records).toBe(13);

      rebuild("rollup_b", "archive-counting"); // a second load with different data into the same database
      await cache.sync(); // lookups reuse a generation read for up to a second; sync() reads fresh
      const after = await answer(api, {});
      expect(cache.stats().flushes).toBe(1);
      const { rows } = await p.query("SELECT count(*)::int AS n FROM seap.record");
      expect(after.total.records).toBe(rows[0].n);
      expect(after.total.records).not.toBe(13);
      expect(await answer(api, { q: "De" })).not.toEqual(de); // not served from the old generation
      expect(after).toEqual(await answer(createApi(postgresStore(p, { rollup: false }), schema), {})); // and the rebuilt rollup agrees with the scan
    });
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
