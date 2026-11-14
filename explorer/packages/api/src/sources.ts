// The `sources` registry as the API sees it (spec #173, First reuse). The registry itself is `watchdog/pipeline/sources.py`: every
// rebuild stores it as `core.source`, and `store.sources()` reads it. Each Source in it needs an adapter here, keyed by its id: how to read
// its data-through dates and its Coverage. The `sources` query and `coverage(source)` go through the registry and these adapters, so adding
// a Source adds an entry and an adapter, and no SEAP code path changes.
import { coverageStatus } from "./coverage.ts";
import type { Store } from "./store.ts";

/** One row of the registry (`core.source`). */
export interface SourceRow {
  id: string;
  name: string;
  /** The Postgres schema of the Source's own tables. */
  schema: string;
  recordKinds: string[];
  lenses: string[];
  placementRule: string;
  /** The methodology page section that explains the Source's measure. */
  methodologyAnchor: string;
  landingStatus: "live" | "wip" | "next" | "skipped";
}

type Window = { from: string | null; to: string | null };

/** A Source's Coverage as the resolver serves it (everything but `source`, which the registry supplies). */
export interface CoverageParts {
  window: Window;
  grid: () => Promise<Awaited<ReturnType<Store["coverageGrid"]>>>;
  counties: () => Promise<{ county: string; status: ReturnType<typeof coverageStatus>; withRecords: number; publicEntities: number; otherAuthorities: number }[]>;
  unplacedAuthorities: () => Promise<{ authorities: number; total: Record<string, unknown> }>;
  referenceSnapshot: () => Promise<string | null>;
}

/** What a Source's Coverage needs to answer; each Source reads its own tables. */
export interface SourceAdapter {
  /** Per record kind, the date up to which the Source's records are complete in the graph. */
  dataThrough(store: Store): Promise<{ kind: string; date: string }[]>;
  /** The Coverage of the window. */
  coverage(store: Store, window: Window, zeroTotal: () => Record<string, unknown>): CoverageParts;
}

/** Whether a Grid cell overlaps the date window (quarters like `2024-Q3`); a blank bound is open. */
const overlaps = (quarter: string, from: string | null, to: string | null): boolean => {
  const [year, q] = quarter.split("-Q").map(Number) as [number, number];
  const start = `${year}-${String((q - 1) * 3 + 1).padStart(2, "0")}-01`;
  const end = `${year}-${String(q * 3).padStart(2, "0")}-${q === 1 || q === 4 ? "31" : "30"}`;
  return (!from || end >= from) && (!to || start <= to);
};

const seap: SourceAdapter = {
  dataThrough: (store) => store.dataThrough(),
  coverage: (store, { from, to }, zeroTotal) => {
    let cached: Promise<Awaited<ReturnType<Store["coverageGrid"]>>> | undefined; // one read per request even when grid and counties are both selected
    const grid = () => (cached ??= store.coverageGrid().then((cells) => cells.filter((cell) => overlaps(cell.quarter, from, to))));
    return {
      window: { from, to },
      grid,
      counties: async () => {
        const status = coverageStatus(await grid()); // the same for every area: SEAP is harvested nationally (see coverage.ts)
        return (await store.coverageAreas({ from, to })).map((a) => ({ county: a.area, status, withRecords: a.withRecords, publicEntities: a.publicEntities, otherAuthorities: a.otherAuthorities }));
      },
      unplacedAuthorities: async () => {
        const unplaced = await store.unplacedAuthorities({ from, to });
        return { authorities: unplaced.authorities, total: { ...zeroTotal(), ...unplaced.total } };
      },
      referenceSnapshot: () => store.referenceSnapshot(),
    };
  },
};

/** Adapters by Source id: one per entry of the registry. */
export const SOURCE_ADAPTERS: Readonly<Record<string, SourceAdapter>> = { SEAP: seap };

/** The later Sources (spec story 37): listed so the Coverage lens can grey them as "not harvested"; nothing is loaded from them yet. A Source leaves this list when it joins the registry. */
export const PLANNED_SOURCES = [
  { id: "ONRC" as const, name: "ONRC" },
  { id: "ANI" as const, name: "ANI" },
  { id: "MFINANTE" as const, name: "Ministerul Finanțelor" },
  { id: "JUST" as const, name: "portal.just.ro" },
].map((source) => ({ ...source, harvested: false, dataThrough: [] }));
