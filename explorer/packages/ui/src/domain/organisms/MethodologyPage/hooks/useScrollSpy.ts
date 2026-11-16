import { useCallback, useEffect, useState } from "react";
import { layout } from "../../../../theme/tokens.ts";

/**
 * The section in view, for the contents list (design decision 12): one `IntersectionObserver` over the sections' elements (found by id), whose band is the upper half of
 * the window below the sticky header; the current section is the first one, in page order, that touches that band. It starts at the `#hash` anchor if the page has it, else the
 * first section; a new hash and a click on a contents link (`select`) set it at once. Without `IntersectionObserver` it follows the hash alone, and never throws.
 * Only the methodology page uses it.
 */
export function useScrollSpy(anchors: readonly string[], hash: string | null): { current: string | null; select: (anchor: string) => void } {
  const [current, setCurrent] = useState<string | null>(() => (hash !== null && anchors.includes(hash) ? hash : (anchors[0] ?? null)));
  const key = anchors.join("\n");

  // a new hash sets the current section at once (adjusting state while rendering, not in an effect)
  const [seenHash, setSeenHash] = useState(hash);
  if (seenHash !== hash) {
    setSeenHash(hash);
    if (hash !== null && anchors.includes(hash)) setCurrent(hash);
  }

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const order = key === "" ? [] : key.split("\n");
    const inView = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          if (isIntersecting) inView.add(target.id);
          else inView.delete(target.id);
        }
        const first = order.find((anchor) => inView.has(anchor));
        if (first !== undefined) setCurrent(first);
      },
      { rootMargin: `-${layout.headerScrollPadding}px 0px -50% 0px` },
    );
    for (const anchor of order) {
      const element = document.getElementById(anchor);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [key]);

  const select = useCallback((anchor: string) => setCurrent(anchor), []);
  return { current, select };
}
