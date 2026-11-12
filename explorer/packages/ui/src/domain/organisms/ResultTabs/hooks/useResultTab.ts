import { useState } from "react";
import { DEFAULT_RESULT_TAB, type ResultTab } from "../resultTabs.utils.ts";

/** The selected tab: the caller's (`tab` given, controlled) or the component's own, starting on Suppliers. */
export function useResultTab(tab: ResultTab | undefined, onTabChange: ((tab: ResultTab) => void) | undefined) {
  const [own, setOwn] = useState<ResultTab>(DEFAULT_RESULT_TAB);
  const selected = tab ?? own;
  const select = (next: ResultTab) => {
    if (tab === undefined) setOwn(next);
    onTabChange?.(next);
  };
  return [selected, select] as const;
}
