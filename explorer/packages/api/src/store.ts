import pg from "pg";
import { buildWhere, cancellableQuery, type SearchFilter, type Where } from "./search.ts";
import { rollupPlan, rollupWhere } from "./rollup.ts";
import { roleStore, type RoleStore } from "./role.ts";
import type { SourceRow } from "./sources.ts";
import { signalStore, signalsOfRecords, type SignalRow, type SignalStore } from "./signals.ts";

/** One entity of the shared core (ADR 0003): a CUI, a foreign VAT id or a name, with where its name and status came from. */
export interface EntityRow {
  key: string;
  identity: "CUI" | "NAME_ONLY";
  displayName: string;
  cui: string | null;
  foreignVatId: string | null;
  /** ANAF's status (ACTIV, RADIERE, FUZIUNE ...); null when ANAF has no entry. */
  anafStatus: string | null;
  identityCurated: boolean;
  /** ANAF (the Reference source) when it has the CUI; ONRC when only ONRC lists it (ADR 0018); else SEAP. `via` is the SEAP file for a SEAP-named entity. */
  provenance: { source: "ANAF" | "SEAP" | "ONRC"; via: string | null; fetchedAt: string };
  /** Where it sits (core.placement, #67); null/absent when no source places it. */
  placement?: PlacementRow | null;
}

/** The basis of the public-enterprise mark: the AMEPIP list's row for the entity's CUI and the snapshot it came from (`amepip.*`, #183). */
export interface PublicEnterpriseRow {
  listedAs: string;
  registrationNumber: string | null;
  status: string | null;
  firstYear: number | null;
  lastYear: number | null;
  snapshot: string;
  url: string | null;
  via: string | null;
  license: string | null;
  fetchedAt: string;
}

/** One Mandate of a Leadership list (`aep.mandate`, #180). Dates are `YYYY-MM-DD`; the end is null while the mandate is still in force. */
export interface MandateRow {
  leaderName: string;
  list: string;
  independent: boolean;
  memberParties: string[];
  electionDate: string;
  basis: "FINAL_MINUTES" | "REPEAT_ROUND" | "PARTIAL_MINUTES";
  dataThrough: string;
  startDate: string;
  endDate: string | null;
}

export interface LeadershipGapRow {
  startDate: string;
  endDate: string | null;
  kind: "HANDOVER_WINDOW" | "INTERIM" | "NO_RESULTS";
}

/** For a subordinate body: the authority whose Leadership list it shows and the MF snapshot the tie rests on (`aep.subordinate`). */
export interface LeadershipViaRow {
  authority: string;
  authorityName: string;
  snapshotDate: string;
  snapshots: number;
}

/** An attributed authority's Mandates and gaps, or a subordinate body's authority's with the basis of the tie. */
export interface LeadershipRow {
  mandates: MandateRow[];
  gaps: LeadershipGapRow[];
  via: LeadershipViaRow | null;
}

/** The Party of a Record: the Mandate in force on its award date at its authority (or its principal credit holder). Never the leader's name. */
export interface RecordPartyRow {
  list: string;
  independent: boolean;
  memberParties: string[];
  electionDate: string;
  basis: MandateRow["basis"];
  dataThrough: string;
  via: LeadershipViaRow | null;
}

/** One fiscal year of an entity's MF statements, with the awards of the same calendar year as context (`financials.*` and `seap.rollup_entity`, #179). Money is bani as text; null = a blank cell. */
export interface FinancialYearRow {
  fiscalYear: number;
  revision: "FIRST" | "REVISED";
  /** The newest fiscal year MF's files hold (for any company). */
  newest: boolean;
  turnover: string | null;
  profitOrLoss: string | null;
  debts: string | null;
  equity: string | null;
  averageEmployees: number | null;
  /** The supplier's awarded value (the stored counting rule) of the Records awarded in this calendar year; "0" when none. */
  awardedInYear: string;
  source: { file: string; datasetUrl: string | null; fileUrl: string | null; via: string | null; license: string | null; published: string | null; fetchedAt: string };
}

/** A Reference source as the methodology page names it: when the held list was published (null when none is held). */
export interface ReferenceSourceRow {
  id: string;
  name: string;
  dataThrough: string | null;
  /** The newest fiscal year held, for a source published by fiscal year (MF's financial statements); null otherwise. */
  fiscalYear: number | null;
  url: string | null;
}

/** core.placement joined to its county and UAT names. A national authority keeps its seat here; the API serves none of it. */
export interface PlacementRow {
  countyIso: string | null;
  countyName: string | null;
  uat: { siruta: string; name: string } | null;
  /** The village's SIRUTA when ANAF or SEAP named one: stored, not plotted. */
  villageSiruta: string | null;
  national: boolean;
  placedBy: "ANAF" | "SEAP" | "ONRC";
}

/** The ONRC registration under an entity's CUI (`onrc.registration`) with the history derived from the held snapshots (ADR 0018). */
export interface OnrcRegistrationRow {
  registrationNumber: string;
  registrationDate: string | null;
  legalForm: string | null;
  statuses: { code: number; name: string | null; firstSeen: string; sinceAtLeast: boolean }[];
  caen: { code: string; version: number | null }[];
  seat: { county: string | null; locality: string | null; address: string | null; postalCode: string | null };
  aliases: { name: string; firstSeen: string; lastSeen: string; sinceAtLeast: boolean; current: boolean }[];
  /** The snapshot the registration comes from. */
  snapshot: string;
  /** The snapshot dataset's public page, its title as ONRC gives it, and when we fetched it. */
  provenance: { url: string | null; via: string | null; fetchedAt: string };
}

/** A county of core.county: ISO 3166-2:RO without `RO-` (Bucharest is `B`) and its Romanian name. */
export interface CountyRow {
  iso: string;
  name: string;
}

/** A UAT of core.uat (Bucharest's UATs are its six sectors). */
export interface UatRow {
  siruta: string;
  name: string;
  county: CountyRow;
}

/** A spelling an entity was published under (core.alias). */
export interface AliasRow {
  name: string;
  records: number;
  first: string;
  last: string;
  differsFromAnaf: boolean;
}

/** A winner on a Record. A natural person has no entity and no name: nothing about them is in the graph. */
export interface WinnerRow {
  naturalPerson: boolean;
  /** The spelling as published on this Record (an alias of the entity); null for a natural person. */
  name: string | null;
  entity: EntityRow | null;
  /** The winner's equal share of the value in bani, as the rebuild decided it (counting rule); null for a sole winner or a Record with no value. */
  share: string | null;
}

/** What the API reads from the graph. The tracer serves the SEAP total and Records list for the empty filter. */
export interface RecordRow {
  code: string;
  title: string;
  date: string;
  kind: "DA" | "DAN" | "CONTRACT" | "AWARD_NOTICE";
  channel: "DIRECT_PURCHASE" | "CONTRACT";
  procedure: string | null;
  value: string | null;
  /** What the Record adds to a sum, decided by the counting rule at rebuild (null: no value, suspect, or a framework ceiling). */
  counted: string | null;
  authority: EntityRow;
  /** In their published order. A DA or DAN has one; a contract or award notice has all of its winners. */
  winners: WinnerRow[];
  /** The badges the rebuild put on it: the counting rule's (FRAMEWORK_CEILING, SUBSEQUENT_CONTRACT, CONSORTIUM_SHARE, SUSPECT_VALUE, NO_VALUE) and the identity ones (CUI_MISMATCH, NAME_DIFFERS_FROM_ANAF, IDENTITY_CURATED). */
  badges: string[];
  /** Why the value is suspect (the published rule and its threshold in bani); null when it is not. */
  suspect: { rule: "DIRECT_PURCHASE_10X_CAP" | "CONTRACT_100X_ESTIMATE" | "CONTRACT_OVER_50BN"; threshold: string | null } | null;
  /** Crawled Records the bulk has not superseded: PROVISIONAL (its quarter has no bulk yet) or CRAWL_ONLY (the bulk has the quarter, not this Record). Null for a bulk Record. */
  crawlStatus: "PROVISIONAL" | "CRAWL_ONLY" | null;
  /** How we obtained it: BULK (a published file, `via` its title as the Source gives it) or CRAWL (`via` null); when we fetched it (ISO, UTC, from the archive); `url` is the public page a crawled Record had built at load time (null for a bulk Record: its link is the /source/seap redirect, added by the resolver). */
  provenance: { kind: "BULK" | "CRAWL"; via: string | null; fetchedAt: string; url: string | null };
  /** The texts as the Source published them (the authority's name and the CPV), which the search document is built from: what "why it matched" highlights (#69). Absent on a stand-in row. */
  published?: { authorityName: string | null; cpvCode: string | null; cpvDescription: string | null };
  /** The Signals it belongs to (#74), latest first; absent on a stand-in row. */
  signals?: SignalRow[];
  /**
   * Set by `searchRecords` only, when the filter is a supplier-side county (#103): the summed shares of the winners in that area, taken from the same
   * rows as `searchTotal` (bani, null when none has a share). The resolver decides whether it is shown (several winners, a supplier-side county filter).
   */
  areaShare?: string | null;
}

