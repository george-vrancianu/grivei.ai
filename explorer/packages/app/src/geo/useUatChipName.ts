import type { RecordFilter } from "@grivei/contract";
import { uatChipName } from "./uatChipName.ts";
import { useUatTopology } from "./useUatTopology.ts";

/** The name for the filter's UAT chip, from its county's outlines (fetched only while the filter holds both; the provider caches them); `undefined` until known. */
export function useUatChipName(filter: Pick<RecordFilter, "county" | "uat">): string | undefined {
  const topology = useUatTopology(filter.county && filter.uat ? filter.county : null);
  return filter.uat ? uatChipName(filter.uat, topology) : undefined;
}
