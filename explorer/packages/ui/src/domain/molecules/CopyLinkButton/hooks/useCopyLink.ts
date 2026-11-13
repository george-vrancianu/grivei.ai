import { useCallback, useEffect, useRef, useState } from "react";

export type CopyStatus = "idle" | "copied" | "failed";

/** How long the confirmation stays before the live region empties again. */
export const CONFIRMATION_MS = 4000;

/** How long the live region stays empty between two copies, so that the next confirmation is a change a screen reader announces again. */
export const REANNOUNCE_MS = 100;

/** Copies `url` to the clipboard on `copy()`; `status` says whether it worked (and goes back to idle after a few seconds). A missing or refusing clipboard is "failed", never a throw. */
export function useCopyLink(url: string): { status: CopyStatus; copy: () => Promise<void> } {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Whether the region holds a confirmation now. */
  const said = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    clearTimeout(timer.current);
    let next: CopyStatus = "copied";
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url); // first, while the click's permission to use the clipboard still stands
    } catch {
      next = "failed";
    }
    if (said.current) {
      // empty the region before saying it again, or a second copy's identical text would not be announced
      setStatus("idle");
      await new Promise((resolve) => setTimeout(resolve, REANNOUNCE_MS));
    }
    said.current = true;
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      said.current = false;
      setStatus("idle");
    }, CONFIRMATION_MS);
  }, [url]);

  return { status, copy };
}
