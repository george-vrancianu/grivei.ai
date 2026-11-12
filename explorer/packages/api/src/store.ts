import pg from "pg";

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
  authority: { cui: string | null; name: string };
  /** In their published order. A DA or DAN has one; a contract or award notice has all of its winners. */
  winners: { cui: string | null; name: string | null }[];
  /** Crawled Records the bulk has not superseded: PROVISIONAL (its quarter has no bulk yet) or CRAWL_ONLY (the bulk has the quarter, not this Record). Null for a bulk Record. */
  crawlStatus: "PROVISIONAL" | "CRAWL_ONLY" | null;
}

/** One Record for its page: the list row plus what only the page shows. */
export interface RecordDetail extends RecordRow {
  contractType: string | null;
  cpv: { code: string; description: string } | null;
  /** How we obtained it; the file it came from, as the Source titles it (null for a crawl); when we fetched it (ISO, UTC); the public page (crawled Records: built at load time). */
  provenance: { kind: "BULK" | "CRAWL"; via: string | null; fetchedAt: string; url: string | null };
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
  /** Per SEAP record kind, the latest publication date loaded; for the crawled kinds (CONTRACT, AWARD_NOTICE) at least the crawl cursor. */
  dataThrough(): Promise<{ kind: string; date: string }[]>;
}

// Fixed strings, never built from input. Ties break on the public code so a page is stable.
const ORDER: Record<RecordOrderKey, string> = {
  VALUE_DESC: "value_bani DESC NULLS LAST, code",
  DATE_DESC: "award_date DESC, code",
  DATE_ASC: "award_date ASC, code",
};

function winnersOf(value: unknown): RecordRow["winners"] {
  return Array.isArray(value) ? value.map((w: { cui?: string | null; name?: string | null }) => ({ cui: w.cui ?? null, name: w.name ?? null })) : [];
}

export function postgresStore(pool: pg.Pool): Store {
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
                authority_cui, authority_name, winners, crawl_status
           FROM seap.record ORDER BY ${ORDER[order]} LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return rows.map((r) => ({
        code: r.code,
        title: r.title,
        date: r.date,
        kind: r.kind,
        channel: r.channel,
        procedure: r.procedure,
        value: r.value,
        counted: r.counted,
        authority: { cui: r.authority_cui, name: r.authority_name },
        winners: winnersOf(r.winners),
        crawlStatus: r.crawl_status,
      }));
    },
    async record(code) {
      const { rows } = await pool.query(
        `SELECT r.code, r.title, r.award_date::text AS date, r.kind, r.channel, r.value_bani::text AS value,
                r.counted_bani::text AS counted, r.authority_cui, r.authority_name, r.winners, r.procedure,
                r.contract_type, r.cpv_code, r.cpv_description, r.crawl_status, r.via AS record_via, r.url, f.via,
                to_char(f.fetched_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS fetched_at
           FROM seap.record r JOIN seap.source_file f ON f.id = r.source_file_id WHERE r.code = $1`,
        [code],
      );
      const r = rows[0];
      if (!r) return null;
      return {
        code: r.code,
        title: r.title,
        date: r.date,
        kind: r.kind,
        channel: r.channel,
        procedure: r.procedure,
        value: r.value,
        counted: r.counted,
        authority: { cui: r.authority_cui, name: r.authority_name },
        winners: winnersOf(r.winners),
        crawlStatus: r.crawl_status,
        contractType: r.contract_type,
        cpv: r.cpv_code ? { code: r.cpv_code, description: r.cpv_description ?? "" } : null,
        provenance: { kind: r.record_via === "CRAWL" ? "CRAWL" : "BULK", via: r.via, fetchedAt: r.fetched_at, url: r.url },
      };
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
  };
}