/** One Record for its page: the list row plus what only the page shows. */
export interface RecordDetail extends RecordRow {
  /** CEILING (a framework agreement's own contract) or SUBSEQUENT (a contract awarded under one); null for any other Record. */
  frameworkRole: "CEILING" | "SUBSEQUENT" | null;
  contractType: string | null;
  cpv: { code: string; description: string } | null;
}

/** The numbers of one Total. `awarded` sums the stored `counted` and nothing else; the rest say what it left out. */
export interface TotalRow {
  awarded: string;
  records: number;
  suspectLeftOut: number;
  noValue: number;
  /** The sum of the framework ceilings in the set (shown beside the Total, never added to it). */
  frameworkCeilings: string;
}

/** One map area of the Coverage lens (a county as `RO-BV`, or `NATIONAL`) in a window: N of M public entities and the other authorities (#80). */
export interface CoverageAreaRow {
  area: string;
  /** N: MF entities of the area with at least one SEAP Record in the window. */
  withRecords: number;
  /** M: MF entities of the area (a national authority is in NATIONAL, not in the county MF files it under). */
  publicEntities: number;
  /** Authorities with a Record in the window that are not on the MF list, by our placement. */
  otherAuthorities: number;
}

/** One cell of the Coverage grid, as the rebuild stored it. `quarter` is `2024-Q4`; state and rule are the contract's GapState and GapRule. */
export interface GapCellRow {
  quarter: string;
  kind: string;
  state: string;
  rule: string | null;
  note: string | null;
  records: number;
  /** Of `records`, the crawl-only ones (#60/#90). */
  crawlOnly: number;
  dataThrough: string | null;
}

/** A framework agreement as seen from one of its Records: the notice's ceiling and what its subsequent contracts reported so far. */
export interface FrameworkRow {
  /** The award notice the subsequent contracts and the agreement's own contracts share. */
  noticeCode: string;
  /** The agreement Record, for a subsequent contract whose agreement is loaded; null on the agreement itself and when it is not loaded. */
  agreement: RecordRow | null;
  /** The sum of the notice's framework ceilings; null when they are blank. */
  ceiling: string | null;
  subsequentReported: string;
  /** subsequentReported / ceiling; null when the ceiling is blank. */
  ratio: number | null;
}

/** One row of an entity tab: the entity and what it matched (consortium shares summed on the supplier side). */
export interface EntityHit {
  entity: EntityRow;
  matched: TotalRow;
}

export interface EntityPage {
  /** Distinct entities in the matching set: exact below the group limit, a HyperLogLog estimate above. */
  count: number;
  estimated: boolean;
  rows: EntityHit[];
}

/** One area of the Money lens: its Total and the distinct entities behind it on the lens's side. */
export interface AreaRow {
  /** A county code (`RO-BV`), or a UAT's SIRUTA on the zoomed county. */
  area: string;
  total: TotalRow;
  entities: number;
}

/** The Money lens of a matching set: every group of the lens's side, the off-map ones apart. Groups with no Record are absent. */
export interface MoneyMapRow {
  /** Counties with Records, by code. */
  counties: AreaRow[];
  /** Authorities flagged national (authority side); zero on the supplier side. */
  national: TotalRow;
  /** Authority side: authorities no source places, and what they account for; null when none match. */
  unplaced: { authorities: number; total: TotalRow } | null;
  /** Supplier side: winners with no county of their own; null when none match. */
  unknownSupplierCounty: TotalRow | null;
}

/** The zoomed county: its UATs with Records (name from the UAT table) and the Records of authorities with a county but no UAT. */
export interface UatMapRow {
  uats: (AreaRow & { name: string })[];
  unknownUat: TotalRow | null;
}

/** Options every search statement takes: `signal` aborts (the client disconnected) and cancels the running statement on the server. */
export interface SearchOptions {
  signal?: AbortSignal;
}

export type RecordOrderKey = "VALUE_DESC" | "DATE_DESC" | "DATE_ASC";

export interface Store extends RoleStore, SignalStore {
  total(): Promise<TotalRow>;
  records(page: { limit: number; offset: number; order: RecordOrderKey }): Promise<RecordRow[]>;
  /** A Record by its public code (DA, DAN, `<award notice>~<contract number>`, award notice), or null. */
  record(code: string): Promise<RecordDetail | null>;
  /** The framework link of a framework or subsequent Record (by its code), or null for any other Record. */
  framework(code: string): Promise<FrameworkRow | null>;
  /** The subsequent contracts reported under an award notice's framework, largest first. */
  subsequent(noticeCode: string, page: { limit: number; offset: number }): Promise<RecordRow[]>;
  /** The `sources` registry the last rebuild stored (`core.source`), in registry order. */
  sources(): Promise<SourceRow[]>;
  /** Per SEAP record kind, the latest publication date loaded; for the crawled kinds (CONTRACT, AWARD_NOTICE) at least the crawl cursor. */
  dataThrough(): Promise<{ kind: string; date: string }[]>;
  /** The SEAP Coverage grid the last rebuild stored (`seap.coverage_cell`), oldest quarter first, kinds in contract order. */
  coverageGrid(): Promise<GapCellRow[]>;
  /** N, M and the other authorities for every county and NATIONAL (in `counties()` order, NATIONAL last), for the Records dated in the window. */
  coverageAreas(window: { from: string | null; to: string | null }): Promise<CoverageAreaRow[]>;
  /** Authorities with a Record in the window that no source places (not in `core.placement`, MF's county notwithstanding), and what they account for. */
  unplacedAuthorities(window: { from: string | null; to: string | null }): Promise<{ authorities: number; total: TotalRow }>;
  /** The date of the MF list the last rebuild loaded, or null when none was. */
  referenceSnapshot(): Promise<string | null>;
  /** The ONRC registration under a CUI (the entity page's ONRC section), or null when ONRC lists none. */
  onrc(cui: string): Promise<OnrcRegistrationRow | null>;
  /** The date of the newest ONRC snapshot read: ONRC's data-through date per record kind (REGISTRATION). */
  onrcDataThrough(): Promise<{ kind: string; date: string }[]>;
  /** The Total of the matching set: matched RON is the sum of the winners' shares. */
  searchTotal(filter: SearchFilter, options?: SearchOptions): Promise<TotalRow>;
  /** The Money lens of the matching set, on the side the filter's `countySide` names (the filter is not narrowed by the lens). */
  searchMap(side: "AUTHORITY" | "SUPPLIER", filter: SearchFilter, options?: SearchOptions): Promise<MoneyMapRow>;
  /** The zoomed county (ISO code with `RO-`): the matching set's authority side, by UAT. */
  searchUatMap(county: string, filter: SearchFilter, options?: SearchOptions): Promise<UatMapRow>;
  /** An entity tab ranked by matched RON (ties by key), top `limit` from `offset`. */
  searchEntities(side: "AUTHORITY" | "SUPPLIER", filter: SearchFilter, page: { limit: number; offset: number }, options?: SearchOptions): Promise<EntityPage>;
  /** The Records tab: each matching Record once. */
  searchRecords(filter: SearchFilter, page: { limit: number; offset: number; order: RecordOrderKey }, options?: SearchOptions): Promise<{ count: number; rows: RecordRow[] }>;
  /**
   * The Go-to entity of a folded query (the `fold` of the reader's text): the one entity whose CUI is the query (a single
   * number) or whose folded name is the query, and null when none or more than one does (#69).
   */
  goTo(qFolded: string, options?: SearchOptions): Promise<EntityRow | null>;
  /** An entity by its URL key (a CUI, `vat-<id>`, `name-<slug>` or a pinned key), or null. */
  entity(key: string): Promise<EntityRow | null>;
  /** Its spellings, most used first. */
  aliases(key: string): Promise<AliasRow[]>;
  /** The AMEPIP list's row for a CUI (the entity's key), or null when the CUI is not on the list or no list is held (#183). */
  publicEnterprise(cui: string): Promise<PublicEnterpriseRow | null>;
  /** MF's annual statements for a CUI, newest year first, each with the awards of that calendar year as the entity's supplier role (`key` is its entity key); empty when MF holds none (#179). */
  financials(cui: string, key: string): Promise<FinancialYearRow[]>;
  /** The Reference sources held, each with its data-through date (#183). */
  referenceSources(): Promise<ReferenceSourceRow[]>;
  /** The Leadership list of an entity that is an attributed authority or a subordinate body; null for every other entity (never a supplier, #180). */
  leadership(key: string): Promise<LeadershipRow | null>;
  /** The Party of a SEAP Record (the Mandate in force on its award date), or null: no attributed authority, or a gap. */
  recordParty(code: string): Promise<RecordPartyRow | null>;
  /** SEAP roles it has: AUTHORITY if it ever bought, SUPPLIER if it ever won. */
  roles(key: string): Promise<("AUTHORITY" | "SUPPLIER")[]>;
  /** Every county, by ISO code. */
  counties(): Promise<CountyRow[]>;
  /** The UATs of a county (ISO code without `RO-`), by folded name; Bucharest's are its six sectors. */
  uats(countyIso: string): Promise<UatRow[]>;
}

