// ONRC's search engine (#176): the OnrcFilter as a WHERE over `onrc.search` (a pg_search BM25 index, see watchdog/pipeline/onrc/search.py), the top results
// and the count lens. Everything is built from fixed strings and bound parameters: no input is ever spliced into SQL. The table holds no sole trader's
// registration (PFA, II, IF) and no person, so nothing here can return one.
import type pg from "pg";
import { foldTokens } from "./fold.ts";
import { cancellableQuery } from "./search.ts";
import type { EntityRow, GapCellRow, OnrcRegistrationRow, SearchOptions } from "./store.ts";

/** The OnrcFilter as the API receives it (the contract's input type; every field optional). */
export interface OnrcSearchFilter {
  q?: string | null;
  status?: number[] | null;
  caen?: string | null;
  county?: string | null;
  registeredFrom?: string | null;
  registeredTo?: string | null;
  seapCounterparty?: boolean | null;
}

export interface OnrcWhere {
  /** A SQL predicate over `onrc.search` (never empty: `id @@@ pdb.all()` stands for "everything"). */
  sql: string;
  params: unknown[];
  /** True when the query has text, so BM25 scores mean something. */
  text: boolean;
  /** The folded query as the server understood it; null for an empty query. */
  qFolded: string | null;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every token of the folded query must match; the last one is a prefix (as in SEAP's search, so `31000` finds every CUI that starts with it). Ranked by BM25 over the words typed in full. */
export function buildOnrcWhere(filter: OnrcSearchFilter): OnrcWhere {
  const params: unknown[] = [];
  const preds: string[] = [];
  const bind = (value: unknown, cast = "") => {
    params.push(value);
    return `$${params.length}${cast}`;
  };
  const tokens = foldTokens(filter.q ?? "");
  if (tokens.length) {
    const last = tokens[tokens.length - 1]!;
    if (tokens.length > 1) preds.push(`doc &&& ${bind(tokens.slice(0, -1).join(" "), "::text")}`);
    // the last word is a prefix (the regex is the match; its score is constant), and the word typed in full also matches the exact term, which adds BM25 relevance:
    // an exact word outranks a longer one it prefixes, and a shorter name outranks a longer one
    preds.push(`(doc @@@ pdb.regex(${bind(`${escapeRegex(last)}.*`, "::text")}) OR doc ||| ${bind(last, "::text")})`);
  }
  if (filter.status?.length) preds.push(`statuses @@@ pdb.term_set(${bind(filter.status.map(String), "::text[]")})`);
  const caen = filter.caen?.trim(); // spaces alone are no code: not "has any CAEN"
  if (caen) preds.push(`caen @@@ pdb.regex(${bind(`${escapeRegex(caen)}.*`, "::text")})`);
  // a county (`RO-CJ`) or UNPLACED; any other value matches nothing (a stale URL is an empty set, not an error)
  if (filter.county) preds.push(`area = ${bind(filter.county)}`);
  if (filter.registeredFrom) preds.push(`registration_date >= ${bind(filter.registeredFrom, "::date")}`);
  if (filter.registeredTo) preds.push(`registration_date <= ${bind(filter.registeredTo, "::date")}`);
  if (filter.seapCounterparty != null) preds.push(`seap_counterparty = ${bind(filter.seapCounterparty)}`);
  if (!tokens.length) preds.unshift("id @@@ pdb.all()");
  return { sql: preds.join(" AND "), params, text: tokens.length > 0, qFolded: tokens.length ? tokens.join(" ") : null };
}

/** One matching registration with what the result row and its "why it matched" need. Never a person. */
export interface OnrcResultRow {
  registrationNumber: string;
  name: string;
  cui: string | null;
  legalForm: string | null;
  registrationDate: string | null;
  seat: { county: string | null; locality: string | null };
  statuses: { code: number; name: string | null }[];
  caen: { code: string; version: number | null }[];
  /** Every other name ONRC listed it under (the text an alias match highlights). */
  aliases: string[];
  seapCounterparty: boolean;
  entity: EntityRow | null;
}

export interface OnrcCountMapRow {
  /** Counties with matching registrations, by code (`RO-CJ`), in code order. */
  counties: { area: string; registrations: number }[];
  /** Matching registrations whose seat has no county (the Unplaced tile). */
  unplaced: number;
}

export interface OnrcStore {
  /** The registration under an ONRC registration number, or null (also for a sole trader's: ADR 0009). */
  onrcRecord(registrationNumber: string): Promise<OnrcRegistrationRow | null>;
  /** The match count and the page of registrations: text relevance, then newest registration first (undated last), then the table's own order. */
  onrcSearch(filter: OnrcSearchFilter, page: { limit: number; offset: number }, options?: SearchOptions & { count?: number }): Promise<{ count: number; rows: OnrcResultRow[] }>;
  /** The match count alone. */
  onrcCount(filter: OnrcSearchFilter, options?: SearchOptions): Promise<number>;
  /** The count lens of the matching set. */
  onrcCountMap(filter: OnrcSearchFilter, options?: SearchOptions): Promise<OnrcCountMapRow>;
  /** ONRC's Coverage grid (`onrc.coverage_cell`): the cells overlapping the window, oldest first. */
  onrcCoverageGrid(window: { from: string | null; to: string | null }): Promise<GapCellRow[]>;
}

export function onrcStore({ pool, entitiesOf }: { pool: pg.Pool; entitiesOf: (keys: string[]) => Promise<Map<string, EntityRow>> }): Omit<OnrcStore, "onrcRecord"> {
  const count = async (w: OnrcWhere, signal: AbortSignal | undefined) =>
    (await cancellableQuery<{ n: number }>(pool, signal, `SELECT count(*)::int AS n FROM onrc.search WHERE ${w.sql}`, w.params)).rows[0]!.n;

  return {
    onrcCount: (filter, { signal } = {}) => count(buildOnrcWhere(filter), signal),

    async onrcSearch(filter, { limit, offset }, { signal, count: known } = {}) {
      const w = buildOnrcWhere(filter);
      const total = known ?? (await count(w, signal));
      if (limit <= 0 || offset >= total) return { count: total, rows: [] };
      // `id` is the tie-break: it follows the registration number (the table is filled in that order), and unlike the text column it lets the index sort and cut the top K itself
      const order = `${w.text ? "pdb.score(id) DESC, " : ""}registration_date DESC NULLS LAST, id`;
      const page = await cancellableQuery<{ reg_no: string }>(pool, signal, `SELECT reg_no FROM onrc.search WHERE ${w.sql} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`, w.params);
      const regs = page.rows.map((r) => r.reg_no);
      if (!regs.length) return { count: total, rows: [] };
      const [reg, statuses, caen, aliases] = await Promise.all([
        pool.query(
          `SELECT r.reg_no, r.name, r.cui, r.legal_form, r.registration_date::text AS registration_date, r.county_name, r.locality, s.seap_counterparty
             FROM onrc.registration r JOIN onrc.search s ON s.reg_no = r.reg_no WHERE r.reg_no = ANY($1)`,
          [regs],
        ),
        pool.query(
          `SELECT sp.reg_no, sp.code, n.name FROM onrc.status_span sp JOIN onrc.registration r ON r.reg_no = sp.reg_no AND sp.last_seen = r.snapshot_date
             LEFT JOIN onrc.status_name n ON n.code = sp.code WHERE sp.reg_no = ANY($1) ORDER BY sp.reg_no, sp.code`,
          [regs],
        ),
        pool.query(`SELECT reg_no, code, version FROM onrc.caen WHERE reg_no = ANY($1) ORDER BY reg_no, code`, [regs]),
        pool.query(
          `SELECT n.reg_no, n.name FROM onrc.name_span n JOIN onrc.registration r ON r.reg_no = n.reg_no AND n.name <> r.name
             JOIN onrc.search s ON s.reg_no = n.reg_no AND n.name = ANY(s.aliases) WHERE n.reg_no = ANY($1)
            GROUP BY n.reg_no, n.name ORDER BY n.reg_no, max(n.last_seen) DESC, n.name`,
          [regs],
        ),
      ]);
      const group = <T extends { reg_no: string }>(rows: T[]) => {
        const by = new Map<string, T[]>();
        for (const r of rows) (by.get(r.reg_no) ?? by.set(r.reg_no, []).get(r.reg_no)!).push(r);
        return by;
      };
      const [st, cn, al] = [group(statuses.rows), group(caen.rows), group(aliases.rows)];
      const byReg = new Map(reg.rows.map((r) => [r.reg_no as string, r]));
      const entities = await entitiesOf([...new Set(reg.rows.map((r) => r.cui as string | null).filter((c): c is string => !!c))]);
      return {
        count: total,
        rows: regs.map((no) => {
          const r = byReg.get(no)!;
          return {
            registrationNumber: no,
            name: r.name,
            cui: r.cui,
            legalForm: r.legal_form,
            registrationDate: r.registration_date,
            seat: { county: r.county_name, locality: r.locality },
            statuses: (st.get(no) ?? []).map((x) => ({ code: x.code, name: x.name })),
            caen: (cn.get(no) ?? []).map((x) => ({ code: x.code, version: x.version })),
            aliases: (al.get(no) ?? []).map((x) => x.name),
            seapCounterparty: r.seap_counterparty,
            entity: (r.cui && entities.get(r.cui)) || null,
          };
        }),
      };
    },

    async onrcCountMap(filter, { signal } = {}) {
      const w = buildOnrcWhere(filter);
      const { rows } = await cancellableQuery<{ area: string; n: number }>(pool, signal, `SELECT area, count(*)::int AS n FROM onrc.search WHERE ${w.sql} GROUP BY area ORDER BY area`, w.params);
      return { counties: rows.filter((r) => r.area !== "UNPLACED").map((r) => ({ area: r.area, registrations: r.n })), unplaced: rows.find((r) => r.area === "UNPLACED")?.n ?? 0 };
    },

    async onrcCoverageGrid({ from, to }) {
      const { rows } = await pool.query(
        `SELECT period AS quarter, kind, state, NULL::text AS rule, NULL::text AS note, records, 0 AS "crawlOnly", data_through::text AS "dataThrough" FROM onrc.coverage_cell
          WHERE ($1::date IS NULL OR period_end >= $1::date) AND ($2::date IS NULL OR period_start <= $2::date)
          ORDER BY period_start, array_position(ARRAY['REGISTRATION', 'ROLE'], kind)`,
        [from, to],
      );
      return rows as GapCellRow[];
    },
  };
}

