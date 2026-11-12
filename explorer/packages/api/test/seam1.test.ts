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
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { graphql, parse } from "graphql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import allowlist from "@grivei/contract/persisted-queries.json" with { type: "json" };
import { loadSchema, validateResponse } from "@grivei/contract/node";
import type { SignalFieldsFragment, CoverageLensQuery, CoveragePageQuery, EntityOverviewQuery, EntityRecordsQuery, EntityRelationshipsQuery, FullResultsSuppliersQuery, MainScreenQuery, RecordPageQuery } from "@grivei/contract";
import { createApi } from "../src/server.ts";
import { rootValue } from "../src/resolvers.ts";
import { cancellableQuery } from "../src/search.ts";
import { cachedStore, canonicalFilter } from "../src/cache.ts";
import { postgresStore } from "../src/store.ts";
import { RECORDED_ENTITY_CASES, type RecordedEntityCase } from "./recordedEntityCases.ts";
import { RECORDED_RECORDS_CASES, type RecordedRecordsCase } from "./recordedRecordsCases.ts";
import { RECORDED_CASES, type RecordedCase } from "./recordedCases.ts";
import { RECORDED_RECORD_CASES, type RecordedRecordCase } from "./recordedRecordCases.ts";
import { RECORDED_RELATIONSHIPS_CASES, type RecordedRelationshipsCase } from "./recordedRelationshipsCases.ts";
import { createSeapLink, seapLinkUrl } from "../src/seapLink.ts";
import { RECORDED_SIGNAL_CASES, type RecordedSignalCase } from "./recordedSignalCases.ts";
import { RECORDED_ZOOM_CASES } from "./recordedZoomCases.ts";
import { RECORDED_COVERAGE_CASES } from "./recordedCoverageCases.ts";

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
const gotoArchive = join(watchdog, "tests/fixtures/archive-goto"); // two authorities whose names differ only by a legal form (#69)
const mfArchive = join(watchdog, "tests/fixtures/archive-mf"); // the MF list slice for the placement world (#80); copied onto archive-placement
const mfGaps = join(watchdog, "tests/fixtures/mf-known-gaps.csv"); // the placement fixture's 2023 Q1 has a DA file only: the other three kinds are hand-entered gaps
const searchArchive = join(watchdog, "tests/fixtures/archive-search"); // one Record per matching rule, a consortium, tied sums (#68)
const rolesEdgeArchive = join(watchdog, "tests/fixtures/archive-roles-edge"); // an unlinked winner, a person, a consortium framework agreement (#73)
const rolesArchive = join(watchdog, "tests/fixtures/archive-roles"); // an authority, a supplier and a both-roles entity, consortia, a framework, a person, blank and suspect values (#73)
const signalsArchive = join(watchdog, "tests/fixtures/archive-signals"); // over-cap and no-publication, positive, boundary and negative, a backfilled and a crawled award notice (#74)
const splittingArchive = join(watchdog, "tests/fixtures/archive-splitting"); // the splitting rule: a trigger, a 31-day near miss, merging windows, a cap change, left-out cases (#75)
const frameworkOverrunArchive = join(watchdog, "tests/fixtures/archive-framework-overrun"); // the framework-overrun rule: a crossing, exactly 110%, 90%, a blank ceiling, a pre-2021 framework, summed ceilings (#76)
const moneyMapArchive = join(watchdog, "tests/fixtures/archive-moneymap"); // the placement fixture plus consortia across counties, a foreign winner (#71)
const python = process.env.PIPELINE_PYTHON ?? join(watchdog, ".venv/bin/python");
const image = process.env.PARADEDB_IMAGE ?? readImagePin();
const container = `pp37-seam1-${process.pid}`;

