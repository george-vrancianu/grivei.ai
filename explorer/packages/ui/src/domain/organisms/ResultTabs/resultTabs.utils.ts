import type { EntityRef, EntityResultPage, EntityRole } from "../../types.ts";

export type ResultTab = "authorities" | "suppliers" | "records";
export const RESULT_TABS: readonly ResultTab[] = ["authorities", "suppliers", "records"];
export const DEFAULT_RESULT_TAB: ResultTab = "suppliers";

/** A tab value from outside (a URL, say) as a `ResultTab`: anything unknown or absent is the default, Suppliers. */
export function toResultTab(value: string | null | undefined): ResultTab {
  return RESULT_TABS.find((tab) => tab === value) ?? DEFAULT_RESULT_TAB;
}

/**
 * Which role the "Go to page" entity is opened in. `goTo` carries no role, so it is read off the tabs: an entity
 * ranked among the suppliers opens as a supplier, else among the authorities as an authority, else as a supplier.
 */
export function goToRole(goTo: EntityRef, pages: { suppliers: EntityResultPage; authorities: EntityResultPage }): EntityRole {
  if (pages.suppliers.rows.some((row) => row.entity.key === goTo.key)) return "supplier";
  if (pages.authorities.rows.some((row) => row.entity.key === goTo.key)) return "authority";
  return "supplier";
}
