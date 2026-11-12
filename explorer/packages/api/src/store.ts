import pg from "pg";

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
  /** ANAF (the Reference source) when it has the CUI, else SEAP. `via` is the SEAP file for a SEAP-named entity. */
  provenance: { source: "ANAF" | "SEAP"; via: string | null; fetchedAt: string };
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
}

/** One Record for its page: the list row plus what only the page shows. */
export interface RecordDetail extends RecordRow {
  /** CEILING (a framework agreement's own contract) or SUBSEQUENT (a contract awarded under one); null for any other Record. */
  frameworkRole: "CEILING" | "SUBSEQUENT" | null;
  contractType: string | null;
  cpv: { code: string; description: string } | null;
  /** How we obtained it; the file it came from, as the Source titles it (null for a crawl); when we fetched it (ISO, UTC); the public page (crawled Records: built at load time). */
  provenance: { kind: "BULK" | "CRAWL"; via: string | null; fetchedAt: string; url: string | null };
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

export type RecordOrderKey = "VALUE_DESC" | "DATE_DESC" | "DATE_ASC";

export interface Store {
  total(): Promise<TotalRow>;
  records(page: { limit: number; offset: number; order: RecordOrderKey }): Promise<RecordRow[]>;
  /** A Record by its public code (DA, DAN, `<award notice>~<contract number>`, award notice), or null. */
  record(code: string): Promise<RecordDetail | null>;
  /** The framework link of a framework or subsequent Record (by its code), or null for any other Record. */
  framework(code: string): Promise<FrameworkRow | null>;
  /** The subsequent contracts reported under an award notice's framework, largest first. */
  subsequent(noticeCode: string, page: { limit: number; offset: number }): Promise<RecordRow[]>;
  /** Per SEAP record kind, the latest publication date loaded; for the crawled kinds (CONTRACT, AWARD_NOTICE) at least the crawl cursor. */
  dataThrough(): Promise<{ kind: string; date: string }[]>;
  /** An entity by its URL key (a CUI, `vat-<id>`, `name-<slug>` or a pinned key), or null. */
  entity(key: string): Promise<EntityRow | null>;
  /** Its spellings, most used first. */
  aliases(key: string): Promise<AliasRow[]>;
  /** SEAP roles it has: AUTHORITY if it ever bought, SUPPLIER if it ever won. */
  roles(key: string): Promise<("AUTHORITY" | "SUPPLIER")[]>;
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
  provenance_source: "ANAF" | "SEAP";
  provenance_via: string | null;
  fetched_at: string;
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
  winners: unknown;
  badges: string[];
  suspect_rule: NonNullable<RecordRow["suspect"]>["rule"] | null;
  suspect_threshold: string | null;
  crawl_status: RecordRow["crawlStatus"];
}

const RECORD_COLUMNS = `code, title, award_date::text AS date, kind, channel, procedure, value_bani::text AS value, counted_bani::text AS counted,
  authority_key, authority_name, winners, badges, suspect_rule, suspect_threshold_bani::text AS suspect_threshold, crawl_status`;

export function postgresStore(pool: pg.Pool): Store {
  /** The entities of `keys`, one query. */
  async function entitiesOf(keys: string[]): Promise<Map<string, EntityRow>> {
    if (!keys.length) return new Map();
    const { rows } = await pool.query(`SELECT ${ENTITY_COLUMNS} FROM core.entity WHERE key = ANY($1)`, [keys]);
    return new Map((rows as RawEntity[]).map((r) => [r.key, toEntity(r)]));
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
    const now = new Date().toISOString();
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
    }));
  }

  return {
    async total() {
      const { rows } = await pool.query(
        // The counting rule was applied when the graph was built: this only adds up what it stored (counted_bani, one decision per Record).
        `SELECT coalesce(sum(counted_bani), 0)::text AS awarded, count(*)::int AS records,
                (count(*) FILTER (WHERE suspect_rule IS NOT NULL))::int AS suspect_left_out,
                (count(*) FILTER (WHERE value_bani IS NULL))::int AS no_value,
                coalesce(sum(value_bani) FILTER (WHERE framework_role = 'CEILING' AND suspect_rule IS NULL), 0)::text AS framework_ceilings
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
                r.suspect_rule, r.suspect_threshold_bani::text AS suspect_threshold, r.framework_role, r.contract_type, r.cpv_code, r.cpv_description, r.crawl_status, r.via AS record_via, r.url, f.via,
                to_char(f.fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS fetched_at
           FROM seap.record r JOIN seap.source_file f ON f.id = r.source_file_id WHERE r.code = $1`,
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
        provenance: { kind: r.record_via === "CRAWL" ? "CRAWL" : "BULK", via: r.via, fetchedAt: r.fetched_at, url: r.url },
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
    async dataThrough() {
      const { rows } = await pool.query(
        // the same definition as pipeline/rebuild.py DATA_THROUGH_SQL (`pipeline status`): the crawled kinds are at least as far as the crawl cursor
        `SELECT kind, max(d)::text AS date FROM (
           SELECT kind, max(published_on) AS d FROM seap.record WHERE via IS DISTINCT FROM 'CRAWL' GROUP BY kind
           UNION ALL
           SELECT kind, through FROM seap.crawl_state
         ) x GROUP BY kind ORDER BY kind`,
      );
      return rows;
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
