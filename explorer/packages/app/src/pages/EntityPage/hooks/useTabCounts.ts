import { useState } from "react";
import type { Locale, EntityPageView as TabView } from "@grivei/ui";
import { formatCount } from "@grivei/ui";
import type { RecordFilter } from "@grivei/contract";
import type { EntityPageState } from "./useEntityPage.ts";

type Total = { records: number; estimated: boolean };

/**
 * The Records count beside the tab: the entity's own, so only when no filter narrows it. The Overview and Records tabs bring it; the Relationships tab and
 * a tab still loading do not, so the last count of the same entity stays on screen then (it does not follow the open tab, so it must not blink).
 */
export function useTabCounts(subject: string, state: EntityPageState, filter: RecordFilter, locale: Locale): Partial<Record<TabView, string>> {
  const [kept, setKept] = useState<{ subject: string; total: Total } | null>(null);
  if (Object.values(filter).some((v) => v !== undefined)) return {};
  const fresh = state.status === "ready" ? (state.overview?.total ?? state.records?.total) : undefined;
  // React's "adjust state when props change" pattern: set state during render, guarded so it settles after one re-render
  if (fresh && (kept?.subject !== subject || kept.total.records !== fresh.records || kept.total.estimated !== fresh.estimated)) setKept({ subject, total: fresh });
  const total = fresh ?? (kept?.subject === subject ? kept.total : undefined);
  return total ? { records: formatCount(total.records, total.estimated, locale) } : {};
}
