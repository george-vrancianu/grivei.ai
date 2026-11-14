import { formatCount, type Locale } from "@grivei/ui";
import type { SourcePickerOption } from "@grivei/ui";
import type { Copy } from "../copy/index.ts";
import type { SourceId } from "../urlState/codec.ts";

/** What a Source has for the query: its own number, and whether SEAP's distinct count is an estimate. */
export interface SourceCount {
  n: number;
  estimated: boolean;
}

/** Each Source's match count for the query; null while it loads, when it failed, or when there is no query. The counts are never summed or compared. */
export type SourceCounts = Record<SourceId, SourceCount | null>;

export const NO_COUNTS: SourceCounts = { SEAP: null, ONRC: null };

export const SOURCES: readonly SourceId[] = ["SEAP", "ONRC"];

/** The picker's options: each Source's name and, when it has one, its count in the Source's own unit ("1,204 Records", "40 registrations"). */
export function pickerOptions(copy: Copy["sources"], counts: SourceCounts, locale: Locale): SourcePickerOption[] {
  return SOURCES.map((id) => {
    const count = counts[id];
    return { id, label: copy.names[id], ...(count ? { count: copy.counts[id](count.n, formatCount(count.n, count.estimated, locale)) } : {}) };
  });
}

/** The picker's option ids as Sources (the control only ever reports one of its own). */
export const asSource = (id: string): SourceId => (id === "ONRC" ? "ONRC" : "SEAP");