// Fixed strings, never built from input. Ties break on the public code so a page is stable.
const ORDER: Record<RecordOrderKey, string> = {
  VALUE_DESC: "value_bani DESC NULLS LAST, code",
  DATE_DESC: "award_date DESC, code",
  DATE_ASC: "award_date ASC, code",
};

interface WinnerJson {
  name?: string | null;
  key?: string | null;
  naturalPerson?: boolean;
  share?: string | null;
}

function winnersOf(value: unknown): WinnerJson[] {
  return Array.isArray(value) ? (value as WinnerJson[]) : [];
}

// A key that is all digits is a CUI; anything else (`vat-`, `name-`, a pinned key) is a name-only entity.
const identityOfKey = (key: string): EntityRow["identity"] => (/^[0-9]+$/.test(key) ? "CUI" : "NAME_ONLY");

/** The entity a Record names, or a stand-in made from the Record's own text if the core has no row for it (it always does after a rebuild). */
function fallbackEntity(key: string, name: string | null, fetchedAt: string): EntityRow {
  const identity = identityOfKey(key);
  return {
    key,
    identity,
    displayName: name ?? key,
    cui: identity === "CUI" ? key : null,
    foreignVatId: null,
    anafStatus: null,
    identityCurated: false,
    provenance: { source: "SEAP", via: null, fetchedAt },
  };
}

interface RawEntity {
  key: string;
  identity: "CUI" | "NAME_ONLY";
  cui: string | null;
  foreign_vat_id: string | null;
  display_name: string;
  anaf_status: string | null;
  identity_curated: boolean;
  provenance_source: "ANAF" | "SEAP" | "ONRC";
  provenance_via: string | null;
  fetched_at: string;
}

interface RawPlacement {
  entity_key: string;
  county_iso: string | null;
  county_name: string | null;
  uat_siruta: string | null;
  uat_name: string | null;
  village_siruta: string | null;
  national: boolean;
  placed_by: "ANAF" | "SEAP" | "ONRC";
}

const ENTITY_COLUMNS = `key, identity, cui, foreign_vat_id, display_name, anaf_status, identity_curated, provenance_source, provenance_via,
  to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS fetched_at`;

const toEntity = (r: RawEntity): EntityRow => ({
  key: r.key,
  identity: r.identity,
  displayName: r.display_name,
  cui: r.cui,
  foreignVatId: r.foreign_vat_id,
  anafStatus: r.anaf_status,
  identityCurated: r.identity_curated,
  provenance: { source: r.provenance_source, via: r.provenance_via, fetchedAt: r.fetched_at },
});

interface RawRecord {
  code: string;
  title: string;
  date: string;
  kind: RecordRow["kind"];
  channel: RecordRow["channel"];
  procedure: string | null;
  value: string | null;
  counted: string | null;
  authority_key: string | null;
  authority_name: string;
  cpv_code?: string | null;
  cpv_description?: string | null;
  winners: unknown;
  badges: string[];
  suspect_rule: NonNullable<RecordRow["suspect"]>["rule"] | null;
  suspect_threshold: string | null;
  crawl_status: RecordRow["crawlStatus"];
  record_via: string | null;
  url: string | null;
  source_file_id: number;
}

/** The date window of the Coverage figures ($1 = from, $2 = to, either may be null): Records by `award_date`, as search does. One place for the "follows the date chip" contract. */
const WINDOW_SQL = "($1::date IS NULL OR award_date >= $1::date) AND ($2::date IS NULL OR award_date <= $2::date)";

const RECORD_COLUMNS = `code, title, award_date::text AS date, kind, channel, procedure, value_bani::text AS value, counted_bani::text AS counted,
  authority_key, authority_name, winners, badges, suspect_rule, suspect_threshold_bani::text AS suspect_threshold, crawl_status,
  via AS record_via, url, source_file_id, cpv_code, cpv_description`;

/** The area key of the authorities with a county but no UAT (their `authority_uat` is null). */
const NO_UAT = "";

