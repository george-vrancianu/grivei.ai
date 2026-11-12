import type { EntityPageView, EntityRole } from "@grivei/ui";
import type { RecordFilter } from "@grivei/contract";
import { pathFor, type EntityRoute } from "../../routing/routes.ts";
import type { Locale } from "@grivei/ui";
import { encodeUrlState } from "../../urlState/codec.ts";

export const roleOf = (entity: EntityRoute): EntityRole => (entity === "authority" ? "AUTHORITY" : "SUPPLIER");
export const routeOf = (role: EntityRole): EntityRoute => (role === "AUTHORITY" ? "authority" : "supplier");

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
export function roleHref(locale: Locale, key: string, view: EntityPageView, role: EntityRole): string {
  return pathFor(locale, { name: "entity", entity: routeOf(role), key, view });
}
