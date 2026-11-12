import pg from "pg";

/** What the API reads from the graph. The tracer serves the SEAP total and Records list for the empty filter. */
export interface RecordRow {
  code: string;
  title: string;
  date: string;
  kind: "DA";
  channel: "DIRECT_PURCHASE";
  value: string | null;
  counted: string | null;
  authority: { cui: string | null; name: string };
  supplier: { cui: string | null; name: string } | null;
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
    async dataThrough() {
      const { rows } = await pool.query(
        `SELECT kind, max(published_on)::text AS date FROM seap.record GROUP BY kind ORDER BY kind`,
      );
      return rows;
    },
  };
}
