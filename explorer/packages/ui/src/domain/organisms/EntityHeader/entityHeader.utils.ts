import type { EntityHeaderData, EntityPageRole } from "../../types.ts";

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

export const ROLES: readonly EntityPageRole[] = ["AUTHORITY", "SUPPLIER"];

export const SEAP_NAMES_SHOWN = 3;

export interface SeapNamesSummary {
  /** The first spellings (the API sends them by Record count), at most `SEAP_NAMES_SHOWN`. */
  names: string[];
  /** How many more spellings there are. */
  more: number;
  /** Records published under any spelling. */
  records: number;
  first: string;
  last: string;
}

/** The "Appears in SEAP as" line: the main spellings, the Records published under them and the dates of the first and the last. Null when SEAP published no spelling. */
export function seapNamesSummary(aliases: EntityHeaderData["aliases"]): SeapNamesSummary | null {
  if (aliases.length === 0) return null;
  return {
    names: aliases.slice(0, SEAP_NAMES_SHOWN).map((a) => a.name),
    more: Math.max(0, aliases.length - SEAP_NAMES_SHOWN),
    records: aliases.reduce((sum, a) => sum + a.records, 0),
    first: aliases.reduce((min, a) => (a.first < min ? a.first : min), aliases[0]!.first),
    last: aliases.reduce((max, a) => (a.last > max ? a.last : max), aliases[0]!.last),
  };
}
