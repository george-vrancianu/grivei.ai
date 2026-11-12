import type { RecordFilter } from "@grivei/contract";
import type { GridWindow } from "@grivei/ui";

/**
 * The date chip's window as the Coverage grid highlights it. The page asks for the whole grid, so the window only marks the columns it
 * overlaps (the harvest around it stays visible); no date chip, no window, nothing highlighted.
 */
export function highlightWindow(filter: Pick<RecordFilter, "from" | "to">): GridWindow | null {
  return filter.from || filter.to ? { from: filter.from ?? null, to: filter.to ?? null } : null;
}
