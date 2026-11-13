import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

/** How long the confirmation stays before the live region empties again. */
export const CONFIRMATION_MS = 4000;

/** Copies `url` to the clipboard on `copy()`; `status` says whether it worked (and goes back to idle after a few seconds). A missing or refusing clipboard is "failed", never a throw. */
export function useCopyLink(url: string): { status: CopyStatus; copy: () => Promise<void> } {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    let next: CopyStatus = "copied";
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
    } catch {
      next = "failed";
    }
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus("idle"), CONFIRMATION_MS);
  }, [url]);

  return { status, copy };
}
