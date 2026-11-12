// The search engine's SQL (#68): the RecordFilter as a WHERE over `seap.search` (a pg_search BM25 index, see
// watchdog/pipeline/search.py), and the cancellable statements the resolvers run. Everything here is built from fixed
// strings and bound parameters: no input is ever spliced into SQL.
import pg from "pg";
import { foldTokens } from "./fold.ts";

/** The RecordFilter as the API receives it (the contract's input type; every field optional). */
export interface SearchFilter {
  q?: string | null;
  from?: string | null;
  to?: string | null;
  channel?: string | null;
  valueBucket?: string | null;
  hasSignals?: boolean | null;
  badges?: string[] | null;
  procedure?: string[] | null;
  county?: string | null;
  uat?: string | null;
  countySide?: "AUTHORITY" | "SUPPLIER" | null;
  authority?: string | null;
  supplier?: string | null;
  cpv?: string | null;
  signal?: string | null;
}

export interface Where {
  /** A SQL predicate over `seap.search` (never empty: `id @@@ pdb.all()` stands for "everything", which also lets the aggregates push down). */
  sql: string;
  params: unknown[];
  /** True when the filter restricts the winners (a supplier, a supplier county): a Record can then match on several rows. */
  winnerSide: boolean;
  /** True when no text and no chip narrows the set. */
  empty: boolean;
  /** The folded query, as the server understood it (the `qFolded` echo); null for an empty query. */
  qFolded: string | null;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Every token of the folded query must match; the last one is a prefix (a regex over the terms), so `45` finds every
 * 45xxxxxx CPV code. A query that folds to nothing (only legal-form words, or blank) is the empty query.
 */
export function buildWhere(filter: SearchFilter): Where {
  const params: unknown[] = [];
  const preds: string[] = [];
  const bind = (value: unknown, cast = "") => {
    params.push(value);
    return `$${params.length}${cast}`;
  };
  let winnerSide = false;
  let narrowed = false;
  const add = (pred: string) => {
    narrowed = true;
    preds.push(pred);
  };

  const tokens = foldTokens(filter.q ?? "");
  const qFolded = tokens.length ? tokens.join(" ") : null;
  if (tokens.length) {
    const last = tokens[tokens.length - 1]!;
    if (tokens.length > 1) add(`doc &&& ${bind(tokens.slice(0, -1).join(" "), "::text")}`);
    add(`doc @@@ pdb.regex(${bind(`${escapeRegex(last)}.*`, "::text")})`);
  }
  if (filter.from) add(`award_date >= ${bind(filter.from, "::date")}`);
  if (filter.to) add(`award_date <= ${bind(filter.to, "::date")}`);
  if (filter.channel) add(`channel = ${bind(filter.channel)}`);
  if (filter.valueBucket) add(`value_bucket = ${bind(filter.valueBucket)}`);
  if (filter.badges?.length) add(`badges @> ${bind(filter.badges, "::text[]")}`);
  if (filter.procedure?.length) add(`procedure = ANY(${bind(filter.procedure, "::text[]")})`);
  if (filter.cpv) add(`cpv_code @@@ pdb.regex(${bind(`${escapeRegex(filter.cpv)}.*`, "::text")})`);
  if (filter.authority) add(`authority_key = ${bind(filter.authority)}`);
  if (filter.supplier) {
    winnerSide = true;
    add(`supplier_key = ${bind(filter.supplier)}`);
  }
  if (filter.uat) add(`authority_uat = ${bind(filter.uat)}`);
  // has_signals / signals are filled by the pipeline's Signal step (watchdog/pipeline/signals) before the index is built
  if (filter.hasSignals != null) add(`has_signals = ${bind(filter.hasSignals)}`);
  if (filter.signal) add(`signals @> ARRAY[${bind(filter.signal)}]::text[]`);
  if (filter.county) {
    // A county, or an off-map tile of the Money lens (#71). The area columns are never null: the county code, or NATIONAL / UNPLACED
    // (authority side) / UNKNOWN_SUPPLIER_COUNTY (supplier side). An area that belongs to the other side of the lens matches nothing:
    // a stale URL is an empty set, not an error (the column is compared to a value it never holds).
    const supplierSide = filter.countySide === "SUPPLIER";
    // supplier side: any winner in the area keeps the Record (a row per winner, so the Record can match on several rows)
    if (supplierSide) winnerSide = true;
    add(`${supplierSide ? "supplier_area" : "authority_area"} = ${bind(filter.county)}`);
  }
  // `id @@@ pdb.all()` is the "no text" predicate the index needs to push an aggregate down
  if (!tokens.length) preds.unshift("id @@@ pdb.all()");
  return { sql: preds.join(" AND "), params, winnerSide, empty: !narrowed, qFolded };
}

export class AbortedError extends Error {
  constructor() {
    super("The request was aborted: the client disconnected.");
    this.name = "AbortError";
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Runs one statement on its own pooled connection and cancels it on the server when `signal` aborts (the client left):
 * a short-lived second connection asks Postgres to cancel that backend's active statement, so a fast typist's superseded,
 * broad queries do not pile up on the CPUs. The cancel matches on the statement text (cut as Postgres cuts it in pg_stat_activity), so it can never hit the next
 * statement a pooled connection runs.
 */
export async function cancellableQuery<R extends pg.QueryResultRow = pg.QueryResultRow>(
  pool: pg.Pool,
  signal: AbortSignal | undefined,
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<R>> {
  if (signal?.aborted) throw new AbortedError();
  const client = await pool.connect();
  let finished = false;
  const cancel = async () => {
    // the abort can land before the backend is running the statement: retry until it has finished
    for (let attempt = 0; attempt < 100 && !finished; attempt++) {
      const killer = new pg.Client(pool.options);
      try {
        await killer.connect();
        // pg_stat_activity.query is cut at track_activity_query_size: compare both texts cut to what it can hold
        await killer.query(
          `SELECT pg_cancel_backend(pid) FROM pg_stat_activity, (SELECT setting::int - 1 AS n FROM pg_settings WHERE name = 'track_activity_query_size') t
            WHERE pid = $1 AND state = 'active' AND left(query, t.n) = left($2::text, t.n)`,
          [(client as unknown as { processID: number }).processID, text],
        );
      } catch {
        // the connection or the statement is already gone
      } finally {
        await killer.end().catch(() => undefined);
      }
      if (!finished) await sleep(20);
    }
  };
  const onAbort = () => void cancel();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    if (signal?.aborted) throw new AbortedError();
    return await client.query<R>(text, params);
  } catch (e) {
    if (signal?.aborted) throw new AbortedError();
    throw e;
  } finally {
    finished = true;
    signal?.removeEventListener("abort", onAbort);
    client.release();
  }
}
