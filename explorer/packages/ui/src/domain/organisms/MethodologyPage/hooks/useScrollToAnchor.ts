import { useEffect } from "react";

/**
 * Brings the section with this id into view, on the first render and whenever the id changes. The browser does it for a page opened at
 * `#id` only when the element exists at load time, and never for an in-app (History API) navigation, so the page asks for it itself.
 */
export function useScrollToAnchor(anchor: string | null): void {
  useEffect(() => {
    if (!anchor) return;
    document.getElementById(anchor)?.scrollIntoView?.();
  }, [anchor]);
}
