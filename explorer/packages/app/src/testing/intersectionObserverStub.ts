/**
 * jsdom has no `IntersectionObserver`. This is a small honest stand-in, installed per test: it records the observers made, the elements each observes and its callback,
 * and the test fires entries by hand (`seeing`), the way the browser would as the reader scrolls. `uninstall` puts the global back.
 */
interface StubObserver {
  observed: Set<Element>;
  disconnected: boolean;
  options: IntersectionObserverInit | undefined;
}

export function installIntersectionObserver() {
  const observers: (StubObserver & { callback: IntersectionObserverCallback })[] = [];
  class Stub {
    private readonly record: StubObserver & { callback: IntersectionObserverCallback };
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.record = { callback, observed: new Set(), disconnected: false, options };
      observers.push(this.record);
    }
    observe(element: Element) { this.record.observed.add(element); }
    unobserve(element: Element) { this.record.observed.delete(element); }
    disconnect() { this.record.disconnected = true; this.record.observed.clear(); }
    takeRecords() { return []; }
  }
  const original = globalThis.IntersectionObserver;
  globalThis.IntersectionObserver = Stub as unknown as typeof IntersectionObserver;
  return {
    observers,
    /** The browser reports that these elements now touch the observed band (`true`) or have left it (`false`). */
    seeing(changes: [Element, boolean][]) {
      for (const observer of observers.filter((o) => !o.disconnected)) {
        const entries = changes.filter(([el]) => observer.observed.has(el)).map(([target, isIntersecting]) => ({ target, isIntersecting }) as IntersectionObserverEntry);
        if (entries.length > 0) observer.callback(entries, observer as unknown as IntersectionObserver);
      }
    },
    uninstall() {
      if (original === undefined) delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver;
      else globalThis.IntersectionObserver = original;
    },
  };
}
