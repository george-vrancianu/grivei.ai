/** How many suppliers a card names before "and N more": a Signal can name every winner of 13 Records. */
export const MAX_SHOWN_SUPPLIERS = 5;

/** The suppliers to name and how many are left out. */
export function shownSuppliers<T>(suppliers: readonly T[], max = MAX_SHOWN_SUPPLIERS): { shown: T[]; more: number } {
  return { shown: suppliers.slice(0, max), more: Math.max(0, suppliers.length - max) };
}
