import { useState } from "react";

const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((name, i) => name === b[i]);

/**
 * The procedure names the chips offer: the latest list the API sent (`facets.procedure`), kept while the next answer is
 * loading so the chips do not blink out on every filter change. A facet is computed over the current filter, so once a
 * procedure is chosen it can shrink to that procedure; while any is chosen the list therefore only grows (union), so
 * the other procedures stay reachable for multi-select. With none chosen the latest list replaces it.
 */
export function useProcedureOptions(latest: readonly string[] | null, selected: readonly string[] | null | undefined): string[] {
  const [kept, setKept] = useState<string[]>([]);
  if (latest) {
    const next = selected && selected.length > 0 ? [...kept, ...latest.filter((name) => !kept.includes(name))] : [...latest];
    if (!same(next, kept)) setKept(next);
  }
  return kept;
}
