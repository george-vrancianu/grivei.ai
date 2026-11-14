import type { OnrcFilter } from "@grivei/contract";
import { toggleItem } from "../FilterChips/index.ts";
import type { OnrcFilterChipsCopy } from "./onrcFilterChips.types.ts";

/** The statuses the chips offer, by ONRC's code: in operation, insolvency, struck off, temporarily suspended. Any other code a URL holds is added as an active chip. */
export const ONRC_STATUS_CHOICES: readonly number[] = [1048, 1107, 1084, 1074];

/** `filter` with `patch` applied; a patched field set to undefined, null or an empty list is removed. */
export function withOnrcFields(filter: OnrcFilter, patch: OnrcFilter): OnrcFilter {
  const next: Record<string, unknown> = { ...filter, ...patch };
  for (const key of Object.keys(patch)) {
    const value = next[key];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) delete next[key];
  }
  return next as OnrcFilter;
}

export const toggleStatus = (filter: OnrcFilter, code: number): OnrcFilter => withOnrcFields(filter, { status: toggleItem(filter.status, code) });

export interface ActiveOnrcChip {
  id: string;
  label: string;
  remove: (filter: OnrcFilter) => OnrcFilter;
}

/** The chips that are on, one per field value, in the filter's order. The query is not a chip: the search box holds it. */
export function activeOnrcChips(filter: OnrcFilter, copy: OnrcFilterChipsCopy, formatDate: (iso: string) => string): ActiveOnrcChip[] {
  const chips: ActiveOnrcChip[] = [];
  for (const code of filter.status ?? []) chips.push({ id: `status:${code}`, label: copy.status.options[code] ?? copy.status.other(code), remove: (f) => toggleStatus(f, code) });
  if (filter.caen) chips.push({ id: "caen", label: copy.active.caen(filter.caen), remove: (f) => withOnrcFields(f, { caen: undefined }) });
  if (filter.county) chips.push({ id: "county", label: filter.county === "UNPLACED" ? copy.active.unplaced : copy.active.county(filter.county), remove: (f) => withOnrcFields(f, { county: undefined }) });
  if (filter.registeredFrom) chips.push({ id: "from", label: copy.active.from(formatDate(filter.registeredFrom)), remove: (f) => withOnrcFields(f, { registeredFrom: undefined }) });
  if (filter.registeredTo) chips.push({ id: "to", label: copy.active.to(formatDate(filter.registeredTo)), remove: (f) => withOnrcFields(f, { registeredTo: undefined }) });
  if (filter.seapCounterparty !== undefined && filter.seapCounterparty !== null) {
    chips.push({ id: "seap", label: filter.seapCounterparty ? copy.active.seapCounterparty.yes : copy.active.seapCounterparty.no, remove: (f) => withOnrcFields(f, { seapCounterparty: undefined }) });
  }
  return chips;
}
