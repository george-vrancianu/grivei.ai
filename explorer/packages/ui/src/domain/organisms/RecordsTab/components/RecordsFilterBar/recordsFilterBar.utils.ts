import type { Channel, RecordBadge, RecordFilter, SignalRuleSlug } from "@grivei/contract";
import type { BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { RecordFacetData, EntityRole } from "../../../../types.ts";
import { endsYear, startsYear, toggleBadge, toggleChannel, toggleProcedure, withFields, yearOf, type ActiveChip } from "../../../../molecules/FilterChips/index.ts";
import { formatDate } from "../../../../utils/formatDate.ts";
import { selectedYear, toggleCounterparty, toggleSignal, toggleYear, counterpartyField } from "../../recordsTab.utils.ts";

export interface FacetOptionData {
  /** Unique in its group: the facet's value (a year, a channel, a procedure, an entity key ...). */
  id: string;
  label: string;
  /** The facet's Record count; absent for an active value the facets did not list. */
  count?: { records: number; estimated: boolean };
  pressed: boolean;
  /** A tooltip (a badge's caveat). */
  description?: string;
  onToggle: () => void;
}

export interface RecordsFilterBarCopy {
  /** The bar's accessible name. */
  label: string;
  groups: { signal: string; channel: string; procedure: string; year: string; counterpartyOfAuthority: string; counterpartyOfSupplier: string; badge: string };
  /** "Direct purchase (12)": a value and its count, the count already in the locale's number format. */
  option: (label: string, count: string) => string;
  /** The label of an active counterparty the facets did not list (only its key is known). */
  counterpartyKey: (key: string) => string;
  signals: Record<SignalRuleSlug, string>;
  channels: Record<Channel, string>;
  /** The badge catalogue the Record rows use: each chip's label, and its explanation as the tooltip. */
  badges: BadgeCopy;
  /** A menu's button while nothing is chosen: "Any". */
  any: string;
  /** A multi-choice menu's button once more than one value is chosen: "3 picked". */
  picked: (n: number) => string;
  /** The active row: one chip per parameter that is set. */
  active: {
    group: string;
    remove: (chip: string) => string;
    clearAll: string;
    /** "From 2023" / "From 15 Mar 2024": `when` is a year, or a date when the filter's date is not a year edge. */
    from: (when: string) => string;
    to: (when: string) => string;
    /** "2023 – 15 Mar 2024": both ends of a date range as one chip. */
    between: (from: string, to: string) => string;
    /** "Signal: No publication". */
    signal: (rule: string) => string;
    /** "CPV: 45210000". */
    cpv: (code: string) => string;
    /** The search text the filter holds: "only Records matching “x”". */
    query: (text: string) => string;
  };
}

export interface FacetGroupData {
  id: string;
  title: string;
  options: FacetOptionData[];
}

const count = (total: { records: number; estimated: boolean }) => ({ records: total.records, estimated: total.estimated });

/** The options a group offers: its listed values, then the active ones the list lacks (no count). Skips nothing else. */
function merge(listed: FacetOptionData[], active: FacetOptionData[]): FacetOptionData[] {
  const ids = new Set(listed.map((option) => option.id));
  return [...listed, ...active.filter((option) => !ids.has(option.id))];
}

/**
 * The panel's groups, in the order Signal, channel, procedure, year, counterparty, badge. A group with no option (nothing listed,
 * nothing active) is left out. Choosing an option calls `onChange` with the filter that choice makes.
 */
export function facetGroups(
  facets: RecordFacetData,
  filter: RecordFilter,
  role: EntityRole,
  copy: RecordsFilterBarCopy,
  onChange: (next: RecordFilter) => void,
): FacetGroupData[] {
  const field = counterpartyField(role);
  const year = selectedYear(filter);
  const held = filter[field] === undefined || filter[field] === null ? undefined : String(filter[field]);
  const groups: FacetGroupData[] = [
    {
      id: "signal",
      title: copy.groups.signal,
      options: merge(
        facets.signal.map((f) => ({
          id: f.value, label: copy.signals[f.value as SignalRuleSlug] ?? f.value, count: count(f.total), pressed: filter.signal === f.value,
          onToggle: () => onChange(toggleSignal(filter, f.value as SignalRuleSlug)),
        })),
        filter.signal
          ? [{ id: filter.signal, label: copy.signals[filter.signal] ?? filter.signal, pressed: true, onToggle: () => onChange(toggleSignal(filter, filter.signal!)) }]
          : [],
      ),
    },
    {
      id: "channel",
      title: copy.groups.channel,
      options: merge(
        facets.channel.map((f) => ({
          id: f.value, label: copy.channels[f.value as Channel] ?? f.value, count: count(f.total), pressed: filter.channel === f.value,
          onToggle: () => onChange(toggleChannel(filter, f.value as Channel)),
        })),
        filter.channel
          ? [{ id: filter.channel, label: copy.channels[filter.channel] ?? filter.channel, pressed: true, onToggle: () => onChange(toggleChannel(filter, filter.channel!)) }]
          : [],
      ),
    },
    {
      id: "procedure",
      title: copy.groups.procedure,
      options: merge(
        facets.procedure.map((f) => ({
          id: f.value, label: f.value, count: count(f.total), pressed: (filter.procedure ?? []).includes(f.value),
          onToggle: () => onChange(toggleProcedure(filter, f.value)),
        })),
        (filter.procedure ?? []).map((name) => ({ id: name, label: name, pressed: true, onToggle: () => onChange(toggleProcedure(filter, name)) })),
      ),
    },
    {
      id: "year",
      title: copy.groups.year,
      options: merge(
        facets.year.map((f) => ({
          id: f.value, label: f.value, count: count(f.total), pressed: String(year) === f.value,
          onToggle: () => onChange(toggleYear(filter, Number(f.value))),
        })),
        year === undefined ? [] : [{ id: String(year), label: String(year), pressed: true, onToggle: () => onChange(toggleYear(filter, year)) }],
      ),
    },
    {
      id: "counterparty",
      title: role === "authority" ? copy.groups.counterpartyOfAuthority : copy.groups.counterpartyOfSupplier,
      options: merge(
        facets.counterparty.map((f) => ({
          id: f.entity.key, label: f.entity.displayName, count: count(f.matched), pressed: held === f.entity.key,
          onToggle: () => onChange(toggleCounterparty(filter, role, f.entity.key)),
        })),
        held === undefined ? [] : [{ id: held, label: copy.counterpartyKey(held), pressed: true, onToggle: () => onChange(toggleCounterparty(filter, role, held)) }],
      ),
    },
    {
      id: "badge",
      title: copy.groups.badge,
      options: merge(
        facets.badge.map((f) => ({
          id: f.value, label: copy.badges[f.value as RecordBadge]?.label ?? f.value, count: count(f.total), pressed: (filter.badges ?? []).includes(f.value as RecordBadge),
          ...(copy.badges[f.value as RecordBadge] ? { description: copy.badges[f.value as RecordBadge].explanation } : {}),
          onToggle: () => onChange(toggleBadge(filter, f.value as RecordBadge)),
        })),
        (filter.badges ?? []).map((badge) => ({
          id: badge, label: copy.badges[badge].label, description: copy.badges[badge].explanation, pressed: true, onToggle: () => onChange(toggleBadge(filter, badge)),
        })),
      ),
    },
  ];
  return groups.filter((group) => group.options.length > 0);
}

/** The `RecordFilter` fields the active row shows, one chip each (the date range, `from` and `to`, is one chip): the filter's Records parameters. */
const CHIP_PARAMS = ["signal", "supplier", "authority", "from", "to", "cpv", "channel", "procedure", "badges", "q"] as const satisfies readonly (keyof RecordFilter)[];

const isSet = (value: unknown) => (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== "");

/** True when the filter holds a parameter the active row shows: there is something to clear. */
export const hasRecordFilters = (filter: RecordFilter): boolean => CHIP_PARAMS.some((field) => isSet(filter[field]));

/** The filter with every parameter the active row shows removed (the row's Clear filters); the rest of the filter (map, value bucket, ...) stays. */
export function clearRecordFilters(filter: RecordFilter): RecordFilter {
  const patch: Record<string, undefined> = {};
  for (const field of CHIP_PARAMS) patch[field] = undefined;
  return withFields(filter, patch as RecordFilter);
}

/**
 * One chip per parameter that is set, each removing only its own parameter (the date range is one chip and removes both ends): the Signal, the supplier or authority
 * (by name when the facets list it, else by key), the date range, the CPV code, the channel, each procedure, each badge and the search text.
 */
export function recordChips(filter: RecordFilter, role: EntityRole, facets: RecordFacetData, copy: RecordsFilterBarCopy, locale: Locale): ActiveChip[] {
  const chips: ActiveChip[] = [];
  const text = copy.active;
  if (filter.signal) chips.push({ id: "signal", label: text.signal(copy.signals[filter.signal] ?? filter.signal), remove: (f) => withFields(f, { signal: undefined }) });
  for (const field of ["supplier", "authority"] as const) {
    const value = filter[field];
    if (value === undefined || value === null) continue;
    const key = String(value);
    const known = field === counterpartyField(role) ? facets.counterparty.find((f) => f.entity.key === key)?.entity.displayName : undefined;
    chips.push({ id: field, label: known ?? copy.counterpartyKey(key), remove: (f) => withFields(f, { [field]: undefined }) });
  }
  const when = (date: string, aligned: boolean) => (aligned ? String(yearOf(date)) : yearOf(date) === undefined ? date : formatDate(date, locale));
  const { from, to } = filter;
  if (from || to) {
    const label =
      from && to
        ? selectedYear(filter) !== undefined
          ? String(selectedYear(filter))
          : text.between(when(from, startsYear(from)), when(to, endsYear(to)))
        : from
          ? text.from(when(from, startsYear(from)))
          : text.to(when(to!, endsYear(to!)));
    chips.push({ id: "dates", label, remove: (f) => withFields(f, { from: undefined, to: undefined }) });
  }
  if (filter.cpv) chips.push({ id: "cpv", label: text.cpv(filter.cpv), remove: (f) => withFields(f, { cpv: undefined }) });
  if (filter.channel) chips.push({ id: "channel", label: copy.channels[filter.channel] ?? filter.channel, remove: (f) => withFields(f, { channel: undefined }) });
  for (const name of filter.procedure ?? [])
    chips.push({ id: `procedure:${name}`, label: name, remove: (f) => withFields(f, { procedure: (f.procedure ?? []).filter((p) => p !== name) }) });
  for (const badge of filter.badges ?? [])
    chips.push({ id: `badge:${badge}`, label: copy.badges[badge].label, remove: (f) => withFields(f, { badges: (f.badges ?? []).filter((b) => b !== badge) }) });
  if (filter.q) chips.push({ id: "q", label: text.query(filter.q), remove: (f) => withFields(f, { q: undefined }) });
  return chips;
}
