import type { RecordFilter, SignalRuleSlug } from "@grivei/contract";
import { withFields, yearEnd, yearOf, yearStart } from "../../molecules/FilterChips/index.ts";
import type { EntityRole } from "../../types.ts";
import { counterpartyRole } from "../EntityOverview/entityOverview.utils.ts";

/** The filter field a counterparty facet sets: named after the counterparty's role. */
export const counterpartyField = (role: EntityRole): "supplier" | "authority" => counterpartyRole(role);

export const toggleSignal = (filter: RecordFilter, signal: SignalRuleSlug): RecordFilter =>
  withFields(filter, { signal: filter.signal === signal ? undefined : signal });
export const toggleCounterparty = (filter: RecordFilter, role: EntityRole, key: string): RecordFilter => {
  const field = counterpartyField(role);
  return withFields(filter, { [field]: filter[field] !== undefined && filter[field] !== null && String(filter[field]) === key ? undefined : key });
};

/** The year the filter selects as a whole calendar year (`from` a Jan 1 and `to` the Dec 31 of the same year), else undefined. */
export function selectedYear(filter: RecordFilter): number | undefined {
  const from = yearOf(filter.from);
  return from !== undefined && filter.from === yearStart(from) && filter.to === yearEnd(from) ? from : undefined;
}
/** Choosing the selected year again clears both dates; any other choice replaces them with that year's Jan 1 and Dec 31. */
export const toggleYear = (filter: RecordFilter, year: number): RecordFilter =>
  selectedYear(filter) === year
    ? withFields(filter, { from: undefined, to: undefined })
    : withFields(filter, { from: yearStart(year), to: yearEnd(year) });
