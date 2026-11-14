// The rollup reads (#70): the empty and chips-only search states, answered from the tables the pipeline rebuilds inside the
// load transaction (watchdog/pipeline/rollup.py) instead of scanning `seap.search`. Fixed strings and bound parameters only.
import type { SearchFilter } from "./search.ts";
import { foldTokens } from "./fold.ts";

/** The cube dimensions a filter narrows by. Anything else (text, badges, procedure, a partial-year range, CPV, county, entity) is not a dimension. */
export interface RollupPlan {
  yearFrom: number | null;
  yearTo: number | null;
  channel: string | null;
  valueBucket: string | null;
  hasSignals: boolean | null;
}

const JAN_1 = /^(\d{4})-01-01$/;
const DEC_31 = /^(\d{4})-12-31$/;

/**
 * The plan that serves `filter` from the rollup, or null when the filter needs the full scan: it has a text query, or a chip
 * that is not a cube dimension (badges, procedure), or a date range that does not start on Jan 1 and end on Dec 31 (a year
 * chip does), or an entity/CPV/county/UAT/Signal scope. Those are answered by the scan, with the same result.
 */
export function rollupPlan(filter: SearchFilter): RollupPlan | null {
  if (foldTokens(filter.q ?? "").length) return null;
  if (filter.badges?.length || filter.procedure?.length) return null;
  if (filter.cpv || filter.authority || filter.supplier || filter.county || filter.uat || filter.signal || filter.party) return null;
  let yearFrom: number | null = null;
  let yearTo: number | null = null;
  if (filter.from) {
    const m = JAN_1.exec(filter.from);
    if (!m) return null;
    yearFrom = Number(m[1]);
  }
  if (filter.to) {
    const m = DEC_31.exec(filter.to);
    if (!m) return null;
    yearTo = Number(m[1]);
  }
  return { yearFrom, yearTo, channel: filter.channel ?? null, valueBucket: filter.valueBucket ?? null, hasSignals: filter.hasSignals ?? null };
}

/** The WHERE over the rollup tables for a plan; the bound values are pushed onto `params`. */
export function rollupWhere(plan: RollupPlan, params: unknown[]): string {
  const preds: string[] = [];
  const bind = (v: unknown) => {
    params.push(v);
    return `$${params.length}`;
  };
  if (plan.yearFrom !== null) preds.push(`award_year >= ${bind(plan.yearFrom)}`);
  if (plan.yearTo !== null) preds.push(`award_year <= ${bind(plan.yearTo)}`);
  if (plan.channel) preds.push(`channel = ${bind(plan.channel)}`);
  if (plan.valueBucket) preds.push(`value_bucket = ${bind(plan.valueBucket)}`);
  if (plan.hasSignals !== null) preds.push(`has_signals = ${bind(plan.hasSignals)}`);
  return preds.length ? preds.join(" AND ") : "true";
}
