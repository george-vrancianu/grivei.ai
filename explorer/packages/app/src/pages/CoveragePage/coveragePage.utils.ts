import type { RecordFilter } from "@grivei/contract";
import type { CoveragePageVariables } from "./coveragePage.types.ts";

/** The date chip's window as the `CoveragePage` operation takes it: only the ends the filter has; no date chip, no variables at all. */
export function coverageVariables(filter: Pick<RecordFilter, "from" | "to">): CoveragePageVariables {
  const window = { ...(filter.from ? { from: filter.from } : {}), ...(filter.to ? { to: filter.to } : {}) };
  return Object.keys(window).length === 0 ? {} : { window };
}
