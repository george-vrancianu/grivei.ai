import { GraphQLError } from "graphql";
import { buildWhere, type SearchFilter } from "./search.ts";
import { matchedFieldOf } from "./matched.ts";
import { onrcMatchedFields } from "./onrcMatched.ts";
import type { OnrcSearchFilter } from "./onrcSearch.ts";
import { foldTokens } from "./fold.ts";
import { adapterOf, plannedSources, SOURCE_ADAPTERS, type SourceRow } from "./sources.ts";
import type { SourceId } from "@grivei/contract/schema-types";
import { seapLinkUrl } from "./seapLink.ts";
import { roleObject } from "./roleResolvers.ts";
import { signalObject as makeSignal, type SignalRow } from "./signals.ts";
import type { Store, EntityRow, RecordRow, RecordDetail, RecordOrderKey, CountyRow, PlacementRow, EntityHit, FinancialYearRow, FirmDonationsRow, OnrcRegistrationRow } from "./store.ts";

const MAX_SUBSEQUENT = 200;
// The graph's root value: plain objects whose function-valued fields graphql-js calls as resolvers.
// The root serves `sources`, `coverage(source)`, `seap { search, record }`, `onrc { search, record }`, `person` and `referenceSources`.
// No copy lives here: only data, enums and identifiers.

const MAX_LIMIT = 200; // the SDL: "the server caps limit at 200"

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

