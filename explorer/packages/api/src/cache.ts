// The result cache (#70): an in-process cache over the search statements, keyed by the normalised filter and valid for one
// load generation. A load (the pipeline's rebuild) writes a fresh value into `seap.rollup_meta` inside its transaction; every
// lookup reads it (one tiny statement) and flushes the cache when it changed, so "a load invalidates the cache" holds for
// the next request after the commit, with no signal between the pipeline and the API. After a flush the 2-character
// prefixes the load contains (`seap.rollup_prefix`) are warmed in the background, no chips.
import pg from "pg";
import { foldTokens } from "./fold.ts";
import type { SearchFilter } from "./search.ts";
import type { RecordOrderKey, Store } from "./store.ts";

/**
 * The canonical form of a filter: the query folded, chips sorted and de-duplicated, defaults filled, empty values dropped.
 * Two filters that mean the same set have the same key.
 */
export function canonicalFilter(f: SearchFilter): string {
  const list = (v: string[] | null | undefined) => (v?.length ? [...new Set(v)].sort() : undefined);
  const tokens = foldTokens(f.q ?? "");
  const canonical = {
    q: tokens.length ? tokens.join(" ") : undefined,
    from: f.from || undefined,
    to: f.to || undefined,
    channel: f.channel || undefined,
    valueBucket: f.valueBucket || undefined,
    hasSignals: f.hasSignals ?? undefined,
    badges: list(f.badges),
    procedure: list(f.procedure),
    county: f.county || undefined,
    uat: f.uat || undefined,
    countySide: f.countySide ?? "AUTHORITY",
    authority: f.authority || undefined,
    supplier: f.supplier || undefined,
    cpv: f.cpv || undefined,
    signal: f.signal || undefined,
  };
  return JSON.stringify(canonical); // keys in a fixed order, undefined dropped
}

export interface CacheStats {
  hits: number;
  misses: number;
  /** How many times a new load generation flushed the cache. */
  flushes: number;
  entries: number;
  generation: string | null;
}

export interface WarmReport {
  prefixes: number;
  statements: number;
  failed: number;
  ms: number;
}

export interface CachedStore extends Store {
  stats(): CacheStats;
  /** Reads the load generation now: a new one flushes the cache and starts warming in the background. */
  sync(): Promise<void>;
  /** Warms every 2-character prefix of the current load (no chips) and the empty state; resolves when done. */
  warm(): Promise<WarmReport>;
}

export interface CacheOptions {
  /** Entries kept (oldest dropped first). */
  maxEntries?: number;
  /** Warm in the background after a flush (default true). */
  autoWarm?: boolean;
  /** Concurrent warming prefixes (default 2: the pool is shared with the requests). */
  warmConcurrency?: number;
  log?: (message: string) => void;
}

const PAGE = { limit: 50, offset: 0 };

export function cachedStore(inner: Store, pool: pg.Pool, { maxEntries = 20_000, autoWarm = true, warmConcurrency = 2, log = () => undefined }: CacheOptions = {}): CachedStore {
  const entries = new Map<string, unknown>();
  let generation: string | null = null;
  let hits = 0;
  let misses = 0;
  let flushes = 0;
  let warming: Promise<WarmReport> | null = null;

  async function readGeneration(): Promise<string | null> {
    try {
      const r = await pool.query<{ generation: string }>("SELECT generation FROM seap.rollup_meta LIMIT 1");
      return r.rows[0]?.generation ?? null;
    } catch {
      return null; // no graph yet: nothing is cached against it
    }
  }

  async function sync(): Promise<string | null> {
    const g = await readGeneration();
    if (g !== generation) {
      if (generation !== null) flushes++;
      entries.clear();
      generation = g;
      if (g !== null && autoWarm) {
        warming = warm().catch((e) => (log(`cache warming failed: ${(e as Error).message}`), { prefixes: 0, statements: 0, failed: 1, ms: 0 }));
      }
    }
    return g;
  }

  async function cached<T>(key: string, run: () => Promise<T>): Promise<T> {
    const g = await sync();
    if (g !== null && entries.has(key)) {
      hits++;
      return entries.get(key) as T;
    }
    misses++;
    const value = await run(); // a failure or an abort is never cached
    if (g !== null && g === generation) {
      if (entries.size >= maxEntries) entries.delete(entries.keys().next().value!);
      entries.set(key, value);
    }
    return value;
  }

  async function warm(): Promise<WarmReport> {
    const started = Date.now();
    const g = generation ?? (await readGeneration());
    const prefixes = (await pool.query<{ prefix: string }>("SELECT prefix FROM seap.rollup_prefix ORDER BY prefix")).rows.map((r) => r.prefix);
    const filters: SearchFilter[] = [{}, ...prefixes.map((q) => ({ q }))];
    let statements = 0;
    let failed = 0;
    let next = 0;
    const worker = async () => {
      while (next < filters.length) {
        const f = filters[next++]!;
        if (generation !== g) return; // a newer load arrived: this warming is stale
        try {
          await Promise.all([
            store.searchTotal(f),
            store.searchEntities("AUTHORITY", f, PAGE),
            store.searchEntities("SUPPLIER", f, PAGE),
            f.q ? store.searchRecords(f, { ...PAGE, order: "VALUE_DESC" }) : store.records({ ...PAGE, order: "VALUE_DESC" }),
          ]);
          statements += 4;
        } catch (e) {
          failed++;
          log(`cache warming of ${JSON.stringify(f)} failed: ${(e as Error).message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: warmConcurrency }, worker));
    const report = { prefixes: prefixes.length, statements, failed, ms: Date.now() - started };
    log(`cache warmed: ${report.prefixes} prefixes, ${report.statements} statements, ${report.failed} failed, ${report.ms} ms`);
    return report;
  }

  const page = (p: { limit: number; offset: number }) => `${p.limit}:${p.offset}`;
  const store: CachedStore = {
    ...inner,
    stats: () => ({ hits, misses, flushes, entries: entries.size, generation }),
    sync: async () => {
      await sync();
    },
    warm: async () => {
      await sync();
      if (warming) await warming.catch(() => undefined);
      return warm();
    },
    searchTotal: (filter, options) => cached(`total|${canonicalFilter(filter)}`, () => inner.searchTotal(filter, options)),
    searchEntities: (side, filter, p, options) => cached(`${side}|${canonicalFilter(filter)}|${page(p)}`, () => inner.searchEntities(side, filter, p, options)),
    searchRecords: (filter, p, options) => cached(`records|${canonicalFilter(filter)}|${page(p)}|${p.order satisfies RecordOrderKey}`, () => inner.searchRecords(filter, p, options)),
    records: (p) => cached(`empty-records|${page(p)}|${p.order}`, () => inner.records(p)),
  };
  return store;
}
