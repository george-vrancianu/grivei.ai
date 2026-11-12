import { GraphQLError } from "graphql";
import type { Store, EntityRow, RecordRow, RecordDetail, RecordOrderKey, CountyRow, PlacementRow } from "./store.ts";

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

const zeroTotal = () => ({ awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false });

function recordPage(r: RecordDetail, recordRow: (r: RecordRow) => object) {
  return {
    ...recordRow(r),
    contractType: r.contractType,
    cpv: r.cpv,
    // `url`: a crawled Record's public page was built at load time; a bulk Record's is the /source/seap/<code> redirect's job (not built yet).
    provenance: { source: "SEAP" as const, url: r.provenance.url, via: r.provenance.via, kind: r.provenance.kind, fetchedAt: r.provenance.fetchedAt },
    suspect: null,
    framework: null,
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
      // the order of the enum: NO_VALUE, then the identity badges the rebuild set
      badges: [
        ...(r.value === null ? ["NO_VALUE"] : []),
        ...(r.crawlStatus === "PROVISIONAL" ? ["CRAWLED_PROVISIONAL"] : r.crawlStatus === "CRAWL_ONLY" ? ["CRAWL_ONLY"] : []),
        ...r.identityBadges,
      ],
      authority: entityObject(r.authority),
      // A natural person (a 13-digit CNP in the file) is never named or linked: the rebuild stored nothing of them (ADR 0003).
      winners: r.winners.map((w) => ({
        naturalPerson: w.naturalPerson,
        publishedName: w.naturalPerson ? null : w.name,
        share: null, // TODO #65: an equal share of the counted value for each member of a consortium
        entity: w.entity ? entityObject(w.entity) : null,
      })),
      signals: [],
    };
  }

  const total = async () => {
    const t = await store.total();
    return { ...zeroTotal(), awarded: t.awarded, records: t.records, noValue: t.noValue };
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
    counties: async () => (await store.counties()).map(county),
    uats: async ({ county: code }: { county: string }) =>
      (await store.uats(code.replace(/^RO-/, ""))).map((u) => ({ siruta: u.siruta, name: u.name, county: county(u.county) })),
    seap: () => ({
      record: async ({ code }: { code: string }) => {
        const found = await store.record(code);
        return found ? recordPage(found, recordRow) : null;
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
