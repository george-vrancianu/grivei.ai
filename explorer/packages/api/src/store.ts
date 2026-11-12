import pg from "pg";

/** What the API reads from the graph. The tracer serves the SEAP total and Records list for the empty filter. */
export interface RecordRow {
  code: string;
  title: string;
  date: string;
  kind: "DA" | "DAN";
  channel: "DIRECT_PURCHASE";
  value: string | null;
  counted: string | null;
  authority: { cui: string | null; name: string };
  supplier: { cui: string | null; name: string } | null;
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
  /** A Record by its public code (DA, DAN), or null. */
  record(code: string): Promise<RecordDetail | null>;
  /** Per SEAP record kind, the latest publication date loaded. */
  dataThrough(): Promise<{ kind: string; date: string }[]>;
}

// Fixed strings, never built from input. Ties break on the public code so a page is stable.
const ORDER: Record<RecordOrderKey, string> = {
  VALUE_DESC: "value_bani DESC NULLS LAST, code",
  DATE_DESC: "award_date DESC, code",
  DATE_ASC: "award_date ASC, code",
};

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
        `SELECT code, title, award_date::text AS date, kind, channel, value_bani::text AS value, counted_bani::text AS counted,
                authority_cui, authority_name, supplier_cui, supplier_name
           FROM seap.record ORDER BY ${ORDER[order]} LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      return rows.map((r) => ({
        code: r.code,
        title: r.title,
        date: r.date,
        kind: r.kind,
        channel: r.channel,
        value: r.value,
        counted: r.counted,
        authority: { cui: r.authority_cui, name: r.authority_name },
        supplier: r.supplier_name || r.supplier_cui ? { cui: r.supplier_cui, name: r.supplier_name } : null,
      }));
    },
    async record(code) {
      const { rows } = await pool.query(
        `SELECT r.code, r.title, r.award_date::text AS date, r.kind, r.channel, r.value_bani::text AS value,
                r.counted_bani::text AS counted, r.authority_cui, r.authority_name, r.supplier_cui, r.supplier_name,
                r.contract_type, r.cpv_code, r.cpv_description, f.via,
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
        value: r.value,
        counted: r.counted,
        authority: { cui: r.authority_cui, name: r.authority_name },
        supplier: r.supplier_name || r.supplier_cui ? { cui: r.supplier_cui, name: r.supplier_name } : null,
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
  };
}