const zeroTotal = () => ({ awarded: "0", records: 0, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", estimated: false });

// The order of the RecordBadge enum.
const BADGE_ORDER = ["FRAMEWORK_CEILING", "SUBSEQUENT_CONTRACT", "CONSORTIUM_SHARE", "SUSPECT_VALUE", "NO_VALUE", "CUI_MISMATCH", "NAME_DIFFERS_FROM_ANAF", "IDENTITY_CURATED", "CRAWLED_PROVISIONAL", "CRAWL_ONLY"];
const badgeRank = (b: string) => (BADGE_ORDER.includes(b) ? BADGE_ORDER.indexOf(b) : BADGE_ORDER.length);

function recordPage(r: RecordDetail, recordRow: (r: RecordRow) => object, store: Store) {
  return {
    ...recordRow(r),
    contractType: r.contractType,
    cpv: r.cpv,
    // the Party of the Mandate in force on the award date at the authority (#180); never on a winner
    party: () => store.recordParty(r.code),
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

/** The texts of a returned Record the query can have matched (never a natural person: they have no name and no entity). */
const matchSource = (r: RecordRow) => ({
  code: r.code,
  title: r.title,
  authorityName: r.published?.authorityName ?? r.authority.displayName,
  authorityCui: r.authority.cui,
  cpvCode: r.published?.cpvCode ?? null,
  cpvDescription: r.published?.cpvDescription ?? null,
  winners: r.winners.filter((w) => !w.naturalPerson).map((w) => ({ name: w.name, cui: w.entity?.cui ?? null, foreignVatId: w.entity?.foreignVatId ?? null })),
});

/** The statements of an entity as the contract serves them; the award share is context (ADR 0014): awarded in the calendar year over the year's turnover, null when that is blank or zero. */
export function financialsObject(rows: FinancialYearRow[]) {
  if (rows.length === 0) return null;
  return {
    years: rows.map((y) => ({
      fiscalYear: y.fiscalYear,
      revision: y.revision === "REVISED" ? ("REVISED" as const) : ("FIRST_RELEASE" as const),
      mayBeRevised: y.newest && y.revision === "FIRST",
      turnover: y.turnover,
      profitOrLoss: y.profitOrLoss,
      debts: y.debts,
      equity: y.equity,
      averageEmployees: y.averageEmployees,
      awardedInYear: y.awardedInYear,
      awardShareOfTurnover: y.turnover !== null && BigInt(y.turnover) > 0n ? Number(y.awardedInYear) / Number(y.turnover) : null,
      source: y.source,
    })),
  };
}

/** An entity's firm donations as the contract serves them (#182): counts of each kind, never a sum; context, never a Signal (ADR 0014). */
export function donationsObject(found: FirmDonationsRow | null) {
  if (found === null) return null;
  return {
    dataThroughYear: found.dataThroughYear,
    donationCount: found.items.filter((i) => i.kind === "DONATION").length,
    loanCount: found.items.filter((i) => i.kind === "LOAN").length,
    items: found.items,
    source: found.source,
  };
}

export function rootValue(store: Store, options: { restricted?: boolean } = {}) {
  // Restricted content (ADR 0015): fail closed. Only an explicit `true` (the host's `GRIVEI_RESTRICTED` is `show`, restricted.ts) reveals it.
  const restricted = options.restricted === true;
  /** An Entity of the shared core (ADR 0003); its SEAP role aggregates are in roleResolvers.ts (#73). */
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
    // the ONRC section (#175): the same on both role pages; null for an entity with no CUI or no registration
    onrc: async () => {
      const found = e.cui ? await store.onrc(e.cui) : null;
      return found && onrcRegistrationObject(found);
    },
    // ONRC's administrators and legal representatives (#177), public tier: named only on a SEAP counterparty (ADR 0009); an organisation that exists only in ONRC is not named.
    // The person link of a linked holder is Restricted (ADR 0015): the store is not even asked for the ids unless the switch shows them.
    people: async () => {
      if (!e.cui || (await store.roles(e.key)).length === 0) return null;
      const found = await store.people(e.cui, { personIds: restricted });
      return (
        found && {
          snapshot: found.snapshot,
          provenance: { source: "ONRC" as const, kind: "BULK" as const, ...found.provenance },
          holders: found.holders.map((h) => ({ name: h.name, role: h.role, birthYear: h.birthYear, person: restricted && h.personId ? { id: h.personId } : null })),
        }
      );
    },
    // AMEPIP's list holds CUIs only (#183): an entity with no CUI is never a public enterprise
    publicEnterprise: () => (e.cui ? store.publicEnterprise(e.cui) : null),
    // the Leadership list (#180): only an attributed authority or a subordinate body has one; null for every other entity, a supplier never
    leadership: () => store.leadership(e.key),
    // MF's annual statements for the CUI (#179), with the awards of each year beside them as context: null when MF holds none
    financials: async () => (e.cui ? financialsObject(await store.financials(e.cui, e.key)) : null),
    // BaniPartide's firm donations and loans under the CUI (#182): null when it lists none; on a supplier the page reads it as "also a firm donor", context only
    donations: async () => (e.cui ? donationsObject(await store.donations(e.cui)) : null),
    seap: () => ({
      roles: () => store.roles(e.key),
      // null when the entity never held the role (the contract); #73
      role: async ({ role }: { role: "AUTHORITY" | "SUPPLIER" }) =>
        (await store.roles(e.key)).includes(role) ? roleObject(store, role, e.key, { entityObject, recordRow, search: (f, other) => searchObject(f, other), moneyMap, withEstimated: (t) => ({ ...zeroTotal(), ...t }), signalObject }) : null,
    }),
  });

  /** An ONRC registration as the contract serves it (the entity page's section and `onrc.record`): its provenance is ONRC's snapshot dataset; its entity is the page of its CUI. */
  const onrcRegistrationObject = (found: OnrcRegistrationRow) => ({
    ...found,
    provenance: { source: "ONRC" as const, kind: "BULK" as const, ...found.provenance },
    entity: async () => (found.cui ? ((await store.entity(found.cui).then((e) => (e ? entityObject(e) : null))) ?? null) : null),
  });

  const signalObject = (s: SignalRow) => makeSignal(store, s, { entityObject, recordRow });

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
      signals: (r.signals ?? []).map(signalObject),
      // Every Record carries its provenance. A crawled Record's public page was built at load time; a bulk Record's is the /source/seap/<code> redirect.
      provenance: {
        source: "SEAP" as const,
        kind: r.provenance.kind,
        via: r.provenance.via,
        fetchedAt: r.provenance.fetchedAt,
        url: r.provenance.url ?? seapLinkUrl(r.code),
      },
    };
  }

  /** The Money lens of a filter on a side: the search's `map` (on the filter's `countySide`) and an entity role's `flow` (on the counterparty's side). */
  async function moneyMap(side: "AUTHORITY" | "SUPPLIER", filter: SearchFilter, ctx: Ctx) {
    const [m, counties] = await Promise.all([store.searchMap(side, filter, { signal: ctx?.signal }), store.counties()]);
    const names = new Map(counties.map((c) => [`RO-${c.iso}`, c.name]));
    return {
      side,
      counties: m.counties.map((c) => ({ area: c.area, name: names.get(c.area) ?? c.area, total: { ...zeroTotal(), ...c.total }, entities: c.entities })),
      national: { ...zeroTotal(), ...m.national },
      unplaced: m.unplaced ? { authorities: m.unplaced.authorities, total: { ...zeroTotal(), ...m.unplaced.total } } : null,
      unknownSupplierCounty: m.unknownSupplierCounty ? { ...zeroTotal(), ...m.unknownSupplierCounty } : null,
    };
  }

  /**
   * The Records tab's facet panel (#73): the Total per channel, procedure, year and badge of the set, and the top counterparties.
   * Served only when the set is one entity's (an authority or a supplier in the filter): the national set has no facet panel, and
   * the panel would be a scan of everything. `counterparties` names the side the counterparty facet lists (an entity page knows its own);
   * the facet offers the alternatives, so the counterparty already picked is dropped from the filter it is computed on.
   */
  /**
   * The rows of an entity page of a tab (or the counterparty facet): `signalCount` (#104) is read only when the query selects it, once for the whole page of
   * `side` and the filter (one grouped query on the page's keys), so the page query itself is not changed.
   */
  function entityResults(side: "AUTHORITY" | "SUPPLIER", filter: SearchFilter, hits: EntityHit[], ctx: Ctx) {
    let counts: Promise<Map<string, number>> | undefined;
    const countOf = (key: string) => (counts ??= store.entitySignalCounts(side, filter, hits.map((h) => h.entity.key), { signal: ctx?.signal })).then((m) => m.get(key) ?? 0);
    return hits.map((h) => ({ entity: entityObject(h.entity), matched: { ...zeroTotal(), ...h.matched }, signalCount: () => countOf(h.entity.key) }));
  }

  function facetsOf(filter: SearchFilter, counterparties: "AUTHORITY" | "SUPPLIER" | null) {
    const scoped = !!(filter.authority || filter.supplier);
    const rows = (dimension: "channel" | "procedure" | "year" | "badge" | "signal") => async (_: unknown, ctx: Ctx) =>
      scoped ? (await store.searchFacet(dimension, filter, { signal: ctx?.signal })).map((x) => ({ value: x.value, total: { ...zeroTotal(), ...x.total } })) : [];
    return {
      channel: rows("channel"),
      procedure: rows("procedure"),
      year: rows("year"),
      signal: rows("signal"),
      badge: rows("badge"),
      counterparty: async (_: unknown, ctx: Ctx) => {
        if (!scoped || !counterparties) return [];
        const open = counterparties === "SUPPLIER" ? { ...filter, supplier: undefined } : { ...filter, authority: undefined };
        const page = await store.searchEntities(counterparties, open, { limit: 10, offset: 0 }, { signal: ctx?.signal });
        return entityResults(counterparties, open, page.rows, ctx);
      },
    };
  }

  function searchObject(filter: SearchFilter, counterparties?: "AUTHORITY" | "SUPPLIER") {
    const where = buildWhere(filter);
    // The store serves the empty and chips-only states from the rollup and the rest from the search index (#70).
    const total = (_: unknown, ctx: Ctx) =>
      store.searchTotal(filter, { signal: ctx?.signal }).then((t) => ({
        ...zeroTotal(),
        ...t,
        // only a Party-filtered search states its coverage, and only when the query selects it (a second grouped scan)
        partyCoverage: () => (filter.party ? store.searchPartyCoverage(filter, { signal: ctx?.signal }) : null),
      }));
    const entityPage = (side: "AUTHORITY" | "SUPPLIER") => async ({ limit, offset }: { limit: number; offset: number }, ctx: Ctx) => {
      const page = await store.searchEntities(side, filter, { limit: Math.min(Math.max(limit, 0), MAX_LIMIT), offset: Math.max(offset, 0) }, { signal: ctx?.signal });
      return {
        count: page.count,
        countEstimated: page.estimated,
        rows: entityResults(side, filter, page.rows, ctx),
      };
    };
    const queryTokens = foldTokens(filter.q ?? "");
    const echo = (key: string | null | undefined) => (key ? store.entity(key).then((e) => (e ? entityObject(e) : null)) : null);
    return {
      filter: { qFolded: where.qFolded, authority: () => echo(filter.authority), supplier: () => echo(filter.supplier) },
      total,
      map: (_: unknown, ctx: Ctx) => moneyMap(filter.countySide ?? "AUTHORITY", filter, ctx),
      // the zoomed county is authority-side (UATs place authorities), whatever the filter's `countySide`
      uatMap: async ({ county: code }: { county: string }, ctx: Ctx) => {
        const m = await store.searchUatMap(code, filter, { signal: ctx?.signal });
        return {
          uats: m.uats.map((u) => ({ area: u.area, name: u.name, total: { ...zeroTotal(), ...u.total }, entities: u.entities })),
          unknownUat: m.unknownUat ? { ...zeroTotal(), ...m.unknownUat } : null,
        };
      },
      authorities: entityPage("AUTHORITY"),
      suppliers: entityPage("SUPPLIER"),
      // the Go-to card depends on the query alone: the chips never restrict it
      goTo: async (_: unknown, ctx: Ctx) => {
        if (!where.qFolded) return null;
        const found = await store.goTo(where.qFolded, { signal: ctx?.signal });
        return found ? entityObject(found) : null;
      },
      // a search of one authority lists suppliers, of one supplier lists authorities (an entity role says which itself)
      facets: () => facetsOf(filter, counterparties ?? (filter.authority && !filter.supplier ? "SUPPLIER" : filter.supplier && !filter.authority ? "AUTHORITY" : null)),
      records: async ({ limit, offset, order }: { limit: number; offset: number; order: RecordOrderKey }, ctx: Ctx) => {
        const page = { limit: Math.min(Math.max(limit, 0), MAX_LIMIT), offset: Math.max(offset, 0), order };
        const { count, rows } = where.empty
          ? { count: (await store.searchTotal(filter, { signal: ctx?.signal })).records, rows: await store.records(page) } // the empty state's Records: the Top-K query on the Record table
          : await store.searchRecords(filter, page, { signal: ctx?.signal });
        // areaShare (#103): only after a supplier-side county click, and only for a Record with several winners (a single winner's share is the whole value)
        const inArea = filter.countySide === "SUPPLIER" && !!filter.county;
        return {
          count,
          rows: rows.map((record) => ({
            record: recordRow(record),
            matchedField: matchedFieldOf(matchSource(record), queryTokens),
            areaShare: inArea && record.winners.length > 1 ? (record.areaShare ?? null) : null,
          })),
        };
      },
    };
  }

  /** ONRC's search (#176): the match count, the Organisations tab and the count lens of one filter. No person is ever in it (the search table holds organisations only). */
  function onrcSearchObject(filter: OnrcSearchFilter) {
    const queryTokens = foldTokens(filter.q ?? "");
    // `count` and the Organisations page both need the match count: it is counted once per search object
    let counted: Promise<number> | undefined;
    const matchCount = (ctx: Ctx) => (counted ??= store.onrcCount(filter, { signal: ctx?.signal }));
    return {
      filter: { qFolded: queryTokens.length ? queryTokens.join(" ") : null },
      count: (_: unknown, ctx: Ctx) => matchCount(ctx),
      defaultTab: "ORGANISATIONS" as const,
      organisations: async ({ limit, offset }: { limit: number; offset: number }, ctx: Ctx) => {
        const page = await store.onrcSearch(filter, { limit: Math.min(Math.max(limit, 0), MAX_LIMIT), offset: Math.max(offset, 0) }, { signal: ctx?.signal, count: await matchCount(ctx) });
        return {
          count: page.count,
          rows: page.rows.map((r) => ({
            registrationNumber: r.registrationNumber,
            name: r.name,
            cui: r.cui,
            legalForm: r.legalForm,
            registrationDate: r.registrationDate,
            seat: r.seat,
            statuses: r.statuses,
            caen: r.caen,
            seapCounterparty: r.seapCounterparty,
            entity: r.entity ? entityObject(r.entity) : null,
            matched: onrcMatchedFields({ name: r.name, aliases: r.aliases, cui: r.cui, registrationNumber: r.registrationNumber, caen: r.caen }, queryTokens),
          })),
        };
      },
      map: async (_: unknown, ctx: Ctx) => {
        const [m, counties] = await Promise.all([store.onrcCountMap(filter, { signal: ctx?.signal }), store.counties()]);
        const names = new Map(counties.map((c) => [`RO-${c.iso}`, c.name]));
        return { counties: m.counties.map((c) => ({ area: c.area, name: names.get(c.area) ?? c.area, registrations: c.registrations })), unplacedRegistrations: m.unplaced };
      },
    };
  }

  /** A registry entry as the `Source` type: its data-through dates come from its adapter. */
  const sourceObject = async (row: Pick<SourceRow, "id" | "name">) => {
    const dataThrough = await adapterOf(row.id).dataThrough(store);
    // a Source in the registry whose tables are empty (an ONRC with no snapshot archived yet) is not harvested; SEAP always is (its Coverage grid says what is missing)
    return { id: row.id as SourceId, name: row.name, harvested: row.id === "SEAP" || dataThrough.length > 0, dataThrough };
  };

  return {
    // the registry (`core.source`, stored by every rebuild) first, then the planned Sources it does not hold yet
    sources: async () => {
      const held = await store.sources();
      return [...(await Promise.all(held.map(sourceObject))), ...plannedSources(held.map((row) => row.id))];
    },
    entity: async ({ key }: { key: string }) => {
      const found = await store.entity(key);
      return found ? entityObject(found) : null;
    },
    // The grid (#79) and the per-county figures (#80) follow the date window: quarters overlapping it, Records dated in it.
    coverage: ({ source, window }: { source: string; window?: { from?: string | null; to?: string | null } | null }) => {
      const adapter = SOURCE_ADAPTERS[source];
      if (!adapter) throw new GraphQLError(`coverage of ${source} is not served yet`, { extensions: { code: "NOT_IMPLEMENTED" } });
      const named = async () => {
        const row = (await store.sources()).find((r) => r.id === source);
        return sourceObject(row ?? { id: source, name: source });
      };
      return { source: named, ...adapter.coverage(store, { from: window?.from || null, to: window?.to || null }, zeroTotal) };
    },
    referenceSources: () => store.referenceSources(),
    // RESTRICTED (ADR 0015): with the switch off the resolver answers null before it asks the store anything, so not even the existence or the count of a person's roles is served
    person: async ({ id }: { id: string }) => {
      if (!restricted) return null;
      const found = await store.person(id);
      return (
        found && {
          id: found.id,
          name: found.name,
          birthYear: found.birthYear,
          roleCount: found.roles.length,
          roles: found.roles,
          snapshot: found.snapshot,
          provenance: { source: "ONRC" as const, kind: "BULK" as const, ...found.provenance },
        }
      );
    },
    signalRules: async () =>
      (await store.signalRules()).map((r) => ({ slug: r.slug, window: r.window, baseRate: r.baseRate, baseRateYear: r.baseRateYear, dataThrough: r.dataThrough })),
    counties: async () => (await store.counties()).map(county),
    uats: async ({ county: code }: { county: string }) =>
      (await store.uats(code.replace(/^RO-/, ""))).map((u) => ({ siruta: u.siruta, name: u.name, county: county(u.county) })),
    onrc: () => ({
      search: ({ filter }: { filter: OnrcSearchFilter }) => onrcSearchObject(filter),
      record: async ({ registrationNumber }: { registrationNumber: string }) => {
        const found = await store.onrcRecord(registrationNumber);
        return found ? onrcRegistrationObject(found) : null;
      },
    }),
    seap: () => ({
      record: async ({ code }: { code: string }) => {
        const found = await store.record(code);
        return found ? recordPage(found, recordRow, store) : null;
      },
      search: ({ filter }: { filter: SearchFilter }) => searchObject(filter),
      partyOptions: () => store.partyOptions(),
    }),
  };
}