const zeroTotalRow = (): TotalRow => ({ awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" });

export interface PostgresStoreOptions {
  /** Distinct-entity counts are exact up to this many groups and a HyperLogLog estimate above (pg_search's group cap is 65,000). */
  exactGroupLimit?: number;
  /** Serve the empty and chips-only states from the rollup (default). `false` forces the full scan: the tests compare the two. */
  rollup?: boolean;
}

const SEARCH_ORDER: Record<RecordOrderKey, string> = {
  VALUE_DESC: "value_bani DESC NULLS LAST, record_code",
  DATE_DESC: "award_date DESC, record_code",
  DATE_ASC: "award_date ASC, record_code",
};

// What one entity tab groups on. Fixed strings.
const SIDE_KEY = { AUTHORITY: "authority_key", SUPPLIER: "supplier_key" } as const;

/** The most buckets one terms aggregation may return (Tantivy's `search.max_term_agg_buckets` default). */
const AGG_BUCKET_CAP = 65_000;

/** A missing table (42P01, undefined_table) means "nothing loaded yet": an empty result. Any other failure is thrown on (cf. cache.ts). */
function noTable(e: unknown): { rows: never[] } {
  if ((e as { code?: string }).code === "42P01") return { rows: [] };
  throw e;
}

export function postgresStore(pool: pg.Pool, { exactGroupLimit = 65_000, rollup = true }: PostgresStoreOptions = {}): Store {
  /** The entities of `keys`, one query. */
  async function entitiesOf(keys: string[]): Promise<Map<string, EntityRow>> {
    if (!keys.length) return new Map();
    const { rows } = await pool.query(`SELECT ${ENTITY_COLUMNS} FROM core.entity WHERE key = ANY($1)`, [keys]);
    const entities = new Map((rows as RawEntity[]).map((r) => [r.key, toEntity(r)]));
    const placed = await pool.query(
      `SELECT p.entity_key, p.county_iso, c.name AS county_name, p.uat_siruta, u.name AS uat_name, p.village_siruta, p.national, p.placed_by
         FROM core.placement p LEFT JOIN core.county c ON c.iso = p.county_iso LEFT JOIN core.uat u ON u.siruta = p.uat_siruta
        WHERE p.entity_key = ANY($1)`,
      [keys],
    );
    for (const p of placed.rows as RawPlacement[]) {
      const entity = entities.get(p.entity_key);
      if (entity) {
        entity.placement = {
          countyIso: p.county_iso,
          countyName: p.county_name,
          uat: p.uat_siruta && p.uat_name ? { siruta: p.uat_siruta, name: p.uat_name } : null,
          villageSiruta: p.village_siruta,
          national: p.national,
          placedBy: p.placed_by,
        };
      }
    }
    return entities;
  }

  /** Attach authority and winner entities to raw Record rows (one entity query for the whole page). */
  async function rowsOf(raw: RawRecord[]): Promise<RecordRow[]> {
    const parsed = raw.map((r) => ({ r, winners: winnersOf(r.winners) }));
    const keys = new Set<string>();
    for (const { r, winners } of parsed) {
      if (r.authority_key) keys.add(r.authority_key);
      for (const w of winners) if (w.key) keys.add(w.key);
    }
    const entities = await entitiesOf([...keys]);
    // provenance: the archive file each Record came from, one query for the page's files
    const fileIds = [...new Set(raw.map((r) => r.source_file_id))];
    const files = new Map<number, { via: string | null; fetchedAt: string }>();
    if (fileIds.length) {
      const found = await pool.query(
        `SELECT id, via, to_char(fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS fetched_at FROM seap.source_file WHERE id = ANY($1)`,
        [fileIds],
      );
      for (const f of found.rows) files.set(f.id, { via: f.via, fetchedAt: f.fetched_at });
    }
    const signals = await signalsOfRecords(pool, raw.map((r) => r.code), entitiesOf);
    const now = new Date().toISOString();
    const fileOf = (id: number) => {
      const f = files.get(id);
      if (!f) throw new Error(`seap.source_file ${id} is missing`); // provenance is never invented
      return f;
    };
    return parsed.map(({ r, winners }) => ({
      code: r.code,
      title: r.title,
      date: r.date,
      kind: r.kind,
      channel: r.channel,
      procedure: r.procedure,
      value: r.value,
      counted: r.counted,
      authority: (r.authority_key && entities.get(r.authority_key)) || fallbackEntity(r.authority_key ?? `name-${(r.authority_name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unnamed"}`, r.authority_name, now),
      winners: winners.map((w) => ({
        naturalPerson: w.naturalPerson === true,
        name: w.naturalPerson === true ? null : (w.name ?? null),
        entity: w.naturalPerson === true || !w.key ? null : (entities.get(w.key) ?? fallbackEntity(w.key, w.name ?? null, now)),
        share: w.share ?? null,
      })),
      badges: r.badges ?? [],
      suspect: r.suspect_rule ? { rule: r.suspect_rule, threshold: r.suspect_threshold } : null,
      crawlStatus: r.crawl_status ?? null,
      published: { authorityName: r.authority_name ?? null, cpvCode: r.cpv_code ?? null, cpvDescription: r.cpv_description ?? null },
      signals: signals.get(r.code) ?? [],
      provenance: {
        kind: r.record_via === "CRAWL" ? "CRAWL" : "BULK",
        via: fileOf(r.source_file_id).via,
        fetchedAt: fileOf(r.source_file_id).fetchedAt,
        url: r.url,
      },
    }));
  }

  /**
   * A Total counted on each Record's first winner row (the authority side, winners not restricted), per area when `areaCol` is given.
   * pg_search pushes a `count(*) FILTER (WHERE ...)` down to the index as a filter sub-aggregation of its own, and on the full load those
   * outgrow the aggregation's memory budget (`MemoryExceeded`). So the index groups on bare columns (an expression would stop the pushdown)
   * and Postgres folds the few groups: `count(value_bani)` counts the rows with a value, the rest have none. `areaOut` is the outer area
   * expression (the zoomed county maps a null UAT to NO_UAT there, outside the pushed-down grouping).
   */
  function firstRowTotalsSql(w: Where, areaCol?: string, areaOut = "area"): string {
    const inner = areaCol ? `${areaCol} AS area, ` : "";
    const byArea = areaCol ? `${areaCol}, ` : "";
    return `SELECT ${areaCol ? `${areaOut} AS area, ` : ""}coalesce(sum(sh), 0)::text AS awarded, coalesce(sum(n) FILTER (WHERE pos = 1), 0)::int AS records,
                   coalesce(sum(n) FILTER (WHERE pos = 1 AND suspect), 0)::int AS suspect_left_out,
                   coalesce(sum(n - with_value) FILTER (WHERE pos = 1), 0)::int AS no_value,
                   coalesce(sum(ceil) FILTER (WHERE pos = 1), 0)::text AS framework_ceilings
              FROM (SELECT ${inner}winner_position AS pos, suspect, sum(share_bani) AS sh, count(*) AS n, count(value_bani) AS with_value, sum(ceiling_bani) AS ceil
                      FROM seap.search WHERE ${w.sql} GROUP BY ${byArea}winner_position, suspect) g${areaCol ? ` GROUP BY 1 ORDER BY 1` : ""}`;
  }

  /**
   * One Total and one distinct-entity count per value of `areaCol`. The counting rule is not applied here, only summed (see searchTotal):
   * - authority side, winners not restricted: every matching row's share sums to the Record's counted value, the Record is counted on its first row;
   * - otherwise (the supplier side, or the filter restricts the winners): each (area, Record) once, with the shares of the winners that matched.
   *   A Record whose winners sit in two counties therefore adds a share to each; the shares were split exactly at the rebuild (the odd bani to the first winner).
   *   So on the supplier side a Record's `records` count is per county touched (the counts can sum to more than the set's total; the awarded shares are exact),
   *   and a framework agreement shows its whole ceiling in every county its winners touch (`max(ceiling_bani)` per area and Record; ceilings are shown, never summed).
   */
  async function areaTotals(w: Where, areaCol: string, entityCol: string, grouped: boolean, signal: AbortSignal | undefined): Promise<AreaRow[]> {
    const area = areaCol === "authority_uat" ? `coalesce(${areaCol}, '${NO_UAT}')` : areaCol;
    const totals = await cancellableQuery<{ area: string; awarded: string; records: number; suspect_left_out: number; no_value: number; framework_ceilings: string }>(
      pool, signal,
      grouped
        ? `SELECT area, coalesce(sum(sh), 0)::text AS awarded, count(*)::int AS records, (count(*) FILTER (WHERE suspect))::int AS suspect_left_out,
                  (count(*) FILTER (WHERE no_value))::int AS no_value, coalesce(sum(ceil), 0)::text AS framework_ceilings
             FROM (SELECT ${area} AS area, record_code, sum(share_bani) AS sh, bool_or(suspect) AS suspect, bool_or(value_bani IS NULL) AS no_value, max(ceiling_bani) AS ceil
                     FROM seap.search WHERE ${w.sql} GROUP BY ${area}, record_code) g
            GROUP BY area ORDER BY area`
        : firstRowTotalsSql(w, areaCol, areaCol === "authority_uat" ? `coalesce(area, '${NO_UAT}')` : "area"),
      w.params,
    );
    const entities = await cancellableQuery<{ area: string; n: number }>(
      pool, signal, `SELECT ${area} AS area, count(DISTINCT ${entityCol})::int AS n FROM seap.search WHERE ${w.sql} GROUP BY ${area}`, w.params,
    );
    const n = new Map(entities.rows.map((r) => [r.area, r.n]));
    return totals.rows.map((r) => ({ area: r.area, total: totalOf(r), entities: n.get(r.area) ?? 0 }));
  }

  const totalOf = (r: { awarded: string; records: number; suspect_left_out: number; no_value: number; framework_ceilings: string }): TotalRow => ({
    awarded: r.awarded, records: r.records, suspectLeftOut: r.suspect_left_out, noValue: r.no_value, frameworkCeilings: r.framework_ceilings,
  });

  const searchTotal: Store["searchTotal"] = async (filter, { signal } = {}) => {
      const plan = rollup ? rollupPlan(filter) : null;
      if (plan) {
        const params: unknown[] = [];
        const where = rollupWhere(plan, params);
        const r = await cancellableQuery<Parameters<typeof totalOf>[0]>(
          pool, signal,
          `SELECT coalesce(sum(awarded), 0)::text AS awarded, coalesce(sum(records), 0)::int AS records, coalesce(sum(suspect_left_out), 0)::int AS suspect_left_out,
                  coalesce(sum(no_value), 0)::int AS no_value, coalesce(sum(framework_ceilings), 0)::text AS framework_ceilings
             FROM seap.rollup_cube WHERE ${where}`,
          params,
        );
        return totalOf(r.rows[0]!);
      }
      const w = buildWhere(filter);
      // Matched RON = the winners' shares that matched. A Record counts once: on its first winner's row, or, when the filter
      // restricts the winners (it can then match on several rows, or not on the first), once per Record after grouping.
      const sql = w.winnerSide
        ? `SELECT coalesce(sum(sh), 0)::text AS awarded, count(*)::int AS records, (count(*) FILTER (WHERE suspect))::int AS suspect_left_out,
                  (count(*) FILTER (WHERE no_value))::int AS no_value, coalesce(sum(ceil), 0)::text AS framework_ceilings
             FROM (SELECT record_code, sum(share_bani) AS sh, bool_or(suspect) AS suspect, bool_or(value_bani IS NULL) AS no_value, max(ceiling_bani) AS ceil
                     FROM seap.search WHERE ${w.sql} GROUP BY record_code) g`
        : firstRowTotalsSql(w);
      return totalOf((await cancellableQuery<Parameters<typeof totalOf>[0]>(pool, signal, sql, w.params)).rows[0]!);
  };

  return {
    ...roleStore({ pool, entitiesOf, rowsOf: (raw) => rowsOf(raw as RawRecord[]), recordColumns: RECORD_COLUMNS, fallbackEntity }),
    ...signalStore({ pool, entitiesOf, rowsOf: (raw) => rowsOf(raw as RawRecord[]), recordColumns: RECORD_COLUMNS }),
    searchTotal,
    async searchEntities(side, filter, { limit, offset }, { signal } = {}) {
      const plan = rollup ? rollupPlan(filter) : null;
      if (plan) {
        // the rollup holds every entity's numbers per chip cell: one exact GROUP BY, ordered as the scan orders (matched RON, then key)
        const params: unknown[] = [side];
        const where = rollupWhere(plan, params);
        type Row = Parameters<typeof totalOf>[0] & { key: string; n: number };
        const sql = `SELECT entity_key AS key, coalesce(sum(awarded), 0)::text AS awarded, sum(records)::int AS records, sum(suspect_left_out)::int AS suspect_left_out,
                            sum(no_value)::int AS no_value, coalesce(sum(framework_ceilings), 0)::text AS framework_ceilings, count(*) OVER ()::int AS n
                       FROM seap.rollup_entity WHERE side = $1 AND ${where}
                      GROUP BY entity_key ORDER BY sum(awarded) DESC NULLS LAST, entity_key LIMIT ${limit} OFFSET ${offset}`;
        const r = await cancellableQuery<Row>(pool, signal, sql, params);
        let count = r.rows[0]?.n ?? 0;
        if (!r.rows.length && offset > 0) {
          count = (await cancellableQuery<{ n: number }>(pool, signal, `SELECT count(DISTINCT entity_key)::int AS n FROM seap.rollup_entity WHERE side = $1 AND ${where}`, params)).rows[0]!.n;
        }
        const entities = await entitiesOf(r.rows.map((x) => x.key));
        const now = new Date().toISOString();
        return { count, estimated: false, rows: r.rows.map((x) => ({ entity: entities.get(x.key) ?? fallbackEntity(x.key, null, now), matched: totalOf(x) })) };
      }
      const w = buildWhere(filter);
      const key = SIDE_KEY[side];
      // 1. how many distinct entities: a HyperLogLog estimate, cheap and inside the index
      const card = await cancellableQuery(pool, signal, `SELECT pdb.agg('{"cardinality":{"field":"${key}"}}'::jsonb) AS c FROM seap.search WHERE ${w.sql}`, w.params);
      const estimate = Math.round(Number((card.rows[0]!.c as { value: number }).value));
      let ranked: { key: string; awarded: string }[] | null = null;
      let count = estimate;
      let estimated = false;
      if (estimate <= exactGroupLimit) {
        try {
          // 2a. exact: the pushed-down GROUP BY, ordered by matched RON then key; the window count is the exact number of groups
          const r = await cancellableQuery<{ key: string; awarded: string; n: number }>(
            pool, signal,
            `SELECT ${key} AS key, coalesce(sum(share_bani), 0)::text AS awarded, count(*) OVER ()::int AS n
               FROM seap.search WHERE ${w.sql} AND ${key} @@@ pdb.exists()
              GROUP BY ${key} ORDER BY sum(share_bani) DESC NULLS LAST, ${key} LIMIT ${limit} OFFSET ${offset}`,
            w.params,
          );
          ranked = r.rows;
          if (r.rows.length) count = r.rows[0]!.n;
          else if (offset > 0) {
            const c = await cancellableQuery<{ n: number }>(
              pool, signal, `SELECT count(*)::int AS n FROM (SELECT ${key} FROM seap.search WHERE ${w.sql} AND ${key} @@@ pdb.exists() GROUP BY ${key}) g`, w.params,
            );
            count = c.rows[0]!.n;
          } else count = 0;
        } catch (e) {
          // the estimate was low and the group cap was hit: fall through to the estimated path
          if (!/max_term_agg_buckets/.test(String((e as Error).message))) throw e;
          ranked = null;
        }
      }
      if (!ranked) {
        // 2b. above the group limit: the top groups by matched RON from the index's terms aggregation, the count a HyperLogLog estimate
        estimated = true;
        count = estimate;
        // past the index's bucket cap there is nothing to page to: an empty page, not an error (the cap is Tantivy's default, 65,000)
        if (offset + limit + 1 > AGG_BUCKET_CAP) return { count, estimated, rows: [] };
        const spec = { terms: { field: key, size: offset + limit + 1, order: { s: "desc" } }, aggs: { s: { sum: { field: "share_bani" } } } };
        const r = await cancellableQuery(pool, signal, `SELECT pdb.agg($${w.params.length + 1}::jsonb) AS t FROM seap.search WHERE ${w.sql}`, [...w.params, JSON.stringify(spec)]);
        const buckets = (r.rows[0]!.t as { buckets: { key: string | null; s: { value: number } }[] }).buckets;
        ranked = buckets
          .filter((b): b is { key: string; s: { value: number } } => b.key !== null) // a natural person has no key: the terms aggregation reports them as a null bucket (one extra slot is asked for)
          .map((b) => ({ key: b.key, awarded: String(Math.round(b.s.value)) }))
          .sort((a, b) => Number(BigInt(b.awarded) - BigInt(a.awarded)) || (a.key < b.key ? -1 : 1))
          .slice(offset, offset + limit);
      }
      if (!ranked.length) return { count, estimated, rows: [] };
      // 3. what each of the page's entities matched, once per Record
      const keys = ranked.map((x) => x.key);
      const stats = await cancellableQuery<{ key: string; awarded: string; records: number; suspect_left_out: number; no_value: number; framework_ceilings: string }>(
        pool, signal,
        `SELECT key, coalesce(sum(sh), 0)::text AS awarded, count(*)::int AS records, (count(*) FILTER (WHERE suspect))::int AS suspect_left_out,
                (count(*) FILTER (WHERE no_value))::int AS no_value, coalesce(sum(ceil), 0)::text AS framework_ceilings
           FROM (SELECT ${key} AS key, record_code, sum(share_bani) AS sh, bool_or(suspect) AS suspect, bool_or(value_bani IS NULL) AS no_value, max(ceiling_bani) AS ceil
                   FROM seap.search WHERE ${w.sql} AND ${key} = ANY($${w.params.length + 1}::text[]) GROUP BY ${key}, record_code) g
          GROUP BY key`,
        [...w.params, keys],
      );
      const byKey = new Map(stats.rows.map((r) => [r.key, totalOf(r)]));
      const entities = await entitiesOf(keys);
      const now = new Date().toISOString();
      const rows = ranked.map((x) => ({
        entity: entities.get(x.key) ?? fallbackEntity(x.key, null, now),
        matched: byKey.get(x.key) ?? { awarded: x.awarded, records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0" }, // the exact per-key sum of step 3, not the aggregation's float
      }));
      return { count, estimated, rows };
    },
    async searchRecords(filter, { limit, offset, order }, { signal } = {}) {
      const w = buildWhere(filter);
      // each Record once: its first winner's row, or, when the filter restricts the winners, grouped per Record.
      // A chips-only count comes from the rollup; the page itself is always the Top-K query on the index (a Record page is not a rollup).
      const plan = rollup ? rollupPlan(filter) : null;
      const count = plan
        ? (await searchTotal(filter, { signal })).records
        : (
        await cancellableQuery<{ n: number }>(
          pool, signal,
          w.winnerSide
            ? `SELECT count(DISTINCT record_code)::int AS n FROM seap.search WHERE ${w.sql}`
            : `SELECT count(*)::int AS n FROM seap.search WHERE ${w.sql} AND winner_position = 1`,
          w.params,
        )
      ).rows[0]!.n;
      const codes = await cancellableQuery<{ record_code: string }>(
        pool, signal,
        w.winnerSide
          ? `SELECT record_code FROM seap.search WHERE ${w.sql} GROUP BY record_code, value_bani, award_date ORDER BY ${SEARCH_ORDER[order]} LIMIT ${limit} OFFSET ${offset}`
          : `SELECT record_code FROM seap.search WHERE ${w.sql} AND winner_position = 1 ORDER BY ${SEARCH_ORDER[order]} LIMIT ${limit} OFFSET ${offset}`,
        w.params,
      );
      const wanted = codes.rows.map((r) => r.record_code);
      if (!wanted.length) return { count, rows: [] };
      const { rows } = await pool.query(`SELECT ${RECORD_COLUMNS} FROM seap.record WHERE code = ANY($1)`, [wanted]);
      const byCode = new Map((await rowsOf(rows as RawRecord[])).map((r) => [r.code, r]));
      if (filter.county && filter.countySide === "SUPPLIER") {
        // the in-area share: the same WHERE, hence the same Record x winner rows that `searchTotal` sums per Record (grouped by record_code), so the shares add up to the Total
        const codesParam = w.params.length + 1;
        const shares = await cancellableQuery<{ record_code: string; share: string | null }>(
          pool, signal,
          `SELECT record_code, sum(share_bani)::text AS share FROM seap.search WHERE ${w.sql} AND record_code = ANY($${codesParam}) GROUP BY record_code`,
          [...w.params, wanted],
        );
        for (const s of shares.rows) {
          const found = byCode.get(s.record_code);
          if (found) found.areaShare = s.share;
        }
      }
      return { count, rows: wanted.map((c) => byCode.get(c)).filter((r): r is RecordRow => !!r) };
    },
    async searchMap(side, filter, { signal } = {}) {
      const w = buildWhere(filter);
      const rows = await areaTotals(w, side === "AUTHORITY" ? "authority_area" : "supplier_area", side === "AUTHORITY" ? "authority_key" : "supplier_key", side === "SUPPLIER" || w.winnerSide, signal);
      const off = new Map(rows.map((r) => [r.area, r]));
      const unplaced = off.get("UNPLACED");
      return {
        counties: rows.filter((r) => /^RO-/.test(r.area)),
        national: off.get("NATIONAL")?.total ?? zeroTotalRow(),
        unplaced: side === "AUTHORITY" && unplaced ? { authorities: unplaced.entities, total: unplaced.total } : null,
        unknownSupplierCounty: side === "SUPPLIER" ? (off.get("UNKNOWN_SUPPLIER_COUNTY")?.total ?? null) : null,
      };
    },
    async searchUatMap(county, filter, { signal } = {}) {
      const w = buildWhere(filter);
      w.params.push(county);
      w.sql += ` AND authority_county = $${w.params.length}`;
      // the zoomed county is the authority side (UATs place authorities); a Record counts once, even when the filter restricts the winners
      const rows = await areaTotals(w, "authority_uat", "authority_key", w.winnerSide, signal);
      const known = rows.filter((r) => r.area !== NO_UAT);
      const names = new Map<string, string>();
      if (known.length) {
        const found = await pool.query(`SELECT siruta, name FROM core.uat WHERE siruta = ANY($1)`, [known.map((r) => r.area)]);
        for (const u of found.rows) names.set(u.siruta, u.name);
      }
      return {
        uats: known.map((r) => ({ ...r, name: names.get(r.area) ?? r.area })),
        unknownUat: rows.find((r) => r.area === NO_UAT)?.total ?? null,
      };
    },
    async total() {
      const { rows } = await pool.query(
        // The counting rule was applied when the graph was built: this only sums and counts what it stored (counted_bani, suspect, ceiling_bani), with no rule predicate here.
        `SELECT coalesce(sum(counted_bani), 0)::text AS awarded, count(*)::int AS records,
                (count(*) FILTER (WHERE suspect))::int AS suspect_left_out,
                (count(*) FILTER (WHERE value_bani IS NULL))::int AS no_value,
                coalesce(sum(ceiling_bani), 0)::text AS framework_ceilings
           FROM seap.record`,
      );
      const r = rows[0];
      return { awarded: r.awarded, records: r.records, suspectLeftOut: r.suspect_left_out, noValue: r.no_value, frameworkCeilings: r.framework_ceilings };
    },
    async records({ limit, offset, order }) {
      const { rows } = await pool.query(
        `SELECT ${RECORD_COLUMNS} FROM seap.record ORDER BY ${ORDER[order]} LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return rowsOf(rows as RawRecord[]);
    },
    async record(code) {
      const { rows } = await pool.query(
        `SELECT r.code, r.title, r.award_date::text AS date, r.kind, r.channel, r.value_bani::text AS value,
                r.counted_bani::text AS counted, r.authority_key, r.authority_name, r.winners, r.badges, r.procedure,
                r.suspect_rule, r.suspect_threshold_bani::text AS suspect_threshold, r.framework_role, r.contract_type, r.cpv_code, r.cpv_description, r.crawl_status, r.via AS record_via, r.url, r.source_file_id
           FROM seap.record r WHERE r.code = $1`,
        [code],
      );
      const r = rows[0];
      if (!r) return null;
      const [row] = await rowsOf([r as RawRecord]);
      return {
        ...row!,
        frameworkRole: r.framework_role,
        contractType: r.contract_type,
        cpv: r.cpv_code ? { code: r.cpv_code, description: r.cpv_description ?? "" } : null,
      };
    },
    async framework(code) {
      const { rows } = await pool.query(
        `SELECT r.framework_role, f.notice_code, f.agreement_code, f.ceiling_bani::text AS ceiling, f.subsequent_bani::text AS subsequent, f.ratio
           FROM seap.record r JOIN seap.framework f ON f.notice_code = r.notice_code
          WHERE r.code = $1 AND r.framework_role IS NOT NULL`,
        [code],
      );
      const f = rows[0];
      if (!f) return null;
      // on the agreement itself `agreement` is null; a subsequent contract points at the agreement Record when it is loaded
      let agreement: RecordRow | null = null;
      if (f.framework_role === "SUBSEQUENT" && f.agreement_code) {
        const found = await pool.query(`SELECT ${RECORD_COLUMNS} FROM seap.record WHERE code = $1`, [f.agreement_code]);
        agreement = (await rowsOf(found.rows as RawRecord[]))[0] ?? null;
      }
      return { noticeCode: f.notice_code, agreement, ceiling: f.ceiling, subsequentReported: f.subsequent, ratio: f.ratio };
    },
    async subsequent(noticeCode, { limit, offset }) {
      const { rows } = await pool.query(
        `SELECT ${RECORD_COLUMNS} FROM seap.record WHERE notice_code = $1 AND framework_role = 'SUBSEQUENT'
          ORDER BY value_bani DESC NULLS LAST, code LIMIT $2 OFFSET $3`,
        [noticeCode, limit, offset],
      );
      return rowsOf(rows as RawRecord[]);
    },
    async sources() {
      const { rows } = await pool.query(
        `SELECT id, name, schema_name AS schema, record_kinds AS "recordKinds", lenses, placement_rule AS "placementRule",
                methodology_anchor AS "methodologyAnchor", landing_status AS "landingStatus" FROM core.source ORDER BY position`,
      );
      return rows as SourceRow[];
    },
    async dataThrough() {
      const { rows } = await pool.query(
        // a copy of SEAP_DATA_THROUGH_SQL in watchdog/pipeline/sources.py (`pipeline status`); the two must agree: the crawled kinds are at least as far as the crawl cursor
        `SELECT kind, max(d)::text AS date FROM (
           SELECT kind, max(published_on) AS d FROM seap.record WHERE via IS DISTINCT FROM 'CRAWL' GROUP BY kind
           UNION ALL
           SELECT kind, through FROM seap.crawl_state
         ) x GROUP BY kind ORDER BY kind`,
      );
      return rows;
    },
    async coverageGrid() {
      const { rows } = await pool.query(
        `SELECT quarter, kind, state, rule, note, records, crawl_only AS "crawlOnly", data_through::text AS "dataThrough" FROM seap.coverage_cell
          ORDER BY quarter, array_position(ARRAY['DA', 'DAN', 'CONTRACT', 'AWARD_NOTICE'], kind)`,
      );
      return rows as GapCellRow[];
    },
    async goTo(qFolded, { signal } = {}) {
      if (!qFolded) return null;
      // a lone number is a CUI (RO<digits> was folded to its digits) and only that (a CUI entity's key is its CUI, so the PK finds it); anything else is a folded name
      const isCui = /^\d{2,10}$/.test(qFolded);
      const found = await cancellableQuery<{ key: string }>(
        pool, signal,
        isCui ? `SELECT key FROM core.entity WHERE key = $1 AND identity = 'CUI' LIMIT 2` : `SELECT key FROM core.entity WHERE name_folded = $1 AND name_folded <> '' LIMIT 2`,
        [qFolded],
      );
      if (found.rows.length !== 1) return null;
      return (await entitiesOf([found.rows[0]!.key])).get(found.rows[0]!.key) ?? null;
    },
    async coverageAreas({ from, to }) {
      // One pass over the window's Records: an authority counts once however many Records it has. The authority's key is its CUI (= the MF CIF).
      const { rows } = await pool.query(
        `WITH rec AS (
           SELECT DISTINCT authority_key FROM seap.record
            WHERE authority_key IS NOT NULL AND ${WINDOW_SQL}),
         areas AS (SELECT 'RO-' || iso AS area, 0 AS grp, iso AS ord FROM core.county UNION ALL SELECT 'NATIONAL', 1, ''),
         mf AS (
           SELECT CASE WHEN e.national THEN 'NATIONAL' WHEN e.county_iso IS NOT NULL THEN 'RO-' || e.county_iso END AS area, (r.authority_key IS NOT NULL) AS has
             FROM core.mf_entity e LEFT JOIN rec r ON r.authority_key = e.cui),
         other AS (
           SELECT CASE WHEN p.national THEN 'NATIONAL' ELSE 'RO-' || p.county_iso END AS area
             FROM rec r JOIN core.placement p ON p.entity_key = r.authority_key
            WHERE NOT EXISTS (SELECT 1 FROM core.mf_entity e WHERE e.cui = r.authority_key))
         SELECT a.area, (SELECT count(*) FROM mf WHERE mf.area = a.area AND mf.has)::int AS "withRecords",
                (SELECT count(*) FROM mf WHERE mf.area = a.area)::int AS "publicEntities",
                (SELECT count(*) FROM other WHERE other.area = a.area)::int AS "otherAuthorities"
           FROM areas a ORDER BY a.grp, a.ord`,
        [from, to],
      );
      return rows as CoverageAreaRow[];
    },
    async unplacedAuthorities({ from, to }) {
      const { rows } = await pool.query(
        `SELECT count(DISTINCT r.authority_key)::int AS authorities, coalesce(sum(r.counted_bani), 0)::text AS awarded, count(*)::int AS records,
                (count(*) FILTER (WHERE r.suspect))::int AS suspect_left_out, (count(*) FILTER (WHERE r.value_bani IS NULL))::int AS no_value,
                coalesce(sum(r.ceiling_bani), 0)::text AS framework_ceilings
           FROM seap.record r
          WHERE r.authority_key IS NOT NULL AND ${WINDOW_SQL.replaceAll("award_date", "r.award_date")}
            AND NOT EXISTS (SELECT 1 FROM core.placement p WHERE p.entity_key = r.authority_key)`,
        [from, to],
      );
      const r = rows[0];
      return { authorities: r.authorities, total: totalOf(r) };
    },
    async referenceSnapshot() {
      const { rows } = await pool.query(`SELECT max(snapshot_date)::text AS d FROM core.mf_snapshot`);
      return (rows[0]?.d as string | null) ?? null;
    },
    async onrcDataThrough() {
      const { rows } = await pool.query(`SELECT 'REGISTRATION' AS kind, max(snapshot_date)::text AS date FROM onrc.snapshot HAVING count(*) > 0`);
      return rows;
    },
    async onrc(cui) {
      const { rows } = await pool.query(
        `SELECT r.reg_no, r.registration_date::text AS registration_date, r.legal_form, r.county_name, r.locality, r.address, r.postal_code, r.snapshot_date::text AS snapshot,
                s.url, s.title, to_char(s.fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS fetched_at
           FROM onrc.registration r JOIN onrc.snapshot s ON s.snapshot_date = r.snapshot_date WHERE r.cui = $1 AND r.primary_for_cui`,
        [cui],
      );
      const r = rows[0];
      if (!r) return null;
      const statuses = await pool.query(
        `SELECT sp.code, n.name, sp.first_seen::text AS "firstSeen", sp.since_at_least AS "sinceAtLeast"
           FROM onrc.status_span sp LEFT JOIN onrc.status_name n ON n.code = sp.code WHERE sp.reg_no = $1 AND sp.last_seen = $2::date ORDER BY sp.code`,
        [r.reg_no, r.snapshot],
      );
      const caen = await pool.query(`SELECT code, version FROM onrc.caen WHERE reg_no = $1 ORDER BY code`, [r.reg_no]);
      const aliases = await pool.query(
        `SELECT name, first_seen::text AS "firstSeen", last_seen::text AS "lastSeen", since_at_least AS "sinceAtLeast", last_seen = $2::date AS current
           FROM onrc.name_span WHERE reg_no = $1 ORDER BY last_seen DESC, first_seen DESC, name`,
        [r.reg_no, r.snapshot],
      );
      return {
        registrationNumber: r.reg_no,
        registrationDate: r.registration_date,
        legalForm: r.legal_form,
        statuses: statuses.rows,
        caen: caen.rows,
        seat: { county: r.county_name, locality: r.locality, address: r.address, postalCode: r.postal_code },
        aliases: aliases.rows,
        snapshot: r.snapshot,
        provenance: { url: r.url, via: r.title, fetchedAt: r.fetched_at },
      };
    },
    async entity(key) {
      return (await entitiesOf([key])).get(key) ?? null;
    },
    async aliases(key) {
      const { rows } = await pool.query(
        `SELECT name, records, first_date::text AS first, last_date::text AS last, differs_from_anaf AS "differsFromAnaf"
           FROM core.alias WHERE entity_key = $1 ORDER BY records DESC, name`,
        [key],
      );
      return rows;
    },
    async publicEnterprise(cui) {
      const { rows } = await pool.query(
        `SELECT a.name AS "listedAs", a.registration_number AS "registrationNumber", a.status, a.first_year AS "firstYear", a.last_year AS "lastYear",
                a.snapshot_date::text AS snapshot, s.dataset_url AS url, s.via, s.license,
                to_char(s.fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "fetchedAt"
           FROM amepip.enterprise a JOIN amepip.snapshot s ON s.snapshot_date = a.snapshot_date WHERE a.cui = $1`,
        [cui],
      );
      return (rows[0] as PublicEnterpriseRow | undefined) ?? null;
    },
    async leadership(key) {
      // A graph built before the aep schema existed (deployed ahead of a rebuild) has no Leadership list or Party: the pages still work.
      const direct = await pool.query(`SELECT area FROM aep.authority WHERE entity_key = $1`, [key]).catch(noTable);
      let area = direct.rows[0]?.area as string | undefined;
      let via: LeadershipViaRow | null = null;
      if (!area) {
        const sub = await pool.query(
          `SELECT s.authority_key AS "authorityKey", e.display_name AS "authorityName", s.snapshot_date::text AS "snapshotDate", s.snapshots, a.area
             FROM aep.subordinate s JOIN aep.authority a ON a.entity_key = s.authority_key JOIN core.entity e ON e.key = s.authority_key WHERE s.entity_key = $1`,
          [key],
        ).catch(noTable);
        if (!sub.rows[0]) return null;
        ({ area } = sub.rows[0] as { area: string });
        via = { authority: sub.rows[0].authorityKey, authorityName: sub.rows[0].authorityName, snapshotDate: sub.rows[0].snapshotDate, snapshots: Number(sub.rows[0].snapshots) };
      }
      const mandates = await pool.query(
        `SELECT leader_name AS "leaderName", list_name AS "list", independent, member_parties AS "memberParties", election_date::text AS "electionDate", basis,
                data_through::text AS "dataThrough", start_date::text AS "startDate", end_date::text AS "endDate"
           FROM aep.mandate WHERE area = $1 ORDER BY start_date`,
        [area],
      );
      const gaps = await pool.query(`SELECT start_date::text AS "startDate", end_date::text AS "endDate", reason AS kind FROM aep.gap WHERE area = $1 ORDER BY start_date`, [area]);
      return { mandates: mandates.rows as MandateRow[], gaps: gaps.rows as LeadershipGapRow[], via };
    },
    async recordParty(code) {
      const { rows } = await pool.query(
        `SELECT m.list_name AS list, m.independent, m.member_parties AS "memberParties", m.election_date::text AS "electionDate", m.basis, m.data_through::text AS "dataThrough",
                p.via_key AS "viaKey", e.display_name AS "viaName", s.snapshot_date::text AS "snapshotDate", s.snapshots
           FROM aep.record_party p JOIN aep.mandate m ON m.id = p.mandate_id
           JOIN seap.record r ON r.code = p.record_code
           LEFT JOIN aep.subordinate s ON s.entity_key = r.authority_key AND p.via_key IS NOT NULL
           LEFT JOIN core.entity e ON e.key = p.via_key
          WHERE p.record_code = $1`,
        [code],
      ).catch(noTable);
      const r = rows[0];
      if (!r) return null;
      return {
        list: r.list, independent: r.independent, memberParties: r.memberParties, electionDate: r.electionDate, basis: r.basis, dataThrough: r.dataThrough,
        via: r.viaKey ? { authority: r.viaKey, authorityName: r.viaName, snapshotDate: r.snapshotDate, snapshots: Number(r.snapshots) } : null,
      };
    },
    async financials(cui, key) {
      // A graph built before the financials schema existed (deployed ahead of a rebuild) has no statements: the Overview still works.
      const { rows } = await pool.query(
        `SELECT s.fiscal_year AS "fiscalYear", s.revision, s.fiscal_year = (SELECT max(fiscal_year) FROM financials.source_file) AS newest,
                s.turnover_bani::text AS turnover, s.profit_loss_bani::text AS "profitOrLoss", s.debts_bani::text AS debts, s.equity_bani::text AS equity,
                s.employees AS "averageEmployees", coalesce(a.awarded, 0)::text AS "awardedInYear",
                f.file_name AS file, f.dataset_url AS "datasetUrl", f.resource_url AS "fileUrl", f.dataset_title AS via, f.license, f.published::text AS published,
                to_char(f.fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "fetchedAt"
           FROM financials.statement s
           JOIN financials.source_file f ON f.id = s.source_file_id
           LEFT JOIN (SELECT award_year, sum(awarded) AS awarded FROM seap.rollup_entity WHERE side = 'SUPPLIER' AND entity_key = $2 GROUP BY award_year) a
                  ON a.award_year = s.fiscal_year
          WHERE s.cui = $1
          ORDER BY s.fiscal_year DESC`,
        [cui, key],
      ).catch(noTable);
      return rows.map(({ file, datasetUrl, fileUrl, via, license, published, fetchedAt, ...year }) => ({ ...year, source: { file, datasetUrl, fileUrl, via, license, published, fetchedAt } })) as FinancialYearRow[];
    },
    async referenceSources() {
      const amepip = await pool.query(`SELECT snapshot_date::text AS d, dataset_url AS url FROM amepip.snapshot ORDER BY snapshot_date DESC LIMIT 1`);
      const aep = await pool.query(`SELECT max(data_through)::text AS d FROM aep.snapshot WHERE basis = 'PARTIAL_MINUTES'`).catch(noTable); // the one-off file's stated date (#180)
      const fs = await pool.query(`SELECT max(fiscal_year) AS year FROM financials.source_file`).catch(noTable);
      const year = (fs.rows[0]?.year as number | null | undefined) ?? null;
      return [
        { id: "AMEPIP", name: "AMEPIP", dataThrough: (amepip.rows[0]?.d as string | undefined) ?? null, fiscalYear: null, url: (amepip.rows[0]?.url as string | null | undefined) ?? null },
        { id: "AEP", name: "AEP", dataThrough: (aep.rows[0]?.d as string | undefined) ?? null, fiscalYear: null, url: null },
        { id: "FINANCIAL_STATEMENTS", name: "MF financial statements", dataThrough: year === null ? null : `${year}-12-31`, fiscalYear: year, url: year === null ? null : "https://data.gov.ro/organization/mfp" },
      ];
    },
    async counties() {
      const { rows } = await pool.query(`SELECT iso, name FROM core.county ORDER BY iso`);
      return rows as CountyRow[];
    },
    async uats(countyIso) {
      const { rows } = await pool.query(
        `SELECT u.siruta, u.name, c.iso, c.name AS county_name FROM core.uat u JOIN core.county c ON c.iso = u.county_iso
          WHERE u.county_iso = $1 ORDER BY u.name_folded, u.siruta`,
        [countyIso],
      );
      return rows.map((r) => ({ siruta: r.siruta, name: r.name, county: { iso: r.iso, name: r.county_name } }));
    },
    async roles(key) {
      const { rows } = await pool.query(
        `SELECT EXISTS (SELECT 1 FROM seap.record WHERE authority_key = $1) AS authority,
                EXISTS (SELECT 1 FROM seap.search WHERE supplier_key = $1) AS supplier`,
        [key],
      );
      return [...(rows[0].authority ? (["AUTHORITY"] as const) : []), ...(rows[0].supplier ? (["SUPPLIER"] as const) : [])];
    },
  };
}
