import type { Channel, RecordBadge, RecordFilter, SignalRuleSlug } from "@grivei/contract";
import type { BadgeCopy } from "../../../../atoms/BadgeChip/index.ts";
import type { RecordFacetData, EntityRole } from "../../../../types.ts";
import type { FacetOptionData } from "../FacetGroup/index.ts";
import { toggleBadge, toggleChannel, toggleProcedure } from "../../../../molecules/FilterChips/index.ts";
import { selectedYear, toggleCounterparty, toggleSignal, toggleYear, counterpartyField } from "../../recordsTab.utils.ts";

export interface FacetPanelCopy {
  /** The panel's accessible name. */
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
  copy: FacetPanelCopy,
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
