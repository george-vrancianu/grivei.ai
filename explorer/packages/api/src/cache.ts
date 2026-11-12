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
  /** Approximate heap held by the entries (see `maxBytes`). */
  bytes: number;
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
  /**
   * Memory budget in approximate bytes (default 300 MB); least recently used entries are dropped first.
   *
   * Sizing: the API container has `mem_limit: 2g`, which gives Node 24 a heap limit of about 1.1 GB (measured). An entry is
   * costed at twice its JSON length (the heap holds the objects and their strings, UTF-16 and with headers, at roughly that
   * ratio): a Records page of 50 rows is ~20 KB of JSON, so ~40 KB costed, and 300 MB holds ~7,500 such pages or many more
   * of the smaller totals and entity pages. That leaves about 800 MB of heap for the pool, GraphQL and the requests, and still
   * holds the whole national warm (about 1,400 prefixes x 5 entries, ~7,000 entries). Configurable through
   * `API_CACHE_MAX_MB` in `main.ts`.
   */
  maxBytes?: number;
  /** Entries kept at most, whatever their size (default 50,000). */
  maxEntries?: number;
  /** Warm in the background after a flush (default true). */
  autoWarm?: boolean;
  /** Concurrent warming prefixes (default 1: every statement takes a pooled connection that requests also need). */
  warmConcurrency?: number;
  /** How long a generation read is reused by lookups, in ms (default 1000); `sync()` always reads fresh. */
  generationTtlMs?: number;
  log?: (message: string) => void;
}

const PAGE = { limit: 50, offset: 0 };

/** Approximate heap cost of a cached value: twice its JSON length. */
export function approxBytes(value: unknown): number {
  return 2 * (JSON.stringify(value)?.length ?? 0);
}

