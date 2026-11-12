import type { Channel, RecordBadge, RecordFilter, ValueBucket } from "@grivei/contract";
import type { Locale } from "../../../theme/index.ts";
import { formatDate } from "../../utils/formatDate.ts";

/** The `RecordFilter` fields the chips own. Everything else (q, county, uat, authority, supplier, cpv, signal, countySide) passes through untouched. */
export const CHIP_FIELDS = ["from", "to", "channel", "valueBucket", "hasSignals", "procedure", "badges"] as const satisfies readonly (keyof RecordFilter)[];
export type ChipField = (typeof CHIP_FIELDS)[number];

/** The first year the data covers (spec default: SEAP bulk data from 2021). */
export const FIRST_YEAR = 2021;

/** `filter` with `patch` applied; a patched field set to undefined, null or an empty list is removed (never left as `[]`); fields outside the patch are left as given. */
export function withFields(filter: RecordFilter, patch: RecordFilter): RecordFilter {
  const next: Record<string, unknown> = { ...filter, ...patch };
  for (const key of Object.keys(patch)) {
    const value = next[key];
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) delete next[key];
  }
  return next as RecordFilter;
}

/** Every chip-owned field of `filter`, absent ones as `undefined`: a patch that makes a patch-merging store (the URL state) land exactly on `filter`. */
export function chipFieldsOf(filter: RecordFilter): RecordFilter {
  const patch: Record<string, unknown> = {};
  for (const field of CHIP_FIELDS) patch[field] = filter[field] ?? undefined;
  return patch as RecordFilter;
}

export const yearStart = (year: number): string => `${year}-01-01`;
export const yearEnd = (year: number): string => `${year}-12-31`;

/** The calendar year a `YYYY-MM-DD` date falls in, or undefined for anything else. */
export function yearOf(date: string | null | undefined): number | undefined {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(date ?? "");
  return match ? Number(match[1]) : undefined;
}

/** True when `from` is a January 1 (the year chip's value). */
export const startsYear = (date: string | null | undefined): boolean => /^\d{4}-01-01$/.test(date ?? "");
/** True when `to` is a December 31. */
export const endsYear = (date: string | null | undefined): boolean => /^\d{4}-12-31$/.test(date ?? "");

export const setFromYear = (filter: RecordFilter, year: number | undefined): RecordFilter =>
  withFields(filter, { from: year === undefined ? undefined : yearStart(year) });
export const setToYear = (filter: RecordFilter, year: number | undefined): RecordFilter =>
  withFields(filter, { to: year === undefined ? undefined : yearEnd(year) });

/**
 * The years a year select offers: `firstYear` to `lastYear`, plus any year the filter already holds outside that range
 * (a URL can say anything), so the select always reflects the filter. Ascending.
 */
export function yearOptions(firstYear: number, lastYear: number, filter: RecordFilter): number[] {
  const years = new Set<number>();
  for (let year = firstYear; year <= lastYear; year += 1) years.add(year);
  for (const held of [yearOf(filter.from), yearOf(filter.to)]) if (held !== undefined) years.add(held);
  return [...years].sort((a, b) => a - b);
}

/** Add `item` to `list`, or remove it when already there; the order of the list is kept stable (new items go last). */
export function toggleItem<T>(list: readonly T[] | null | undefined, item: T): T[] {
  const current = list ?? [];
  return current.includes(item) ? current.filter((existing) => existing !== item) : [...current, item];
}

export const toggleBadge = (filter: RecordFilter, badge: RecordBadge): RecordFilter => withFields(filter, { badges: toggleItem(filter.badges, badge) });
export const toggleProcedure = (filter: RecordFilter, procedure: string): RecordFilter =>
  withFields(filter, { procedure: toggleItem(filter.procedure, procedure) });
/** Single choice: choosing the active channel again unsets it. */
export const toggleChannel = (filter: RecordFilter, channel: Channel): RecordFilter =>
  withFields(filter, { channel: filter.channel === channel ? undefined : channel });
export const toggleValueBucket = (filter: RecordFilter, bucket: ValueBucket): RecordFilter =>
  withFields(filter, { valueBucket: filter.valueBucket === bucket ? undefined : bucket });
/** The chip offers `true` or nothing; a given `false` ("without Signals") is replaced by `true`. */
export const toggleHasSignals = (filter: RecordFilter): RecordFilter => withFields(filter, { hasSignals: filter.hasSignals === true ? undefined : true });

/** The filter with every chip-owned field removed. */
export const clearChips = (filter: RecordFilter): RecordFilter => withFields(filter, chipFieldsOf({}));

/** The procedures to offer: the caller's, then any the filter holds that the caller did not list. */
export function procedureChoices(options: readonly string[], filter: RecordFilter): string[] {
  const held = (filter.procedure ?? []).filter((name) => !options.includes(name));
  return [...options, ...held];
}

export interface ActiveChip {
  id: string;
  label: string;
  /** The filter without this chip's value. */
  remove: (filter: RecordFilter) => RecordFilter;
}

export interface ActiveChipText {
  from: (when: string) => string;
  to: (when: string) => string;
  channel: Record<Channel, string>;
  valueBucket: Record<ValueBucket, string>;
  hasSignals: string;
  withoutSignals: string;
  badges: Record<RecordBadge, string>;
}

/**
 * One entry per active chip, in a stable order: dates, channel, value bucket, Signals, procedures, badges (in the
 * order of the filter's list). A date that is not Jan 1 (from) or Dec 31 (to) is shown as the date, not as its year.
 */
export function activeChips(filter: RecordFilter, text: ActiveChipText, locale: Locale): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const when = (date: string, aligned: boolean) => (aligned ? String(yearOf(date)) : formatDateOr(date, locale));
  if (filter.from) {
    const from = filter.from;
    chips.push({ id: "from", label: text.from(when(from, startsYear(from))), remove: (f) => withFields(f, { from: undefined }) });
  }
  if (filter.to) {
    const to = filter.to;
    chips.push({ id: "to", label: text.to(when(to, endsYear(to))), remove: (f) => withFields(f, { to: undefined }) });
  }
  if (filter.channel) chips.push({ id: "channel", label: text.channel[filter.channel], remove: (f) => withFields(f, { channel: undefined }) });
  if (filter.valueBucket)
    chips.push({ id: "valueBucket", label: text.valueBucket[filter.valueBucket], remove: (f) => withFields(f, { valueBucket: undefined }) });
  if (filter.hasSignals !== undefined && filter.hasSignals !== null)
    chips.push({
      id: "hasSignals",
      label: filter.hasSignals ? text.hasSignals : text.withoutSignals,
      remove: (f) => withFields(f, { hasSignals: undefined }),
    });
  for (const name of filter.procedure ?? [])
    chips.push({ id: `procedure:${name}`, label: name, remove: (f) => withFields(f, { procedure: (f.procedure ?? []).filter((p) => p !== name) }) });
  for (const badge of filter.badges ?? [])
    chips.push({ id: `badge:${badge}`, label: text.badges[badge], remove: (f) => withFields(f, { badges: (f.badges ?? []).filter((b) => b !== badge) }) });
  return chips;
}

function formatDateOr(date: string, locale: Locale): string {
  try {
    return yearOf(date) === undefined ? date : formatDate(date, locale);
  } catch {
    return date;
  }
}
