import type { Locale } from "../../../theme/index.ts";
import type { EntityHeaderData, EntityRole } from "../../types.ts";

/** ANAF's status for an entity in good standing. Anything else (RADIERE, FUZIUNE ...) is badged. */
export function isInactiveStatus(status: string | null): status is string {
  return status !== null && !/^activ/i.test(status.trim());
}

export type PlacementView =
  { kind: "unplaced" } | { kind: "national"; placedBy: string } | { kind: "county"; county: string; uat: string | null; placedBy: string };

/** Where the entity sits: a county (and UAT when known), the national tile, or nowhere (Unplaced). */
export function placementView(entity: Pick<EntityHeaderData, "placement">): PlacementView {
  const { placement } = entity;
  if (!placement) return { kind: "unplaced" };
  if (placement.national) return { kind: "national", placedBy: placement.placedBy };
  if (!placement.county) return { kind: "unplaced" };
  return {
    kind: "county",
    county: placement.county.name,
    uat: placement.uat?.name ?? null,
    placedBy: placement.placedBy,
  };
}

/** The roles the entity has in SEAP; the switch is only offered when it has both. */
export function hasBothRoles(entity: EntityHeaderData): boolean {
  return entity.seap.roles.includes("AUTHORITY") && entity.seap.roles.includes("SUPPLIER");
}

export const ROLES: readonly EntityRole[] = ["AUTHORITY", "SUPPLIER"];

/** "12 October 2024" / "12 octombrie 2024" from an ISO instant, in UTC. */
export function formatFetched(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(iso));
}
