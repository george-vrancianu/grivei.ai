// Signals (#74): the GraphQL side of the Signal model the pipeline builds (watchdog/pipeline/signals/). A Signal is a set of Records
// with no public id: the rows carry an ordinal that is only good for the load they came from (it never reaches a response, and the
// result cache is flushed on every load), and the response addresses a Signal by its `reproduce` filter.
//
// Nothing here switches on a rule slug except `NUMBERS_TYPE`: the pipeline stores `numbers` with the field names of the rule's
// GraphQL numbers type, `reproduce` as a RecordFilterValue and the slug as the GraphQL enum value, so adding a rule needs no API change
// beyond a line in that table (already present for every rule of the contract). No copy: slugs, enums, numbers and identifiers only.
import type pg from "pg";
import { buildWhere, cancellableQuery, type SearchFilter } from "./search.ts";
import type { EntityRow, RecordRow, SearchOptions } from "./store.ts";

/** The union member each rule's `numbers` is. */
export const NUMBERS_TYPE: Record<string, string> = {
  OVER_CAP: "OverCapNumbers",
  SPLITTING: "SplittingNumbers",
  FRAMEWORK_OVERRUN: "FrameworkOverrunNumbers",
  NO_PUBLICATION: "NoPublicationNumbers",
  YOUNG_FIRM: "YoungFirmNumbers",
  NO_CONSTRUCTION_CAEN: "NoConstructionCaenNumbers",
  AFTER_STRIKE_OFF: "AfterStrikeOffNumbers",
  INSOLVENCY: "InsolvencyNumbers",
  FEW_EMPLOYEES: "FewEmployeesNumbers",
  NO_FINANCIAL_STATEMENT: "NoFinancialStatementNumbers",
};

/** The RecordFilterValue a Signal is reproduced by (the fields of the contract's output twin of RecordFilter). */
export interface ReproduceRow {
  authority?: string | null;
  supplier?: string | null;
  signal?: string | null;
  cpv?: string | null;
  from?: string | null;
  to?: string | null;
}

export interface SignalRow {
  /**
   * This load's ordinal: only a handle to read the Signal's Records, never served. A request that spans a load commit (or the cache's
   * 1 s generation window) can read the Records of another Signal under an old row; the window is narrow and the result is a stale page,
   * never a wrong filter (`reproduce` is by value).
   */
  ordinal: number;
  rule: string;
  /** Its latest Record's award date. */
  date: string;
  firstDate: string;
  authorityKey: string;
  /** Every winner entity of its Records, consortium members included; natural persons have no key and are absent. */
  supplierKeys: string[];
  recordCount: number;
  /** What its Records add to a sum, in bani (the VALUE_DESC order; never shown as a score). */
  value: string;
  numbers: Record<string, unknown>;
  reproduce: ReproduceRow;
  dataThrough: string;
  /** Its authority and suppliers (in `supplierKeys` order), loaded once for the whole page, so serving them costs no query per Signal. */
  authority: EntityRow | null;
  suppliers: EntityRow[];
}

export interface SignalRuleRow {
  slug: string;
  window: { from: string | null; to: string | null };
  baseRate: number;
  baseRateYear: number;
  dataThrough: string;
}

export type SignalOrderKey = "DATE_DESC" | "VALUE_DESC";

export interface SignalStore {
  /** The rules the last load has seen data for, with their windows and national base rates, in the contract's order. */
  signalRules(): Promise<SignalRuleRow[]>;
  /**
   * The Signals that have at least one Record in the matching set, so the year chip keeps a Signal if any of its Records is in range
   * (story 78) and an entity's page lists the Signals of its Records on its side, consortium members included. `filter` is already
   * scoped to the entity (role.ts `scopeFilter`); a `signal` in it restricts to that rule. Never scored: DATE_DESC or VALUE_DESC only.
   */
  roleSignals(filter: SearchFilter, page: { limit: number; offset: number; order: SignalOrderKey }, options?: SearchOptions): Promise<{ count: number; rows: SignalRow[] }>;
  /**
   * How many Signals each of `keys` has in the matching set, on `side` (#104): the Signals with at least one Record in the set where the entity is the
   * authority (AUTHORITY) or a winner (SUPPLIER), the same rule `roleSignals` applies to an entity's page, so with the same filter the two counts agree.
   * `filter` is the search's own, not scoped to an entity. An entity with none is absent from the map. One grouped query for the whole page.
   */
  entitySignalCounts(side: "AUTHORITY" | "SUPPLIER", filter: SearchFilter, keys: string[], options?: SearchOptions): Promise<Map<string, number>>;
  /** A Signal's Records (by the ordinal of the row it came from), latest first, with full provenance like every Record list. */
  signalRecords(ordinal: number, page: { limit: number; offset: number }): Promise<RecordRow[]>;
}

