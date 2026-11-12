import { GraphQLError } from "graphql";
import type { Store, EntityRow, RecordRow, RecordDetail, RecordOrderKey } from "./store.ts";

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

interface Filter {
  countySide?: "AUTHORITY" | "SUPPLIER" | null;
  [key: string]: unknown;
}

/** The empty filter: nothing but the (defaulted) county side. */
function assertEmptyFilter(filter: Filter): void {
  const used = Object.entries(filter).filter(([key, value]) => key !== "countySide" && value != null);
  if (used.length) {
    throw new GraphQLError(`filtering is not served yet (got ${used.map(([k]) => k).join(", ")})`, {
      extensions: { code: "NOT_IMPLEMENTED" },
    });
  }
}

const zeroTotal = () => ({ awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false });

// The order of the RecordBadge enum, with the crawl badges where they have always been (before the identity ones).
const BADGE_ORDER = ["FRAMEWORK_CEILING", "SUBSEQUENT_CONTRACT", "CONSORTIUM_SHARE", "SUSPECT_VALUE", "NO_VALUE", "CRAWLED_PROVISIONAL", "CRAWL_ONLY", "CUI_MISMATCH", "NAME_DIFFERS_FROM_ANAF", "IDENTITY_CURATED"];
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
  /** An Entity of the shared core (ADR 0003). Placement and the role aggregates belong to later tickets (#67, #73): null for now. */
  const entityObject = (e: EntityRow) => ({
    __typename: "Entity" as const,
    key: e.key,
    displayName: e.displayName,
    identity: e.identity,
    cui: e.cui,
    foreignVatId: e.foreignVatId,
    anafStatus: e.anafStatus,
    identityCurated: e.identityCurated,
    placement: null,
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

  const total = async () => {
    const t = await store.total();
    return { ...zeroTotal(), ...t };
  };
  const emptyPage = () => ({ count: 0, countEstimated: false, rows: [] });

  return {
    sources: async () => [
      { id: "SEAP", name: "SEAP", harvested: true, dataThrough: await store.dataThrough() },
    ],
    entity: async ({ key }: { key: string }) => {
      const found = await store.entity(key);
      return found ? entityObject(found) : null;
    },
    coverage: notServed("coverage"),
    signalRules: notServed("signalRules"),
    counties: notServed("counties"),
    uats: notServed("uats"),
    seap: () => ({
      record: async ({ code }: { code: string }) => {
        const found = await store.record(code);
        return found ? recordPage(found, recordRow, store) : null;
      },
      search: ({ filter }: { filter: Filter }) => {
        assertEmptyFilter(filter);
        return {
          filter: { qFolded: null, authority: null, supplier: null },
          total,
          map: async () => ({
            side: filter.countySide ?? "AUTHORITY",
            counties: [],
            national: zeroTotal(),
            unplaced: null,
            unknownSupplierCounty: null,
          }),
          uatMap: () => ({ uats: [], unknownUat: null }),
          authorities: emptyPage,
          suppliers: emptyPage,
          goTo: null,
          facets: () => ({ channel: [], procedure: [], year: [], signal: [], badge: [], counterparty: [] }),
          records: async ({ limit, offset, order }: { limit: number; offset: number; order: RecordOrderKey }) => {
            const count = (await store.total()).records;
            const rows = await store.records({ limit: Math.min(Math.max(limit, 0), MAX_LIMIT), offset: Math.max(offset, 0), order });
            return { count, rows: rows.map((record) => ({ record: recordRow(record), matchedField: null })) };
          },
        };
      },
    }),
  };
}
