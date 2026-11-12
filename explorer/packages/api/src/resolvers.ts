import { GraphQLError } from "graphql";
import { coverageStatus } from "./coverage.ts";
import { buildWhere, type SearchFilter } from "./search.ts";
import type { Store, EntityRow, RecordRow, RecordDetail, RecordOrderKey, CountyRow, PlacementRow, EntityHit } from "./store.ts";

const MAX_SUBSEQUENT = 200;

// The graph's root value: plain objects whose function-valued fields graphql-js calls as resolvers.
// The tracer bullet serves the SEAP Total and Records list for the empty filter, and returns empty-but-valid values for
// the rest of what the main screen selects (maps, tabs, goTo), until the tickets that own them land.
// No copy lives here: only data, enums and identifiers.

const MAX_LIMIT = 200; // the SDL: "the server caps limit at 200"

function notServed(what: string): () => never {
  return () => {
    throw new GraphQLError(`${what} is not served yet`, { extensions: { code: "NOT_IMPLEMENTED" } });
  };
}

type Ctx = { signal?: AbortSignal } | undefined;

/** A county as the contract names it: ISO 3166-2:RO with the `RO-` prefix (`RO-BV`, `RO-B`). */
const county = (c: CountyRow) => ({ code: `RO-${c.iso}`, name: c.name });

/**
 * Placement (#67). A national authority is flagged and placed nowhere on the map: its seat (Bucharest, as a rule) is stored in the
 * core but not served as a county, a UAT or a locality, so no client can pile it onto Bucharest. Everyone else: the county, the UAT
 * when one matched (else null: "county known, UAT unknown") and the village SIRUTA when a source named one.
 */
const placementObject = (p: PlacementRow | null | undefined) => {
  if (!p) return null;
  if (p.national) return { county: null, uat: null, locality: null, national: true, placedBy: p.placedBy };
  const c = p.countyIso && p.countyName ? { iso: p.countyIso, name: p.countyName } : null;
  return {
    county: c ? county(c) : null,
    uat: c && p.uat ? { siruta: p.uat.siruta, name: p.uat.name, county: county(c) } : null,
    locality: p.villageSiruta,
    national: false,
    placedBy: p.placedBy,
  };
};

/** Does the quarter (`2024-Q4`) overlap the window (open ends allowed; `Date`s are `YYYY-MM-DD`, which sort as text)? */
function overlaps(quarter: string, from: string | null, to: string | null): boolean {
  const [year, q] = quarter.split("-Q") as [string, string];
  const first = `${year}-${String(3 * Number(q) - 2).padStart(2, "0")}-01`;
  const last = `${year}-${String(3 * Number(q)).padStart(2, "0")}-${Number(q) === 1 || Number(q) === 4 ? "31" : "30"}`;
  return (from === null || last >= from) && (to === null || first <= to);
}

const zeroTotal = () => ({ awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false });

// The order of the RecordBadge enum.
const BADGE_ORDER = ["FRAMEWORK_CEILING", "SUBSEQUENT_CONTRACT", "CONSORTIUM_SHARE", "SUSPECT_VALUE", "NO_VALUE", "CUI_MISMATCH", "NAME_DIFFERS_FROM_ANAF", "IDENTITY_CURATED", "CRAWLED_PROVISIONAL", "CRAWL_ONLY"];
const badgeRank = (b: string) => (BADGE_ORDER.includes(b) ? BADGE_ORDER.indexOf(b) : BADGE_ORDER.length);

function recordPage(r: RecordDetail, recordRow: (r: RecordRow) => object, store: Store) {
  return {
    ...recordRow(r),
    contractType: r.contractType,
    cpv: r.cpv,
    // `url`: a crawled Record's public page was built at load time; a bulk Record's is the /source/seap/<code> redirect's job (not built yet).
    provenance: { source: "SEAP" as const, url: r.provenance.url, via: r.provenance.via, kind: r.provenance.kind, fetchedAt: r.provenance.fetchedAt },
    // the link to its framework agreement (the counting rule): set for an agreement's own contract and for a contract awarded under one
    framework: r.frameworkRole
      ? async () => {
          const f = await store.framework(r.code);
          if (!f) return null;
          return {
            agreement: f.agreement ? recordRow(f.agreement) : null,
            ceiling: f.ceiling,
            subsequentReported: f.subsequentReported,
            ratio: f.ratio,
            subsequent: async ({ limit, offset }: { limit: number; offset: number }) =>
              (await store.subsequent(f.noticeCode, { limit: Math.min(Math.max(limit, 0), MAX_SUBSEQUENT), offset: Math.max(offset, 0) })).map(recordRow),
          };
        }
      : null,
  };
}

