// The role aggregates of an entity page (#73): what one authority or supplier did in SEAP, under the page's filter.
// Everything is read from `seap.search` (one row per Record x winner) through the same `buildWhere` the search uses, with the
// filter scoped to the entity on its side, so a role's Total is the entity-scoped search's Total by construction. The counting
// rule is not applied here, only summed: a Record counts once per group (its winners' shares add up to its counted value), and
// the supplier side adds the entity's own share. See store.ts `areaTotals` for the same shape per map area.
import type pg from "pg";
import { buildWhere as buildWhereFor, cancellableQuery, type SearchFilter } from "./search.ts";
import type { EntityRow, RecordRow, SearchOptions, TotalRow } from "./store.ts";

export type RoleSide = "AUTHORITY" | "SUPPLIER";

/** The filter scoped to the entity on its side: an authority's page matches `authority = key`, a supplier's `supplier = key` (the other side's key stays a counterparty restriction). */
export function scopeFilter(side: RoleSide, key: string, filter: SearchFilter | null | undefined): SearchFilter {
  return side === "AUTHORITY" ? { ...filter, authority: key } : { ...filter, supplier: key };
}

/** The side a role's counterparties are on: an authority's are suppliers and the other way round. */
export const otherSide = (side: RoleSide): RoleSide => (side === "AUTHORITY" ? "SUPPLIER" : "AUTHORITY");

/** The filter with one counterparty (an entity key of the other side) picked. A natural person has no key, so cannot be picked. */
export function withCounterparty(side: RoleSide, counterparty: string, filter: SearchFilter): SearchFilter {
  return side === "AUTHORITY" ? { ...filter, supplier: counterparty } : { ...filter, authority: counterparty };
}

/**
 * part / whole as a Float, from exact bani strings: 0 when the whole is 0 (nothing was awarded), nine decimals.
 * BigInt first, so no sum loses precision before the division.
 */
export function shareOf(part: string, whole: string): number {
  const w = BigInt(whole);
  if (w === 0n) return 0;
  return Number((BigInt(part) * 1_000_000_000n) / w) / 1e9;
}

/** The facets of the Records tab that are Totals per value. */
export type FacetDimension = "channel" | "procedure" | "year" | "badge" | "signal";

export interface FacetRow {
  value: string;
  total: TotalRow;
}

/** One counterparty on an entity page. A natural person has no entity and is never named: all of them are ONE row (the whole group's money). */
export interface CounterpartyRow {
  entity: EntityRow | null;
  naturalPerson: boolean;
  total: TotalRow;
  viaDirectPurchase: TotalRow;
  viaContract: TotalRow;
  /** At least one of the pair's Records in the set had more than one winner. */
  wonTogether: boolean;
  /** The pair shares at least one Signal: one of the pair's Records (the entity's with this counterparty) belongs to a Signal. */
  hasSignals: boolean;
}

export interface ConsortiumMember {
  naturalPerson: boolean;
  name: string | null;
  entity: EntityRow | null;
  /** The member's equal shares summed over the group's Records, in bani; null when none of them was counted. */
  share: string | null;
}

/** Records with the same members, with what they add up to (the Records' whole counted value). */
export interface ConsortiumRow {
  members: ConsortiumMember[];
  total: TotalRow;
}

export interface FrameworkTotals {
  /** Framework agreements in the set (suspect ones left out; a blank ceiling still counts as an agreement). */
  count: number;
  ceilings: string;
  /** What the contracts awarded under those agreements' notices reported, once per notice. */
  subsequentReported: string;
}

export interface RoleStore {
  /** The other side's entities ranked by money. `filter` is already scoped to the entity (see `scopeFilter`). */
  roleCounterparties(side: RoleSide, filter: SearchFilter, page: { limit: number }, options?: SearchOptions): Promise<{ count: number; rows: CounterpartyRow[] }>;
  /** The set's Total per value of a facet dimension, biggest first (ties by value). */
  searchFacet(dimension: FacetDimension, filter: SearchFilter, options?: SearchOptions): Promise<FacetRow[]>;
  /** The set's Total per month (`2024-03`), oldest first; months with no Record are absent. */
  searchMonths(filter: SearchFilter, options?: SearchOptions): Promise<{ month: string; total: TotalRow }[]>;
  roleFrameworks(filter: SearchFilter, options?: SearchOptions): Promise<FrameworkTotals>;
  roleConsortia(filter: SearchFilter, page: { limit: number }, options?: SearchOptions): Promise<ConsortiumRow[]>;
  /** The Records that add the most to the set (the entity's share on the supplier side); suspect, ceilings and blank values add nothing and are absent. */
  roleLargest(filter: SearchFilter, page: { limit: number }, options?: SearchOptions): Promise<RecordRow[]>;
}

