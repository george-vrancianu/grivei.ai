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
import type { EntityOverviewQuery, MainScreenQuery, RecordPageQuery } from "@grivei/contract";
import { createApi } from "../src/server.ts";
import { postgresStore } from "../src/store.ts";

const here = dirname(fileURLToPath(import.meta.url));
const watchdog = resolve(here, "../../../../watchdog");
const fixtureArchive = join(watchdog, "tests/fixtures/archive");
const bulkArchive = join(watchdog, "tests/fixtures/archive-bulk"); // DA + DAN: renamed headers, quirks, a quarantined file (#63)
const contractsArchive = join(watchdog, "tests/fixtures/archive-contracts"); // Contracte + "fara anunt": recurring contract, lots, winners (#64)
const identityArchive = join(watchdog, "tests/fixtures/archive-identity"); // every identity case, with archived ANAF answers (#66)
const identityOverrides = join(watchdog, "tests/fixtures/identity-overrides.toml");
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
const entityOverview = allowlist.operations.find((o) => o.name === "EntityOverview")!;
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
    cpSync(identityArchive, join(scratch, "archive-identity"), { recursive: true });
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
    await admin.query("CREATE DATABASE identity_a");
    await admin.query("CREATE DATABASE identity_b");
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
    expect(summed).toMatchObject({ value: "120025", counted: "120025" });
    expect(summed!.winners.map((w) => w.publishedName)).toEqual(["BETA CHIMIE SRL", "ALFA CHIMIE SRL"]);
    // a contract number that holds a slash, from the 2025 XLSX (numeric CUIs, a float amount)
    expect(await contractPage("contracts_a", "CAN9000010~1398514/1")).toMatchObject({
      kind: "CONTRACT", value: "28963700", authority: { key: "4267117" }, winners: [{ entity: { key: "name-uti-facility-sa" } }],
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
