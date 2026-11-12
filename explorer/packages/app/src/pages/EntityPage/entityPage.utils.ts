import type { EntityPageView, EntityPageRole, Locale } from "@grivei/ui";
import type { RecordFilter } from "@grivei/contract";
import { pathFor, type EntityRoute } from "../../routing/routes.ts";
import { encodeUrlState, type UrlState } from "../../urlState/codec.ts";

export const roleOf = (entity: EntityRoute): EntityPageRole => (entity === "authority" ? "AUTHORITY" : "SUPPLIER");
const routeOf = (role: EntityPageRole): EntityRoute => (role === "AUTHORITY" ? "authority" : "supplier");

/**
 * The URL of each tab. The filter travels with the reader from tab to tab (the side panel's filter shapes every tab's totals);
 * paging and orders belong to one tab and are left behind.
 */
export function tabHrefs(locale: Locale, entity: EntityRoute, key: string, filter: RecordFilter): Record<EntityPageView, string> {
  const query = encodeUrlState({ filter });
  const href = (view: EntityPageView) => `${pathFor(locale, { name: "entity", entity, key, view })}${query}`;
  return { overview: href("overview"), records: href("records"), relationships: href("relationships") };
}

/** The same tab of the entity in the other role. The filter is left behind: its counterparties and facets are the other role's. */
export function roleHref(locale: Locale, key: string, view: EntityPageView, role: EntityPageRole): string {
  return pathFor(locale, { name: "entity", entity: routeOf(role), key, view });
}

/** The Records tab's URL for a page of the list (page 1 is left out), carrying the filter and the order. */
export function recordsHref(locale: Locale, entity: EntityRoute, key: string, state: UrlState): string {
  return `${pathFor(locale, { name: "entity", entity, key, view: "records" })}${encodeUrlState(state)}`;
}

/** A patch that makes the URL's filter land exactly on `next`: every field either has its new value or is removed (setFilter merges patches). */
export function patchTo(current: RecordFilter, next: RecordFilter): RecordFilter {
  const patch: Record<string, unknown> = {};
  for (const field of new Set([...Object.keys(current), ...Object.keys(next)])) patch[field] = (next as Record<string, unknown>)[field] ?? undefined;
  return patch as RecordFilter;
}
