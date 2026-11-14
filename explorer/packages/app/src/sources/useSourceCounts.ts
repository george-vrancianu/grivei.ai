import { useEffect, useState } from "react";
import { useClient } from "../graphql/ClientContext.tsx";
import { FullResultsRecords, OnrcCount } from "../graphql/operations.ts";
import type { SourceId } from "../urlState/codec.ts";
import { NO_COUNTS, type SourceCount, type SourceCounts } from "./sourceCounts.ts";

/** Rows per page of ONRC's Organisations tab. */
export const ONRC_PAGE_SIZE = 50;
/** The picker only reads a count: SEAP's is asked with no rows (the API accepts a limit of 0 and answers the count alone); ONRC has its own count-only operation (no page, no map). */
export const COUNT_ONLY_LIMIT = 0;

/** Counts of one Source for one query (`q`), or null while nothing is asked. Each request is superseded by the next one and a stale answer never lands. */
function useCount(source: SourceId, q: string | null): SourceCount | null {
  const client = useClient();
  const key = JSON.stringify([source, q]);
  const [settled, setSettled] = useState<{ key: string; count: SourceCount | null } | null>(null);
  useEffect(() => {
    if (q === null) return;
    const controller = new AbortController();
    const asked =
      source === "SEAP"
        ? client.query(FullResultsRecords, { filter: { q }, limit: COUNT_ONLY_LIMIT, offset: 0 }, { signal: controller.signal }).then((d): SourceCount => ({ n: d.seap.search.total.records, estimated: d.seap.search.total.estimated }))
        : client.query(OnrcCount, { filter: { q } }, { signal: controller.signal }).then((d): SourceCount => ({ n: d.onrc.search.count, estimated: false }));
    asked
      .then((count) => !controller.signal.aborted && setSettled({ key, count }))
      .catch(() => !controller.signal.aborted && setSettled({ key, count: null })); // a Source whose count failed shows its name only
    return () => controller.abort();
  }, [client, key, source, q]);
  return q !== null && settled?.key === key ? settled.count : null;
}

/**
 * The Source picker's counts. The Source the page shows gives its own number (`own`, what the reader sees: the query and its chips); the other one is asked for the query
 * text alone, which is exactly what it will show after a switch (the chips are each Source's own and stay behind). No query, no counts. Never summed or compared.
 */
export function useSourceCounts(q: string | undefined, shown: SourceId, own: SourceCount | null): SourceCounts {
  const query = q ? q : null;
  const seap = useCount("SEAP", shown === "ONRC" ? query : null);
  const onrc = useCount("ONRC", shown === "SEAP" ? query : null);
  if (query === null) return NO_COUNTS;
  return { SEAP: shown === "SEAP" ? own : seap, ONRC: shown === "ONRC" ? own : onrc };
}
