import type { EntityPageView, EntityPageRole, Locale } from "@grivei/ui";
import type { RecordFilter } from "@grivei/contract";
import { pathFor, type EntityRoute } from "../../routing/routes.ts";
import { encodeUrlState, type UrlState } from "../../urlState/codec.ts";

export const roleOf = (entity: EntityRoute): EntityPageRole => (entity === "authority" ? "AUTHORITY" : "SUPPLIER");
export const routeOf = (role: EntityPageRole): EntityRoute => (role === "AUTHORITY" ? "authority" : "supplier");

/**
 * The URL of each tab. The filter travels with the reader from tab to tab (the side panel's filter shapes every tab's totals);
 * paging and orders belong to one tab and are left behind.
 */
export function tabHrefs(locale: Locale, entity: EntityRoute, key: string, filter: RecordFilter, carried?: RecordFilter): Record<EntityPageView, string> {
  const query = encodeUrlState({ filter, ...(carried ? { carried } : {}) });
  const href = (view: EntityPageView) => `${pathFor(locale, { name: "entity", entity, key, view })}${query}`;
  return { overview: href("overview"), records: href("records"), relationships: href("relationships") };
}

/** The same tab of the entity in the other role. The filter is left behind: its counterparties and facets are the other role's. */
export function roleHref(locale: Locale, key: string, view: EntityPageView, role: EntityPageRole): string {
  return pathFor(locale, { name: "entity", entity: routeOf(role), key, view });
}

/** The URL of one tab of an entity's page, carrying the URL state (the filter, the order, the page...). */
export function tabHref(locale: Locale, entity: EntityRoute, key: string, view: EntityPageView, state: UrlState): string {
  return `${pathFor(locale, { name: "entity", entity, key, view })}${encodeUrlState(state)}`;
}

/** The Records tab's URL for a page of the list (page 1 is left out), carrying the filter and the order. */
export function recordsHref(locale: Locale, entity: EntityRoute, key: string, state: UrlState): string {
  return tabHref(locale, entity, key, "records", state);
}

/**
 * Where "only Records matching ..." goes: the Records tab with the carried query and chips applied over the entity's own filter, and the
 * carried search dropped (it is applied now, and the link has nothing left to offer). The page restarts at 1. Where both set the same field
 * (a repeatable one like badges or procedure, or from/to) the carried value wins: it replaces the entity's own rather than combining with it.
 */
export function onlyMatchingHref(locale: Locale, entity: EntityRoute, key: string, state: UrlState & { carried: RecordFilter }): string {
  const { carried, filter, order } = state;
  return recordsHref(locale, entity, key, { filter: { ...filter, ...carried }, ...(order ? { order } : {}) });
}

/** A patch that makes the URL's filter land exactly on `next`: every field either has its new value or is removed (setFilter merges patches). */
export function patchTo(current: RecordFilter, next: RecordFilter): RecordFilter {
  const patch: Record<string, unknown> = {};
  for (const field of new Set([...Object.keys(current), ...Object.keys(next)])) patch[field] = (next as Record<string, unknown>)[field] ?? undefined;
  return patch as RecordFilter;
}
