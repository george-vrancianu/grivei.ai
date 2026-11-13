import { useEffect } from "react";
import { useLocation } from "./location.tsx";

/**
 * Brings the element the URL's `#fragment` names into view once `ready` (the page has rendered it). The browser does that only for an element
 * that exists when the page loads, and these pages draw their sections after their data arrives; an in-app navigation never does it at all.
 * Runs again when the fragment changes; a fragment that names no element, or is malformed, does nothing.
 */
export function useScrollToHash(ready: boolean): void {
  const { hash } = useLocation();
  useEffect(() => {
    if (!ready || hash.length < 2) return;
    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      return;
    }
    document.getElementById(id)?.scrollIntoView?.();
  }, [ready, hash]);
}
