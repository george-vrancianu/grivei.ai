import { useCallback, useEffect, useRef, useState } from "react";
import { layout } from "../../../../theme/tokens.ts";

/** How long the observer is ignored after a click, while the page scrolls to the section. */
const SETTLE_MS = 800;

/**
 * The section in view, for the contents list (design decision 12): one `IntersectionObserver` over the sections' elements (found by id), whose band is the upper half of
 * the window below the sticky header; the current section is the first one, in page order, that touches that band and has no section of its own inside the band (the Signal rules'
 * section holds every rule panel: while a rule is in the band, the rule is current, not the group). It starts at the `#hash` anchor if the page has it, else the
 * first section; a new hash and a click on a contents link (`select`) set it at once. Without `IntersectionObserver` it follows the hash alone, and never throws.
 * Only the methodology page uses it.
 */
export function useScrollSpy(anchors: readonly string[], hash: string | null): { current: string | null; select: (anchor: string) => void } {
  const [current, setCurrent] = useState<string | null>(() => (hash !== null && anchors.includes(hash) ? hash : (anchors[0] ?? null)));
  const key = anchors.join("\n");
  // after a click on a contents link the page scrolls and the observer reports on the way (and the target may never reach the top of a short page): it is ignored for a while
  const ignoreUntil = useRef(0);

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
    const elements = new Map<string, Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const { target, isIntersecting } of entries) {
          if (isIntersecting) inView.add(target.id);
          else inView.delete(target.id);
        }
        if (Date.now() < ignoreUntil.current) return;
        const deepest = (anchor: string) => !order.some((other) => other !== anchor && inView.has(other) && elements.get(anchor)!.contains(elements.get(other)!));
        const first = order.find((anchor) => inView.has(anchor) && deepest(anchor));
        if (first !== undefined) setCurrent(first);
      },
      { rootMargin: `-${layout.headerScrollPadding}px 0px -50% 0px` },
    );
    for (const anchor of order) {
      const element = document.getElementById(anchor);
      if (element) {
        elements.set(anchor, element);
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [key]);

  const select = useCallback((anchor: string) => {
    ignoreUntil.current = Date.now() + SETTLE_MS;
    setCurrent(anchor);
  }, []);
  return { current, select };
}
