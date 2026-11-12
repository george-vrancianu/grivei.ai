import { GraphQLError } from "graphql";
import type { Store, RecordRow, RecordDetail, RecordOrderKey } from "./store.ts";

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

const entity = (cui: string | null, name: string) => ({
  __typename: "Entity" as const,
  key: cui ?? `name-${name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  displayName: name,
  identity: cui ? ("CUI" as const) : ("NAME_ONLY" as const),
  cui,
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
    badges: r.value === null ? ["NO_VALUE"] : [],
    authority: entity(r.authority.cui, r.authority.name),
    // TODO #66: natural persons. A CNP-shaped CUI_OFERTANT must never be stored or served; it should be naturalPerson: true.
    winners: r.winners.map((w) => ({
      naturalPerson: false,
      publishedName: w.name,
      share: null, // TODO #65: an equal share of the counted value for each member of a consortium
      entity: entity(w.cui, w.name ?? w.cui ?? ""),
    })),
    signals: [],
  };
}

function recordPage(r: RecordDetail) {
  return {
    ...recordRow(r),
    contractType: r.contractType,
    cpv: r.cpv,
    // TODO: `url` is the Source's public page for the Record, served by the /source/seap/<code> redirect (not built yet).
    provenance: { source: "SEAP" as const, url: null, via: r.provenance.via, kind: "BULK" as const, fetchedAt: r.provenance.fetchedAt },
    suspect: null,
    framework: null,
  };
}

export function rootValue(store: Store) {
  const total = async () => {
    const t = await store.total();
    return { ...zeroTotal(), awarded: t.awarded, records: t.records, noValue: t.noValue };
  };
  const emptyPage = () => ({ count: 0, countEstimated: false, rows: [] });

  return {
    sources: async () => [
      { id: "SEAP", name: "SEAP", harvested: true, dataThrough: await store.dataThrough() },
    ],
    entity: notServed("entity"),
    coverage: notServed("coverage"),
    signalRules: notServed("signalRules"),
    counties: notServed("counties"),
    uats: notServed("uats"),
    seap: () => ({
      record: async ({ code }: { code: string }) => {
        const found = await store.record(code);
        return found ? recordPage(found) : null;
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