interface RawSignal {
  ordinal: number;
  rule: string;
  date: string;
  first_date: string;
  authority_key: string;
  supplier_keys: string[];
  record_count: number;
  value: string;
  numbers: Record<string, unknown>;
  reproduce: ReproduceRow;
  data_through: string | null;
}

// `data_through` comes from the rule's row; the pipeline writes one for every rule that has Signals.
const SIGNAL_COLUMNS = `g.id AS ordinal, g.rule, g.last_date::text AS date, g.first_date::text AS first_date, g.authority_key, g.supplier_keys, g.record_count,
  g.value_bani::text AS value, g.numbers, g.reproduce, r.data_through::text AS data_through`;
const SIGNAL_FROM = `seap.signal g LEFT JOIN seap.signal_rule r ON r.slug = g.rule`;

const toSignal = (r: RawSignal): SignalRow => ({
  authority: null,
  suppliers: [],
  ordinal: r.ordinal,
  rule: r.rule,
  date: r.date,
  firstDate: r.first_date,
  authorityKey: r.authority_key,
  supplierKeys: r.supplier_keys,
  recordCount: r.record_count,
  value: r.value,
  numbers: r.numbers,
  reproduce: r.reproduce,
  dataThrough: r.data_through ?? r.date,
});

/** Attach the authority and suppliers of every row, one entity query for the whole page. A key the core has no row for stays absent. */
async function withEntities(rows: SignalRow[], entitiesOf: (keys: string[]) => Promise<Map<string, EntityRow>>): Promise<SignalRow[]> {
  const keys = [...new Set(rows.flatMap((s) => [s.authorityKey, ...s.supplierKeys]))];
  if (!keys.length) return rows;
  const found = await entitiesOf(keys);
  return rows.map((s) => ({ ...s, authority: found.get(s.authorityKey) ?? null, suppliers: s.supplierKeys.flatMap((k) => (found.has(k) ? [found.get(k)!] : [])) }));
}

/** The Signals each of `codes` belongs to (latest first), one query: what `Record.signals` and a list's `signals { rule }` read. */
export async function signalsOfRecords(pool: pg.Pool, codes: string[], entitiesOf: (keys: string[]) => Promise<Map<string, EntityRow>>): Promise<Map<string, SignalRow[]>> {
  const out = new Map<string, SignalRow[]>();
  if (!codes.length) return out;
  const { rows } = await pool.query<RawSignal & { record_code: string }>(
    `SELECT m.record_code, ${SIGNAL_COLUMNS} FROM seap.signal_member m JOIN ${SIGNAL_FROM} ON g.id = m.signal_id
      WHERE m.record_code = ANY($1) ORDER BY m.record_code, g.last_date DESC, g.rule, g.id`,
    [codes],
  );
  // a Signal read for several Records is one object, so the page's entities are attached once per Signal
  const byId = new Map<number, SignalRow>();
  const order = new Map<number, SignalRow>();
  for (const r of rows) if (!byId.has(r.ordinal)) byId.set(r.ordinal, toSignal(r));
  const full = await withEntities([...byId.values()], entitiesOf);
  for (const s of full) order.set(s.ordinal, s);
  for (const r of rows) out.set(r.record_code, [...(out.get(r.record_code) ?? []), order.get(r.ordinal)!]);
  return out;
}

export interface SignalDeps {
  pool: pg.Pool;
  entitiesOf(keys: string[]): Promise<Map<string, EntityRow>>;
  rowsOf(raw: unknown[]): Promise<RecordRow[]>;
  recordColumns: string;
}

// Fixed strings, never built from input.
const ORDER: Record<SignalOrderKey, string> = {
  DATE_DESC: "g.last_date DESC, g.value_bani DESC, g.id",
  VALUE_DESC: "g.value_bani DESC, g.last_date DESC, g.id",
};