export interface RoleDeps {
  pool: pg.Pool;
  entitiesOf(keys: string[]): Promise<Map<string, EntityRow>>;
  rowsOf(raw: unknown[]): Promise<RecordRow[]>;
  recordColumns: string;
  fallbackEntity(key: string, name: string | null, fetchedAt: string): EntityRow;
  /** Restricted Signal rules are served (#185); default off. */
  restricted?: boolean;
}

/**
 * The Total's five columns over the per-(group, Record) rows `sh, suspect, no_value, ceil` (see `perRecord`), optionally only
 * the rows that meet `cond` (the channel split): column names are `<prefix>awarded` ... Fixed strings.
 */
function totalColumns(prefix: string, cond?: string): string {
  const only = (extra?: string) => {
    const c = [cond, extra].filter(Boolean).join(" AND ");
    return c ? ` FILTER (WHERE ${c})` : "";
  };
  return `coalesce(sum(sh)${only()}, 0)::text AS ${prefix}awarded, (count(*)${only()})::int AS ${prefix}records,
          (count(*)${only("suspect")})::int AS ${prefix}suspect_left_out, (count(*)${only("no_value")})::int AS ${prefix}no_value,
          coalesce(sum(ceil)${only()}, 0)::text AS ${prefix}framework_ceilings`;
}

function totalFrom(r: Record<string, unknown>, prefix = ""): TotalRow {
  return {
    awarded: r[`${prefix}awarded`] as string,
    records: r[`${prefix}records`] as number,
    suspectLeftOut: r[`${prefix}suspect_left_out`] as number,
    noValue: r[`${prefix}no_value`] as number,
    frameworkCeilings: r[`${prefix}framework_ceilings`] as string,
  };
}

/**
 * The matching rows folded to one row per (group, Record): the winners' shares that matched summed, the Record's flags and its
 * ceiling. A Record counts once per group, which is what makes the groups' numbers add up to the set's Total (the authority side:
 * the shares of all winners are the counted value; the supplier side: only the entity's own share matched).
 */
function perRecord(groupSql: string, whereSql: string, extra = "", table = "seap.search"): string {
  return `SELECT ${groupSql} AS g, record_code, sum(share_bani) AS sh, bool_or(suspect) AS suspect, bool_or(value_bani IS NULL) AS no_value,
                 max(ceiling_bani) AS ceil, max(channel) AS channel, max(winners) AS winners, bool_or(has_signals) AS has_signals ${extra}
            FROM ${table} WHERE ${whereSql} GROUP BY ${groupSql}, record_code`;
}

