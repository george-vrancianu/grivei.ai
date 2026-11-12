import { useState } from "react";

/**
 * The procedure names the chips offer: the latest list the API sent (`facets.procedure`), kept while the next answer is
 * loading so the chips do not blink out on every filter change.
 */
export function useProcedureOptions(latest: readonly string[] | null): string[] {
  const [kept, setKept] = useState<string[]>([]);
  if (latest && (latest.length !== kept.length || latest.some((name, i) => name !== kept[i]))) setKept([...latest]);
  return kept;
}