export function rootValue(store: Store) {
  /** An Entity of the shared core (ADR 0003). The role aggregates belong to a later ticket (#73): null for now. */
  const entityObject = (e: EntityRow) => ({
    __typename: "Entity" as const,
    key: e.key,
    displayName: e.displayName,
    identity: e.identity,
    cui: e.cui,
    foreignVatId: e.foreignVatId,
    anafStatus: e.anafStatus,
    identityCurated: e.identityCurated,
    placement: placementObject(e.placement),
    provenance: [
      {
        source: e.provenance.source,
        url: null,
        via: e.provenance.via,
        kind: e.provenance.source === "ANAF" ? ("API" as const) : ("BULK" as const),
        fetchedAt: e.provenance.fetchedAt,
      },
    ],
    aliases: () => store.aliases(e.key),
    seap: () => ({ roles: () => store.roles(e.key), role: () => null }), // TODO #73: the per-role totals, Records and counterparties
  });

  function recordRow(r: RecordRow) {
    return {
      __typename: "SeapRecord" as const,
      code: r.code,
      title: r.title,
      date: r.date,
      kind: r.kind,
      channel: r.channel,
      procedure: r.procedure,
      value: r.value,
      counted: r.counted,
      // the counting and identity badges the rebuild stored, plus the crawl ones; one stable order (the enum's)
      badges: [...r.badges, ...(r.crawlStatus === "PROVISIONAL" ? ["CRAWLED_PROVISIONAL"] : r.crawlStatus === "CRAWL_ONLY" ? ["CRAWL_ONLY"] : [])].sort(
        (a, b) => badgeRank(a) - badgeRank(b),
      ),
      suspect: r.suspect ? { rule: r.suspect.rule, threshold: r.suspect.threshold } : null,
      authority: entityObject(r.authority),
      // A natural person (a 13-digit CNP in the file) is never named or linked: the rebuild stored nothing of them (ADR 0003).
      winners: r.winners.map((w) => ({
        naturalPerson: w.naturalPerson,
        publishedName: w.naturalPerson ? null : w.name,
        share: w.share, // an equal share of the value for each member of a consortium, decided by the rebuild
        entity: w.entity ? entityObject(w.entity) : null,
      })),
      signals: [],
    };
  }

  const seapSource = async () => ({ id: "SEAP" as const, name: "SEAP", harvested: true, dataThrough: await store.dataThrough() });

  return {
    sources: async () => [await seapSource()],
    entity: async ({ key }: { key: string }) => {
      const found = await store.entity(key);
      return found ? entityObject(found) : null;
    },
    // The grid (#79) and the per-county figures (#80) follow the date window: quarters overlapping it, Records dated in it.
    coverage: ({ source, window }: { source: string; window?: { from?: string | null; to?: string | null } | null }) => {
      if (source !== "SEAP") throw new GraphQLError(`coverage of ${source} is not served yet`, { extensions: { code: "NOT_IMPLEMENTED" } });
      const from = window?.from ?? null;
      const to = window?.to ?? null;
      let cached: Promise<Awaited<ReturnType<typeof store.coverageGrid>>> | undefined; // one read per request even when grid and counties are both selected
      const grid = () => (cached ??= store.coverageGrid().then((cells) => cells.filter((cell) => overlaps(cell.quarter, from, to))));
      return {
        source: seapSource,
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
    signalRules: notServed("signalRules"),
    counties: async () => (await store.counties()).map(county),
    uats: async ({ county: code }: { county: string }) =>
      (await store.uats(code.replace(/^RO-/, ""))).map((u) => ({ siruta: u.siruta, name: u.name, county: county(u.county) })),
    seap: () => ({
      record: async ({ code }: { code: string }) => {
        const found = await store.record(code);
        return found ? recordPage(found, recordRow, store) : null;
      },
      search: ({ filter }: { filter: SearchFilter }) => {
        const where = buildWhere(filter); // refuses the filters that wait for other tickets (NOT_IMPLEMENTED)
        // The store serves the empty and chips-only states from the rollup and the rest from the search index (#70).
        const total = (_: unknown, ctx: Ctx) => store.searchTotal(filter, { signal: ctx?.signal }).then((t) => ({ ...zeroTotal(), ...t }));
        const entityPage = (side: "AUTHORITY" | "SUPPLIER") => async ({ limit, offset }: { limit: number; offset: number }, ctx: Ctx) => {
          const page = await store.searchEntities(side, filter, { limit: Math.min(Math.max(limit, 0), MAX_LIMIT), offset: Math.max(offset, 0) }, { signal: ctx?.signal });
          return {
            count: page.count,
            countEstimated: page.estimated,
            rows: page.rows.map((h: EntityHit) => ({ entity: entityObject(h.entity), matched: { ...zeroTotal(), ...h.matched } })),
          };
        };
        const echo = (key: string | null | undefined) => (key ? store.entity(key).then((e) => (e ? entityObject(e) : null)) : null);
        return {
          filter: { qFolded: where.qFolded, authority: () => echo(filter.authority), supplier: () => echo(filter.supplier) },
          total,
          map: async () => ({
            side: filter.countySide ?? "AUTHORITY",
            counties: [],
            national: zeroTotal(),
            unplaced: null,
            unknownSupplierCounty: null,
          }),
          uatMap: () => ({ uats: [], unknownUat: null }),
          authorities: entityPage("AUTHORITY"),
          suppliers: entityPage("SUPPLIER"),
          goTo: null,
          facets: () => ({ channel: [], procedure: [], year: [], signal: [], badge: [], counterparty: [] }),
          records: async ({ limit, offset, order }: { limit: number; offset: number; order: RecordOrderKey }, ctx: Ctx) => {
            const page = { limit: Math.min(Math.max(limit, 0), MAX_LIMIT), offset: Math.max(offset, 0), order };
            const { count, rows } = where.empty
              ? { count: (await store.searchTotal(filter, { signal: ctx?.signal })).records, rows: await store.records(page) } // the empty state's Records: the Top-K query on the Record table
              : await store.searchRecords(filter, page, { signal: ctx?.signal });
            return { count, rows: rows.map((record) => ({ record: recordRow(record), matchedField: null })) };
          },
        };
      },
    }),
  };
}
