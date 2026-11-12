import type { RecordFilter } from "@grivei/contract";

/** The filter with the SUSPECT_VALUE badge on: the Records a Total left out. One rule for every Total's "left out" link. */
export function withSuspectBadge(filter: RecordFilter): RecordFilter {
  return { ...filter, badges: [...(filter.badges ?? []).filter((b) => b !== "SUSPECT_VALUE"), "SUSPECT_VALUE"] };
}