/** The app's fixture client matches on exact variables, so no two recorded cases may ask the same question. */
function expectDistinctVariables(cases: ReadonlyArray<{ variables: unknown }>): void {
  const sorted = (v: unknown): unknown => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sorted(x)])) : v);
  const asked = cases.map((c) => JSON.stringify(sorted(c.variables)));
  expect(new Set(asked).size).toBe(asked.length);
}

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
const coveragePage = allowlist.operations.find((o) => o.name === "CoveragePage")!;
const entityRecords = allowlist.operations.find((o) => o.name === "EntityRecords")!;
const entityRelationships = allowlist.operations.find((o) => o.name === "EntityRelationships")!;
const zoomedCounty = allowlist.operations.find((o) => o.name === "ZoomedCounty")!;
// The authorities of the placement fixture (watchdog/tests/fixtures/build_placement_archive.py): CUIs with valid check digits, invented.
const P = {
  sanpetru: "51000005", caragiale: "51000102", apahida: "51000200", rasnov: "51000307", sinca: "51000404", brasov: "51000501", bucharest3: "51000609",
  unmatched: "51000706", seap: "51000803", unplaced: "51000900", ministry: "51001000", agency: "51001108", dsp: "51001205", huedin: "51001302",
} as const;
// The MF-only entities of the MF fixture slice (watchdog/tests/fixtures/build_mf_archive.py): on the list, with no Record.
const M = { nationalOnly: "51001809" } as const;
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
    cpSync(placementArchive, join(scratch, "archive-mf"), { recursive: true });
    cpSync(mfArchive, join(scratch, "archive-mf"), { recursive: true }); // merges: the MF unit lands beside the placement world's units
    cpSync(placementData, join(scratch, "mf-data"), { recursive: true });
    appendFileSync(join(scratch, "mf-data/national_authorities.csv"), `${M.nationalOnly},true,false,INSTITUTUL NATIONAL FICTIV,"fictional: an MF-only national institute"\n`);
    // The default for every rebuild that passes no --placement-data: the fixture's reviewed files without a UAT table, so placement
    // is by county only. Never the checked-in national tables (pipeline/placement/data): this seam's answers must not move with them.
    cpSync(placementData, join(scratch, "county-only-data"), { recursive: true });
    for (const f of ["uats.csv", "villages.csv", "table-sources.json"]) rmSync(join(scratch, "county-only-data", f));
    cpSync(countingArchive, join(scratch, "archive-counting"), { recursive: true });
    cpSync(coverageArchive, join(scratch, "archive-coverage"), { recursive: true });
    cpSync(searchArchive, join(scratch, "archive-search"), { recursive: true });
    cpSync(gotoArchive, join(scratch, "archive-goto"), { recursive: true });
    cpSync(moneyMapArchive, join(scratch, "archive-moneymap"), { recursive: true });
    cpSync(rolesArchive, join(scratch, "archive-roles"), { recursive: true });
    cpSync(rolesEdgeArchive, join(scratch, "archive-roles-edge"), { recursive: true });
    cpSync(signalsArchive, join(scratch, "archive-signals"), { recursive: true });
    cpSync(splittingArchive, join(scratch, "archive-splitting"), { recursive: true });
    cpSync(frameworkOverrunArchive, join(scratch, "archive-framework-overrun"), { recursive: true });
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
    await admin.query("CREATE DATABASE mf_a");
    await admin.query("CREATE DATABASE mf_b");
    await admin.query("CREATE DATABASE mf_c");
    await admin.query("CREATE DATABASE placement_a");
    await admin.query("CREATE DATABASE placement_b");
    await admin.query("CREATE DATABASE counting_a");
    await admin.query("CREATE DATABASE counting_b");
    await admin.query("CREATE DATABASE coverage_a");
    await admin.query("CREATE DATABASE coverage_b");
    await admin.query("CREATE DATABASE search_a");
    await admin.query("CREATE DATABASE goto_a");
    await admin.query("CREATE DATABASE moneymap_a");
    await admin.query("CREATE DATABASE moneymap_b");
    await admin.query("CREATE DATABASE recorded_a");
    await admin.query("CREATE DATABASE recorded_zoom");
    await admin.query("CREATE DATABASE recorded_coverage");
    await admin.query("CREATE DATABASE rollup_a");
    await admin.query("CREATE DATABASE rollup_b");
    await admin.query("CREATE DATABASE roles_a");
    await admin.query("CREATE DATABASE roles_edge");
    await admin.query("CREATE DATABASE signals_a");
    await admin.query("CREATE DATABASE splitting_a");
    await admin.query("CREATE DATABASE framework_overrun_a");
  });

  afterAll(async () => {
    await Promise.all(pools.map((p) => p.end().catch(() => undefined)));
    await admin?.end().catch(() => undefined);
    cleanup();
    if (scratch) rmSync(scratch, { recursive: true, force: true });
  });

  // --in-place: the default is the switchover (#82), which terminates the sessions of the live database; this seam keeps one pool per database and rebuilds under it
  // PIPELINE_PLACEMENT_DATA pins the placement tables to the fixture's county-only directory; an explicit --placement-data in `extra` wins
  const rebuild = (db: string, archive = "archive", extra: string[] = []) => {
    const r = spawnSync(python, ["-m", "pipeline", "--archive", join(scratch, archive), "rebuild", "--db", `${baseUrl}/${db}`, "--in-place", ...extra], {
      cwd: watchdog, encoding: "utf8", env: { ...process.env, PIPELINE_PLACEMENT_DATA: join(scratch, "county-only-data") },
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
    expect(data.sources[0]).toEqual({ id: "SEAP", name: "SEAP", harvested: true, dataThrough: [{ kind: "DA", date: "2022-03-31" }] });
    expect(data.sources.slice(1).map((s) => [s.id, s.harvested])).toEqual([["ONRC", false], ["ANI", false], ["MFINANTE", false], ["JUST", false]]); // planned Sources (#90)
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
      value: "15000000", counted: "15000000", badges: [], provenance: { source: "SEAP", kind: "BULK", via: "Contracte 2026 - T1", url: "/source/seap/CAN9200001~C-1" },
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
    expect((main.body.data as MainScreenQuery).sources[0]).toEqual({
      id: "SEAP", name: "SEAP", harvested: true,
      dataThrough: [{ kind: "AWARD_NOTICE", date: "2026-02-10" }, { kind: "CONTRACT", date: "2026-04-02" }],
    });
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
      kind: "CONTRACT", value: "15000000", counted: "15000000", badges: [], provenance: { kind: "BULK", via: "Contracte 2023 - T1", url: "/source/seap/CAN9300001~B-1" },
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
    expect(data.sources[0]).toEqual({ id: "SEAP", name: "SEAP", harvested: true, dataThrough: [{ kind: "AWARD_NOTICE", date: "2023-01-05" }, { kind: "CONTRACT", date: "2023-01-06" }] });
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

  // ---- Coverage statuses and the MF list (#80) --------------------------------------------------------------------------------
  // The placement world (14 authorities, each with one DA Record dated 2023-03-11 .. 2023-03-24, in the alphabetical order of their keys) plus the MF slice.
  type CoverageData = CoveragePageQuery["coverage"];
  const mfRebuild = (db: string) => rebuild(db, "archive-mf", ["--placement-data", join(scratch, "mf-data"), "--geo-dir", join(scratch, `geo-${db}`), "--today", "2023-09-20", "--known-gaps", mfGaps]);
  const coverageOf = async (db: string, window: { from?: string; to?: string } | null = null): Promise<CoverageData> => {
    const variables = { window };
    const r = await ask(db, coveragePage.sha256, variables);
    expect(r.body.errors).toBeUndefined();
    expect(validateResponse(schema, parse(coveragePage.document), r.body.data, variables)).toEqual([]);
    return (r.body.data as CoveragePageQuery).coverage;
  };
  const figures = (c: CoverageData, area: string) => {
    const { withRecords, publicEntities, otherAuthorities, status } = c.counties.find((x) => x.county === area)!;
    return { status, n: withRecords, m: publicEntities, other: otherAuthorities };
  };

  it("serves N of M and the other authorities per county, with national entities in National, and the MF snapshot date (#80)", async () => {
    const out = mfRebuild("mf_a");
    expect(out).toContain("mf list: snapshot 2026-11-01, 17 public entities, 3 national, 1 without a county (Strainatate: 1), 1 repeated CUIs dropped");
    const c = await coverageOf("mf_a");
    expect(c.referenceSnapshot).toBe("2026-11-01");
    expect(c.counties).toHaveLength(43); // 42 counties and National
    expect(c.counties.at(-1)!.county).toBe("NATIONAL");
    // Brasov: the municipality, two communes and a town have Records, two MF entities have none; the DSP, the county-only commune and the SEAP-placed one are not on the list
    expect(figures(c, "RO-BV")).toMatchObject({ n: 4, m: 6, other: 3 });
    // Cluj: two communes and the unplaced authority (MF files it under Cluj) have Records, one entity has none; Huedin is not on the list
    expect(figures(c, "RO-CJ")).toMatchObject({ n: 3, m: 4, other: 1 });
    expect(figures(c, "RO-B")).toMatchObject({ n: 1, m: 1, other: 0 }); // the ministry and the agency are MF-filed under Bucuresti but national: not here
    // National: the ministry (award notice), the agency (reviewed file) and an MF-only institute (reviewed file, no Record)
    expect(figures(c, "NATIONAL")).toMatchObject({ n: 2, m: 3, other: 0 });
    expect(figures(c, "RO-AB")).toMatchObject({ n: 0, m: 0, other: 0 }); // a county with nothing on the list
    // MF writes plain ASCII (`Dambovita`, `Valcea`); the gazetteer's own fold would read them as no county, so M would be 0 for both
    expect(figures(c, "RO-DB")).toMatchObject({ n: 0, m: 1, other: 0 });
    expect(figures(c, "RO-VL")).toMatchObject({ n: 0, m: 1, other: 0 });
    // the foreign-mission row (Judet `Strainatate`) and the repeated CIF are in no M
    expect(c.counties.reduce((sum, x) => sum + x.publicEntities, 0)).toBe(16);
    // the unplaced authority: no source places it (MF's county does not), its Record is its Total
    expect(c.unplacedAuthorities).toMatchObject({ authorities: 1, total: { awarded: "100000", records: 1 } });
  });

  it("derives the status from the grid cells of the window and narrows N and the other authorities with it (#80)", async () => {
    // 2023 Q1 holds a DA file and three hand-entered gaps: harvested with known gaps. Wider windows reach quarters with nothing loaded yet (awaiting the bulk file, the expected lag): still known gaps, not partial; a
    // partial window needs a quarantined hole, which the status unit tests cover.
    expect(figures(await coverageOf("mf_a", { from: "2023-01-01", to: "2023-03-31" }), "RO-BV")).toEqual({ status: "HARVESTED_WITH_KNOWN_GAPS", n: 4, m: 6, other: 3 });
    expect((await coverageOf("mf_a", { from: "2023-01-01", to: "2023-06-30" })).counties[0]!.status).toBe("HARVESTED_WITH_KNOWN_GAPS");
    expect((await coverageOf("mf_a")).counties.every((x) => x.status === "HARVESTED_WITH_KNOWN_GAPS")).toBe(true); // 2021 Q1 .. 2023 Q3, one file loaded
    // after the file's quarter nothing is loaded, before the grid starts there is no cell: not harvested, and N is zero because no Record is dated there
    for (const window of [{ from: "2023-07-01", to: "2023-09-20" }, { to: "2020-12-31" }]) {
      const c = await coverageOf("mf_a", window);
      expect(c.counties.every((x) => x.status === "NOT_HARVESTED" && x.withRecords === 0 && x.otherAuthorities === 0)).toBe(true);
      expect(figures(c, "RO-BV").m).toBe(6); // M is the list, not the window
      expect(c.unplacedAuthorities).toMatchObject({ authorities: 0, total: { records: 0 } });
    }
    // a narrower window inside the quarter: only the Records dated 03-11 .. 03-16 (agency, apahida, brasov, bucharest3, caragiale, dsp)
    const narrow = await coverageOf("mf_a", { from: "2023-03-11", to: "2023-03-16" });
    expect(narrow.window).toEqual({ from: "2023-03-11", to: "2023-03-16" });
    expect(figures(narrow, "RO-BV")).toEqual({ status: "HARVESTED_WITH_KNOWN_GAPS", n: 1, m: 6, other: 1 }); // the municipality; the DSP is not on the list
    expect(figures(narrow, "RO-CJ")).toMatchObject({ n: 2, m: 4, other: 0 }); // the unplaced authority (03-24) and Huedin (03-17) are out
    expect(figures(narrow, "RO-B")).toMatchObject({ n: 1, m: 1 });
    expect(figures(narrow, "NATIONAL")).toMatchObject({ n: 1, m: 3, other: 0 }); // the agency only
    expect(narrow.unplacedAuthorities.authorities).toBe(0);
  });

  it("gives the same Coverage figures after a second rebuild into a fresh database (#80, ADR 0004)", async () => {
    mfRebuild("mf_b");
    expect(await coverageOf("mf_b")).toEqual(await coverageOf("mf_a"));
    expect(await coverageOf("mf_b", { from: "2023-03-11", to: "2023-03-16" })).toEqual(await coverageOf("mf_a", { from: "2023-03-11", to: "2023-03-16" }));
  });

  it("serves no snapshot and an empty denominator when no MF list was archived (#80)", async () => {
    placementRebuild("mf_c", "geo-mf-c"); // the placement world as it is, with no MF unit
    const c = await coverageOf("mf_c");
    expect(c.referenceSnapshot).toBeNull();
    expect(c.counties.every((x) => x.publicEntities === 0 && x.withRecords === 0)).toBe(true);
    expect(figures(c, "RO-BV").other).toBe(7); // every Brasov authority is "other" without a list
  });

  // Every Record in every response that returns Records carries its provenance (#72). No persisted operation selects `provenance` on
  // a list row, so the lists are asked through the real resolvers with an ad-hoc document that does.
  const adhocPools = new Map<string, pg.Pool>();
  const adhocRecords = async (db: string, source: string, variableValues: Record<string, unknown> = {}) => {
    let pool = adhocPools.get(db);
    if (!pool) {
      pool = new pg.Pool({ connectionString: `${baseUrl}/${db}`, max: 2 });
      pools.push(pool);
      adhocPools.set(db, pool);
    }
    const r = await graphql({ schema, source, rootValue: rootValue(postgresStore(pool)), variableValues });
    expect(r.errors).toBeUndefined();
    return r.data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  const PROV = "provenance { source kind via fetchedAt url }";
  const LISTS = `query Q($code: ID!) { seap {
    search(filter: {}) { records(limit: 200, offset: 0, order: DATE_DESC) { rows { record { code ${PROV} } } } }
    record(code: $code) { code ${PROV} framework { agreement { code ${PROV} } subsequent(limit: 200) { code ${PROV} } } }
  } }`;

  /** Collect every Record node (anything with a code and a provenance) in a response, wherever it sits. */
  function recordsIn(node: unknown, out: { code: string; provenance: Record<string, any> }[] = []) { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (Array.isArray(node)) node.forEach((n) => recordsIn(n, out));
    else if (node && typeof node === "object") {
      const o = node as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (typeof o.code === "string" && o.provenance) out.push({ code: o.code, provenance: o.provenance });
      Object.values(o).forEach((v) => recordsIn(v, out));
    }
    return out;
  }

  it("gives every Record in every response its provenance: BULK via the file and the /source/seap redirect, CRAWL with the notice URL, fetchedAt always (#72)", async () => {
    const seen = new Map<string, number>();
    for (const [db, kinds] of [
      ["bulk_a", ["BULK"]], ["contracts_a", ["BULK"]], ["counting_a", ["BULK"]], ["identity_a", ["BULK"]], ["crawl_a", ["BULK", "CRAWL"]], ["backfill_a", ["BULK", "CRAWL"]],
    ] as const) {
      const codes = ((await adhocRecords(db, `{ seap { search(filter: {}) { records(limit: 200, offset: 0, order: DATE_DESC) { rows { record { code } } } } } }`)).seap.search.records.rows as { record: { code: string } }[]).map((r) => r.record.code);
      expect(codes.length, `${db} has Records`).toBeGreaterThan(0);
      const records = recordsIn(await adhocRecords(db, LISTS, { code: codes[0] }));
      // the list, plus each Record's page with its framework agreement and subsequent contracts
      for (const code of codes) records.push(...recordsIn(await adhocRecords(db, LISTS, { code })));
      for (const { code, provenance: p } of records) {
        expect(p.source, `${db} ${code}`).toBe("SEAP");
        expect(p.fetchedAt, `${db} ${code}`).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
        expect(kinds, `${db} ${code}`).toContain(p.kind);
        if (p.kind === "BULK") {
          expect(p.via, `${db} ${code}`).toEqual(expect.stringMatching(/\S/)); // the file as the Source titles it
          expect(p.url, `${db} ${code}`).toBe(`/source/seap/${encodeURIComponent(code)}`);
        } else {
          expect(p.via, `${db} ${code}`).toBeNull();
          expect(p.url, `${db} ${code}`).toMatch(/^https:\/\/e-licitatie\.ro\/pub\/notices\/ca-notices\//);
        }
        seen.set(p.kind, (seen.get(p.kind) ?? 0) + 1);
      }
    }
    expect(seen.get("BULK")).toBeGreaterThan(0);
    expect(seen.get("CRAWL")).toBeGreaterThan(0); // a crawled and a backfilled Record were walked
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

    it("serves the Signal filter (#74): this fixture has no Signal, so the rule's set is empty, not an error", async () => {
      const r = await ask("search_a", mainScreen.sha256, { filter: { q: "stefan", signal: "OVER_CAP" } });
      expect(r.body.errors).toBeUndefined();
      expect((r.body.data as MainScreenQuery).seap.search.total.records).toBe(0);
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
      expect(cache.stats()).toMatchObject({ misses, hits: 6 }); // total, two tabs, Records, the map, and the Go-to lookup (keyed by the folded query)

      const report = await cache.warm();
      expect(report).toMatchObject({ failed: 0 });
      expect(report.prefixes).toBeGreaterThan(20);
      const before = cache.stats();
      const de = await answer(api, { q: "De" }); // a 2-character prefix with no chips: already cached
      expect(cache.stats()).toMatchObject({ misses: before.misses, hits: before.hits + 6 });
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

  describe("search details (#69): why a Record matched, and the Go-to entity", () => {
    type Search = MainScreenQuery["seap"]["search"];
    const ask69 = async (db: string, filter: Record<string, unknown>): Promise<Search> => {
      const variables = { filter };
      const r = await ask(db, mainScreen.sha256, variables);
      expect(r.body.errors).toBeUndefined();
      expect(validateResponse(schema, parse(mainScreen.document), r.body.data, variables)).toEqual([]);
      return (r.body.data as MainScreenQuery).seap.search;
    };
    const matched = async (q: string, code: string) => {
      const row = (await ask69("search_a", { q })).records.rows.find((r) => r.record.code === code);
      expect(row, `${code} for ${q}`).toBeDefined();
      return row!.matchedField;
    };

    beforeAll(() => {
      rebuild("search_a", "archive-search");
      rebuild("goto_a", "archive-goto");
    });

    it("names the matched field, its original text and the highlight ranges, one query per field kind", async () => {
      // TITLE, with a diacritics case: the query has none, the title has comma-below letters
      expect(await matched("Ștefan", "DA95000001")).toEqual({ field: "TITLE", text: "Reparații străzi Ștefan cel Mare", highlights: [[17, 23]] });
      expect(await matched("stefan", "DA95000001")).toEqual({ field: "TITLE", text: "Reparații străzi Ștefan cel Mare", highlights: [[17, 23]] });
      // the last token is a prefix: highlighted up to what was typed; the CPV description holds it too, the title wins the tie
      expect(await matched("servicii desz", "DA95000006")).toEqual({ field: "TITLE", text: "Servicii deszapezire drumuri", highlights: [[0, 8], [9, 13]] });
      expect(await matched("deszapezir", "CAN9500001~1")).toMatchObject({ field: "TITLE", highlights: [[9, 19]] });
      expect(await matched("spitalul", "DA95000008")).toEqual({ field: "AUTHORITY", text: "SPITALUL EXEMPLU", highlights: [[0, 8]] });
      expect(await matched("gamma", "CAN9500001~1")).toEqual({ field: "SUPPLIER", text: "GAMMA CONSORT SRL", highlights: [[0, 5]] });
      expect(await matched("țara", "DA95000001")).toEqual({ field: "SUPPLIER", text: "ŞANTIER ȚARA S.R.L.", highlights: [[8, 12]] }); // the cedilla Ş is in the source, the query has Ț
      expect(await matched("4523", "DA95000001")).toEqual({ field: "CPV_CODE", text: "45233140-2", highlights: [[0, 4]] });
      expect(await matched("drumuri", "DA95000001")).toEqual({ field: "CPV_DESCRIPTION", text: "Lucrari de drumuri", highlights: [[11, 18]] });
      expect(await matched("DA95000003", "DA95000003")).toEqual({ field: "PUBLIC_CODE", text: "DA95000003", highlights: [[0, 10]] });
      // a CUI, with RO: the identifier wins over the title that holds it too
      expect(await matched("RO1000017", "DA95000008")).toEqual({ field: "CUI", text: "1000017", highlights: [[0, 7]] });
    });

    it("has no matched field without a text query, and never one for a natural person", async () => {
      for (const r of (await ask69("search_a", {})).records.rows) expect(r.matchedField).toBeNull();
      for (const r of (await ask69("search_a", { channel: "DIRECT_PURCHASE" })).records.rows) expect(r.matchedField).toBeNull();
      expect((await ask69("search_a", { q: "ionescu" })).records.rows).toEqual([]);
    });

    it("every returned row names a field", async () => {
      const r = await ask69("search_a", { q: "desz" });
      expect(r.records.rows.every((x) => x.matchedField !== null)).toBe(true);
      expect(r.records.count).toBe(3);
    });

    const goTo = async (db: string, filter: Record<string, unknown>) => (await ask69(db, filter)).goTo;

    it("sets goTo for an exact CUI, with and without RO", async () => {
      for (const q of ["1000017", "RO1000017", "ro1000017"]) {
        const g = await goTo("search_a", { q });
        expect(g?.key, q).toBe("1000017");
        expect(g?.seap.roles, q).toEqual(["AUTHORITY"]);
      }
    });

    it("sets goTo for exactly one entity's folded name, and ignores the chips", async () => {
      for (const q of ["SPITALUL EXEMPLU", "spitalul  exemplu", "Spitalul Exemplu"]) expect((await goTo("search_a", { q }))?.key, q).toBe("1000017");
      expect((await goTo("search_a", { q: "spitalul exemplu", channel: "CONTRACT", from: "2023-02-05" }))?.key).toBe("1000017");
      expect((await goTo("search_a", { q: "PAPETARIE ALFA S.A." }))?.seap.roles).toEqual(["SUPPLIER"]);
    });

    it("leaves goTo unset for a non-exact query, a CUI that matches nothing, and a name two entities share", async () => {
      expect(await goTo("search_a", { q: "spitalul" })).toBeNull(); // a prefix of the name, not the name
      expect(await goTo("search_a", { q: "exemplu" })).toBeNull();
      expect(await goTo("search_a", { q: "9999999" })).toBeNull();
      expect(await goTo("search_a", { q: "RO9999999" })).toBeNull();
      expect(await goTo("search_a", {})).toBeNull();
      expect(await goTo("search_a", { q: "SRL" })).toBeNull(); // only a legal form: the empty query
      const two = await ask69("goto_a", { q: "primaria gemena" });
      expect(two.goTo).toBeNull();
      expect(two.authorities.count).toBe(2); // both are found, neither is pinned
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

  // ---- Money lens aggregations (#71) ----------------------------------------------------------------------------------------
  // archive-moneymap = the placement fixture (14 authorities, one DA of 1,000 RON each, all won by SANTIERUL TARA DEMO of Brasov:
  // 7 authorities in Brasov county, 3 in Cluj, 1 in a Bucharest sector, 2 national, 1 unplaced) plus four contracts:
  //   CAN9800001 Sanpetru (BV) 1,000.01 RON: Santierul (BV) + Cluj Demo Construct (CJ)       shares 50,001 + 50,000 bani
  //   CAN9800002 Caragiale (CJ)   600 RON: Cluj Demo Construct (CJ) + a Bulgarian firm       shares 30,000 + 30,000
  //   CAN9800003 the ministry (national) 5,000 RON: Santierul (BV)
  //   CAN9800004 the unplaced authority  700 RON: a natural person + Cluj Demo Construct     shares 35,000 + 35,000
  describe("Money lens (#71): archive-moneymap -> rebuild -> map, uatMap and the county filters", () => {
    type Total = { awarded: string; records: number; suspectLeftOut: number; noValue: number; frameworkCeilings: string; estimated: boolean };
    type Area = { area: string; name: string; entities: number; total: Total };
    type Map = { side: string; counties: Area[]; national: Total; unplaced: { authorities: number; total: Total } | null; unknownSupplierCounty: Total | null };
    const sum = (xs: string[]) => xs.reduce((a, x) => a + BigInt(x), 0n);
    const main = async (filter: Record<string, unknown>, db = "moneymap_a") => {
      const variables = { filter };
      const r = await ask(db, mainScreen.sha256, variables);
      expect(r.body.errors).toBeUndefined();
      expect(validateResponse(schema, parse(mainScreen.document), r.body.data, variables)).toEqual([]);
      const search = (r.body.data as unknown as { seap: { search: { total: Total; map: Map; records: { count: number; rows: { record: { code: string } }[] } } } }).seap.search;
      return { ...search, codes: search.records.rows.map((x) => x.record.code).sort() };
    };
    const byArea = (m: Map) => Object.fromEntries(m.counties.map((c) => [c.area, [c.total.awarded, c.total.records, c.entities]]));

    beforeAll(() => {
      rebuild("moneymap_a", "archive-moneymap", ["--placement-data", placementData, "--geo-dir", join(scratch, "geo-money")]);
    });

    it("authority side: county totals plus National and Unplaced add up to the set's total; National is not Bucharest (#71)", async () => {
      const { total, map } = await main({});
      expect(map.side).toBe("AUTHORITY");
      expect(total.awarded).toBe("2130001"); // 14 DA x 100,000 bani + 100,001 + 60,000 + 500,000 + 70,000
      expect(byArea(map)).toEqual({ "RO-B": ["100000", 1, 1], "RO-BV": ["800001", 8, 7], "RO-CJ": ["360000", 4, 3] });
      expect(map.national).toMatchObject({ awarded: "700000", records: 3 }); // the ministry and the agency, seated in Bucharest sectors, are not in RO-B
      expect(map.unplaced).toMatchObject({ authorities: 1, total: { awarded: "170000", records: 2 } });
      expect(map.unknownSupplierCounty).toBeNull();
      expect(sum([...map.counties.map((c) => c.total.awarded), map.national.awarded, map.unplaced!.total.awarded])).toBe(BigInt(total.awarded));
      expect(map.counties.reduce((n, c) => n + c.total.records, map.national.records + map.unplaced!.total.records)).toBe(total.records);
    });

    it("supplier side: a Record is shared by its winners' counties, the shares add up exactly, the rest is the unknown-county bucket (#71)", async () => {
      const { total, map } = await main({ countySide: "SUPPLIER" });
      expect(map.side).toBe("SUPPLIER");
      // CAN9800001's odd bani stay with the first winner (Santierul, Brasov): 50,001 + 50,000
      expect(byArea(map)).toEqual({ "RO-BV": ["1950001", 16, 1], "RO-CJ": ["115000", 3, 1] });
      expect(map.unknownSupplierCounty).toMatchObject({ awarded: "65000", records: 2 }); // the Bulgarian firm's and the natural person's shares
      expect(map.national).toMatchObject({ awarded: "0", records: 0 }); // no National tile on the supplier side, but never null
      expect(map.unplaced).toBeNull();
      expect(sum([...map.counties.map((c) => c.total.awarded), map.unknownSupplierCounty!.awarded])).toBe(BigInt(total.awarded));
    });

    it("an authority-side map under a winner-restricting filter groups per Record: records and awarded still add up (#71)", async () => {
      const { total, map } = await main({ supplier: "2000104" }); // winner 2 of CAN9800001 and CAN9800004, not the first winner of any Record
      expect(total).toMatchObject({ awarded: "115000", records: 3 });
      expect(byArea(map)["RO-BV"]).toEqual(["50000", 1, 1]);
      const areas = [...map.counties.map((c) => c.total), map.national, ...(map.unplaced ? [map.unplaced.total] : [])];
      expect(areas.reduce((n, t) => n + t.records, 0)).toBe(total.records);
      expect(sum(areas.map((t) => t.awarded))).toBe(BigInt(total.awarded));
    });

    it("names the counties the map lists (#71)", async () => {
      const { map } = await main({});
      expect(map.counties.find((c) => c.area === "RO-BV")?.name).toBe("Brașov");
    });

    it("gives the same map on the tracer path and on the search path (#71)", async () => {
      for (const countySide of ["AUTHORITY", "SUPPLIER"]) {
        const empty = await main({ countySide });
        const narrowed = await main({ countySide, from: "2000-01-01" }); // a chip that excludes nothing: the search path
        expect(narrowed.map).toEqual(empty.map);
        expect(narrowed.total).toEqual(empty.total);
      }
    });

    it("a supplier-county filter keeps a consortium with one local winner, once, and counts that winner's share (#71)", async () => {
      const cj = await main({ county: "RO-CJ", countySide: "SUPPLIER" });
      // CAN9800002 (Cluj Demo + a Bulgarian firm), CAN9800001 (Santierul + Cluj Demo), CAN9800004 (a person + Cluj Demo)
      expect(cj.codes).toEqual(["CAN9800001~1", "CAN9800002~1", "CAN9800004~1"]);
      expect(cj.records.count).toBe(3);
      expect(cj.total).toMatchObject({ awarded: "115000", records: 3 }); // the Cluj winner's share, not the whole Record
      expect(byArea(cj.map)).toEqual({ "RO-CJ": ["115000", 3, 1] });
      const bv = await main({ county: "RO-BV", countySide: "SUPPLIER" });
      expect(bv.total.records).toBe(16);
      expect(bv.records.count).toBe(16);
    });

    it("filters by the areas: a county of the authority, National, Unplaced, unknown supplier county (#71)", async () => {
      const national = await main({ county: "NATIONAL" });
      expect(national.total).toMatchObject({ awarded: "700000", records: 3 });
      const unplaced = await main({ county: "UNPLACED" });
      expect(unplaced.total).toMatchObject({ awarded: "170000", records: 2 });
      const bucharest = await main({ county: "RO-B" });
      expect(bucharest.total).toMatchObject({ awarded: "100000", records: 1 }); // no national authority in Bucharest
      const unknown = await main({ county: "UNKNOWN_SUPPLIER_COUNTY", countySide: "SUPPLIER" });
      expect(unknown.codes).toEqual(["CAN9800002~1", "CAN9800004~1"]);
      expect(unknown.total).toMatchObject({ awarded: "65000", records: 2 });
      // a county filter on the authority side: its own map keeps the set's shape
      const bv = await main({ county: "RO-BV" });
      expect(bv.total).toMatchObject({ awarded: "800001", records: 8 });
      expect(byArea(bv.map)).toEqual({ "RO-BV": ["800001", 8, 7] });
      expect(bv.map.national).toMatchObject({ awarded: "0", records: 0 });
      expect(bv.map.unplaced).toBeNull();
    });

    it("an area of the other side matches nothing: NATIONAL and UNPLACED on the supplier side, the unknown supplier county on the authority side (#71)", async () => {
      for (const filter of [{ county: "NATIONAL", countySide: "SUPPLIER" }, { county: "UNPLACED", countySide: "SUPPLIER" }, { county: "UNKNOWN_SUPPLIER_COUNTY", countySide: "AUTHORITY" }, { county: "UNKNOWN_SUPPLIER_COUNTY" }]) {
        const r = await main(filter);
        expect(r.total).toMatchObject({ awarded: "0", records: 0 });
        expect(r.records.count).toBe(0);
        expect(r.map.counties).toEqual([]);
        expect(r.map.unplaced).toBeNull();
        expect(r.map.unknownSupplierCounty).toBeNull();
      }
    });

    it("Unplaced is null when no authority is unplaced (#71)", async () => {
      expect((await main({ county: "RO-BV" })).map.unplaced).toBeNull();
      expect((await main({ q: "ministerul" })).map.unplaced).toBeNull();
      expect((await main({})).map.unplaced).not.toBeNull();
    });

    it("the zoomed county: UAT totals, the unknown-UAT row, Bucharest by sector, nationals excluded (#71)", async () => {
      const zoom = async (county: string, filter: Record<string, unknown> = {}) => {
        const variables = { filter, county };
        const r = await ask("moneymap_a", zoomedCounty.sha256, variables);
        expect(r.body.errors).toBeUndefined();
        expect(validateResponse(schema, parse(zoomedCounty.document), r.body.data, variables)).toEqual([]);
        return (r.body.data as unknown as { seap: { search: { uatMap: { uats: Area[]; unknownUat: Total | null } } } }).seap.search.uatMap;
      };
      const bv = await zoom("RO-BV");
      expect(Object.fromEntries(bv.uats.map((u) => [u.area, [u.name, u.total.awarded, u.total.records, u.entities]]))).toEqual({
        "880001": ["Brașov", "200000", 2, 2], "880010": ["Sânpetru", "200001", 2, 1], "880030": ["Râșnov", "100000", 1, 1], "880050": ["Ucea", "100000", 1, 1], "880060": ["Șinca Nouă", "100000", 1, 1],
      });
      expect(bv.unknownUat).toMatchObject({ awarded: "100000", records: 1 }); // the commune ANAF puts in the county but SIRUTA does not know
      expect(sum([...bv.uats.map((u) => u.total.awarded), bv.unknownUat!.awarded])).toBe(800001n); // = the county's total on the map
      const b = await zoom("RO-B");
      expect(b.uats.map((u) => [u.area, u.name, u.total.awarded])).toEqual([["179169", "Sector 3", "100000"]]);
      expect(b.unknownUat).toBeNull();
      expect((await zoom("RO-IS")).uats).toEqual([]);
      // the filter narrows it too
      expect((await zoom("RO-BV", { uat: "880010" })).uats.map((u) => u.area)).toEqual(["880010"]);
      expect((await zoom("RO-CJ", { county: "RO-BV" })).uats).toEqual([]);
    });

    it("gives identical maps after a second rebuild into a fresh database (#71, ADR 0004)", async () => {
      rebuild("moneymap_b", "archive-moneymap", ["--placement-data", placementData, "--geo-dir", join(scratch, "geo-money-b")]);
      for (const countySide of ["AUTHORITY", "SUPPLIER"]) expect((await main({ countySide }, "moneymap_b")).map).toEqual((await main({ countySide })).map);
    });
  });


  describe("entity roles (#73): archive-roles -> rebuild -> EntityOverview, EntityRecords, EntityRelationships", () => {
    type Total = { awarded: string; records: number; suspectLeftOut: number; noValue: number; frameworkCeilings: string; estimated: boolean };
    type Cpty = { entity: { key: string } | null; naturalPerson: boolean; total: Total; viaDirectPurchase: Total; viaContract: Total; wonTogether: boolean; hasSignals: boolean };
    type Role = {
      role: string;
      total: Total;
      counterparties: { count: number; topShare: number | null; rows: Cpty[] };
      directPurchaseShare: number;
      procedures: { value: string; total: Total }[];
      consortia: { members: { entity: { key: string } | null; publishedName: string | null; naturalPerson: boolean; share: string | null }[]; total: Total }[];
      frameworks: { count: number; ceilings: string; subsequentReported: string };
      largestRecords: { code: string; provenance: { url: string | null; fetchedAt: string } }[];
      signals: { count: number; rows: unknown[] };
    };
    const S = "1000017"; // SPITALUL EXEMPLU: an authority
    const COMUNA = "1000009";
    const CNAIR = "2000031"; // both roles
    const ALFA = "2000007"; // a supplier
    const BETA = "2000015";
    const GAMMA = "2000023";
    const RON = (n: number) => String(n * 100);
    const DB = "roles_a";

    const ask1 = async (op: { name: string; sha256: string; document: string }, variables: Record<string, unknown>) => {
      const r = await ask(DB, op.sha256, variables);
      expect(r.body.errors).toBeUndefined();
      expect(validateResponse(schema, parse(op.document), r.body.data, variables)).toEqual([]);
      return (r.body.data as unknown as { entity: { seap: { role: Record<string, unknown> | null; roles: string[] } } | null }).entity!.seap;
    };
    const overview = async (key: string, role: string, filter: Record<string, unknown> = {}) =>
      (await ask1(entityOverview, { key, role, filter })).role as unknown as Role;
    type RecordsRole = { records: { total: Total; facets: Record<string, { value: string; total: Total }[]> & { counterparty: { entity: { key: string }; matched: Total }[] }; records: { rows: { record: { code: string; provenance: { url: string | null } } }[] } } };
    const recordsTab = async (key: string, role: string, filter: Record<string, unknown> = {}) =>
      (await ask1(entityRecords, { key, role, filter, limit: 100, offset: 0 })).role as unknown as RecordsRole;
    type RelRole = { counterparties: Role["counterparties"]; timeline: { month: string; total: Total }[]; flow: { side: string; counties: unknown[]; unplaced: { authorities: number; total: Total } | null; unknownSupplierCounty: Total | null; national: Total } };
    const relationships = async (key: string, role: string, filter: Record<string, unknown> = {}, counterparty: string | null = null) =>
      (await ask1(entityRelationships, { key, role, filter, counterparty })).role as unknown as RelRole;
    const searchTotal = async (filter: Record<string, unknown>) => {
      const variables = { filter };
      const r = await ask(DB, mainScreen.sha256, variables);
      expect(r.body.errors).toBeUndefined();
      return (r.body.data as unknown as { seap: { search: { total: Total; records: { count: number } } } }).seap.search;
    };
    const money = (t: Total) => [t.awarded, t.records];
    const sum = (xs: string[]) => xs.reduce((a, x) => a + BigInt(x), 0n);

    beforeAll(() => {
      rebuild(DB, "archive-roles");
    });

    it("an entity that never held the role has no such role: null (#73)", async () => {
      const r = await ask1(entityOverview, { key: ALFA, role: "AUTHORITY", filter: {} });
      expect(r.roles).toEqual(["SUPPLIER"]);
      expect(r.role).toBeNull();
      expect((await ask1(entityOverview, { key: S, role: "SUPPLIER", filter: {} })).role).toBeNull();
      expect((await ask1(entityOverview, { key: CNAIR, role: "AUTHORITY", filter: {} })).roles).toEqual(["AUTHORITY", "SUPPLIER"]);
    });

    it("total: an authority sums its counted Records once, leaving out the suspect, the blank and the ceiling (#73)", async () => {
      const t = (await overview(S, "AUTHORITY")).total;
      // direct purchases 240,000 RON + contracts 5,000,000 (two subsequent) + 900,000 + 600,000 + 100,000 + 2,000,000
      expect(t).toMatchObject({ awarded: RON(8_840_000), records: 16, suspectLeftOut: 1, noValue: 2, frameworkCeilings: RON(10_000_000), estimated: false });
    });

    it("total: a supplier sums its own share of each Record, a consortium once per Record with an equal share (#73)", async () => {
      const t = (await overview(ALFA, "SUPPLIER")).total;
      // 215,000 of direct purchases, 5,000,000 of subsequent contracts, 300,000 + 350,000 + 50,000 of three consortium thirds and halves
      expect(t).toMatchObject({ awarded: RON(5_915_000), records: 13, suspectLeftOut: 1, noValue: 2, frameworkCeilings: RON(10_000_000) });
    });

    it("total: an entity with both roles has one total per role (#73)", async () => {
      expect((await overview(CNAIR, "SUPPLIER")).total).toMatchObject({ awarded: RON(2_020_000), records: 2 }); // the hospital's DA and contract
      expect((await overview(CNAIR, "AUTHORITY")).total).toMatchObject({ awarded: RON(340_000), records: 2 }); // it buys from ALFA and BETA
    });

    it("counterparties: an authority's suppliers ranked by money; all natural persons are ONE row without an entity; counts and top share (#73)", async () => {
      const c = (await overview(S, "AUTHORITY")).counterparties;
      expect(c.count).toBe(5);
      expect(c.rows.map((r) => [r.entity?.key ?? null, r.naturalPerson, r.total.awarded])).toEqual([
        [ALFA, false, RON(5_525_000)], [CNAIR, false, RON(2_020_000)], [BETA, false, RON(680_000)], [null, true, RON(315_000)], [GAMMA, false, RON(300_000)],
      ]);
      expect(c.topShare).toBeCloseTo(5_525_000 / 8_840_000, 9);
      expect(sum(c.rows.map((r) => r.total.awarded))).toBe(8_840_000n * 100n); // the counterparties add up to the role total on the authority side
      expect(JSON.stringify(c)).not.toContain("IONESCU"); // a person is never named
    });

    it("counterparties: a supplier's authorities, the channel split and who it won together with (#73)", async () => {
      const c = (await relationships(ALFA, "SUPPLIER")).counterparties;
      expect(c.rows.map((r) => [r.entity!.key, r.total.awarded, r.viaDirectPurchase.awarded, r.viaContract.awarded, r.wonTogether])).toEqual([
        [S, RON(5_525_000), RON(175_000), RON(5_350_000), true], // CAN9600002 and CAN9600005 were won with others
        [COMUNA, RON(350_000), "0", RON(350_000), true],
        [CNAIR, RON(40_000), RON(40_000), "0", false],
      ]);
      expect(c.rows[0]!.viaDirectPurchase.records + c.rows[0]!.viaContract.records).toBe(c.rows[0]!.total.records);
      expect(c.rows.every((r) => !r.hasSignals && !r.naturalPerson)).toBe(true);
      expect(sum(c.rows.map((r) => r.total.awarded))).toBe(5_915_000n * 100n);
      expect(c.topShare).toBeCloseTo(5_525_000 / 5_915_000, 9);
    });

    it("counterparties: both roles of CNAIR, and the blank/suspect Records show as left out on the counterparty (#73)", async () => {
      const asAuthority = (await relationships(CNAIR, "AUTHORITY")).counterparties;
      expect(asAuthority.rows.map((r) => [r.entity!.key, r.total.awarded])).toEqual([[BETA, RON(300_000)], [ALFA, RON(40_000)]]);
      const alfaAtHospital = (await relationships(S, "AUTHORITY")).counterparties.rows[0]!;
      expect(alfaAtHospital.total).toMatchObject({ suspectLeftOut: 1, noValue: 2 });
    });

    it("directPurchaseShare: direct purchases over everything awarded, 0 when nothing was awarded (#73)", async () => {
      expect((await overview(S, "AUTHORITY")).directPurchaseShare).toBeCloseTo(240_000 / 8_840_000, 9);
      expect((await overview(ALFA, "SUPPLIER")).directPurchaseShare).toBeCloseTo(215_000 / 5_915_000, 9);
      expect((await overview(CNAIR, "AUTHORITY")).directPurchaseShare).toBeCloseTo(40_000 / 340_000, 8);
      expect((await overview(S, "AUTHORITY", { channel: "CONTRACT" })).directPurchaseShare).toBe(0);
      expect((await overview(S, "AUTHORITY", { to: "2000-01-01" })).directPurchaseShare).toBe(0); // nothing in the window
    });

    it("procedures: the Total per published procedure, direct purchases (no procedure) apart (#73)", async () => {
      const p = (await overview(S, "AUTHORITY")).procedures;
      expect(p.map((x) => [x.value, x.total.awarded, x.total.records, x.total.noValue])).toEqual([
        ["Licitatie deschisa", RON(7_100_000), 5, 0], ["Negociere", RON(1_500_000), 3, 1],
      ]);
      expect((await overview(ALFA, "SUPPLIER")).procedures.map((x) => [x.value, x.total.awarded])).toEqual([["Licitatie deschisa", RON(5_400_000)], ["Negociere", RON(300_000)]]);
      expect((await overview(CNAIR, "AUTHORITY")).procedures.map((x) => x.value)).toEqual(["Licitatie deschisa"]);
    });

    it("consortia: Records with several winners grouped by member set, ranked by money, a person without an entity (#73)", async () => {
      const keys = (c: Role["consortia"][number]) => c.members.map((m) => m.entity?.key ?? "person");
      const hospital = (await overview(S, "AUTHORITY")).consortia;
      expect(hospital.map((c) => [keys(c), c.total.awarded, c.total.records])).toEqual([
        [[ALFA, BETA, GAMMA], RON(900_000), 1], [[BETA, "person"], RON(600_000), 1], [[ALFA, BETA], RON(100_000), 1],
      ]);
      const person = hospital[1]!.members.find((m) => m.naturalPerson)!;
      expect(person).toMatchObject({ entity: null, publishedName: null, share: RON(300_000) });
      expect(hospital[0]!.members.map((m) => m.share)).toEqual([RON(300_000), RON(300_000), RON(300_000)]);
      // the supplier's page: the same groups, but only its own Records; {ALFA, BETA} is two Records now (the commune's and the hospital's)
      const alfa = (await overview(ALFA, "SUPPLIER")).consortia;
      expect(alfa.map((c) => [keys(c), c.total.awarded, c.total.records])).toEqual([[[ALFA, BETA, GAMMA], RON(900_000), 1], [[ALFA, BETA], RON(800_000), 2]]);
      expect(alfa[1]!.members.map((m) => m.share)).toEqual([RON(400_000), RON(400_000)]); // each member's equal shares summed over the group's Records
      expect((await overview(CNAIR, "SUPPLIER")).consortia).toEqual([]);
    });

    it("consortia: a limit of 1 keeps the biggest group (#73)", async () => {
      const one = await adhoc(DB, `query($k: ID!) { entity(key: $k) { seap { role(role: AUTHORITY) { consortia(limit: 1) { total { awarded } } counterparties(limit: 2) { count rows { naturalPerson } } largestRecords(limit: 1) { code } } } } }`, { k: S });
      const role = (one as unknown as { entity: { seap: { role: { consortia: { total: Total }[]; counterparties: { count: number; rows: unknown[] }; largestRecords: unknown[] } } } }).entity.seap.role;
      expect(role.consortia.map((c) => c.total.awarded)).toEqual([RON(900_000)]);
      expect(role.counterparties.rows.length).toBe(2);
      expect(role.counterparties.count).toBe(5); // the count is of all, not of the page
      expect(role.largestRecords.length).toBe(1);
    });

    it("counterparties: a page of 0 rows still counts all of them (#73)", async () => {
      const r = await adhoc(DB, `query($k: ID!) { entity(key: $k) { seap { role(role: AUTHORITY) { counterparties(limit: 0) { count rows { naturalPerson } } } } } }`, { k: S });
      expect((r as unknown as { entity: { seap: { role: { counterparties: { count: number; rows: unknown[] } } } } }).entity.seap.role.counterparties).toEqual({ count: 5, rows: [] });
    });

    it("frameworks: how many agreements, their ceilings, and what the subsequent contracts under them reported (#73)", async () => {
      expect((await overview(S, "AUTHORITY")).frameworks).toEqual({ count: 1, ceilings: RON(10_000_000), subsequentReported: RON(5_000_000) });
      expect((await overview(ALFA, "SUPPLIER")).frameworks).toEqual({ count: 1, ceilings: RON(10_000_000), subsequentReported: RON(5_000_000) });
      expect((await overview(BETA, "SUPPLIER")).frameworks).toEqual({ count: 0, ceilings: "0", subsequentReported: "0" });
      expect((await overview(CNAIR, "AUTHORITY")).frameworks).toEqual({ count: 0, ceilings: "0", subsequentReported: "0" });
    });

    it("largestRecords: the largest counted Records, with provenance; the ceiling, the suspect and the blank are not among them (#73)", async () => {
      const codes = async (key: string, role: string, filter = {}) => (await overview(key, role, filter)).largestRecords.map((r) => r.code);
      expect((await codes(S, "AUTHORITY")).slice(0, 4)).toEqual(["CAN9600001~2", "CAN9600006~1", "CAN9600001~3", "CAN9600002~1"]);
      expect(await codes(S, "AUTHORITY")).not.toContain("CAN9600001~1"); // the 10,000,000 ceiling
      expect(await codes(S, "AUTHORITY")).not.toContain("DA96000005"); // suspect
      expect(await codes(S, "AUTHORITY")).not.toContain("DA96000004"); // blank
      expect((await codes(ALFA, "SUPPLIER")).slice(0, 3)).toEqual(["CAN9600001~2", "CAN9600001~3", "CAN9600003~1"]); // ranked by ALFA's own share
    });

    it("largestRecords and records carry provenance like every other path: the file it came from and the SEAP link (#73, #72)", async () => {
      const data = (await adhoc(DB, `query($k: ID!) { entity(key: $k) { seap { role(role: AUTHORITY) {
          largestRecords(limit: 2) { code provenance { source kind via url fetchedAt } }
          records(filter: {}) { records(limit: 100) { rows { record { code provenance { source kind via url fetchedAt } } } } } } } } }`, { k: S })) as unknown as {
        entity: { seap: { role: { largestRecords: { code: string; provenance: Record<string, string> }[]; records: { records: { rows: { record: { code: string; provenance: Record<string, string> } }[] } } } } };
      };
      const role = data.entity.seap.role;
      expect(role.largestRecords[0]!.provenance).toMatchObject({ source: "SEAP", kind: "BULK", via: "Contracte 2023 - T1" });
      expect(role.largestRecords[0]!.provenance.url).toMatch(/\/source\/seap\/CAN9600001~2$/);
      expect(role.largestRecords[0]!.provenance.fetchedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
      expect(role.records.records.rows.length).toBe(16);
      for (const { record } of role.records.records.rows) expect(record.provenance).toMatchObject({ source: "SEAP", kind: "BULK" });
      for (const { record } of role.records.records.rows) expect(record.provenance.url).toMatch(/\/source\/seap\/(DA|CAN)/);
    });

    it("signals: an empty page until the Signal model exists (#73, #74)", async () => {
      expect((await overview(S, "AUTHORITY")).signals).toEqual({ count: 0, rows: [] });
    });

    it("records: the scoped search, with its facets; the other side's counterparties offered as the counterparty facet (#73)", async () => {
      const r = await recordsTab(S, "AUTHORITY");
      expect(r.records.total).toMatchObject({ awarded: RON(8_840_000), records: 16 });
      expect(r.records.records.rows.length).toBe(16);
      expect(r.records.facets.channel!.map((x) => [x.value, x.total.awarded, x.total.records])).toEqual([["CONTRACT", RON(8_600_000), 8], ["DIRECT_PURCHASE", RON(240_000), 8]]);
      expect(r.records.facets.year!.map((x) => [x.value, x.total.awarded]).sort()).toEqual([["2023", RON(8_815_000)], ["2024", RON(25_000)]]);
      expect(r.records.facets.procedure!.map((x) => x.value).sort()).toEqual(["Licitatie deschisa", "Negociere"]);
      const badge = Object.fromEntries(r.records.facets.badge!.map((x) => [x.value, x.total.records]));
      expect(badge).toMatchObject({ SUSPECT_VALUE: 1, NO_VALUE: 2, FRAMEWORK_CEILING: 1, SUBSEQUENT_CONTRACT: 2 });
      expect(r.records.facets.signal).toEqual([]);
      expect(r.records.facets.counterparty!.map((x) => x.entity.key)).toEqual([ALFA, CNAIR, BETA, GAMMA]); // suppliers, ranked; the person has no entity
    });

    it("records: a supplier's own Records and the authorities offered as counterparties, also with one picked (#73)", async () => {
      const r = await recordsTab(ALFA, "SUPPLIER");
      expect(r.records.records.rows.length).toBe(13);
      expect(r.records.facets.counterparty!.map((x) => x.entity.key)).toEqual([S, COMUNA, CNAIR]);
      const picked = await recordsTab(ALFA, "SUPPLIER", { authority: COMUNA });
      expect(picked.records.total).toMatchObject({ awarded: RON(350_000), records: 1 });
      expect(picked.records.facets.counterparty!.map((x) => x.entity.key)).toEqual([S, COMUNA, CNAIR]); // the alternatives stay on offer
    });

    it("records: an entity that does not hold the role has none (#73)", async () => {
      expect((await ask1(entityRecords, { key: ALFA, role: "AUTHORITY", filter: {}, limit: 10, offset: 0 })).role).toBeNull();
    });

    it("timeline: the Total per month, oldest first, optionally for one counterparty (#73)", async () => {
      const t = (await relationships(S, "AUTHORITY")).timeline;
      expect(t.map((m) => [m.month, m.total.awarded, m.total.records])).toEqual([
        ["2023-01", RON(7_120_000), 6], ["2023-02", RON(995_000), 4], ["2023-03", RON(700_000), 5], ["2024-01", RON(25_000), 1],
      ]);
      expect(sum(t.map((m) => m.total.awarded))).toBe(8_840_000n * 100n);
      const beta = (await relationships(S, "AUTHORITY", {}, BETA)).timeline;
      expect(beta.map((m) => [m.month, m.total.awarded, m.total.records])).toEqual([["2023-02", RON(330_000), 2], ["2023-03", RON(350_000), 2]]);
      const alfaAt = (await relationships(ALFA, "SUPPLIER", {}, COMUNA)).timeline;
      expect(alfaAt.map((m) => [m.month, m.total.awarded])).toEqual([["2023-02", RON(350_000)]]);
      expect((await relationships(S, "AUTHORITY", {}, "9999999")).timeline).toEqual([]); // a key that is not a counterparty
    });

    it("flow: drawn on the counterparty's side, off-map buckets included (#73)", async () => {
      const supplier = (await relationships(ALFA, "SUPPLIER")).flow;
      expect(supplier.side).toBe("AUTHORITY");
      // CNAIR is placed (ANAF knows its county); the hospital and the commune are not, so they are the Unplaced tile and CNAIR's 40,000 sits in its county
      expect(supplier.unplaced).toMatchObject({ authorities: 2, total: { awarded: RON(5_875_000), records: 12 } });
      expect(supplier.counties).toMatchObject([{ total: { awarded: RON(40_000), records: 1 }, entities: 1 }]);
      const authority = (await relationships(S, "AUTHORITY")).flow;
      expect(authority.side).toBe("SUPPLIER");
      // the natural person's shares have no county; the companies ANAF places in a county are on the map
      expect(authority.unknownSupplierCounty).toMatchObject({ awarded: RON(315_000), records: 2 });
      expect(authority.unplaced).toBeNull();
      expect(sum([...authority.counties.map((c) => (c as { total: Total }).total.awarded), authority.unknownSupplierCounty!.awarded])).toBe(8_840_000n * 100n);
    });

    it("every field follows the filter: a channel, a year range and a text query narrow each of them (#73)", async () => {
      const contracts = await overview(S, "AUTHORITY", { channel: "CONTRACT" });
      expect(contracts.total).toMatchObject({ awarded: RON(8_600_000), records: 8 });
      expect(contracts.counterparties.rows.map((r) => r.entity?.key ?? null)).toEqual([ALFA, CNAIR, BETA, GAMMA, null]); // the natural person ties with GAMMA at 300,000: ties by key, a person last
      const split = (await relationships(S, "AUTHORITY", { channel: "CONTRACT" })).counterparties.rows;
      expect(split.every((r) => r.viaDirectPurchase.awarded === "0" && r.viaDirectPurchase.records === 0)).toBe(true);
      expect(split.find((r) => r.entity?.key === ALFA)!.viaContract.awarded).toBe(RON(5_350_000));
      expect(contracts.procedures.map((p) => p.total.awarded)).toEqual([RON(7_100_000), RON(1_500_000)]);
      expect(contracts.consortia.length).toBe(3);
      expect(contracts.frameworks.count).toBe(1);
      const y24 = await overview(S, "AUTHORITY", { from: "2024-01-01", to: "2024-12-31" });
      expect(y24.total).toMatchObject({ awarded: RON(25_000), records: 1, frameworkCeilings: "0" });
      expect(y24.counterparties.rows.map((r) => r.entity?.key)).toEqual([ALFA]);
      expect(y24.consortia).toEqual([]);
      expect(y24.frameworks.count).toBe(0);
      expect(y24.procedures).toEqual([]);
      expect(y24.largestRecords.map((r) => r.code)).toEqual(["DA96100001"]);
      expect((await relationships(S, "AUTHORITY", { from: "2024-01-01" })).timeline.map((m) => m.month)).toEqual(["2024-01"]);
      expect((await relationships(S, "AUTHORITY", { channel: "DIRECT_PURCHASE" })).flow.unknownSupplierCounty).toMatchObject({ awarded: RON(15_000), records: 1 });
      const q = await recordsTab(S, "AUTHORITY", { q: "consortium" });
      expect(q.records.total.records).toBe(0); // nothing in this fixture is about that
      const narrow = await recordsTab(S, "AUTHORITY", { to: "2023-01-31" });
      expect(narrow.records.total).toMatchObject({ awarded: RON(7_120_000), records: 6 });
      expect(narrow.records.facets.year!.map((x) => x.value)).toEqual(["2023"]);
      // the supplier side
      const alfa = await overview(ALFA, "SUPPLIER", { channel: "CONTRACT" });
      expect(alfa.total).toMatchObject({ awarded: RON(5_700_000), records: 7 });
      expect(alfa.consortia.map((c) => c.total.awarded)).toEqual([RON(900_000), RON(800_000)]);
    });

    it("role totals equal the entity-scoped search totals for the same filter, empty, channel, year range, text and area (#73)", async () => {
      const filters: Record<string, unknown>[] = [
        {}, { channel: "DIRECT_PURCHASE" }, { channel: "CONTRACT" }, { from: "2023-02-01", to: "2023-12-31" }, { q: "demo" }, { q: "achizitie da96" },
        { county: "UNPLACED" }, { badges: ["CONSORTIUM_SHARE"] }, { valueBucket: "UP_TO_10K" }, { procedure: ["Negociere"] },
      ];
      for (const [key, role] of [[S, "AUTHORITY"], [COMUNA, "AUTHORITY"], [CNAIR, "AUTHORITY"], [ALFA, "SUPPLIER"], [BETA, "SUPPLIER"], [CNAIR, "SUPPLIER"]] as const) {
        for (const filter of filters) {
          const scoped = { ...filter, [role === "AUTHORITY" ? "authority" : "supplier"]: key };
          const search = await searchTotal(scoped);
          const asRole = await overview(key, role, filter);
          const fields = (t: Total) => [t.awarded, t.records, t.suspectLeftOut, t.noValue, t.frameworkCeilings];
          expect(fields(asRole.total), `${role} ${key} ${JSON.stringify(filter)}`).toEqual(fields(search.total));
          const records = await recordsTab(key, role, filter);
          expect(fields(records.records.total), `records ${role} ${key} ${JSON.stringify(filter)}`).toEqual(fields(search.total));
          expect(records.records.records.rows.length).toBe(search.total.records);
          // the authority side: the counterparties add up to the role's total (a Record has one authority, and the suppliers' shares add up to its counted value)
          const rel = await relationships(key, role, filter);
          if (rel.counterparties.rows.length === rel.counterparties.count) expect(sum(rel.counterparties.rows.map((r) => r.total.awarded)).toString()).toBe(search.total.awarded);
          expect(sum(rel.timeline.map((m) => m.total.awarded)).toString()).toBe(search.total.awarded);
          expect(rel.timeline.reduce((n, m) => n + m.total.records, 0)).toBe(search.total.records);
        }
      }
    });

    it("role totals equal the search totals under a counterparty filter too (#73)", async () => {
      for (const [key, role, other] of [[S, "AUTHORITY", "supplier"], [ALFA, "SUPPLIER", "authority"]] as const) {
        const counterparty = role === "AUTHORITY" ? BETA : S;
        const filter = { [other]: counterparty };
        const scoped = { ...filter, [role === "AUTHORITY" ? "authority" : "supplier"]: key };
        const search = await searchTotal(scoped);
        expect(money((await overview(key, role, filter)).total)).toEqual(money(search.total));
        expect(search.total.records).toBeGreaterThan(0);
      }
    });

    it("the facets split the role total exactly: channel and year Totals add up to it (#73)", async () => {
      const r = await recordsTab(S, "AUTHORITY");
      expect(sum(r.records.facets.channel!.map((x) => x.total.awarded))).toBe(BigInt(r.records.total.awarded));
      expect(sum(r.records.facets.year!.map((x) => x.total.awarded))).toBe(BigInt(r.records.total.awarded));
    });

    it("both roles: every field stays on its own side, CNAIR as authority and as supplier (#73)", async () => {
      const asAuthority = await overview(CNAIR, "AUTHORITY");
      const asSupplier = await overview(CNAIR, "SUPPLIER");
      expect(asAuthority.largestRecords.map((r) => r.code)).toEqual(["CAN9600007~1", "DA96000007"]);
      expect(asSupplier.largestRecords.map((r) => r.code)).toEqual(["CAN9600006~1", "DA96000006"]);
      const rows = async (role: string) => (await recordsTab(CNAIR, role)).records.records.rows.map((r) => r.record.code).sort();
      const authorityRows = await rows("AUTHORITY");
      const supplierRows = await rows("SUPPLIER");
      expect(authorityRows).toEqual(["CAN9600007~1", "DA96000007"]);
      expect(supplierRows).toEqual(["CAN9600006~1", "DA96000006"]);
      expect(authorityRows.filter((c) => supplierRows.includes(c))).toEqual([]);
      expect((await recordsTab(CNAIR, "AUTHORITY")).records.facets.counterparty!.map((x) => x.entity.key)).toEqual([BETA, ALFA]);
      expect((await recordsTab(CNAIR, "SUPPLIER")).records.facets.counterparty!.map((x) => x.entity.key)).toEqual([S]);
      const a = await relationships(CNAIR, "AUTHORITY");
      const s = await relationships(CNAIR, "SUPPLIER");
      expect(a.timeline.map((m) => [m.month, m.total.awarded])).toEqual([["2023-02", RON(340_000)]]);
      expect(s.timeline.map((m) => [m.month, m.total.awarded])).toEqual([["2023-01", RON(2_020_000)]]);
      expect(a.flow.side).toBe("SUPPLIER");
      expect(s.flow.side).toBe("AUTHORITY");
      expect(sum([...s.flow.counties.map((c) => (c as { total: Total }).total.awarded), s.flow.unplaced!.total.awarded, ...(s.flow.unknownSupplierCounty ? [s.flow.unknownSupplierCounty.awarded] : [])])).toBe(2_020_000n * 100n);
      expect(s.counterparties.rows.map((r) => [r.entity!.key, r.total.awarded, r.viaDirectPurchase.awarded, r.viaContract.awarded])).toEqual([[S, RON(2_020_000), RON(20_000), RON(2_000_000)]]);
      expect((await overview(CNAIR, "SUPPLIER")).directPurchaseShare).toBeCloseTo(20_000 / 2_020_000, 8);
      expect(asSupplier.frameworks).toEqual({ count: 0, ceilings: "0", subsequentReported: "0" });
      expect(asAuthority.signals).toEqual({ count: 0, rows: [] });
      expect(asSupplier.signals).toEqual({ count: 0, rows: [] });
    });

    describe("edge cases: an unlinked winner, a person, a consortium framework agreement (archive-roles-edge)", () => {
      const EDGE = "roles_edge";
      const edge = async (key: string, role: string) => {
        const r = await ask(EDGE, entityOverview.sha256, { key, role, filter: {} });
        expect(r.body.errors).toBeUndefined();
        return (r.body.data as unknown as { entity: { seap: { role: Role } } }).entity.seap.role;
      };
      beforeAll(() => {
        rebuild(EDGE, "archive-roles-edge");
      });

      it("counterparties: a winner nobody could link is not a natural person; persons stay one named-never row (#73)", async () => {
        const c = (await edge(COMUNA, "AUTHORITY")).counterparties;
        const person = c.rows.filter((r) => r.naturalPerson);
        const unlinked = c.rows.filter((r) => !r.naturalPerson && r.entity === null);
        expect(person.map((r) => r.total.awarded)).toEqual([RON(2_000)]);
        expect(unlinked.map((r) => r.total.awarded)).toEqual([RON(1_000)]);
        expect(c.count).toBe(4); // ALFA, BETA, the unlinked winner, the person
      });

      it("consortia: members' shares are the counted shares, so a framework ceiling or a suspect Record adds nothing (#73)", async () => {
        for (const [key, role] of [[COMUNA, "AUTHORITY"], [ALFA, "SUPPLIER"]] as const) {
          const consortia = (await edge(key, role)).consortia;
          expect(consortia.length, `${role} ${key}`).toBe(1);
          const [group] = consortia;
          expect(group!.total).toMatchObject({ awarded: RON(1_000_000), frameworkCeilings: RON(4_000_000) });
          expect(group!.members.map((m) => m.share)).toEqual([RON(500_000), RON(500_000)]);
        }
      });
    });
  });

  describe("recorded fixtures (#83): archive-moneymap -> rebuild -> the contract's recorded responses", () => {
    // The app's seam 3 renders against these answers, so the two seams stay in step: this block fails when an answer
    // drifts from the committed JSON. `RECORD_FIXTURES=1` rewrites the JSON instead (see packages/contract/README.md).
    const recording = process.env.RECORD_FIXTURES === "1";
    const dir = resolve(here, "../../contract/src/fixtures/recorded");
    const operations = [...new Set(RECORDED_CASES.map((c) => c.operation))];

    beforeAll(() => {
      rebuild("recorded_a", "archive-moneymap", ["--placement-data", placementData, "--geo-dir", join(scratch, "geo-money-recorded")]); // its own database: no other block rebuilds it under a live pool
    });

    const answer = async (c: RecordedCase) => {
      const op = allowlist.operations.find((o) => o.name === c.operation)!;
      const r = await ask("recorded_a", op.sha256, c.variables);
      expect(r.status, c.name).toBe(200);
      expect(r.body.errors, c.name).toBeUndefined();
      expect(validateResponse(schema, parse(op.document), r.body.data, c.variables), c.name).toEqual([]);
      return { name: c.name, kind: c.kind, description: c.description, variables: c.variables, data: r.body.data };
    };

    for (const operation of operations) {
      it(`${operation}: every recorded case is what the API answers now`, async () => {
        const recorded = [];
        for (const c of RECORDED_CASES.filter((x) => x.operation === operation)) recorded.push(await answer(c));
        const file = join(dir, `${operation}.json`);
        if (recording) writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
        // through JSON, so undefined and key order do not matter
        expect(JSON.parse(JSON.stringify(recorded))).toEqual(JSON.parse(readFileSync(file, "utf8")));
      });
    }

    it("gives the cases the states they are named for", async () => {
      const search = async (name: string) => ((await answer(RECORDED_CASES.find((c) => c.name === name && c.operation === "MainScreen")!)).data as MainScreenQuery).seap.search;
      const national = await search("empty-filter-national");
      expect(national.map.national.records).toBeGreaterThan(0);
      expect(national.map.unplaced?.total.records).toBeGreaterThan(0);
      expect((await search("supplier-side-unknown-county")).map.unknownSupplierCounty?.records).toBeGreaterThan(0);
      expect((await search("go-to-entity")).goTo).not.toBeNull();
      const none = await search("empty-no-match");
      expect([none.total.records, none.records.count, none.goTo]).toEqual([0, 0, null]);
      const county = await search("county-authority-side");
      expect(county.total.records).toBeLessThan(national.total.records);
    });
  });

  describe("recorded fixtures (#84): archive-moneymap -> rebuild -> the contract's recorded ZoomedCounty responses", () => {
    // Same convention as #83: fails when an answer drifts from the committed JSON, `RECORD_FIXTURES=1` rewrites it.
    const recording = process.env.RECORD_FIXTURES === "1";
    const file = resolve(here, "../../contract/src/fixtures/recorded/ZoomedCounty.json");
    const op = allowlist.operations.find((o) => o.name === "ZoomedCounty")!;
    type Zoom = { uats: { siruta: string }[]; seap: { search: { total: { records: number }; uatMap: { uats: { area: string; total: { records: number } }[]; unknownUat: { records: number } | null } } } };

    beforeAll(() => {
      rebuild("recorded_zoom", "archive-moneymap", ["--placement-data", placementData, "--geo-dir", join(scratch, "geo-money-zoom")]);
    });

    const answer = async (c: (typeof RECORDED_ZOOM_CASES)[number]) => {
      const r = await ask("recorded_zoom", op.sha256, c.variables);
      expect(r.status, c.name).toBe(200);
      expect(r.body.errors, c.name).toBeUndefined();
      expect(validateResponse(schema, parse(op.document), r.body.data, c.variables), c.name).toEqual([]);
      return { name: c.name, kind: c.kind, description: c.description, variables: c.variables, data: r.body.data };
    };

    it("every recorded ZoomedCounty case is what the API answers now", async () => {
      const recorded = [];
      for (const c of RECORDED_ZOOM_CASES) recorded.push(await answer(c));
      if (recording) writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
      expect(JSON.parse(JSON.stringify(recorded))).toEqual(JSON.parse(readFileSync(file, "utf8")));
    });

    it("gives the cases the states they are named for", async () => {
      const zoom = async (name: string) => ((await answer(RECORDED_ZOOM_CASES.find((c) => c.name === name)!)).data as Zoom);
      const bv = await zoom("county-with-unknown-uat-row");
      expect(bv.seap.search.uatMap.uats.length).toBeGreaterThan(1);
      expect(bv.seap.search.uatMap.unknownUat?.records).toBeGreaterThan(0);
      expect((await zoom("county-without-unknown-uat-row")).seap.search.uatMap.unknownUat).toBeNull();
      const b = await zoom("bucharest-by-sector");
      expect(b.uats.map((u) => u.siruta)).toEqual(["179141", "179150", "179169", "179178", "179187", "179196"]); // the six sectors
      expect(b.seap.search.uatMap.uats.map((u) => u.area)).toEqual(["179169"]); // only Sector 3 has Records: the others draw grey
      const narrowed = await zoom("county-text-query");
      expect(narrowed.seap.search.total.records).toBeLessThan(bv.seap.search.total.records);
      const none = await zoom("county-no-match");
      expect([none.seap.search.total.records, none.seap.search.uatMap.uats, none.seap.search.uatMap.unknownUat]).toEqual([0, [], null]);
      expect(none.uats.length).toBeGreaterThan(0); // the county's UATs are still listed: they all draw grey
    });
  });

  describe("recorded fixtures (#90): archive-mf + archive-coverage -> rebuild -> the contract's recorded CoverageLens and CoveragePage responses", () => {
    // Same convention as #83/#84: fails when an answer drifts from the committed JSON, `RECORD_FIXTURES=1` rewrites it.
    const recording = process.env.RECORD_FIXTURES === "1";
    const DB = "recorded_coverage";

    // One world for both operations: the placement world (N of M in 2023 Q1), the MF list (the snapshot date, M), and the Coverage archive's grid
    // (every gap state, a quarantined file, crawled quarters), rebuilt as of 2025-09-20 with both known-gaps files joined.
    beforeAll(() => {
      const archive = join(scratch, "archive-recorded-coverage");
      for (const part of ["archive-mf", "archive-coverage"]) cpSync(join(scratch, part), archive, { recursive: true });
      const gaps = join(scratch, "recorded-coverage-gaps.csv");
      writeFileSync(gaps, `${readFileSync(mfGaps, "utf8").trimEnd()}\n${readFileSync(coverageGaps, "utf8").split("\n").slice(1).join("\n")}`);
      rebuild(DB, "archive-recorded-coverage", ["--placement-data", join(scratch, "mf-data"), "--geo-dir", join(scratch, "geo-recorded-coverage"), "--today", "2025-09-20", "--known-gaps", gaps]);
    });

    const answer = async (c: (typeof RECORDED_COVERAGE_CASES)[number]) => {
      const op = allowlist.operations.find((o) => o.name === c.operation)!;
      const r = await ask(DB, op.sha256, c.variables);
      expect(r.status, c.name).toBe(200);
      expect(r.body.errors, c.name).toBeUndefined();
      expect(validateResponse(schema, parse(op.document), r.body.data, c.variables), c.name).toEqual([]);
      return { name: c.name, kind: c.kind, description: c.description, variables: c.variables, data: r.body.data };
    };
    const named = async (name: string, operation: "CoverageLens" | "CoveragePage" = "CoverageLens") =>
      (await answer(RECORDED_COVERAGE_CASES.find((c) => c.name === name && c.operation === operation)!)).data as CoverageLensQuery & CoveragePageQuery;

    it("every recorded CoverageLens and CoveragePage case is what the API answers now", async () => {
      for (const operation of ["CoverageLens", "CoveragePage"] as const) {
        expectDistinctVariables(RECORDED_COVERAGE_CASES.filter((x) => x.operation === operation));
        const recorded = [];
        for (const c of RECORDED_COVERAGE_CASES.filter((x) => x.operation === operation)) recorded.push(await answer(c));
        const file = resolve(here, `../../contract/src/fixtures/recorded/${operation}.json`);
        if (recording) writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
        expect(JSON.parse(JSON.stringify(recorded)), operation).toEqual(JSON.parse(readFileSync(file, "utf8")));
      }
    });

    it("gives the cases the figures they are named for: the date chip moves the status, N and the other authorities, never M", async () => {
      const lens = async (name: string) => {
        const d = await named(name);
        const row = (area: string) => {
          const r = d.coverage.counties.find((x) => x.county === area)!;
          return { status: r.status, n: r.withRecords, m: r.publicEntities, other: r.otherAuthorities };
        };
        return { d, row, unplaced: d.coverage.unplacedAuthorities.authorities };
      };
      const open = await lens("open-window");
      expect(open.d.coverage.window).toEqual({ from: null, to: null });
      expect(open.d.coverage.counties).toHaveLength(43); // 42 counties and National
      expect(open.row("RO-BV")).toEqual({ status: "PARTIAL", n: 4, m: 6, other: 3 }); // the quarantined 2022 Q2 DA file is a hole in the whole harvest
      expect(open.row("RO-CJ")).toEqual({ status: "PARTIAL", n: 3, m: 4, other: 1 });
      expect(open.row("NATIONAL")).toEqual({ status: "PARTIAL", n: 2, m: 3, other: 0 });
      expect(open.unplaced).toBe(3);
      // the Sources: SEAP harvested with its data-through per kind, the four later Sources planned (not harvested, no dates)
      expect(open.d.sources.map((s) => [s.id, s.harvested])).toEqual([["SEAP", true], ["ONRC", false], ["ANI", false], ["MFINANTE", false], ["JUST", false]]);
      expect(open.d.sources[0]!.dataThrough).toEqual([{ kind: "AWARD_NOTICE", date: "2025-07-02" }, { kind: "CONTRACT", date: "2025-07-02" }, { kind: "DA", date: "2023-03-24" }]);

      const y2023 = await lens("year-2023");
      expect(y2023.d.coverage.window).toEqual({ from: "2023-01-01", to: "2023-12-31" });
      expect(y2023.row("RO-BV")).toEqual({ status: "HARVESTED_WITH_KNOWN_GAPS", n: 4, m: 6, other: 3 }); // past the quarantined quarter: the hand-entered 2023 Q1 gaps
      expect(y2023.unplaced).toBe(1);
      const from2023 = await lens("from-2023");
      expect(from2023.d.coverage.window).toEqual({ from: "2023-01-01", to: null });
      expect([from2023.row("RO-BV").status, from2023.unplaced]).toEqual(["HARVESTED_WITH_KNOWN_GAPS", 2]); // later crawled Records place two more authorities nowhere
      const y2022 = await lens("year-2022");
      expect(y2022.row("RO-BV")).toEqual({ status: "PARTIAL", n: 0, m: 6, other: 0 }); // the quarantined file is in this window; no placed authority has a 2022 Record
      expect(y2022.row("RO-AB")).toEqual({ status: "PARTIAL", n: 0, m: 0, other: 0 });
      const narrow = await lens("narrow-days");
      expect(narrow.row("RO-BV")).toEqual({ status: "HARVESTED_WITH_KNOWN_GAPS", n: 1, m: 6, other: 1 });
      expect(narrow.row("RO-CJ")).toEqual({ status: "HARVESTED_WITH_KNOWN_GAPS", n: 2, m: 4, other: 0 });
      expect(narrow.unplaced).toBe(0);
      const before = await lens("before-harvest");
      expect(before.d.coverage.counties.every((x) => x.status === "NOT_HARVESTED" && x.withRecords === 0 && x.otherAuthorities === 0)).toBe(true);
      expect(before.row("RO-BV").m).toBe(6); // M is the list, not the window
      expect(before.unplaced).toBe(0);
      expect(new Set([open, y2023, y2022, before].map((x) => x.row("RO-BV").status))).toEqual(new Set(["PARTIAL", "HARVESTED_WITH_KNOWN_GAPS", "NOT_HARVESTED"])); // the chip changes the status
    });

    it("serves the Coverage page's whole grid with every state, data-through dates and the MF snapshot, and cuts a windowed one", async () => {
      const whole = (await named("whole-grid", "CoveragePage")).coverage;
      expect(whole.referenceSnapshot).toBe("2026-11-01");
      expect(whole.grid).toHaveLength(19 * 4); // 2021 Q1 .. 2025 Q3, four kinds
      const cell = (quarter: string, kind: string) => whole.grid.find((c) => c.quarter === quarter && c.kind === kind)!;
      const shape = ({ state, rule, note, records, dataThrough }: (typeof whole.grid)[number]) => ({ state, rule, note, records, dataThrough });
      expect(shape(cell("2023-Q1", "DA"))).toEqual({ state: "LOADED", rule: null, note: null, records: 14, dataThrough: "2023-03-24" });
      expect(shape(cell("2023-Q1", "DAN"))).toEqual({ state: "KNOWN_GAP", rule: "HAND_ENTERED", note: "Fisier lipsa la sursa (fixture); raportat", records: 0, dataThrough: null });
      expect(shape(cell("2025-Q2", "DAN")).note).toBe("Fișier încărcat greșit (fixture), conținutul nu corespunde trimestrului; raportat la sursă, trimestrul rămâne gol"); // verbatim
      expect(shape(cell("2022-Q2", "DA"))).toEqual({ state: "NOT_YET_LOADED", rule: null, note: null, records: 0, dataThrough: null }); // the quarantined file: no reason is served
      expect(shape(cell("2022-Q3", "DA"))).toMatchObject({ state: "NOT_YET_LOADED", rule: "AWAITING_BULK_FILE" });
      expect(shape(cell("2024-Q4", "CONTRACT"))).toEqual({ state: "POSSIBLY_INCOMPLETE", rule: "COUNT_BELOW_NEIGHBOURS", note: null, records: 9, dataThrough: "2024-11-09" });
      expect(shape(cell("2025-Q3", "CONTRACT"))).toEqual({ state: "CRAWLED_PROVISIONAL", rule: "AWAITING_BULK_FILE", note: null, records: 3, dataThrough: "2025-07-02" });
      expect(shape(cell("2021-Q1", "AWARD_NOTICE"))).toMatchObject({ state: "NOT_IN_SOURCE", rule: "NO_PRIOR_CALL_BEFORE_BACKFILL" });
      expect(new Set(whole.grid.map((c) => c.state))).toEqual(new Set(["LOADED", "KNOWN_GAP", "POSSIBLY_INCOMPLETE", "NOT_IN_SOURCE", "CRAWLED_PROVISIONAL", "NOT_YET_LOADED"]));
      const cut = (await named("year-2023-grid", "CoveragePage")).coverage;
      expect([...new Set(cut.grid.map((c) => c.quarter))]).toEqual(["2023-Q1", "2023-Q2", "2023-Q3", "2023-Q4"]);
      expect(cut.grid).toEqual(whole.grid.filter((c) => c.quarter.startsWith("2023-")));
      expect(cut.referenceSnapshot).toBe("2026-11-01");
    });
  });

  describe("signals (#74): archive-signals -> rebuild -> signalRules, role signals, record.signals, the filters", () => {
    type Total = { awarded: string; records: number; suspectLeftOut: number; noValue: number; frameworkCeilings: string; estimated: boolean };
    type Repro = { authority: string | null; supplier: string | null; signal: string | null; cpv: string | null; from: string | null; to: string | null };
    type Sig = { rule: string; date: string; firstDate: string; recordCount: number; dataThrough: string; authority: { key: string }; suppliers: { key: string }[]; numbers: Record<string, unknown>; reproduce: Repro };
    const DB = "signals_a";
    const S = "1000017";
    const COMUNA = "1000009";
    const CNAIR = "2000031";
    const ALFA = "2000007";
    const BETA = "2000015";
    const GAMMA = "2000023";
    const methodology = allowlist.operations.find((o) => o.name === "MethodologyBaseRates")!;

    beforeAll(() => {
      const out = rebuild(DB, "archive-signals");
      expect(out).toContain("signals: OVER_CAP 7, SPLITTING 0, FRAMEWORK_OVERRUN 0, NO_PUBLICATION 5"); // one Signal per authority and day: the Records of a day are one Signal; splitting (#75) and framework-overrun (#76) find none here (their own fixtures are archive-splitting and archive-framework-overrun)
    });

    const op = async (o: { sha256: string; document: string; name: string }, variables: Record<string, unknown>) => {
      const r = await ask(DB, o.sha256, variables);
      expect(r.body.errors).toBeUndefined();
      expect(validateResponse(schema, parse(o.document), r.body.data, variables)).toEqual([]);
      return r.body.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    const roleSignals = async (key: string, role: string, filter: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
      (await op(entityOverview, { key, role, filter, ...extra })).entity.seap.role.signals as { count: number; rows: Sig[] };
    const doc = (source: string, variableValues: Record<string, unknown> = {}, rollup = true) => {
      const pool = pools.find((p) => (p.options as { connectionString?: string }).connectionString === `${baseUrl}/${DB}`)!;
      return graphql({ schema, source, rootValue: rootValue(postgresStore(pool, { rollup })), variableValues }).then((r) => {
        expect(r.errors).toBeUndefined();
        return r.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    };
    const totalQ = `query($f: RecordFilter!) { seap { search(filter: $f) { total { awarded records suspectLeftOut noValue frameworkCeilings } } } }`;
    const searchTotal = async (filter: Record<string, unknown>, rollup = true) => (await doc(totalQ, { f: filter }, rollup)).seap.search.total as Total;
    const key = (s: Sig) => `${s.rule} ${s.authority.key} ${s.date}`;
    const RON = (n: number) => String(Math.round(n * 100));

    it("serves each rule's window, base rate and data-through through the persisted MethodologyBaseRates (#74)", async () => {
      const data = await op(methodology, {});
      expect(data.signalRules).toEqual([
        // direct purchases since 2022 (the 2022 Q3 file); 2 of 3 authorities with a direct purchase in 2023 had a Signal; 2024 is the data-through year
        { slug: "OVER_CAP", window: { from: "2022-01-01", to: null }, baseRate: 2 / 3, baseRateYear: 2023, dataThrough: "2024-03-20" },
        // the splitting rule (#75) reads the same direct purchases and finds no Signal in this fixture (its own is archive-splitting)
        { slug: "SPLITTING", window: { from: "2022-01-01", to: null }, baseRate: 0, baseRateYear: 2023, dataThrough: "2024-03-20" },
        // framework-overrun (#76) reads Contracte (CONTRACT Records): this fixture has no framework agreement, so no Signal; the window starts with its first Contracte (2023; the rule's
        // 2021 floor only matters when older ones are loaded, as in archive-framework-overrun), the year is the latest complete one it has Records for (2023: the Contracte of 2024 are not complete)
        { slug: "FRAMEWORK_OVERRUN", window: { from: "2023-01-01", to: null }, baseRate: 0, baseRateYear: 2023, dataThrough: "2024-02-01" },
        // the backfill reaches 2021; only the hospital had a no-publication award in 2023 (the commune's is in 2024)
        { slug: "NO_PUBLICATION", window: { from: "2021-01-01", to: null }, baseRate: 1 / 3, baseRateYear: 2023, dataThrough: "2024-02-01" },
      ]);
    });

    it("lists an authority's Signals by date or by RON, with the numbers of each rule and no score (#74)", async () => {
      const byDate = await roleSignals(S, "AUTHORITY", {}, { signalOrder: "DATE_DESC", signalOffset: 0 });
      expect(byDate.count).toBe(8);
      expect(byDate.rows.map(key)).toEqual([
        `NO_PUBLICATION ${S} 2026-03-29`, `NO_PUBLICATION ${S} 2023-03-05`, `NO_PUBLICATION ${S} 2023-02-10`, `OVER_CAP ${S} 2023-02-03`,
        `OVER_CAP ${S} 2023-01-14`, `OVER_CAP ${S} 2023-01-12`, `OVER_CAP ${S} 2023-01-10`, `NO_PUBLICATION ${S} 2021-04-02`,
      ]);
      const byValue = await roleSignals(S, "AUTHORITY", {}, { signalOrder: "VALUE_DESC", signalOffset: 0 });
      expect(byValue.rows.slice(0, 3).map(key)).toEqual([`OVER_CAP ${S} 2023-01-14`, `NO_PUBLICATION ${S} 2023-03-05`, `NO_PUBLICATION ${S} 2023-02-10`]); // 2,701,199.99 RON, then two of 600,000 (latest first)
      const page2 = await roleSignals(S, "AUTHORITY", {}, { signalOrder: "DATE_DESC", signalOffset: 6 });
      expect(page2.count).toBe(8);
      expect(page2.rows.map(key)).toEqual(byDate.rows.slice(6).map(key));

      const by = new Map(byDate.rows.map((s) => [key(s), s]));
      // the day's two over-cap direct purchases are one Signal: two suppliers, the largest Record's numbers, reproduced by the authority and the day
      const cap = by.get(`OVER_CAP ${S} 2023-01-10`)!;
      expect(cap).toMatchObject({ rule: "OVER_CAP", date: "2023-01-10", firstDate: "2023-01-10", recordCount: 2, dataThrough: "2024-03-20" });
      expect(cap.suppliers.map((s) => s.key).sort()).toEqual([ALFA, BETA]);
      expect(cap.numbers).toEqual({ __typename: "OverCapNumbers", value: RON(300_000), cap: RON(270_120), multiple: 1.110618 });
      expect(cap.reproduce).toEqual({ authority: S, supplier: null, signal: "OVER_CAP", cpv: null, from: "2023-01-10", to: "2023-01-10" });
      // boundary: exactly the cap, exactly 10x and CPV 70 are no Signal; just above the cap and just below 10x are
      for (const day of ["2023-01-11", "2023-01-13", "2023-01-15"]) expect(by.has(`OVER_CAP ${S} ${day}`)).toBe(false);
      expect(by.get(`OVER_CAP ${S} 2023-01-12`)!.numbers).toMatchObject({ value: "27012001", cap: "27012000" });
      expect(by.get(`OVER_CAP ${S} 2023-01-14`)!.numbers).toMatchObject({ value: "270119999", multiple: 10 });
      // a natural-person winner: a Signal with no supplier to name
      expect(by.get(`OVER_CAP ${S} 2023-02-03`)).toMatchObject({ recordCount: 1, suppliers: [] });
      // no-publication: a consortium (ALFA + BETA) and GAMMA in one Signal of the day; "Negociere" alone, a licitatie and "Procedura simplificata proprie" are not
      const np = by.get(`NO_PUBLICATION ${S} 2023-02-10`)!;
      expect(np).toMatchObject({ recordCount: 2, numbers: { __typename: "NoPublicationNumbers", procedure: "Negociere fara publicare prealabila" } });
      expect(np.suppliers.map((s) => s.key).sort()).toEqual([ALFA, BETA, GAMMA]);
      expect([...by.keys()].filter((k) => k.startsWith("NO_PUBLICATION")).map((k) => k.split(" ")[2]).sort()).toEqual(["2021-04-02", "2023-02-10", "2023-03-05", "2026-03-29"]);
      // the backfilled 2021 award notice and the crawled 2026 one (no initiation procedure, no procedureId) are Signals too, with a range of dates
      expect(by.get(`NO_PUBLICATION ${S} 2026-03-29`)).toMatchObject({ recordCount: 1, firstDate: "2026-03-29", reproduce: { from: "2026-03-29", to: "2026-03-29" } });
      expect(by.get(`NO_PUBLICATION ${S} 2021-04-02`)).toMatchObject({ recordCount: 1 });
    });

    it("the year chip keeps a Signal whose Records fall in range; a supplier or rule in the filter keeps the whole Signal (#74)", async () => {
      expect((await roleSignals(S, "AUTHORITY", { from: "2023-01-01", to: "2023-12-31" })).count).toBe(6);
      expect((await roleSignals(S, "AUTHORITY", { from: "2021-01-01", to: "2021-12-31" })).rows.map(key)).toEqual([`NO_PUBLICATION ${S} 2021-04-02`]);
      expect((await roleSignals(S, "AUTHORITY", { signal: "NO_PUBLICATION" })).count).toBe(4);
      // GAMMA won one of the two Records of the 2023-02-10 Signal: the Signal is kept, whole (recordCount 2)
      const gamma = await roleSignals(S, "AUTHORITY", { supplier: GAMMA });
      expect(gamma.rows.map((s) => [key(s), s.recordCount])).toEqual([[`NO_PUBLICATION ${S} 2023-02-10`, 2]]);
      expect((await roleSignals(S, "AUTHORITY", { from: "2030-01-01" })).count).toBe(0);
    });

    it("a Signal is on the authority page and on every supplier page its Records touch, consortium members included, and on no natural person's (#74)", async () => {
      const onAuthority = (await roleSignals(S, "AUTHORITY")).rows;
      let checked = 0;
      for (const s of onAuthority) {
        for (const sup of s.suppliers) {
          const page = (await roleSignals(sup.key, "SUPPLIER")).rows;
          expect(page.map((x) => JSON.stringify(x.reproduce)), `${key(s)} on ${sup.key}`).toContain(JSON.stringify(s.reproduce));
          checked++;
        }
      }
      expect(checked).toBe(9);
      // the consortium's members each have it, a supplier that won nothing in it does not
      const gammaPage = (await roleSignals(GAMMA, "SUPPLIER")).rows.map(key);
      expect(gammaPage).toEqual([`NO_PUBLICATION ${S} 2023-02-10`]); // its CPV 70 rent is exempt
      expect((await roleSignals(BETA, "SUPPLIER")).rows.map(key)).toContain(`NO_PUBLICATION ${S} 2023-02-10`);
      expect((await roleSignals(BETA, "SUPPLIER")).rows.map(key)).toContain(`OVER_CAP ${S} 2023-01-10`);
      expect((await roleSignals(BETA, "SUPPLIER")).rows.map(key)).not.toContain(`OVER_CAP ${S} 2023-01-12`); // ALFA's alone
      // the natural person has no page: only the Signals' supplier lists could name them, and do not
      const personal = onAuthority.filter((s) => s.recordCount === 1 && s.suppliers.length === 0).map(key);
      expect(personal.sort()).toEqual([`NO_PUBLICATION ${S} 2023-03-05`, `OVER_CAP ${S} 2023-02-03`]);
    });

    it("running a Signal's reproduce filter returns exactly its Records, for every Signal in the fixture (#74)", async () => {
      const q = `query($k: ID!, $role: Role!) { entity(key: $k) { seap { role(role: $role) { signals(limit: 200) { rows { rule date reproduce { authority supplier signal cpv from to }
          records(limit: 200) { code } } } } } } }`;
      const search = `query($f: RecordFilter!) { seap { search(filter: $f) { records(limit: 200, offset: 0, order: DATE_DESC) { count rows { record { code } } } } } }`;
      const distinct = new Set<string>();
      for (const [k, role] of [[S, "AUTHORITY"], [COMUNA, "AUTHORITY"], [CNAIR, "AUTHORITY"], [ALFA, "SUPPLIER"], [BETA, "SUPPLIER"], [GAMMA, "SUPPLIER"]] as const) {
        const { entity } = await doc(q, { k, role });
        for (const s of entity.seap.role.signals.rows as { rule: string; reproduce: Record<string, string | null>; records: { code: string }[] }[]) {
          const filter = Object.fromEntries(Object.entries(s.reproduce).filter(([, v]) => v !== null));
          const found = (await doc(search, { f: filter })).seap.search.records;
          expect(found.rows.map((r: { record: { code: string } }) => r.record.code).sort(), JSON.stringify(s.reproduce)).toEqual(s.records.map((r) => r.code).sort());
          expect(found.count).toBe(s.records.length);
          distinct.add(`${s.rule}|${s.reproduce.authority}|${s.reproduce.from}`);
        }
      }
      expect(distinct.size).toBe(12); // every Signal of the load (OVER_CAP 7, NO_PUBLICATION 5), reached from its authority or a supplier
    });

    it("record.signals: a Record lists its Signals with their Records; suspect, at-the-cap and ordinary Records have none (#74)", async () => {
      const page = async (code: string) => (await op(recordPage, { code })).seap.record;
      const r = await page("DA98000001");
      expect(r.signals).toHaveLength(1);
      expect(r.signals[0]).toMatchObject({ rule: "OVER_CAP", recordCount: 2, date: "2023-01-10", numbers: { __typename: "OverCapNumbers", multiple: 1.110618 } });
      expect(r.signals[0].records.map((x: { code: string }) => x.code).sort()).toEqual(["DA98000001", "DA98000002"]);
      expect(r.signals[0].suppliers.map((s: { key: string }) => s.key).sort()).toEqual([ALFA, BETA]);
      const c = await page("CAN9800001~1"); // a contract of the consortium
      expect(c.signals.map((s: Sig) => s.rule)).toEqual(["NO_PUBLICATION"]);
      expect(c.signals[0].numbers).toEqual({ __typename: "NoPublicationNumbers", procedure: "Negociere fara publicare prealabila" });
      for (const code of ["DA98000005", "DA98000003", "DA98000007", "CAN9800004~1", "CAN9800005~1", "DA98100002"]) expect((await page(code)).signals, code).toEqual([]);
      // the Records of a list carry their Signals' rules too (the persisted RecordRowFields)
      const rows = (await doc(`{ seap { search(filter: { authority: "${S}" }) { records(limit: 200, order: DATE_DESC) { rows { record { code signals { rule } } } } } } }`)).seap.search.records.rows;
      const rules = Object.fromEntries(rows.map((x: { record: { code: string; signals: { rule: string }[] } }) => [x.record.code, x.record.signals.map((s) => s.rule)]));
      expect(rules["DA98000001"]).toEqual(["OVER_CAP"]);
      expect(rules["DA98000005"]).toEqual([]);
      expect(rules["CAN9800001~1"]).toEqual(["NO_PUBLICATION"]);
    });

    it("the signal and has-Signals filters, the Signal facet and the pair's hasSignals read the Signals (#74)", async () => {
      const overCap = await searchTotal({ signal: "OVER_CAP" });
      const noPub = await searchTotal({ signal: "NO_PUBLICATION" });
      expect([overCap.records, noPub.records]).toEqual([8, 6]);
      expect(overCap.suspectLeftOut + noPub.suspectLeftOut).toBe(0); // suspect values never join a Signal
      const withSignals = await searchTotal({ hasSignals: true });
      const without = await searchTotal({ hasSignals: false });
      const all = await searchTotal({});
      expect(withSignals.records).toBe(14);
      expect(withSignals.records + without.records).toBe(all.records);
      expect(BigInt(withSignals.awarded) + BigInt(without.awarded)).toBe(BigInt(all.awarded));
      expect((await searchTotal({ signal: "OVER_CAP", authority: S })).records).toBe(5);
      // a rule with no Records matches nothing, not everything
      expect((await searchTotal({ signal: "SPLITTING" })).records).toBe(0);
      // the facet on an entity's Records tab: its Records per rule
      const tab = async (key: string, filter: Record<string, unknown>) =>
        (await op(entityRecords, { key, role: "AUTHORITY", filter, limit: 5, offset: 0 })).entity.seap.role.records as {
          total: Total; facets: { signal: { value: string; total: Total }[] }; records: { count: number };
        };
      const facets = (await tab(S, {})).facets.signal;
      expect(Object.fromEntries(facets.map((f) => [f.value, f.total.records]))).toEqual({ OVER_CAP: 5, NO_PUBLICATION: 5 });
      const filtered = await tab(S, { signal: "OVER_CAP" });
      expect(filtered.total.records).toBe(5);
      expect(filtered.facets.signal.map((f) => f.value)).toEqual(["OVER_CAP"]);
      // Counterparty.hasSignals: the pair shares a Signal when one of its Records is in one
      const cpty = async (key: string) =>
        Object.fromEntries(((await op(entityRelationships, { key, role: "AUTHORITY", filter: {}, counterparty: null })).entity.seap.role.counterparties.rows as { entity: { key: string } | null; hasSignals: boolean }[])
          .map((r) => [r.entity?.key ?? "person", r.hasSignals]));
      expect(await cpty(CNAIR)).toEqual({ [ALFA]: false, [BETA]: true }); // ALFA's 100,000 is under the cap; BETA's 2024 purchase is over it
      expect(await cpty(S)).toMatchObject({ [ALFA]: true, [BETA]: true, [GAMMA]: true, person: true });
    });

    it("the rollup agrees with the scan over real Signals (#74)", async () => {
      for (const filter of [{}, { hasSignals: true }, { hasSignals: false }, { hasSignals: true, channel: "DIRECT_PURCHASE" }, { hasSignals: true, channel: "CONTRACT" },
        { hasSignals: true, from: "2023-01-01", to: "2023-12-31" }, { hasSignals: false, valueBucket: "UP_TO_270K" }, { hasSignals: true, from: "2021-01-01", to: "2022-12-31" }]) {
        const rolled = await searchTotal(filter, true);
        const scanned = await searchTotal(filter, false);
        expect(rolled, JSON.stringify(filter)).toEqual(scanned);
      }
      expect((await searchTotal({ hasSignals: true }, true)).records).toBe(14);
      // the entity tabs too
      const tabs = `query($f: RecordFilter!) { seap { search(filter: $f) { authorities(limit: 50) { count rows { entity { key } matched { awarded records } } } suppliers(limit: 50) { count rows { entity { key } matched { awarded records } } } } } }`;
      for (const filter of [{ hasSignals: true }, { hasSignals: false, channel: "DIRECT_PURCHASE" }]) {
        expect(await doc(tabs, { f: filter }, true)).toEqual(await doc(tabs, { f: filter }, false));
      }
    });
  });

  describe("recorded fixtures (#86): archive-roles + archive-roles-names, archive-signals, archive-moneymap -> rebuild -> the recorded EntityOverview", () => {
    // The app's seam 3 renders the entity pages against these answers, so the two seams stay in step: this block fails when an
    // answer drifts from the committed JSON. `RECORD_FIXTURES=1` rewrites the JSON instead (see packages/contract/README.md).
    const recording = process.env.RECORD_FIXTURES === "1";
    const file = resolve(here, "../../contract/src/fixtures/recorded/EntityOverview.json");
    const DBS = { overview: "entity_rec_a", signals: "entity_rec_b", moneymap: "entity_rec_c" } as const;

    beforeAll(async () => {
      // the name-only suppliers' quarter lands beside the roles world's units (a rebuild reads the whole archive)
      cpSync(rolesArchive, join(scratch, "archive-overview"), { recursive: true });
      cpSync(join(watchdog, "tests/fixtures/archive-roles-names"), join(scratch, "archive-overview"), { recursive: true });
      for (const db of Object.values(DBS)) await admin.query(`CREATE DATABASE ${db}`);
      rebuild(DBS.overview, "archive-overview");
      rebuild(DBS.signals, "archive-signals");
      rebuild(DBS.moneymap, "archive-moneymap", ["--placement-data", placementData, "--geo-dir", join(scratch, "geo-entity-recorded")]);
    });

    const answer = async (c: RecordedEntityCase) => {
      const r = await ask(DBS[c.archive], entityOverview.sha256, c.variables);
      expect(r.status, c.name).toBe(200);
      expect(r.body.errors, c.name).toBeUndefined();
      expect(validateResponse(schema, parse(entityOverview.document), r.body.data, c.variables), c.name).toEqual([]);
      return { name: c.name, kind: c.kind, description: c.description, variables: c.variables, data: r.body.data };
    };
    const answers = new Map<string, Awaited<ReturnType<typeof answer>>>();
    beforeAll(async () => {
      for (const c of RECORDED_ENTITY_CASES) answers.set(c.name, await answer(c));
    });
    const entityOf = (name: string) => (answers.get(name)!.data as EntityOverviewQuery).entity;

    it("EntityOverview: every recorded case is what the API answers now", () => {
      const recorded = RECORDED_ENTITY_CASES.map((c) => answers.get(c.name)!);
      if (recording) writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
      // through JSON, so undefined and key order do not matter
      expect(JSON.parse(JSON.stringify(recorded))).toEqual(JSON.parse(readFileSync(file, "utf8")));
    });

    it("asks no two cases the same question, so the app's fixture client can tell them apart (it matches on variables)", () => {
      expectDistinctVariables(RECORDED_ENTITY_CASES);
    });

    it("gives the cases the numbers they are named for", () => {
      const RON = (n: number) => String(n * 100);
      const role = (name: string) => entityOf(name)!.seap.role!;
      const keys = (name: string) => role(name).counterparties.rows.map((r) => r.entity?.key ?? null);
      // an authority: its counted Records (a suspect value, two blanks and a framework ceiling left out of the total), five counterparties
      expect(entityOf("authority")).toMatchObject({ key: "1000017", identity: "CUI", seap: { roles: ["AUTHORITY"] }, placement: null });
      expect(role("authority").total).toMatchObject({ awarded: RON(8_840_000), records: 16, suspectLeftOut: 1, noValue: 2, frameworkCeilings: RON(10_000_000) });
      expect(role("authority").counterparties).toMatchObject({ count: 5, topShare: 0.625 }); // ALFA's 5,525,000 of 8,840,000
      expect(keys("authority")).toEqual(["2000007", "2000031", "2000015", null, "2000023"]); // the natural person is one row without an entity
      expect(role("authority").counterparties.rows[3]).toMatchObject({ entity: null, naturalPerson: true });
      expect(role("authority").consortia).toHaveLength(3);
      expect(role("authority").frameworks).toEqual({ count: 1, ceilings: RON(10_000_000), subsequentReported: RON(5_000_000) });
      // a supplier: its own share of each Record
      expect(role("supplier").total).toMatchObject({ awarded: RON(5_915_000), records: 13 });
      expect(keys("supplier")).toEqual(["1000017", "1000009", "2000031"]);
      // both roles: one page per role, each with its own numbers (what the entity bought is not what it won)
      expect(entityOf("both-roles-authority-page")!.seap.roles).toEqual(["AUTHORITY", "SUPPLIER"]);
      expect(role("both-roles-authority-page")).toMatchObject({ role: "AUTHORITY", total: { awarded: RON(340_000), records: 2 } });
      expect(role("both-roles-supplier-page")).toMatchObject({ role: "SUPPLIER", total: { awarded: RON(2_020_000), records: 2 } });
      expect(keys("both-roles-authority-page")).toEqual(["2000015", "2000007"]);
      expect(keys("both-roles-supplier-page")).toEqual(["1000017"]);
      // name-only suppliers: keyed by name or by the foreign VAT id, no CUI, a total all the same
      expect(entityOf("name-only-supplier")).toMatchObject({ key: "name-furnizor-local-srl", identity: "NAME_ONLY", cui: null });
      expect(role("name-only-supplier").total).toMatchObject({ awarded: RON(20_000), records: 2 });
      expect(role("name-only-supplier").counterparties).toMatchObject({ count: 1, topShare: 1 });
      expect(entityOf("foreign-vat-supplier")).toMatchObject({ key: "vat-bg103029862", identity: "NAME_ONLY", cui: null });
      expect(role("foreign-vat-supplier").total).toMatchObject({ awarded: RON(30_000), records: 1 });
      // an entity without the role asked for: the entity is there, the role is null; an unknown key is no entity
      for (const name of ["authority-asked-as-supplier", "supplier-asked-as-authority"]) expect(entityOf(name)!.seap.role, name).toBeNull();
      expect(entityOf("authority-asked-as-supplier")!.seap.roles).toEqual(["AUTHORITY"]);
      expect(entityOf("unknown-key")).toBeNull();
      // the filter narrows every number; a filter that matches nothing leaves zeros, not a missing role
      expect(role("authority-from-date").total.records).toBeLessThan(role("authority").total.records);
      expect(role("authority-nothing-in-filter")).toMatchObject({ total: { awarded: "0", records: 0 }, counterparties: { count: 0, topShare: null, rows: [] }, procedures: [], largestRecords: [] });
      // placement in the header: a county and a UAT, national, or nothing at all
      expect(entityOf("authority-placed-in-uat")!.placement).toEqual({ county: { code: "RO-BV", name: "Brașov" }, uat: { siruta: "880010", name: "Sânpetru" }, national: false, placedBy: "ANAF" });
      expect(entityOf("national-authority")!.placement).toMatchObject({ county: null, uat: null, national: true });
      expect(entityOf("unplaced-authority")!.placement).toBeNull();
      expect(role("unplaced-authority").counterparties.rows.some((r) => r.naturalPerson && r.entity === null)).toBe(true);
      // Signals: the authority and the supplier see the same Signals of their Records; the order changes with the argument
      const dates = (name: string) => role(name).signals.rows.map((x) => `${x.rule} ${x.date}`);
      expect(role("authority-with-signals").signals.count).toBe(8);
      expect(role("supplier-with-signals").signals.count).toBe(6);
      expect(dates("authority-with-signals")[0]).toBe("NO_PUBLICATION 2026-03-29"); // newest first
      expect(dates("authority-with-signals-by-value")[0]).toBe("OVER_CAP 2023-01-14"); // the largest first
      expect([...dates("authority-with-signals-by-value")].sort()).toEqual([...dates("authority-with-signals")].sort());
      expect(role("authority").signals).toEqual({ count: 0, rows: [] }); // no Signals in the other archive
    });
  });

  describe("recorded fixtures (#88): archive-roles + archive-roles-names, archive-moneymap -> rebuild -> the recorded EntityRelationships and side-panel EntityRecords", () => {
    // The Relationships tab's seam 3 tests render against these answers (graph, timeline, Flow lens, side panel), so the two seams stay in step.
    const recording = process.env.RECORD_FIXTURES === "1";
    const dir = resolve(here, "../../contract/src/fixtures/recorded");
    const DBS = { overview: "rel_rec_a", moneymap: "rel_rec_b" } as const;
    const ops = { EntityRelationships: entityRelationships, EntityRecords: entityRecords };

    beforeAll(async () => {
      cpSync(rolesArchive, join(scratch, "archive-overview-rel"), { recursive: true });
      cpSync(join(watchdog, "tests/fixtures/archive-roles-names"), join(scratch, "archive-overview-rel"), { recursive: true });
      for (const db of Object.values(DBS)) await admin.query(`CREATE DATABASE ${db}`);
      rebuild(DBS.overview, "archive-overview-rel");
      rebuild(DBS.moneymap, "archive-moneymap", ["--placement-data", placementData, "--geo-dir", join(scratch, "geo-relationships-recorded")]);
    });

    const answer = async (c: RecordedRelationshipsCase) => {
      const op = ops[c.operation];
      const r = await ask(DBS[c.archive], op.sha256, c.variables);
      expect(r.status, c.name).toBe(200);
      expect(r.body.errors, c.name).toBeUndefined();
      expect(validateResponse(schema, parse(op.document), r.body.data, c.variables), c.name).toEqual([]);
      return { name: c.name, kind: c.kind, description: c.description, variables: c.variables, data: r.body.data };
    };
    const answers = new Map<string, Awaited<ReturnType<typeof answer>>>();
    beforeAll(async () => {
      for (const c of RECORDED_RELATIONSHIPS_CASES) answers.set(`${c.operation}/${c.name}`, await answer(c));
    });

    for (const operation of ["EntityRelationships", "EntityRecords"] as const) {
      it(`${operation}: every recorded case is what the API answers now`, () => {
        const recorded = RECORDED_RELATIONSHIPS_CASES.filter((c) => c.operation === operation).map((c) => answers.get(`${c.operation}/${c.name}`)!);
        const file = resolve(dir, operation === "EntityRelationships" ? "EntityRelationships.json" : "EntityRecordsSidePanel.json");
        if (recording) writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
        expect(JSON.parse(JSON.stringify(recorded))).toEqual(JSON.parse(readFileSync(file, "utf8")));
      });
    }

    it("asks no two cases of one operation the same question, so the app's fixture client can tell them apart (it matches on variables)", () => {
      const sorted = (v: unknown): unknown => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sorted(x)])) : v);
      const asked = RECORDED_RELATIONSHIPS_CASES.map((c) => `${c.operation} ${JSON.stringify(sorted(c.variables))}`);
      expect(new Set(asked).size).toBe(asked.length);
    });

    it("gives the cases the numbers they are named for", () => {
      const RON = (n: number) => String(n * 100);
      const role = (name: string) => (answers.get(`EntityRelationships/${name}`)!.data as EntityRelationshipsQuery).entity!.seap.role!;
      const rows = (name: string) => role(name).counterparties.rows;
      const months = (name: string) => role(name).timeline.map((t) => t.month);
      // an authority: five counterparties (a natural person is one row without an entity), the biggest holds 5,525,000 of 8,840,000
      expect(rows("authority").map((r) => r.entity?.key ?? null)).toEqual(["2000007", "2000031", "2000015", null, "2000023"]);
      expect(role("authority").counterparties).toMatchObject({ count: 5, topShare: 0.625 });
      expect(rows("authority")[3]).toMatchObject({ naturalPerson: true, wonTogether: true });
      expect(rows("authority")[0]!.total).toMatchObject({ awarded: RON(5_525_000), records: 11 });
      expect(months("authority")).toEqual(["2023-01", "2023-02", "2023-03", "2024-01"]); // YYYY-MM, oldest first
      // the picked supplier's months are a part of the overall ones; the graph and the Flow lens do not change with the pick
      expect(months("authority-supplier-picked")).toEqual(months("authority"));
      expect(role("authority-supplier-picked").timeline[0]!.total.awarded).toBe(RON(5_100_000));
      expect(role("authority-supplier-picked").counterparties).toEqual(role("authority").counterparties);
      expect(role("authority-supplier-picked").flow).toEqual(role("authority").flow);
      // Flow, authority page: the supplier side by county; a supplier whose county is unknown is off the map; this authority has no placement
      expect(role("authority").flow).toMatchObject({ side: "SUPPLIER", counties: [{ area: "RO-CJ", entities: 4 }], national: { records: 0 }, unplaced: null, unknownSupplierCounty: { awarded: RON(315_000), records: 2 } });
      // Flow, supplier page: the authority side; two authorities no Source places are the Unplaced tile
      expect(role("supplier").flow).toMatchObject({ side: "AUTHORITY", counties: [{ area: "RO-CJ", entities: 1 }], unplaced: { authorities: 2, total: { records: 12 } }, unknownSupplierCounty: null });
      expect(rows("supplier").map((r) => r.entity!.key)).toEqual(["1000017", "1000009", "2000031"]);
      expect(role("supplier").counterparties.topShare).toBeCloseTo(0.934, 3);
      // a placed authority: its supplier counties are on the map; a national one has none of its own
      expect(role("authority-placed-in-uat").flow.counties.map((c) => c.area)).toEqual(["RO-BV", "RO-CJ"]);
      expect(role("national-authority").flow.counties.map((c) => c.area)).toEqual(["RO-BV"]);
      // nothing in the filter: no counterparties, no months, an empty map
      expect(role("authority-nothing-in-filter")).toMatchObject({ counterparties: { count: 0, topShare: null, rows: [] }, timeline: [], flow: { counties: [] } });
      // the side panel: the Records the two share, whichever side asks
      for (const name of ["authority-with-supplier", "supplier-with-authority"]) {
        const records = (answers.get(`EntityRecords/${name}`)!.data as EntityRecordsQuery).entity!.seap.role!.records;
        expect(records.total.records, name).toBe(11);
        expect(records.records.count, name).toBe(11);
      }
    });
  });

  describe("recorded fixtures (#87): the same archives -> rebuild -> the recorded EntityRecords", () => {
    // The Records tab's seam 3 tests render against these answers; this block fails when one drifts from the committed JSON.
    // `RECORD_FIXTURES=1` rewrites the JSON instead (see packages/contract/README.md).
    const recording = process.env.RECORD_FIXTURES === "1";
    const file = resolve(here, "../../contract/src/fixtures/recorded/EntityRecords.json");
    const DBS = { overview: "records_rec_a", signals: "records_rec_b", moneymap: "records_rec_c" } as const;

    beforeAll(async () => {
      cpSync(rolesArchive, join(scratch, "archive-records-overview"), { recursive: true });
      cpSync(join(watchdog, "tests/fixtures/archive-roles-names"), join(scratch, "archive-records-overview"), { recursive: true });
      for (const db of Object.values(DBS)) await admin.query(`CREATE DATABASE ${db}`);
      rebuild(DBS.overview, "archive-records-overview");
      rebuild(DBS.signals, "archive-signals");
      rebuild(DBS.moneymap, "archive-moneymap", ["--placement-data", placementData, "--geo-dir", join(scratch, "geo-records-recorded")]);
    });

    const answer = async (c: RecordedRecordsCase) => {
      const r = await ask(DBS[c.archive], entityRecords.sha256, c.variables);
      expect(r.status, c.name).toBe(200);
      expect(r.body.errors, c.name).toBeUndefined();
      expect(validateResponse(schema, parse(entityRecords.document), r.body.data, c.variables), c.name).toEqual([]);
      return { name: c.name, kind: c.kind, description: c.description, variables: c.variables, data: r.body.data };
    };
    const answers = new Map<string, Awaited<ReturnType<typeof answer>>>();
    beforeAll(async () => {
      for (const c of RECORDED_RECORDS_CASES) answers.set(c.name, await answer(c));
    });
    type Role = NonNullable<NonNullable<EntityRecordsQuery["entity"]>["seap"]["role"]>;
    const entityOf = (name: string) => (answers.get(name)!.data as EntityRecordsQuery).entity;
    const recordsOf = (name: string) => (entityOf(name)!.seap.role as Role).records;

    it("EntityRecords: every recorded case is what the API answers now", () => {
      const recorded = RECORDED_RECORDS_CASES.map((c) => answers.get(c.name)!);
      if (recording) writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
      expect(JSON.parse(JSON.stringify(recorded))).toEqual(JSON.parse(readFileSync(file, "utf8")));
    });

    it("asks no two cases the same question, so the app's fixture client can tell them apart (it matches on variables)", () => {
      expectDistinctVariables(RECORDED_RECORDS_CASES);
    });

    it("gives the cases the numbers they are named for", () => {
      const RON = (n: number) => String(n * 100);
      const rows = (name: string) => recordsOf(name).records.rows.map((r) => r.record);
      const codes = (name: string) => rows(name).map((r) => r.code);
      const facet = (name: string, dimension: "channel" | "procedure" | "year" | "signal" | "badge", value: string) => recordsOf(name).facets[dimension].find((f) => f.value === value)?.total;
      // the unfiltered answers: the entity's own Records, one page, the count the total says
      expect(entityOf("authority")).toMatchObject({ key: "1000017", seap: { roles: ["AUTHORITY"] } });
      expect(recordsOf("authority").total).toMatchObject({ awarded: RON(8_840_000), records: 16, suspectLeftOut: 1, noValue: 2, frameworkCeilings: RON(10_000_000) });
      expect(recordsOf("authority").records.count).toBe(16);
      expect(rows("authority")).toHaveLength(16);
      expect(rows("authority").every((r) => r.authority?.key === "1000017")).toBe(true); // scoped to the entity on its side
      expect(recordsOf("supplier").total).toMatchObject({ awarded: RON(5_915_000), records: 13 });
      expect(rows("supplier").every((r) => r.winners.some((w) => w.entity?.key === "2000007"))).toBe(true);
      expect(recordsOf("supplier").facets.counterparty.map((c) => c.entity?.key)).toEqual(["1000017", "1000009", "2000031"]); // authorities, on a supplier's page
      expect(recordsOf("authority").facets.counterparty.map((c) => c.entity?.key)).toEqual(["2000007", "2000031", "2000015", "2000023"]); // suppliers, on an authority's
      // both roles: one page per role, what the entity bought is not what it won
      expect(recordsOf("both-roles-authority-page")).toMatchObject({ total: { awarded: RON(340_000), records: 2 }, records: { count: 2 } });
      expect(recordsOf("both-roles-supplier-page")).toMatchObject({ total: { awarded: RON(2_020_000), records: 2 }, records: { count: 2 } });
      expect(codes("both-roles-authority-page")).not.toEqual(codes("both-roles-supplier-page"));
      // a name-only supplier has its Records and facets all the same
      expect(entityOf("name-only-supplier")).toMatchObject({ key: "name-furnizor-local-srl", identity: "NAME_ONLY" });
      expect(recordsOf("name-only-supplier")).toMatchObject({ total: { awarded: RON(20_000), records: 2 }, records: { count: 2 } });
      // an entity without the role asked for: the entity is there, the role is null; an unknown key is no entity
      expect(entityOf("authority-asked-as-supplier")).toMatchObject({ key: "1000017", seap: { role: null } });
      expect(entityOf("unknown-key")).toBeNull();

      // every facet answers with the total and the rows the filter it names gives (facet count == filtered total == rows)
      const sameAsFacet = (name: string, base: string, dimension: "channel" | "procedure" | "year" | "signal" | "badge", value: string) => {
        const f = facet(base, dimension, value)!;
        const filtered = recordsOf(name);
        expect(f, `${base} has a ${dimension} facet ${value}`).toBeDefined();
        expect(filtered.total.records, name).toBe(f.records);
        expect(filtered.total.awarded, name).toBe(f.awarded);
        expect(filtered.records.count, name).toBe(f.records);
        expect(filtered.records.rows, name).toHaveLength(f.records);
        expect(f.records, name).toBeLessThan(recordsOf(base).total.records); // a facet narrows
        expect(filtered.facets[dimension].map((x) => x.value), name).toEqual([value]); // and the panel follows the filter
      };
      sameAsFacet("authority-channel-direct-purchase", "authority", "channel", "DIRECT_PURCHASE");
      sameAsFacet("authority-channel-contract", "authority", "channel", "CONTRACT");
      sameAsFacet("authority-procedure", "authority", "procedure", "Negociere");
      sameAsFacet("authority-year-2024", "authority", "year", "2024");
      sameAsFacet("authority-year-2023", "authority", "year", "2023");
      expect(recordsOf("authority-contract-in-2023").total.records).toBe(facet("authority-channel-contract", "year", "2023")!.records); // a second facet, counted in the first's panel
      sameAsFacet("authority-badge-suspect-value", "authority", "badge", "SUSPECT_VALUE");
      sameAsFacet("supplier-channel-contract", "supplier", "channel", "CONTRACT");
      sameAsFacet("authority-signal-over-cap", "authority-with-signals", "signal", "OVER_CAP");
      sameAsFacet("authority-signal-no-publication", "authority-with-signals", "signal", "NO_PUBLICATION");
      expect(recordsOf("authority-with-signals").total.records).toBe(15);
      expect(rows("authority-signal-over-cap").every((r) => r.signals.some((s) => s.rule === "OVER_CAP"))).toBe(true);
      // the two channels add up to the whole (a Record has one)
      expect(recordsOf("authority-channel-direct-purchase").total.records + recordsOf("authority-channel-contract").total.records).toBe(16);
      // a counterparty: the same count as the facet shows beside it, on either side of the pair
      const counterparty = (base: string, key: string) => recordsOf(base).facets.counterparty.find((c) => c.entity?.key === key)!.matched;
      expect(recordsOf("authority-counterparty").total.records).toBe(counterparty("authority", "2000007").records);
      expect(recordsOf("authority-counterparty").total.awarded).toBe(counterparty("authority", "2000007").awarded);
      expect(recordsOf("supplier-counterparty").total).toEqual(recordsOf("authority-counterparty").total); // the same pair, seen from the other side
      expect(codes("supplier-counterparty")).toEqual(codes("authority-counterparty"));
      expect(rows("second-authority-name-only-counterparty").length).toBe(recordsOf("second-authority-name-only-counterparty").total.records);
      expect(recordsOf("second-authority-name-only-counterparty").total.records).toBeGreaterThan(0);
      // the suspect value is a row of the badge's answer but counts in no sum
      expect(recordsOf("authority-badge-suspect-value").total).toMatchObject({ awarded: "0", records: 1, suspectLeftOut: 1 });
      expect(rows("authority-badge-suspect-value")[0]).toMatchObject({ counted: null, badges: ["SUSPECT_VALUE"] });
      // several facets at once narrow further than each, and stay consistent with their own rows
      const several = recordsOf("authority-several-facets");
      expect(several.total.records).toBeLessThan(recordsOf("authority-channel-contract").total.records);
      expect(several.total.records).toBeLessThan(recordsOf("authority-counterparty").total.records);
      expect(several.records.rows).toHaveLength(several.total.records);
      expect(rows("authority-several-facets").every((r) => r.channel === "CONTRACT" && r.date?.startsWith("2023"))).toBe(true);
      // a filter that matches nothing leaves zeros and an empty panel, not a missing role
      expect(recordsOf("authority-nothing-in-filter")).toMatchObject({
        total: { awarded: "0", records: 0 }, records: { count: 0, rows: [] },
        facets: { channel: [], procedure: [], year: [], signal: [], badge: [], counterparty: [] },
      });
      // a facet panel is scoped to the entity: the placement world's commune sees only its own Records
      expect(rows("authority-placed-in-uat").every((r) => r.authority?.key === "51000005")).toBe(true);
    });
  });

  describe("splitting (#75): archive-splitting -> rebuild -> Signals, reproduce, filters", () => {
    type Repro = { authority: string | null; supplier: string | null; signal: string | null; cpv: string | null; from: string | null; to: string | null };
    type Sig = { rule: string; date: string; firstDate: string; recordCount: number; suppliers: { key: string }[]; numbers: Record<string, unknown>; reproduce: Repro; records?: { code: string }[] };
    const DB = "splitting_a";
    const S = "1000017";
    const C = "1000009";
    const N = "2000031";
    const ALFA = "2000007";
    const BETA = "2000015";
    const GAMMA = "2000023";
    const RON = (n: number) => String(Math.round(n * 100));
    const methodology = allowlist.operations.find((o) => o.name === "MethodologyBaseRates")!;

    beforeAll(() => {
      expect(rebuild(DB, "archive-splitting")).toContain("signals: OVER_CAP 2, SPLITTING 6, FRAMEWORK_OVERRUN 0, NO_PUBLICATION 0");
    });

    const op = async (o: { sha256: string; document: string }, variables: Record<string, unknown>) => {
      const r = await ask(DB, o.sha256, variables);
      expect(r.body.errors).toBeUndefined();
      expect(validateResponse(schema, parse(o.document), r.body.data, variables)).toEqual([]);
      return r.body.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    const signals = async (key: string, role: string, filter: Record<string, unknown> = {}) =>
      (await op(entityOverview, { key, role, filter, signalOrder: "DATE_DESC", signalOffset: 0 })).entity.seap.role.signals as { count: number; rows: Sig[] };
    const splits = async (key: string, role: string, filter: Record<string, unknown> = {}) =>
      (await signals(key, role, { signal: "SPLITTING", ...filter })).rows.filter((s) => s.rule === "SPLITTING");
    const doc = (source: string, variableValues: Record<string, unknown> = {}) => {
      const pool = pools.find((p) => (p.options as { connectionString?: string }).connectionString === `${baseUrl}/${DB}`)!;
      return graphql({ schema, source, rootValue: rootValue(postgresStore(pool, { rollup: true })), variableValues }).then((r) => {
        expect(r.errors).toBeUndefined();
        return r.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    };
    const range = (s: Sig) => `${s.firstDate}..${s.date}`;

    it("a trigger: two purchases each under the cap and together over it are one Signal with its numbers (#75)", async () => {
      const spital = await splits(S, "AUTHORITY");
      const alfa = spital.find((s) => s.suppliers[0]!.key === ALFA)!;
      expect(alfa).toMatchObject({ rule: "SPLITTING", firstDate: "2023-01-05", date: "2023-01-20", recordCount: 2 });
      expect(alfa.numbers).toEqual({ __typename: "SplittingNumbers", purchases: 2, sum: RON(300_000), cap: RON(270_120), cpvGroup: "301", from: "2023-01-05", to: "2023-01-20" });
      expect(alfa.reproduce).toEqual({ authority: S, supplier: ALFA, signal: "SPLITTING", cpv: "301", from: "2023-01-05", to: "2023-01-20" });
    });

    it("a 31-day span is a near miss; 30 days is a Signal (#75)", async () => {
      expect((await splits(S, "AUTHORITY", { supplier: BETA })).map(range)).toEqual([]); // 2023-01-05 and 2023-02-04
      expect((await splits(C, "AUTHORITY", { supplier: BETA })).map(range)).toEqual(["2023-01-05..2023-02-03"]);
    });

    it("overlapping windows merge into one Signal; a disjoint window of the same triple is another (#75)", async () => {
      const gamma = (await splits(S, "AUTHORITY", { supplier: GAMMA })).sort((a, b) => a.date.localeCompare(b.date));
      expect(gamma.map(range)).toEqual(["2023-03-01..2023-04-08", "2023-08-01..2023-08-02"]);
      expect(gamma[0]!.numbers).toMatchObject({ purchases: 3, sum: RON(450_000), cap: RON(270_120), from: "2023-03-01", to: "2023-04-08" });
      expect(gamma[1]!.numbers).toMatchObject({ purchases: 2, sum: RON(300_000) });
    });

    it("the cap of the last purchase's date decides across 10 September 2022 (#75)", async () => {
      const comuna = await splits(C, "AUTHORITY", { supplier: ALFA });
      expect(comuna.map(range)).toEqual(["2022-09-01..2022-09-20"]); // 135,060 (the old cap) + 135,100 = 270,160 > the new cap
      expect(comuna[0]!.numbers).toMatchObject({ purchases: 2, sum: RON(270_160), cap: RON(270_120) });
      expect(await splits(C, "AUTHORITY", { supplier: GAMMA })).toEqual([]); // 200,000: over the old cap, not the new one
    });

    it("exempt, suspect, over-cap, person and split-CPV purchases make no Signal; works use the works cap (#75)", async () => {
      const n = await splits(N, "AUTHORITY");
      expect(n.map((s) => `${s.suppliers[0]!.key} ${range(s)} ${(s.numbers as { cap: string }).cap}`)).toEqual([`${ALFA} 2023-09-01..2023-09-10 ${RON(900_400)}`]);
      // the over-cap one is the over-cap rule's: it is in no splitting Signal (the reproduce test below checks no over-cap Record sits in a range)
      const all = (await signals(N, "AUTHORITY")).rows.map((s) => s.rule).sort();
      expect(all).toEqual(["OVER_CAP", "SPLITTING"]);
    });

    it("a Signal is on its authority's and its supplier's page; the filters and the facet count it (#75)", async () => {
      expect((await splits(ALFA, "SUPPLIER")).map((s) => `${s.reproduce.authority} ${range(s)}`).sort()).toEqual([`${C} 2022-09-01..2022-09-20`, `${S} 2023-01-05..2023-01-20`, `${N} 2023-09-01..2023-09-10`]);
      expect((await splits(BETA, "SUPPLIER")).map((s) => s.reproduce.authority)).toEqual([C]);
      const total = async (f: Record<string, unknown>) =>
        (await doc(`query($f: RecordFilter!) { seap { search(filter: $f) { total { records } } } }`, { f })).seap.search.total.records as number;
      expect(await total({ signal: "SPLITTING" })).toBe(13); // 2 + 2 + 3 + 2 + 2 + 2 Records
      expect(await total({ signal: "OVER_CAP" })).toBe(2);
      // the facet on an entity's Records tab counts its Records per rule: CNAIR has one over-cap purchase and the two works purchases of a splitting Signal
      const tab = (await op(entityRecords, { key: N, role: "AUTHORITY", filter: {}, limit: 5, offset: 0 })).entity.seap.role.records as { facets: { signal: { value: string; total: { records: number } }[] } };
      expect(Object.fromEntries(tab.facets.signal.map((f) => [f.value, f.total.records]))).toEqual({ OVER_CAP: 1, SPLITTING: 2 });
    });

    it("running a Signal's reproduce filter returns exactly its Records, for every splitting Signal (#75)", async () => {
      const q = `query($k: ID!, $role: Role!) { entity(key: $k) { seap { role(role: $role) { signals(limit: 200) { rows { rule date reproduce { authority supplier signal cpv from to }
          records(limit: 200) { code } } } } } } }`;
      const search = `query($f: RecordFilter!) { seap { search(filter: $f) { records(limit: 200, offset: 0, order: DATE_DESC) { count rows { record { code } } } } } }`;
      const seen = new Set<string>();
      for (const [k, role] of [[S, "AUTHORITY"], [C, "AUTHORITY"], [N, "AUTHORITY"], [ALFA, "SUPPLIER"], [BETA, "SUPPLIER"], [GAMMA, "SUPPLIER"]] as const) {
        const { entity } = await doc(q, { k, role });
        for (const s of entity.seap.role.signals.rows as { rule: string; reproduce: Record<string, string | null>; records: { code: string }[] }[]) {
          const filter = Object.fromEntries(Object.entries(s.reproduce).filter(([, v]) => v !== null));
          const found = (await doc(search, { f: filter })).seap.search.records;
          expect(found.rows.map((r: { record: { code: string } }) => r.record.code).sort(), JSON.stringify(s.reproduce)).toEqual(s.records.map((r) => r.code).sort());
          expect(found.count).toBe(s.records.length);
          if (s.rule === "SPLITTING") seen.add(JSON.stringify(s.reproduce));
        }
      }
      expect(seen.size).toBe(6); // trigger, window edge, merged, second window, cap change, works
      // the 300,000 purchase inside the trigger's range is over-cap's: the splitting filter does not return it
      const ranged = (await doc(search, { f: { authority: S, supplier: ALFA, signal: "SPLITTING", cpv: "301", from: "2023-01-05", to: "2023-01-20" } })).seap.search.records;
      expect(ranged.rows.map((r: { record: { code: string } }) => r.record.code).sort()).toEqual(["DA97000001", "DA97000002"]);
      const inRange = (await doc(search, { f: { authority: S, supplier: ALFA, cpv: "301", from: "2023-01-05", to: "2023-01-20" } })).seap.search.records;
      expect(inRange.count).toBe(3);
    });

    it("the record page lists the splitting Signal with its numbers; a left-out purchase lists none (#75)", async () => {
      const page = async (code: string) => (await op(recordPage, { code })).seap.record;
      const r = await page("DA97000005");
      expect(r.signals.map((s: Sig) => s.rule)).toEqual(["SPLITTING"]);
      expect(r.signals[0].numbers).toMatchObject({ __typename: "SplittingNumbers", purchases: 3 });
      expect(r.signals[0].records.map((x: { code: string }) => x.code).sort()).toEqual(["DA97000005", "DA97000006", "DA97000007"]);
      expect((await page("DA97000010")).signals.map((s: Sig) => s.rule)).toEqual(["OVER_CAP"]);
      for (const code of ["DA97000003", "DA97000004", "DA97100003", "DA97200003", "DA97200005", "DA97200008", "DA97200010", "DA97300003"]) expect((await page(code)).signals, code).toEqual([]);
    });

    it("signalRules: the window starts with the first direct purchases, base rate from the latest complete year (2022: the commune bought and split) (#75)", async () => {
      const data = await op(methodology, {});
      const rule = (data.signalRules as { slug: string; window: { from: string; to: string | null }; baseRate: number; baseRateYear: number; dataThrough: string }[]).find((r) => r.slug === "SPLITTING");
      expect(rule).toEqual({ slug: "SPLITTING", window: { from: "2022-01-01", to: null }, baseRate: 1, baseRateYear: 2022, dataThrough: "2023-09-10" });
    });
  });

  describe("framework-overrun (#76): archive-framework-overrun -> rebuild -> Signals, reproduce, filters", () => {
    type Repro = { authority: string | null; supplier: string | null; signal: string | null; cpv: string | null; from: string | null; to: string | null };
    type Sig = { rule: string; date: string; firstDate: string; recordCount: number; suppliers: { key: string }[]; numbers: Record<string, unknown>; reproduce: Repro; records?: { code: string }[] };
    const DB = "framework_overrun_a";
    const S = "1000017";
    const C = "1000009";
    const N = "2000031";
    const ALFA = "2000007";
    const BETA = "2000015";
    const GAMMA = "2000023";
    const RON = (n: number) => String(Math.round(n * 100));
    const methodology = allowlist.operations.find((o) => o.name === "MethodologyBaseRates")!;

    beforeAll(() => {
      expect(rebuild(DB, "archive-framework-overrun")).toContain("signals: OVER_CAP 0, SPLITTING 0, FRAMEWORK_OVERRUN 5, NO_PUBLICATION 0");
    });

    const op = async (o: { sha256: string; document: string }, variables: Record<string, unknown>) => {
      const r = await ask(DB, o.sha256, variables);
      expect(r.body.errors).toBeUndefined();
      expect(validateResponse(schema, parse(o.document), r.body.data, variables)).toEqual([]);
      return r.body.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    };
    const signals = async (key: string, role: string, filter: Record<string, unknown> = {}) =>
      (await op(entityOverview, { key, role, filter, signalOrder: "DATE_DESC", signalOffset: 0 })).entity.seap.role.signals as { count: number; rows: Sig[] };
    const overruns = async (key: string, role: string, filter: Record<string, unknown> = {}) =>
      (await signals(key, role, { signal: "FRAMEWORK_OVERRUN", ...filter })).rows.filter((s) => s.rule === "FRAMEWORK_OVERRUN");
    const doc = (source: string, variableValues: Record<string, unknown> = {}) => {
      const pool = pools.find((p) => (p.options as { connectionString?: string }).connectionString === `${baseUrl}/${DB}`)!;
      return graphql({ schema, source, rootValue: rootValue(postgresStore(pool, { rollup: true })), variableValues }).then((r) => {
        expect(r.errors).toBeUndefined();
        return r.data as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      });
    };
    const range = (s: Sig) => `${s.firstDate}..${s.date}`;

    it("a crossing: the subsequent contract that pushes the sum over 110% dates the Signal; later subsequent contracts are not its Records but are in its numbers (#76)", async () => {
      const [x1, x7] = (await overruns(S, "AUTHORITY")).sort((a, b) => b.date.localeCompare(a.date)); // newest first: 03-05, then 02-20
      expect(x1).toMatchObject({ rule: "FRAMEWORK_OVERRUN", firstDate: "2023-01-10", date: "2023-03-05", recordCount: 4 }); // the ceiling and the first three subsequent contracts, not the 03-20 one
      expect(x1!.suppliers.map((s) => s.key)).toEqual([ALFA]);
      // ceiling 1,000,000; all four subsequent contracts reported = 1,250,000: the numbers describe the framework as reported, the Records stop at the crossing
      expect(x1!.numbers).toEqual({ __typename: "FrameworkOverrunNumbers", ceiling: RON(1_000_000), subsequent: RON(1_250_000), ratio: 1.25 });
      expect(x1!.reproduce).toEqual({ authority: S, supplier: ALFA, signal: "FRAMEWORK_OVERRUN", cpv: null, from: "2023-01-10", to: "2023-03-05" });
      expect(x7).toMatchObject({ firstDate: "2023-01-15", date: "2023-02-20", recordCount: 2 });
      expect(x7!.numbers).toMatchObject({ ceiling: RON(1_000_000), subsequent: RON(1_200_000), ratio: 1.2 });
      expect(x7!.reproduce).toMatchObject({ supplier: BETA });
    });

    it("the same numbers as the Record page's framework link (seap.framework), from the ceiling and from a subsequent contract (#76)", async () => {
      const page = async (code: string) => (await op(recordPage, { code })).seap.record;
      for (const code of ["CAN9700001~1", "CAN9700001~4"]) {
        const r = await page(code);
        expect(r.framework).toMatchObject({ ceiling: RON(1_000_000), subsequentReported: RON(1_250_000), ratio: 1.25 });
        expect(r.signals.map((s: Sig) => s.rule)).toEqual(["FRAMEWORK_OVERRUN"]);
        expect(r.signals[0].numbers).toMatchObject({ ceiling: RON(1_000_000), subsequent: RON(1_250_000), ratio: 1.25 });
        expect(r.signals[0].records.map((x: { code: string }) => x.code).sort()).toEqual(["CAN9700001~1", "CAN9700001~2", "CAN9700001~3", "CAN9700001~4"]);
      }
      expect((await page("CAN9700001~5")).signals).toEqual([]); // after the crossing: reported, not a member
    });

    it("negatives: exactly 110%, 90%, a blank ceiling and a pre-2021 framework make no Signal (#76)", async () => {
      const all = async (key: string, role: string) => (await overruns(key, role)).map((s) => s.reproduce.authority + " " + range(s)).sort();
      expect(await all(S, "AUTHORITY")).toEqual([`${S} 2023-01-10..2023-03-05`, `${S} 2023-01-15..2023-02-20`]); // CAN9700002 (exactly 110%) is not there
      // the commune: CAN9700003 (90%) and CAN9700004 (blank ceiling, 5,000,000 of subsequent contracts) are not Signals; only CAN9700008 is
      expect(await all(C, "AUTHORITY")).toEqual([`${C} 2023-01-02..2023-02-05`]);
      // CNAIR: CAN9700005 is a 2020 framework with 1,500,000 of 2023 subsequent contracts (150%): not a Signal; CAN9700006 and CAN9700009 are
      expect(await all(N, "AUTHORITY")).toEqual([`${N} 2023-01-03..2023-01-03`, `${N} 2023-01-05..2023-02-20`]);
      const page = async (code: string) => (await op(recordPage, { code })).seap.record;
      for (const code of ["CAN9700002~1", "CAN9700002~2", "CAN9700003~1", "CAN9700003~3", "CAN9700004~1", "CAN9700004~2", "CAN9700005~1", "CAN9700005~2", "CAN9700005~3"]) {
        expect((await page(code)).signals, code).toEqual([]);
      }
      // the pre-2021 and blank-ceiling frameworks are still frameworks for the counting rule: the Record page shows their link
      expect((await page("CAN9700005~2")).framework).toMatchObject({ ceiling: RON(1_000_000), subsequentReported: RON(1_500_000), ratio: 1.5 });
      expect((await page("CAN9700004~2")).framework).toMatchObject({ ceiling: null, ratio: null });
    });

    it("several ceilings are summed; several suppliers leave the supplier out of the filter; a consortium subsequent contract too (#76)", async () => {
      const n = (await overruns(N, "AUTHORITY")).find((s) => s.firstDate === "2023-01-05")!;
      expect(n).toMatchObject({ firstDate: "2023-01-05", date: "2023-02-20", recordCount: 4 }); // both ceilings, BETA's 700,000 subsequent contract and the crossing GAMMA one
      expect(n!.numbers).toMatchObject({ ceiling: RON(1_000_000), subsequent: RON(1_200_000), ratio: 1.2 });
      expect(n!.suppliers.map((s) => s.key).sort()).toEqual([ALFA, BETA, GAMMA]);
      expect(n!.reproduce).toEqual({ authority: N, supplier: null, signal: "FRAMEWORK_OVERRUN", cpv: null, from: "2023-01-05", to: "2023-02-20" });
      const [c] = await overruns(C, "AUTHORITY");
      expect(c!.numbers).toMatchObject({ ceiling: RON(500_000), subsequent: RON(570_000), ratio: 1.14 });
      expect(c!.suppliers.map((s) => s.key).sort()).toEqual([ALFA, GAMMA]);
      expect(c!.reproduce.supplier).toBeNull();
    });

    it("subsequent contracts signed by another authority under the notice count, as on the Record page; the Signal is the concluder's alone (#76)", async () => {
      // CAN9700009: concluded by CNAIR (ceiling 1,000,000), its only subsequent contract (1,200,000) signed by the commune
      const [x9] = (await overruns(N, "AUTHORITY")).filter((s) => s.firstDate === "2023-01-03");
      expect(x9).toMatchObject({ date: "2023-01-03", recordCount: 1 }); // the crossing contract (2023-03-01) is the other authority's, not a Record: dated by its latest Record, the ceiling
      expect(x9!.numbers).toEqual({ __typename: "FrameworkOverrunNumbers", ceiling: RON(1_000_000), subsequent: RON(1_200_000), ratio: 1.2 }); // the Record page's numbers
      expect(x9!.reproduce).toEqual({ authority: N, supplier: ALFA, signal: "FRAMEWORK_OVERRUN", cpv: null, from: "2023-01-03", to: "2023-01-03" }); // `to` is the last member's day
      expect((await overruns(C, "AUTHORITY")).map((s) => s.firstDate)).toEqual(["2023-01-02"]); // not a Signal of the commune
      const page = async (code: string) => (await op(recordPage, { code })).seap.record;
      expect((await page("CAN9700009~1")).signals.map((s: Sig) => s.rule)).toEqual(["FRAMEWORK_OVERRUN"]);
      const off = await page("CAN9700009~2");
      expect(off.signals).toEqual([]);
      expect(off.framework).toMatchObject({ ceiling: RON(1_000_000), subsequentReported: RON(1_200_000), ratio: 1.2 });
    });

    it("a Signal is on its authority's and its suppliers' pages; the filter and the facet count it (#76)", async () => {
      const where = async (key: string) => (await overruns(key, "SUPPLIER")).map((s) => `${s.reproduce.authority} ${range(s)}`).sort();
      expect(await where(ALFA)).toEqual([`${C} 2023-01-02..2023-02-05`, `${S} 2023-01-10..2023-03-05`, `${N} 2023-01-05..2023-02-20`, `${N} 2023-01-03..2023-01-03`].sort());
      expect(await where(BETA)).toEqual([`${S} 2023-01-15..2023-02-20`, `${N} 2023-01-05..2023-02-20`].sort());
      expect(await where(GAMMA)).toEqual([`${C} 2023-01-02..2023-02-05`, `${N} 2023-01-05..2023-02-20`].sort());
      const total = async (f: Record<string, unknown>) =>
        (await doc(`query($f: RecordFilter!) { seap { search(filter: $f) { total { records } } } }`, { f })).seap.search.total.records as number;
      expect(await total({ signal: "FRAMEWORK_OVERRUN" })).toBe(14); // 4 + 2 + 4 + 3 + 1 Records
      expect(await total({ signal: "FRAMEWORK_OVERRUN", authority: S })).toBe(6);
      expect(await total({ signal: "FRAMEWORK_OVERRUN", authority: S, supplier: ALFA })).toBe(4);
      expect(await total({ signal: "OVER_CAP" })).toBe(0);
      const tab = (await op(entityRecords, { key: S, role: "AUTHORITY", filter: {}, limit: 5, offset: 0 })).entity.seap.role.records as { facets: { signal: { value: string; total: { records: number } }[] } };
      expect(Object.fromEntries(tab.facets.signal.map((f) => [f.value, f.total.records]))).toEqual({ FRAMEWORK_OVERRUN: 6 });
    });

    it("running a Signal's reproduce filter returns exactly its Records, for every framework-overrun Signal (#76)", async () => {
      const q = `query($k: ID!, $role: Role!) { entity(key: $k) { seap { role(role: $role) { signals(limit: 200) { rows { rule date reproduce { authority supplier signal cpv from to }
          records(limit: 200) { code date } } } } } } }`;
      const search = `query($f: RecordFilter!) { seap { search(filter: $f) { records(limit: 200, offset: 0, order: DATE_DESC) { count rows { record { code } } } } } }`;
      const seen = new Set<string>();
      for (const [k, role] of [[S, "AUTHORITY"], [C, "AUTHORITY"], [N, "AUTHORITY"], [ALFA, "SUPPLIER"], [BETA, "SUPPLIER"], [GAMMA, "SUPPLIER"]] as const) {
        const { entity } = await doc(q, { k, role });
        for (const s of entity.seap.role.signals.rows as { rule: string; date: string; reproduce: Record<string, string | null>; records: { code: string; date: string | null }[] }[]) {
          const filter = Object.fromEntries(Object.entries(s.reproduce).filter(([, v]) => v !== null));
          const found = (await doc(search, { f: filter })).seap.search.records;
          expect(found.rows.map((r: { record: { code: string } }) => r.record.code).sort(), JSON.stringify(s.reproduce)).toEqual(s.records.map((r) => r.code).sort());
          expect(found.count).toBe(s.records.length);
          expect(s.date, JSON.stringify(s.reproduce)).toBe(s.records.map((r) => r.date!).sort().at(-1)); // dated by its latest Record, never by a contract that is not one
          expect(s.reproduce.to).toBe(s.date);
          seen.add(JSON.stringify(s.reproduce));
        }
      }
      expect(seen.size).toBe(5); // one per overrun framework; the two of the hospital overlap in dates and are told apart by the supplier
    });

    it("signalRules: the window starts on 2021-01-01 although a 2020 file is loaded; the base rate counts the authorities that had Contracte in 2023 (#76)", async () => {
      const data = await op(methodology, {});
      const rule = (data.signalRules as { slug: string; window: { from: string; to: string | null }; baseRate: number; baseRateYear: number; dataThrough: string }[]).find((r) => r.slug === "FRAMEWORK_OVERRUN");
      // 3 authorities have a Contracte Record in 2023 (no complete year in the window before the data-through year 2023, so 2023 stands in; the 2020 Records are before the window); all 3 have a Signal
      expect(rule).toEqual({ slug: "FRAMEWORK_OVERRUN", window: { from: "2021-01-01", to: null }, baseRate: 1, baseRateYear: 2023, dataThrough: "2023-03-20" });
    });
  });

  describe("recorded fixtures (#85): seven small archives -> rebuild -> the recorded RecordPage", () => {
    // The app's seam 3 renders the Record page against these answers, so the two seams stay in step: this block fails when an answer
    // drifts from the committed JSON. `RECORD_FIXTURES=1` rewrites the JSON instead (see packages/contract/README.md).
    const recording = process.env.RECORD_FIXTURES === "1";
    const file = resolve(here, "../../contract/src/fixtures/recorded/RecordPage.json");
    const ARCHIVES = {
      counting: { db: "record_counting", dir: "archive-counting", extra: [] as string[] },
      contracts: { db: "record_contracts", dir: "archive-contracts", extra: [] as string[] },
      bulk: { db: "record_bulk", dir: "archive-bulk", extra: [] as string[] },
      identity: { db: "record_identity", dir: "archive-identity", extra: ["--identity-overrides", identityOverrides] },
      crawl: { db: "record_crawl", dir: "archive-crawl", extra: [] as string[] },
      signals: { db: "record_signals", dir: "archive-signals", extra: [] as string[] },
      splitting: { db: "record_splitting", dir: "archive-splitting", extra: [] as string[] },
    };

    beforeAll(async () => {
      for (const a of Object.values(ARCHIVES)) {
        await admin.query(`CREATE DATABASE ${a.db}`);
        rebuild(a.db, a.dir, a.extra);
      }
    });

    const answer = async (c: RecordedRecordCase) => {
      const r = await ask(ARCHIVES[c.archive].db, recordPage.sha256, c.variables);
      expect(r.status, c.name).toBe(200);
      expect(r.body.errors, c.name).toBeUndefined();
      expect(validateResponse(schema, parse(recordPage.document), r.body.data, c.variables), c.name).toEqual([]);
      return { name: c.name, kind: c.kind, description: c.description, variables: c.variables, data: r.body.data };
    };
    const answers = new Map<string, Awaited<ReturnType<typeof answer>>>();
    beforeAll(async () => {
      for (const c of RECORDED_RECORD_CASES) answers.set(c.name, await answer(c));
    });
    const recordOf = (name: string) => (answers.get(name)!.data as RecordPageQuery).seap.record!;

    it("RecordPage: every recorded case is what the API answers now", () => {
      const recorded = RECORDED_RECORD_CASES.map((c) => answers.get(c.name)!);
      if (recording) writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
      // through JSON, so undefined and key order do not matter
      expect(JSON.parse(JSON.stringify(recorded))).toEqual(JSON.parse(readFileSync(file, "utf8")));
    });

    it("asks no two cases the same question, so the app's fixture client can tell them apart (it matches on variables)", () => {
      const asked = RECORDED_RECORD_CASES.map((c) => c.variables.code);
      expect(new Set(asked).size).toBe(asked.length);
      expect(new Set(RECORDED_RECORD_CASES.map((c) => c.name)).size).toBe(asked.length);
    });

    it("answers every Record kind, and the states the Record page names, with the facts they are named for", () => {
      const R = (n: number) => bani(n);
      const kinds = RECORDED_RECORD_CASES.filter((c) => c.name !== "not-found").map((c) => recordOf(c.name).kind);
      expect([...new Set(kinds)].sort()).toEqual(["AWARD_NOTICE", "CONTRACT", "DA", "DAN"]);
      // value as published and counted value; a suspect one is shown, flagged by its rule and threshold, not counted
      expect(recordOf("direct-purchase-counted")).toMatchObject({ kind: "DA", value: R(1_350_599), counted: R(1_350_599), badges: [], suspect: null, framework: null });
      expect(recordOf("direct-purchase-counted").signals.map((x) => x.rule)).toEqual(["OVER_CAP"]); // 9.99999x the cap: counted, and an over-cap Signal lists it
      expect(recordOf("direct-purchase-suspect")).toMatchObject({ value: R(2_000_000), counted: null, badges: ["SUSPECT_VALUE"], suspect: { rule: "DIRECT_PURCHASE_10X_CAP", threshold: R(135_060) } });
      expect(recordOf("contract-suspect-over-estimate")).toMatchObject({ kind: "CONTRACT", counted: null, suspect: { rule: "CONTRACT_100X_ESTIMATE", threshold: R(10_000_000) } });
      expect(recordOf("contract-suspect-no-estimate")).toMatchObject({ counted: null, suspect: { rule: "CONTRACT_OVER_50BN", threshold: null } });
      // no value in SEAP
      expect(recordOf("direct-purchase-no-value")).toMatchObject({ value: null, counted: null, badges: ["NO_VALUE"], suspect: null });
      // a framework agreement and what hangs on it; a subsequent contract points back; a blank ceiling has no ratio
      const framework = recordOf("framework-agreement");
      expect(framework).toMatchObject({ value: R(10_000_000), counted: null, badges: ["FRAMEWORK_CEILING"] });
      expect(framework.framework).toMatchObject({ agreement: null, ceiling: R(10_000_000), subsequentReported: R(5_000_000), ratio: 0.5 });
      expect(framework.framework!.subsequent.map((s) => s.code)).toEqual(["CAN9800001~2", "CAN9800001~3"]);
      expect(recordOf("subsequent-contract")).toMatchObject({ counted: R(4_000_000), badges: ["SUBSEQUENT_CONTRACT"], framework: { agreement: { code: "CAN9800001~1" }, ratio: 0.5 } });
      expect(recordOf("framework-blank-ceiling").framework).toMatchObject({ ceiling: null, subsequentReported: R(500_000), ratio: null });
      // a consortium: the full value once, equal shares summing back to it; a natural person among the members is unnamed and unlinked
      const trio = recordOf("consortium-with-natural-person");
      expect(trio).toMatchObject({ value: "100000", counted: "100000", badges: ["CONSORTIUM_SHARE"] });
      expect(trio.winners.map((w) => w.share)).toEqual(["33334", "33333", "33333"]);
      expect(trio.winners.map((w) => [w.naturalPerson, w.publishedName, w.entity?.key ?? null])).toEqual([[false, "ALFA DEMO SRL", "name-alfa-demo-srl"], [true, null, null], [false, "BALKAN TRADING OOD", "vat-bg103029862"]]);
      expect(recordOf("award-notice-consortium")).toMatchObject({ kind: "AWARD_NOTICE", value: "9880000", counted: "9880000", badges: ["CONSORTIUM_SHARE"] });
      expect(recordOf("award-notice-consortium").winners.map((w) => w.share)).toEqual(["4940000", "4940000"]);
      expect(recordOf("framework-consortium")).toMatchObject({ kind: "CONTRACT", counted: null, badges: ["FRAMEWORK_CEILING", "CONSORTIUM_SHARE"], framework: { ceiling: "120025", ratio: 0, subsequent: [] } });
      // a subsequent contract whose framework is in the archive, under a code with a slash
      expect(recordOf("contract-code-with-slash")).toMatchObject({ badges: ["SUBSEQUENT_CONTRACT"], framework: { agreement: { code: "CAN9000010~21" } } });
      // identity: a natural person is never named; mismatch, differing name, curation
      expect(recordOf("natural-person-winner").winners).toEqual([expect.objectContaining({ naturalPerson: true, publishedName: null, entity: null })]);
      expect(recordOf("cui-mismatch").badges).toEqual(["CUI_MISMATCH"]);
      expect(recordOf("name-differs-from-anaf").badges).toEqual(["NAME_DIFFERS_FROM_ANAF"]);
      expect(recordOf("identity-curated").badges).toEqual(["NAME_DIFFERS_FROM_ANAF", "IDENTITY_CURATED"]);
      expect(recordOf("consortium-name-only-members").winners.map((w) => [w.naturalPerson, w.entity?.key ?? null])).toEqual([[false, "2000007"], [true, null], [false, "vat-bg103029862"]]);
      // crawled Records: provisional or crawl-only, with the notice's own page as the link and no bulk file behind them
      expect(recordOf("crawl-only")).toMatchObject({ badges: ["CRAWL_ONLY"], provenance: { kind: "CRAWL", via: null, url: "https://e-licitatie.ro/pub/notices/ca-notices/view-c/92000012", fetchedAt: "2026-11-11T09:00:00Z" } });
      expect(recordOf("crawled-provisional")).toMatchObject({ badges: ["CRAWLED_PROVISIONAL"], provenance: { kind: "CRAWL", url: "https://e-licitatie.ro/pub/notices/ca-notices/view-c/92000013", fetchedAt: "2026-11-12T09:00:00Z" } });
      expect(recordOf("crawled-request-for-quotation").provenance.url).toBe("https://e-licitatie.ro/pub/notices/ca-notices/view-rfq/92000014");
      expect(recordOf("bulk-over-crawl")).toMatchObject({ badges: [], provenance: { kind: "BULK", via: "Contracte 2026 - T1" } });
      // Signals: the Record lists its Signals with their Records and numbers
      const over = recordOf("over-cap-signal");
      expect(over.signals).toHaveLength(1);
      expect(over.signals[0]).toMatchObject({ rule: "OVER_CAP", recordCount: 2, numbers: { __typename: "OverCapNumbers" } });
      expect(over.signals[0]!.records.map((r) => r.code).sort()).toEqual(["DA98000001", "DA98000002"]);
      expect(recordOf("signal-natural-person").signals.map((s) => s.rule)).toEqual(["OVER_CAP"]);
      expect(recordOf("signal-natural-person").winners[0]).toMatchObject({ naturalPerson: true, publishedName: null, entity: null });
      expect(recordOf("no-publication-signal")).toMatchObject({ kind: "AWARD_NOTICE", badges: ["CRAWL_ONLY"], signals: [{ rule: "NO_PUBLICATION" }], provenance: { kind: "CRAWL" } });
      expect(recordOf("no-publication-signal").signals[0]!.numbers).toEqual({ __typename: "NoPublicationNumbers", procedure: "Negociere fara publicare prealabila" });
      const split = recordOf("splitting-signal");
      expect(split.signals).toHaveLength(1);
      expect(split.signals[0]).toMatchObject({ rule: "SPLITTING", recordCount: 3, numbers: { __typename: "SplittingNumbers", purchases: 3 } });
      expect(split.signals[0]!.records.map((r) => r.code).sort()).toEqual(["DA97000005", "DA97000006", "DA97000007"]);
      // an unknown code is no Record
      expect((answers.get("not-found")!.data as RecordPageQuery).seap.record).toBeNull();
    });

    it("gives every bulk Record the redirect path for its code as the Check-in-SEAP link, and the redirect reaches the page of its notice type (seam 2 fake upstream)", async () => {
      const upstream: Server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (x: Buffer) => chunks.push(x));
        req.on("end", () => {
          const body = JSON.parse(Buffer.concat(chunks).toString() || "{}") as Record<string, string>;
          const row = req.url?.includes("GetDirectAcquisitionList")
            ? { directAcquisitionId: 111, uniqueIdentificationCode: body.uniqueIdentificationCode }
            : req.url?.includes("GetDaAwardNoticeList")
              ? { daAwardNoticeId: 333, noticeNo: body.noticeNo }
              : { caNoticeId: 222, noticeNo: body.number, sysNoticeTypeId: body.number?.startsWith("SCNA") ? 18 : 3, sysNoticeVersionId: 2 };
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ total: 1, items: [row] }));
        });
      });
      await new Promise<void>((r) => upstream.listen(0, "127.0.0.1", r));
      const upstreamBase = `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`;
      const server = await createApi({} as never, schema, { seapLink: createSeapLink({ baseUrl: upstreamBase }) }).listen(0, "127.0.0.1");
      const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      try {
        const bulk = RECORDED_RECORD_CASES.map((c) => ({ c, r: (answers.get(c.name)!.data as RecordPageQuery).seap.record })).filter((x) => x.r?.provenance.kind === "BULK");
        expect(bulk.length).toBeGreaterThan(15);
        const pages: Record<string, string> = {};
        for (const { c, r } of bulk) {
          const code = r!.code;
          expect(code, c.name).toBe(c.variables.code);
          // the link the page shows is the redirect path of the Record's code (url-encoded as a path segment)
          expect(r!.provenance.url, c.name).toBe(seapLinkUrl(code));
          expect(r!.provenance.url, c.name).toBe(`/source/seap/${encodeURIComponent(code)}`);
          const res = await fetch(`${base}${r!.provenance.url}`, { redirect: "manual" });
          expect(res.status, c.name).toBe(302);
          pages[code] = res.headers.get("location")!.replace(upstreamBase, "");
        }
        expect(pages["DA94000002"]).toBe("/pub/direct-acquisition/view/111");
        expect(pages["DAN9100001"]).toBe("/pub/direct-acquisition/award-notice/view/333");
        expect(pages["CAN9800001~1"]).toBe("/pub/notices/ca-notices/view-c/222");
        expect(pages["CAN9000010~1398514/1"]).toBe("/pub/notices/ca-notices/view-c/222"); // `~number` dropped: the notice's page
        expect(pages["CAN9100002"]).toBe("/pub/notices/ca-notices/view-c/222");
      } finally {
        server.close();
        server.closeAllConnections();
        await new Promise<void>((r) => upstream.close(() => r()));
      }
    });
  });


  describe("recorded fixtures (#89): archive-signals, archive-splitting, archive-framework-overrun -> rebuild -> Signals on every screen", () => {
    // The app's seam 3 renders the Signals on every screen against these answers. Same convention as #83/#86: this block fails when an answer
    // drifts from the committed JSON; `RECORD_FIXTURES=1` rewrites it. One JSON file per operation under recorded/signals/.
    const recording = process.env.RECORD_FIXTURES === "1";
    const dir = resolve(here, "../../contract/src/fixtures/recorded/signals");
    const DBS = { signals: "sig89_a", splitting: "sig89_b", frameworkOverrun: "sig89_c" } as const;
    const DIRS = { signals: "archive-signals", splitting: "archive-splitting", frameworkOverrun: "archive-framework-overrun" } as const;
    const OPS = {
      EntityOverview: entityOverview,
      EntityRecords: entityRecords,
      EntityRelationships: entityRelationships,
      MainScreen: mainScreen,
      FullResultsAuthorities: allowlist.operations.find((o) => o.name === "FullResultsAuthorities")!,
      FullResultsSuppliers: allowlist.operations.find((o) => o.name === "FullResultsSuppliers")!,
      FullResultsRecords: allowlist.operations.find((o) => o.name === "FullResultsRecords")!,
      RecordPage: recordPage,
      MethodologyBaseRates: allowlist.operations.find((o) => o.name === "MethodologyBaseRates")!,
    };
    type Case = Omit<RecordedSignalCase, "operation"> & { operation: keyof typeof OPS };
    type Answer = { name: string; kind: string; description: string; variables: Record<string, unknown>; data: unknown };

    beforeAll(async () => {
      for (const a of Object.keys(DBS) as (keyof typeof DBS)[]) {
        await admin.query(`CREATE DATABASE ${DBS[a]}`);
        rebuild(DBS[a], DIRS[a]);
      }
    });

    const answer = async (c: Case): Promise<Answer> => {
      const op = OPS[c.operation];
      const r = await ask(DBS[c.archive], op.sha256, c.variables);
      expect(r.status, c.name).toBe(200);
      expect(r.body.errors, c.name).toBeUndefined();
      expect(validateResponse(schema, parse(op.document), r.body.data, c.variables), c.name).toEqual([]);
      return { name: c.name, kind: c.kind, description: c.description, variables: c.variables, data: r.body.data };
    };
    /** What the Records tab asks when a Signal's reproducing link is opened: the authority's page with the Signal's grouping as the filter, 100 a page, no order. The case names built here are the recording names; the ui samples (`fixtureData.ts` overCapSignalRecords, splittingSignalRecords) pick recordings by them, so changing the scheme means changing those names. */
    const reproduceCase = (s: SignalFieldsFragment, archive: RecordedSignalCase["archive"]): Case => {
      const { authority, signal, supplier, cpv, from, to } = s.reproduce;
      const filter = Object.fromEntries(Object.entries({ signal, supplier, cpv, from, to }).filter(([, v]) => v !== null && v !== undefined));
      const who = [signal!.toLowerCase().replace(/_/g, "-"), authority, s.firstDate, s.date, supplier ?? ""].filter(Boolean).join("-");
      return {
        operation: "EntityRecords", name: who, archive, kind: "typical",
        description: `the Records of the ${signal} Signal of authority ${authority} dated ${s.date}, opened from its reproducing link`,
        variables: { key: authority, role: "AUTHORITY", filter, limit: 100, offset: 0 },
      };
    };
    const answers = new Map<string, Answer>();
    const cases: Case[] = [];
    beforeAll(async () => {
      for (const c of RECORDED_SIGNAL_CASES) {
        cases.push(c);
        answers.set(`${c.operation}/${c.name}`, await answer(c));
      }
      // one Records-tab case per Signal the recorded Overviews show: the Signal and its Records list cannot drift apart
      const seen = new Set<string>();
      // (and the hospital's Signals of #86's recorded Overview, which this block does not ask again)
      const earlier = (JSON.parse(readFileSync(resolve(here, "../../contract/src/fixtures/recorded/EntityOverview.json"), "utf8")) as { name: string; data: EntityOverviewQuery }[]).filter((x) => x.name === "authority-with-signals");
      const shown = [
        ...earlier.map((x) => ({ archive: "signals" as const, rows: x.data.entity!.seap.role!.signals.rows })),
        ...RECORDED_SIGNAL_CASES.filter((x) => x.operation === "EntityOverview").map((c) => ({ archive: c.archive, rows: (answers.get(`EntityOverview/${c.name}`)!.data as EntityOverviewQuery).entity!.seap.role!.signals.rows })),
      ];
      for (const { archive, rows } of shown) {
        for (const s of rows) {
          const rc = reproduceCase(s, archive);
          const k = JSON.stringify(rc.variables);
          if (seen.has(k)) continue;
          seen.add(k);
          cases.push(rc);
          answers.set(`EntityRecords/${rc.name}`, await answer(rc));
        }
      }
    });
    const byOperation = (op: string) => cases.filter((c) => c.operation === op).map((c) => answers.get(`${op}/${c.name}`)!);

    it("every recorded case is what the API answers now", () => {
      for (const op of Object.keys(OPS)) {
        const recorded = byOperation(op);
        if (recorded.length === 0) continue;
        const file = join(dir, `${op}.json`);
        if (recording) {
          mkdirSync(dir, { recursive: true });
          writeFileSync(file, `${JSON.stringify(recorded, null, 2)}\n`);
        }
        // through JSON, so undefined and key order do not matter
        expect(JSON.parse(JSON.stringify(recorded)), op).toEqual(JSON.parse(readFileSync(file, "utf8")));
      }
    });

    it("asks no two cases the same question, also against the sets recorded by #83, #85, #86, #87 and #88 (the app's fixture client matches on variables)", () => {
      const sorted = (v: unknown): unknown => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => x.localeCompare(y)).map(([k, x]) => [k, sorted(x)])) : v);
      const recordedDir = resolve(here, "../../contract/src/fixtures/recorded");
      const earlier: Record<string, string[]> = {
        EntityOverview: ["EntityOverview"], EntityRecords: ["EntityRecords", "EntityRecordsSidePanel"], EntityRelationships: ["EntityRelationships"], MainScreen: ["MainScreen"], RecordPage: ["RecordPage"],
        FullResultsAuthorities: ["FullResultsAuthorities"], FullResultsSuppliers: ["FullResultsSuppliers"], FullResultsRecords: ["FullResultsRecords"], MethodologyBaseRates: [],
      };
      for (const op of Object.keys(OPS)) {
        const mine = byOperation(op).map((x) => JSON.stringify(sorted(x.variables)));
        const before = earlier[op]!.flatMap((f) => (JSON.parse(readFileSync(join(recordedDir, `${f}.json`), "utf8")) as { variables: unknown }[]).map((x) => JSON.stringify(sorted(x.variables))));
        if (op !== "MethodologyBaseRates") expect(new Set(mine).size, op).toBe(mine.length); // the base rates ask nothing: three archives, three named answers (the app serves one per test)
        expect(mine.filter((v) => before.includes(v)), `${op} asked again`).toEqual([]);
        expect(new Set(byOperation(op).map((x) => x.name)).size, `${op} names`).toBe(byOperation(op).length);
      }
    });

    const sig = (name: string) => (answers.get(`EntityOverview/${name}`)!.data as EntityOverviewQuery).entity!.seap.role!.signals;
    const records = (name: string) => (answers.get(`EntityRecords/${name}`)!.data as EntityRecordsQuery).entity!.seap.role!.records;
    const page = (name: string) => (answers.get(`RecordPage/${name}`)!.data as RecordPageQuery).seap.record!;
    const keysOf = (name: string) => sig(name).rows.map((x) => x.suppliers.map((y) => y.key).join("+"));

    it("gives each Overview the Signals it is named for, on every page they touch and never on a natural person (ADR 0003)", () => {
      const RON = (n: number) => String(n * 100);
      // the consortium (ALFA + BETA + GAMMA) of the no-publication Signal: the Signal is on the page of each member, whole
      expect(sig("consortium-member-supplier")).toMatchObject({ count: 1, rows: [{ rule: "NO_PUBLICATION", date: "2023-02-10", recordCount: 2, authority: { key: "1000017" } }] });
      expect(keysOf("consortium-member-supplier")).toEqual(["2000007+2000015+2000023"]);
      expect(sig("supplier-in-three-authorities-signals").count).toBe(5);
      expect(sig("supplier-in-three-authorities-signals").rows.map((x) => x.authority.key)).toEqual(["1000017", "2000031", "1000017", "1000017", "1000009"]);
      expect(sig("commune-with-signals").count).toBe(3);
      expect(sig("both-roles-authority-with-signal")).toMatchObject({ count: 1, rows: [{ rule: "OVER_CAP", authority: { key: "2000031" } }] });
      // splitting: purchases, CPV group and window, one supplier each; the supplier's page lists what the authority's does
      expect(sig("splitting-authority").rows.map((x) => x.numbers)).toEqual([
        expect.objectContaining({ __typename: "SplittingNumbers", purchases: 2, cpvGroup: "301", from: "2023-08-01", to: "2023-08-02" }),
        expect.objectContaining({ purchases: 3, from: "2023-03-01", to: "2023-04-08" }),
        expect.objectContaining({ purchases: 2, from: "2023-01-05", to: "2023-01-20" }),
      ]);
      expect(keysOf("splitting-authority")).toEqual(["2000023", "2000023", "2000007"]);
      expect(sig("splitting-supplier")).toMatchObject({ count: 2 });
      expect(sig("splitting-supplier-three-authorities").rows.map((x) => x.authority.key)).toEqual(["2000031", "1000017", "1000009"]);
      // framework-overrun: ceiling 1,000,000 RON, reported 1,250,000, ratio 1.25 (four Records: the ceiling and the first three subsequent contracts)
      expect(sig("framework-overrun-authority").rows[0]).toMatchObject({ rule: "FRAMEWORK_OVERRUN", recordCount: 4, date: "2023-03-05", firstDate: "2023-01-10", numbers: { __typename: "FrameworkOverrunNumbers", ceiling: RON(1_000_000), subsequent: RON(1_250_000), ratio: 1.25 } });
      expect(keysOf("framework-overrun-consortium-authority")[0]).toBe("2000007+2000015+2000023");
      expect(sig("framework-overrun-consortium-member").rows.map((x) => x.authority.key)).toEqual(["2000031", "1000009"]);
      expect(sig("framework-overrun-supplier").count).toBe(2);
      // no Signal names a supplier that is not an entity: a natural person has no page, so the Signal of a natural person's purchase names no supplier at all
      for (const x of cases.filter((c) => c.operation === "EntityOverview"))
        for (const row of sig(x.name).rows) for (const supplier of row.suppliers) expect(supplier.key, `${x.name} ${row.rule}`).toMatch(/^(\d+|name-.+|vat-.+)$/);
      const earlier = JSON.parse(readFileSync(resolve(here, "../../contract/src/fixtures/recorded/EntityOverview.json"), "utf8")) as { name: string; data: EntityOverviewQuery }[];
      const hospital = earlier.find((x) => x.name === "authority-with-signals")!.data.entity!.seap.role!.signals;
      expect(hospital.count).toBe(8);
      expect(hospital.rows.find((x) => x.date === "2023-02-03")).toMatchObject({ rule: "OVER_CAP", recordCount: 1, suppliers: [] }); // won by a natural person
    });

    it("lists, for each Signal an Overview shows, exactly its Records at its reproducing filter (the Records tab of its authority)", async () => {
      const signalsDoc = `query($key: ID!, $role: Role!) { entity(key: $key) { seap { role(role: $role) { signals(limit: 50) { rows { rule date firstDate recordCount reproduce { authority supplier signal cpv from to } records(limit: 100) { code } } } } } } }`;
      const pools2 = (db: string) => pools.find((p) => (p.options as { connectionString?: string }).connectionString === `${baseUrl}/${db}`)!;
      let checked = 0;
      const reproducing = cases.filter((x) => x.operation === "EntityRecords" && x.variables.role === "AUTHORITY");
      for (const c of reproducing) {
        const pool = pools2(DBS[c.archive]);
        const v = c.variables as { key: string; filter: { signal: string; from?: string; to?: string } };
        const r = await graphql({ schema, source: signalsDoc, rootValue: rootValue(postgresStore(pool)), variableValues: { key: v.key, role: "AUTHORITY" } });
        expect(r.errors, c.name).toBeUndefined();
        type Row = { rule: string; date: string; firstDate: string; recordCount: number; reproduce: Record<string, string | null>; records: { code: string }[] };
        const rows = (r.data as { entity: { seap: { role: { signals: { rows: Row[] } } } } }).entity.seap.role.signals.rows;
        // the Signal whose reproduce filter this case is
        const filterOf = (x: Row["reproduce"]) => JSON.stringify(Object.fromEntries(Object.entries({ signal: x.signal, supplier: x.supplier, cpv: x.cpv, from: x.from, to: x.to }).filter(([, y]) => y !== null).sort(([m], [n]) => m.localeCompare(n))));
        const mine = rows.filter((s) => filterOf(s.reproduce) === JSON.stringify(Object.fromEntries(Object.entries(v.filter).sort(([m], [n]) => m.localeCompare(n)))));
        expect(mine.length, c.name).toBe(1);
        const rec = records(c.name);
        expect(rec.records.rows.map((x) => x.record.code).sort(), c.name).toEqual(mine[0]!.records.map((x) => x.code).sort());
        expect(rec.records.count, c.name).toBe(mine[0]!.recordCount);
        checked++;
      }
      expect(checked).toBe(reproducing.length);
      expect(checked).toBeGreaterThanOrEqual(21);
    });

    it("gives the Record pages the Signals they are named for", () => {
      const over = page("over-cap-single-record-signal");
      expect(over.signals).toHaveLength(1);
      expect(over.signals[0]).toMatchObject({ rule: "OVER_CAP", recordCount: 1 });
      const ceiling = page("framework-overrun-ceiling");
      expect(ceiling).toMatchObject({ kind: "CONTRACT", framework: { ceiling: "100000000", subsequentReported: "125000000", ratio: 1.25 } });
      expect(ceiling.signals).toHaveLength(1);
      expect(ceiling.signals[0]).toMatchObject({ rule: "FRAMEWORK_OVERRUN", recordCount: 4, numbers: { ratio: 1.25 } });
      expect(ceiling.signals[0]!.records.map((r) => r.code).sort()).toEqual(["CAN9700001~1", "CAN9700001~2", "CAN9700001~3", "CAN9700001~4"]);
      expect(page("framework-overrun-subsequent-after-crossing").signals).toEqual([]); // reported after the crossing: in the ratio, not in the Signal
      expect(page("framework-overrun-consortium").signals[0]!.suppliers.map((x) => x.key)).toEqual(["2000007", "2000015", "2000023"]);
      expect(page("framework-overrun-single-record").signals[0]).toMatchObject({ recordCount: 1 });
    });

    it("answers the has-Signals chip end to end: every tab counts Records inside a Signal, the opposite chip the rest", () => {
      const main = (name: string) => (answers.get(`MainScreen/${name}`)!.data as MainScreenQuery).seap.search;
      const withS = main("has-signals-chip");
      const without = main("without-signals-chip");
      expect(withS.total).toMatchObject({ records: 14, awarded: "654832100" });
      expect(without.total).toMatchObject({ records: 10, awarded: "207012000" });
      expect(withS.records.count).toBe(14);
      expect(withS.records.rows.every((x) => x.record.signals.length > 0)).toBe(true); // every Record of the chip is in a Signal
      expect(without.records.rows.every((x) => x.record.signals.length === 0)).toBe(true);
      expect(withS.authorities.count).toBe(3);
      expect(withS.suppliers.count).toBe(4);
      const full = (op: string) => (answers.get(`${op}/has-signals-chip`)!.data as { seap: { search: { total: { records: number } } } }).seap.search.total.records;
      for (const op of ["FullResultsAuthorities", "FullResultsSuppliers", "FullResultsRecords"]) expect(full(op), op).toBe(14);
    });

    it("rings the counterparties whose Records are in a Signal, and only those", () => {
      const rows = (name: string) => (answers.get(`EntityRelationships/${name}`)!.data as EntityRelationshipsQuery).entity!.seap.role!.counterparties.rows;
      const ringed = (name: string) => rows(name).filter((r) => r.hasSignals).map((r) => r.entity?.key ?? "natural person").sort();
      // the hospital's 2023 suppliers: ALFA, BETA and GAMMA won Records inside Signals; the lumped natural-person row has an over-cap Signal too (it names nobody)
      expect(ringed("authority-counterparties-with-signals")).toEqual(["2000007", "2000015", "2000023", "natural person"]);
      // BETA's authorities: the hospital (Signals on its Records) is ringed, the both-roles entity's own purchase from BETA in 2023 is not
      expect(ringed("supplier-counterparties-with-signals")).toEqual(["1000017"]);
      expect(rows("supplier-counterparties-with-signals").find((r) => r.entity?.key === "2000031")).toMatchObject({ hasSignals: false });
    });

    it("answers each rule's base rate through signalRules, per archive (the methodology page shows them)", () => {
      const rates = (name: string) => Object.fromEntries((answers.get(`MethodologyBaseRates/${name}`)!.data as { signalRules: { slug: string; baseRate: number; baseRateYear: number; window: { from: string | null } }[] }).signalRules.map((r) => [r.slug, [r.baseRate, r.baseRateYear, r.window.from]]));
      expect(rates("signals-archive")).toEqual({ OVER_CAP: [2 / 3, 2023, "2022-01-01"], SPLITTING: [0, 2023, "2022-01-01"], FRAMEWORK_OVERRUN: [0, 2023, "2023-01-01"], NO_PUBLICATION: [1 / 3, 2023, "2021-01-01"] });
      expect(rates("splitting-archive")).toMatchObject({ SPLITTING: [1, 2022, "2022-01-01"], OVER_CAP: [0, 2022, "2022-01-01"] });
      expect(rates("framework-overrun-archive")).toMatchObject({ FRAMEWORK_OVERRUN: [1, 2023, "2021-01-01"] }); // the rule's 2021 floor, although a 2020 Contracte file is loaded
    });
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