export function signalStore({ pool, entitiesOf, rowsOf, recordColumns }: SignalDeps): SignalStore {
  return {
    async signalRules() {
      const { rows } = await pool.query(
        `SELECT slug, window_from::text AS window_from, window_to::text AS window_to, base_rate, base_rate_year, data_through::text AS data_through
           FROM seap.signal_rule
          ORDER BY array_position(ARRAY['OVER_CAP', 'SPLITTING', 'FRAMEWORK_OVERRUN', 'NO_PUBLICATION', 'YOUNG_FIRM', 'NO_CONSTRUCTION_CAEN', 'AFTER_STRIKE_OFF', 'INSOLVENCY', 'FEW_EMPLOYEES', 'NO_FINANCIAL_STATEMENT'], slug), slug`,
      );
      return rows.map((r) => ({ slug: r.slug, window: { from: r.window_from, to: r.window_to }, baseRate: r.base_rate, baseRateYear: r.base_rate_year, dataThrough: r.data_through }));
    },

    async roleSignals(filter, { limit, offset, order }, { signal } = {}) {
      const w = buildWhere(filter);
      const params = [...w.params];
      // a Signal is in when one of its Records is in the matching set; the rule filter also narrows which Signals, not only which Records
      const rule = filter.signal ? ` AND g.rule = $${params.push(filter.signal)}` : "";
      const inSet = `g.id IN (SELECT m.signal_id FROM seap.signal_member m WHERE m.record_code IN (SELECT record_code FROM seap.search WHERE ${w.sql}))${rule}`;
      const { rows } = await cancellableQuery<RawSignal & { n: number }>(
        pool, signal,
        `SELECT ${SIGNAL_COLUMNS}, count(*) OVER ()::int AS n FROM ${SIGNAL_FROM} WHERE ${inSet} ORDER BY ${ORDER[order]} LIMIT ${limit} OFFSET ${offset}`,
        params,
      );
      if (rows.length || offset === 0) return { count: rows[0]?.n ?? 0, rows: await withEntities(rows.map(toSignal), entitiesOf) };
      // a page past the end has no row to read the count from
      const total = await cancellableQuery<{ n: number }>(pool, signal, `SELECT count(*)::int AS n FROM ${SIGNAL_FROM} WHERE ${inSet}`, params);
      return { count: total.rows[0]!.n, rows: [] };
    },

    async entitySignalCounts(side, filter, keys, { signal } = {}) {
      const out = new Map<string, number>();
      if (!keys.length) return out;
      const w = buildWhere(filter);
      const params = [...w.params, keys];
      const column = side === "AUTHORITY" ? "authority_key" : "supplier_key";
      // the entity's Records in the set (once each), then the Signals those Records belong to: `roleSignals`' rule per entity. A `signal` in the filter
      // narrows which Signals count, as it does there.
      const rule = filter.signal ? ` AND g.rule = $${params.push(filter.signal)}` : "";
      const { rows } = await cancellableQuery<{ key: string; n: number }>(
        pool, signal,
        `SELECT s.key, count(DISTINCT m.signal_id)::int AS n
           FROM (SELECT DISTINCT ${column} AS key, record_code FROM seap.search WHERE ${w.sql} AND ${column} = ANY($${w.params.length + 1}::text[])) s
           JOIN seap.signal_member m ON m.record_code = s.record_code
           JOIN seap.signal g ON g.id = m.signal_id${rule}
          GROUP BY s.key`,
        params,
      );
      for (const r of rows) out.set(r.key, r.n);
      return out;
    },

    async signalRecords(ordinal, { limit, offset }) {
      const { rows } = await pool.query(
        `SELECT ${recordColumns} FROM seap.record WHERE code IN (SELECT record_code FROM seap.signal_member WHERE signal_id = $1)
          ORDER BY award_date DESC, code LIMIT $2 OFFSET $3`,
        [ordinal, limit, offset],
      );
      return rowsOf(rows);
    },
  };
}

const MAX_LIMIT = 200; // the SDL: "the server caps limit at 200"

/** What a Signal needs from the graph's root: how an Entity and a Record are served. */
export interface SignalHelpers {
  entityObject(e: EntityRow): object;
  recordRow(r: RecordRow): object;
}

/** The GraphQL Signal of a row. `authority`, `suppliers` and `records` are read only when the query selects them. */
export function signalObject(store: SignalStore, s: SignalRow, h: SignalHelpers) {
  const authority = () => {
    const found = s.authority;
    if (!found) throw new Error(`the authority ${s.authorityKey} of a Signal is not in the core`); // the pipeline guarantees it
    return h.entityObject(found);
  };
  return {
    rule: s.rule,
    date: s.date,
    firstDate: s.firstDate,
    authority,
    suppliers: async () => s.suppliers.map(h.entityObject),
    recordCount: s.recordCount,
    records: async ({ limit, offset }: { limit: number; offset: number }) =>
      (await store.signalRecords(s.ordinal, { limit: Math.min(Math.max(limit, 0), MAX_LIMIT), offset: Math.max(offset, 0) })).map(h.recordRow),
    // the union member by slug: the stored numbers already have the member's field names
    numbers: { __typename: NUMBERS_TYPE[s.rule], ...s.numbers },
    reproduce: s.reproduce,
    dataThrough: s.dataThrough,
  };
}
