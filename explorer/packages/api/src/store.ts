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
  counted: string | null;
  authority: EntityRow;
  /** In their published order. A DA or DAN has one; a contract or award notice has all of its winners. */
  winners: WinnerRow[];
  /** The identity badges the rebuild put on it: CUI_MISMATCH, NAME_DIFFERS_FROM_ANAF, IDENTITY_CURATED. */
  identityBadges: string[];
}

/** One Record for its page: the list row plus what only the page shows. */
export interface RecordDetail extends RecordRow {
  contractType: string | null;
  cpv: { code: string; description: string } | null;
  /** The loaded file it came from, as the Source titles it, and when we fetched it (ISO, UTC). */
  provenance: { via: string | null; fetchedAt: string };
}

export interface TotalRow {
  awarded: string;
  records: number;
  noValue: number;
}

export type RecordOrderKey = "VALUE_DESC" | "DATE_DESC" | "DATE_ASC";

export interface Store {
  total(): Promise<TotalRow>;
  records(page: { limit: number; offset: number; order: RecordOrderKey }): Promise<RecordRow[]>;
  /** A Record by its public code (DA, DAN, `<award notice>~<contract number>`, award notice), or null. */
  record(code: string): Promise<RecordDetail | null>;
  /** Per SEAP record kind, the latest publication date loaded. */
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
}

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
      })),
      identityBadges: r.badges ?? [],
    }));
  }

  return {
    async total() {
      const { rows } = await pool.query(
        `SELECT coalesce(sum(counted_bani), 0)::text AS awarded, count(*)::int AS records,
                (count(*) FILTER (WHERE value_bani IS NULL))::int AS no_value
           FROM seap.record`,
      );
      const r = rows[0];
      return { awarded: r.awarded, records: r.records, noValue: r.no_value };
    },
    async records({ limit, offset, order }) {
      const { rows } = await pool.query(
        `SELECT code, title, award_date::text AS date, kind, channel, procedure, value_bani::text AS value, counted_bani::text AS counted,
                authority_key, authority_name, winners, badges
           FROM seap.record ORDER BY ${ORDER[order]} LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return rowsOf(rows as RawRecord[]);
    },
    async record(code) {
      const { rows } = await pool.query(
        `SELECT r.code, r.title, r.award_date::text AS date, r.kind, r.channel, r.value_bani::text AS value,
                r.counted_bani::text AS counted, r.authority_key, r.authority_name, r.winners, r.badges, r.procedure,
                r.contract_type, r.cpv_code, r.cpv_description, f.via,
                to_char(f.fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS fetched_at
           FROM seap.record r JOIN seap.source_file f ON f.id = r.source_file_id WHERE r.code = $1`,
        [code],
      );
      const r = rows[0];
      if (!r) return null;
      const [row] = await rowsOf([r as RawRecord]);
      return {
        ...row!,
        contractType: r.contract_type,
        cpv: r.cpv_code ? { code: r.cpv_code, description: r.cpv_description ?? "" } : null,
        provenance: { via: r.via, fetchedAt: r.fetched_at },
      };
    },
    async dataThrough() {
      const { rows } = await pool.query(
        `SELECT kind, max(published_on)::text AS date FROM seap.record GROUP BY kind ORDER BY kind`,
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
