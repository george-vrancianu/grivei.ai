import type { RecordFilter } from "@grivei/contract";
import { CHIP_FIELDS, type Locale } from "@grivei/ui";
import { pathFor, type EntityRoute } from "../routing/routes.ts";
import { encodeUrlState } from "./codec.ts";

/** The part of a search an entity link carries: the query and the chips. County, UAT and the rest of the map's choices stay behind. Undefined when there is none. */
export function carriedSearchOf(filter: RecordFilter): RecordFilter | undefined {
  const carried: Record<string, unknown> = {};
  for (const field of ["q", ...CHIP_FIELDS] as const) {
    const value = filter[field];
    if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) continue;
    carried[field] = value;
  }
  return Object.keys(carried).length > 0 ? (carried as RecordFilter) : undefined;
}

/**
 * The entity-row link of a search screen: the entity's Overview, unfiltered, carrying the search it was followed from in its own
 * parameter so the Records tab can offer "only Records matching ...". A search with no query and no chips carries nothing.
 */
export function entityHrefFrom(locale: Locale, filter: RecordFilter): (entity: { key: string }, role: EntityRoute) => string {
  const carried = carriedSearchOf(filter);
  return (entity, role) => `${pathFor(locale, { name: "entity", entity: role, key: entity.key, view: "overview" })}${encodeUrlState({ filter: {}, ...(carried ? { carried } : {}) })}`;
}
