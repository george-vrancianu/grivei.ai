import type { EntityRole } from "../../types.ts";

export type ResultTab = "authorities" | "suppliers" | "records";
export const RESULT_TABS: readonly ResultTab[] = ["authorities", "suppliers", "records"];
export const DEFAULT_RESULT_TAB: ResultTab = "suppliers";

/** A tab value from outside (a URL, say) as a `ResultTab`: anything unknown or absent is the default, Suppliers. */
export function toResultTab(value: string | null | undefined): ResultTab {
  return RESULT_TABS.find((tab) => tab === value) ?? DEFAULT_RESULT_TAB;
}

/** The role the "Go to page" entity is opened in: its supplier page when it ever won ("who gets the money"), else its authority page. */
export function goToRole(roles: readonly ("AUTHORITY" | "SUPPLIER")[]): EntityRole {
  return roles.includes("SUPPLIER") || !roles.includes("AUTHORITY") ? "supplier" : "authority";
}
