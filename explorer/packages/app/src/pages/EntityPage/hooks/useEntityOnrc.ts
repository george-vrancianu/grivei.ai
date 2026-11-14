import { useEffect, useState } from "react";
import type { OnrcFilter } from "@grivei/contract";
import type { OnrcResultData } from "@grivei/ui";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { OnrcSearch } from "../../../graphql/operations.ts";
import { ONRC_PAGE_SIZE } from "../../../sources/useSourceCounts.ts";

/** What ONRC lists under an entity's CUI: `all` of it (does the Source have anything for the entity?) and `rows` for the ONRC chips the URL holds. */
export type EntityOnrcState = { status: "idle" | "loading" | "error" } | { status: "ready"; all: readonly OnrcResultData[]; rows: readonly OnrcResultData[] };

/** The registrations of one CUI for a filter: ONRC's search by the CUI, keeping the rows that carry exactly that CUI (a search by a prefix would also find longer ones). */
function useRegistrations(cui: string | null, chips: OnrcFilter | null): { key: string; rows: OnrcResultData[] | null } | null {
  const client = useClient();
  const key = JSON.stringify([cui, chips]);
  const [settled, setSettled] = useState<{ key: string; rows: OnrcResultData[] | null } | null>(null);
  useEffect(() => {
    const [asked, narrowing] = JSON.parse(key) as [string | null, OnrcFilter | null];
    if (asked === null || narrowing === null) return;
    const controller = new AbortController();
    client
      .query(OnrcSearch, { filter: { ...narrowing, q: asked }, limit: ONRC_PAGE_SIZE, offset: 0 }, { signal: controller.signal })
      .then((d) => !controller.signal.aborted && setSettled({ key, rows: d.onrc.search.organisations.rows.filter((row) => row.cui === asked) }))
      .catch(() => !controller.signal.aborted && setSettled({ key, rows: null })); // no answer reads as "nothing to offer": the Source is left out of the switch
    return () => controller.abort();
  }, [client, key]);
  return cui !== null && chips !== null && settled?.key === key ? settled : null;
}

/**
 * ONRC's registrations of an entity, for the Records tab's Source switch (#178). The CUI is the search (an entity with none has nothing in ONRC). One request finds
 * everything ONRC lists for it; a second, only when ONRC chips are on, finds what they leave. Never a sole trader's: the API leaves those out of the search.
 * `asked` false (another tab is open) asks nothing.
 */
export function useEntityOnrc(cui: string | null, chips: OnrcFilter, asked: boolean): EntityOnrcState {
  const subject = asked ? cui : null;
  const filtered = Object.keys(chips).length > 0;
  const all = useRegistrations(subject, {});
  const narrowed = useRegistrations(subject, filtered ? chips : null);
  if (subject === null) return { status: "idle" };
  if (all === null || (filtered && narrowed === null)) return { status: "loading" };
  if (all.rows === null || (filtered && narrowed?.rows === null)) return { status: "error" };
  return { status: "ready", all: all.rows, rows: filtered ? (narrowed?.rows ?? []) : all.rows };
}
