import type { CoverageLensQueryVariables, RecordFilter } from "@grivei/contract";

/**
 * The `CoverageLens` variables for a page filter: the date chip's window, sending only the bounds the chip holds
 * (`{}` with no chip: the API answers for the whole harvest). Nothing else of the filter matters to Coverage.
 */
export function coverageLensVariables(filter: Pick<RecordFilter, "from" | "to">): CoverageLensQueryVariables {
  if (!filter.from && !filter.to) return {};
  return { window: { ...(filter.from ? { from: filter.from } : {}), ...(filter.to ? { to: filter.to } : {}) } };
}