export function cachedStore(
  inner: Store,
  pool: pg.Pool,
  { maxBytes = 300 * 1024 * 1024, maxEntries = 50_000, autoWarm = true, warmConcurrency = 1, generationTtlMs = 1000, log = () => undefined }: CacheOptions = {},
): CachedStore {
  // Map order is recency order: a hit re-inserts its key, so the first key is the least recently used.
  const entries = new Map<string, { value: unknown; bytes: number }>();
  let bytes = 0;
  let generation: string | null = null;
  let hits = 0;
  let misses = 0;
  let flushes = 0;
  let warming: Promise<WarmReport> | null = null;
  let lastRead = 0;
  let reading: Promise<string | null> | null = null;

  // A missing table or row means "no graph yet" (null); a failed read throws so the caller keeps the current generation.
  async function readGeneration(): Promise<string | null> {
    try {
      const r = await pool.query<{ generation: string }>("SELECT generation FROM seap.rollup_meta LIMIT 1");
      return r.rows[0]?.generation ?? null;
    } catch (e) {
      if ((e as { code?: string }).code === "42P01") return null; // undefined_table
      throw e;
    }
  }

  function flush(g: string | null) {
    if (generation !== null) flushes++;
    entries.clear();
    bytes = 0;
    generation = g;
    if (g !== null && autoWarm) {
      warming = warm().catch((e) => (log(`cache warming failed: ${(e as Error).message}`), { prefixes: 0, statements: 0, failed: 1, ms: 0 }));
    }
  }

  async function sync(fresh: boolean): Promise<string | null> {
    if (!fresh && generation !== null && Date.now() - lastRead < generationTtlMs) return generation;
    if (!reading) {
      reading = readGeneration().finally(() => {
        reading = null;
      });
    }
    let g: string | null;
    try {
      g = await reading; // concurrent lookups share one in-flight read
    } catch (e) {
      log(`reading the load generation failed, keeping the current one: ${(e as Error).message}`);
      return generation;
    }
    lastRead = Date.now();
    if (g !== generation) flush(g);
    return g;
  }

  let countiesMemo: { generation: string; rows: Awaited<ReturnType<Store["counties"]>> } | null = null;

  async function cached<T>(key: string, run: () => Promise<T>): Promise<T> {
    const g = await sync(false);
    const hit = g !== null ? entries.get(key) : undefined;
    if (hit) {
      hits++;
      entries.delete(key); // LRU: most recently used goes last
      entries.set(key, hit);
      return hit.value as T;
    }
    misses++;
    const value = await run(); // a failure or an abort is never cached
    if (g !== null && g === generation) {
      const cost = approxBytes(value);
      if (cost <= maxBytes) {
        const old = entries.get(key);
        if (old) bytes -= old.bytes;
        entries.delete(key);
        entries.set(key, { value, bytes: cost });
        bytes += cost;
        while ((bytes > maxBytes || entries.size > maxEntries) && entries.size > 1) {
          const [oldest, e] = entries.entries().next().value!;
          entries.delete(oldest);
          bytes -= e.bytes;
        }
      }
    }
    return value;
  }

  async function warm(): Promise<WarmReport> {
    const started = Date.now();
    const g = generation;
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
          // in sequence: each statement takes a pooled connection, and the pool is shared with the requests
          await store.searchTotal(f);
          await store.searchMap("AUTHORITY", f); // the Money lens, the default side (#71)
          await store.searchMap("SUPPLIER", f); // and the other side, so the first toggle is not a cold scan
          await store.searchEntities("AUTHORITY", f, PAGE);
          await store.searchEntities("SUPPLIER", f, PAGE);
          await (f.q ? store.searchRecords(f, { ...PAGE, order: "VALUE_DESC" }) : store.records({ ...PAGE, order: "VALUE_DESC" }));
          if (f.q) await store.goTo(foldTokens(f.q).join(" ")); // the Go-to lookup of the same folded query
          statements += f.q ? 7 : 6;
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
    stats: () => ({ hits, misses, flushes, entries: entries.size, bytes, generation }),
    sync: async () => {
      await sync(true);
    },
    warm: async () => {
      await sync(true);
      if (warming) await warming.catch(() => undefined);
      return warm();
    },
    searchTotal: (filter, options) => cached(`total|${canonicalFilter(filter)}`, () => inner.searchTotal(filter, options)),
    searchEntities: (side, filter, p, options) => cached(`${side}|${canonicalFilter(filter)}|${page(p)}`, () => inner.searchEntities(side, filter, p, options)),
    searchRecords: (filter, p, options) => cached(`records|${canonicalFilter(filter)}|${page(p)}|${p.order satisfies RecordOrderKey}`, () => inner.searchRecords(filter, p, options)),
    // the Go-to entity depends on the folded query alone (chips never restrict it), so the key is the folded text
    goTo: (qFolded, options) => cached(`goto|${qFolded}`, () => inner.goTo(qFolded, options)),
    searchMap: (side, filter, options) => cached(`map|${side}|${canonicalFilter(filter)}`, () => inner.searchMap(side, filter, options)),
    // the county list is tiny and only changes with a load: kept per generation, outside the LRU and the hit/miss counts
    counties: async () => {
      const g = await sync(false);
      if (g !== null && countiesMemo?.generation === g) return countiesMemo.rows;
      const rows = await inner.counties();
      if (g !== null && g === generation) countiesMemo = { generation: g, rows };
      return rows;
    },
    // the role aggregates of an entity page (#73): the filter is already scoped to the entity, so its key is in the canonical filter
    roleCounterparties: (side, filter, p, options) => cached(`cpty|${side}|${canonicalFilter(filter)}|${p.limit}`, () => inner.roleCounterparties(side, filter, p, options)),
    searchFacet: (dimension, filter, options) => cached(`facet|${dimension}|${canonicalFilter(filter)}`, () => inner.searchFacet(dimension, filter, options)),
    searchMonths: (filter, options) => cached(`months|${canonicalFilter(filter)}`, () => inner.searchMonths(filter, options)),
    roleFrameworks: (filter, options) => cached(`frameworks|${canonicalFilter(filter)}`, () => inner.roleFrameworks(filter, options)),
    roleConsortia: (filter, p, options) => cached(`consortia|${canonicalFilter(filter)}|${p.limit}`, () => inner.roleConsortia(filter, p, options)),
    roleLargest: (filter, p, options) => cached(`largest|${canonicalFilter(filter)}|${p.limit}`, () => inner.roleLargest(filter, p, options)),
    searchUatMap: (county, filter, options) => cached(`uatmap|${county}|${canonicalFilter(filter)}`, () => inner.searchUatMap(county, filter, options)),
    records: (p) => cached(`empty-records|${page(p)}|${p.order}`, () => inner.records(p)),
  };
  return store;
}