export function roleStore(deps: RoleDeps): RoleStore {
  const { pool, entitiesOf, fallbackEntity } = deps;
  const { rowsOf } = deps;
  const whereOf = (filter: SearchFilter) => buildWhereFor(filter, deps.restricted === true);

  return {
    async roleCounterparties(side, filter, { limit }, { signal } = {}) {
      const w = whereOf(filter);
      // The counterparty's key: the supplier on an authority's page, the authority on a supplier's. A row with no key is either a natural
      // person (all of them one group, `#person`; the winner's `naturalPerson` flag on the Record says so) or a winner nobody could link,
      // or a Record with no winner (`#unknown`): those are NOT natural persons.
      const gk =
        side === "AUTHORITY"
          ? `CASE WHEN s.supplier_key IS NOT NULL THEN s.supplier_key
                  WHEN coalesce((SELECT (r.winners -> (s.winner_position - 1) ->> 'naturalPerson')::boolean FROM seap.record r WHERE r.code = s.record_code), false) THEN '#person'
                  ELSE '#unknown' END`
          : `coalesce(s.authority_key, '#unknown')`;
      const table = `(SELECT s.*, ${gk} AS gk FROM seap.search s WHERE ${w.sql}) t`;
      const asked = Math.max(limit, 1); // a page of 0 still has to say how many there are
      const rows = (
        await cancellableQuery<Record<string, unknown> & { key: string; n: number; won_together: boolean; has_signals: boolean }>(
          pool, signal,
          `SELECT g AS key, ${totalColumns("")}, ${totalColumns("dp_", "channel = 'DIRECT_PURCHASE'")}, ${totalColumns("c_", "channel = 'CONTRACT'")},
                  bool_or(winners > 1) AS won_together, bool_or(has_signals) AS has_signals, count(*) OVER ()::int AS n
             FROM (${perRecord("gk", "true", "", table)}) r
            GROUP BY g ORDER BY coalesce(sum(sh), 0) DESC, (g LIKE '#%'), g LIMIT ${asked}`,
          w.params,
        )
      ).rows;
      const count = rows[0]?.n ?? 0;
      const page = rows.slice(0, limit);
      const isKey = (k: string) => !k.startsWith("#");
      const keys = page.map((r) => r.key).filter(isKey);
      const entities = await entitiesOf(keys);
      const now = new Date().toISOString();
      return {
        count,
        rows: page.map((r) => ({
          entity: isKey(r.key) ? (entities.get(r.key) ?? fallbackEntity(r.key, null, now)) : null,
          naturalPerson: r.key === "#person",
          total: totalFrom(r),
          viaDirectPurchase: totalFrom(r, "dp_"),
          viaContract: totalFrom(r, "c_"),
          wonTogether: r.won_together,
          hasSignals: r.has_signals,
        })),
      };
    },

    async searchFacet(dimension, filter, { signal } = {}) {
      const w = whereOf(filter);
      let sql: string;
      if (dimension === "badge" || dimension === "signal") {
        // a Record has several badges (or belongs to several Signals' rules): one row per (value, Record). The inner select is what the index serves; the unnest is above it.
        const column = dimension === "badge" ? "badges" : "signals";
        sql = `SELECT v AS value, ${totalColumns("")}
                 FROM (SELECT record_code, ${column}, sum(share_bani) AS sh, bool_or(suspect) AS suspect, bool_or(value_bani IS NULL) AS no_value, max(ceiling_bani) AS ceil
                         FROM seap.search WHERE ${w.sql} GROUP BY record_code, ${column}) r, unnest(${column}) AS v
                GROUP BY v ORDER BY coalesce(sum(sh), 0) DESC, v`;
      } else {
        const column = { channel: "channel", procedure: "procedure", year: "award_year::text" }[dimension];
        // a Record with no procedure (a direct purchase) is in the channel facet, not in this one
        const where = dimension === "procedure" ? `${w.sql} AND procedure IS NOT NULL` : w.sql;
        sql = `SELECT g AS value, ${totalColumns("")} FROM (${perRecord(column, where)}) r GROUP BY g ORDER BY coalesce(sum(sh), 0) DESC, g`;
      }
      const { rows } = await cancellableQuery<Record<string, unknown> & { value: string }>(pool, signal, sql, w.params);
      return rows.map((r) => ({ value: r.value, total: totalFrom(r) }));
    },

    async searchMonths(filter, { signal } = {}) {
      const w = whereOf(filter);
      const { rows } = await cancellableQuery<Record<string, unknown> & { month: string }>(
        pool, signal,
        `SELECT g AS month, ${totalColumns("")} FROM (${perRecord("to_char(award_date, 'YYYY-MM')", w.sql)}) r GROUP BY g ORDER BY g`,
        w.params,
      );
      return rows.map((r) => ({ month: r.month, total: totalFrom(r) }));
    },

    async roleFrameworks(filter, { signal } = {}) {
      const w = whereOf(filter);
      const { rows } = await cancellableQuery<{ count: number; ceilings: string; subsequent: string }>(
        pool, signal,
        `WITH m AS (SELECT record_code, max(ceiling_bani) AS ceil FROM seap.search WHERE ${w.sql} GROUP BY record_code),
              f AS (SELECT m.ceil, r.notice_code FROM m JOIN seap.record r ON r.code = m.record_code WHERE r.framework_role = 'CEILING' AND NOT r.suspect)
         SELECT count(*)::int AS count, coalesce(sum(ceil), 0)::text AS ceilings,
                coalesce((SELECT sum(fw.subsequent_bani) FROM seap.framework fw WHERE fw.notice_code IN (SELECT notice_code FROM f)), 0)::text AS subsequent
           FROM f`,
        w.params,
      );
      const r = rows[0]!;
      return { count: r.count, ceilings: r.ceilings, subsequentReported: r.subsequent };
    },

    async roleConsortia(filter, { limit }, { signal } = {}) {
      const w = whereOf(filter);
      // The Records of the set with more than one winner, grouped by who won them (the sorted member keys; natural persons have no key, they are `#person`).
      // The group's money is the Records' whole counted value on both sides, so one consortium reads the same on the authority's and the supplier's page.
      // (a natural person is `#person`; a winner nobody could link is `#unknown`: the two are different members)
      const memberKey = `CASE WHEN coalesce((x->>'naturalPerson')::boolean, false) THEN '#person' ELSE coalesce(x->>'key', '#unknown') END`;
      const members = `(SELECT string_agg(${memberKey}, ',' ORDER BY ${memberKey}) FROM jsonb_array_elements(r.winners) x)`;
      const groups = await cancellableQuery<Record<string, unknown> & { sig: string }>(
        pool, signal,
        `WITH m AS (SELECT record_code, sum(share_bani) AS sh, bool_or(suspect) AS suspect, bool_or(value_bani IS NULL) AS no_value, max(ceiling_bani) AS ceil,
                           max(counted_bani) AS counted
                      FROM seap.search WHERE ${w.sql} GROUP BY record_code HAVING max(winners) > 1),
              c AS (SELECT m.counted AS sh, m.suspect, m.no_value, m.ceil, ${members} AS sig FROM m JOIN seap.record r ON r.code = m.record_code)
         SELECT sig, ${totalColumns("")} FROM c GROUP BY sig ORDER BY coalesce(sum(sh), 0) DESC, sig LIMIT ${limit}`,
        w.params,
      );
      if (!groups.rows.length) return [];
      // each group's members: the first Record's winners in published order, with every member's shares summed over the group's Records
      // (a natural person is told apart by its order among the Record's natural persons, so two of them stay two members)
      const found = await cancellableQuery<{ sig: string; mid: string; val: { key?: string | null; name?: string | null; naturalPerson?: boolean }; share: string | null }>(
        pool, signal,
        `WITH m AS (SELECT record_code FROM seap.search WHERE ${w.sql} GROUP BY record_code HAVING max(winners) > 1),
              c AS (SELECT r.code, r.winners, ${members} AS sig FROM m JOIN seap.record r ON r.code = m.record_code),
              x AS (SELECT c.sig, c.code, e.val, e.ord,
                           CASE WHEN coalesce((e.val->>'naturalPerson')::boolean, false)
                                THEN '#person' || row_number() OVER (PARTITION BY c.code, coalesce((e.val->>'naturalPerson')::boolean, false) ORDER BY e.ord)
                                ELSE coalesce(e.val->>'key', '#unknown' || e.ord) END AS mid
                      FROM c CROSS JOIN LATERAL jsonb_array_elements(c.winners) WITH ORDINALITY AS e(val, ord))
         SELECT x.sig, x.mid, (array_agg(x.val ORDER BY x.code))[1] AS val, sum(s.share_bani)::text AS share
           FROM x LEFT JOIN seap.search s ON s.record_code = x.code AND s.winner_position = x.ord
          WHERE x.sig = ANY($${w.params.length + 1}::text[]) GROUP BY x.sig, x.mid ORDER BY x.sig, min(x.ord), x.mid`,
        [...w.params, groups.rows.map((g) => g.sig)],
      );
      const keys = [...new Set(found.rows.map((r) => r.val.key).filter((k): k is string => !!k))];
      const entities = await entitiesOf(keys);
      const now = new Date().toISOString();
      const bySig = new Map<string, ConsortiumMember[]>();
      for (const r of found.rows) {
        const natural = r.val.naturalPerson === true;
        const member: ConsortiumMember = {
          naturalPerson: natural,
          name: natural ? null : (r.val.name ?? null),
          entity: natural || !r.val.key ? null : (entities.get(r.val.key) ?? fallbackEntity(r.val.key, r.val.name ?? null, now)),
          share: r.share,
        };
        bySig.set(r.sig, [...(bySig.get(r.sig) ?? []), member]);
      }
      return groups.rows.map((g) => ({ members: bySig.get(g.sig) ?? [], total: totalFrom(g) }));
    },

    async roleLargest(filter, { limit }, { signal } = {}) {
      const w = whereOf(filter);
      const codes = await cancellableQuery<{ record_code: string }>(
        pool, signal,
        `SELECT record_code FROM seap.search WHERE ${w.sql} GROUP BY record_code HAVING sum(share_bani) IS NOT NULL
          ORDER BY sum(share_bani) DESC, record_code LIMIT ${limit}`,
        w.params,
      );
      const wanted = codes.rows.map((r) => r.record_code);
      if (!wanted.length) return [];
      const { rows } = await cancellableQuery<Record<string, unknown>>(pool, signal, `SELECT ${deps.recordColumns} FROM seap.record WHERE code = ANY($1)`, [wanted]);
      const byCode = new Map((await rowsOf(rows)).map((r) => [r.code, r]));
      return wanted.map((c) => byCode.get(c)).filter((r): r is RecordRow => !!r);
    },
  };
}
