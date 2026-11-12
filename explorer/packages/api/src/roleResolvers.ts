// The GraphQL side of an entity's role (#73): `entity.seap.role(role:)`. Every field takes the page's RecordFilter and scopes it to the
// entity on its side (see role.ts `scopeFilter`), then asks the same store calls the search uses, so the role's numbers are the
// entity-scoped search's by construction. No copy here: data, enums and identifiers only.
import type { SearchFilter } from "./search.ts";
import { otherSide, scopeFilter, shareOf, withCounterparty, type RoleSide } from "./role.ts";
import type { EntityRow, RecordRow, Store, TotalRow } from "./store.ts";

const MAX_LIMIT = 200; // the SDL: "the server caps limit at 200"
const capped = (limit: number | null | undefined, fallback: number) => Math.min(Math.max(limit ?? fallback, 0), MAX_LIMIT);

type Ctx = { signal?: AbortSignal } | undefined;
type FilterArg = { filter?: SearchFilter | null };

/** What the role needs from the graph's root: how an Entity, a Record, a search and a Money lens are served. */
export interface RoleHelpers {
  entityObject(e: EntityRow): object;
  recordRow(r: RecordRow): object;
  /** The SeapSearch of a filter (the one `seap.search` serves). */
  search(filter: SearchFilter, counterparties: RoleSide): object;
  /** The Money lens of a filter on a side (the one `SeapSearch.map` serves). */
  moneyMap(side: RoleSide, filter: SearchFilter, ctx: Ctx): Promise<object>;
  withEstimated(t: TotalRow): object;
}

export function roleObject(store: Store, side: RoleSide, key: string, h: RoleHelpers) {
  const scoped = (a: FilterArg) => scopeFilter(side, key, a.filter);
  const total = (f: SearchFilter, ctx: Ctx) => store.searchTotal(f, { signal: ctx?.signal });
  return {
    role: side,
    total: async (a: FilterArg, ctx: Ctx) => h.withEstimated(await total(scoped(a), ctx)),
    counterparties: async (a: FilterArg & { limit?: number }, ctx: Ctx) => {
      const f = scoped(a);
      const [page, t] = await Promise.all([store.roleCounterparties(side, f, { limit: capped(a.limit, 10) }, { signal: ctx?.signal }), total(f, ctx)]);
      const top = page.rows[0]; // ranked by money, so the first row is the top-1
      return {
        count: page.count,
        // top-1 total / the role's total; null when there is no money to share
        topShare: top && BigInt(t.awarded) > 0n ? shareOf(top.total.awarded, t.awarded) : null,
        rows: page.rows.map((r) => ({
          entity: r.entity ? h.entityObject(r.entity) : null,
          naturalPerson: r.naturalPerson,
          total: h.withEstimated(r.total),
          viaDirectPurchase: h.withEstimated(r.viaDirectPurchase),
          viaContract: h.withEstimated(r.viaContract),
          wonTogether: r.wonTogether,
          hasSignals: r.hasSignals,
        })),
      };
    },
    directPurchaseShare: async (a: FilterArg, ctx: Ctx) => {
      const f = scoped(a);
      if (f.channel === "CONTRACT") return 0;
      const [all, direct] = await Promise.all([total(f, ctx), total({ ...f, channel: "DIRECT_PURCHASE" }, ctx)]);
      return shareOf(direct.awarded, all.awarded);
    },
    procedures: async (a: FilterArg, ctx: Ctx) =>
      (await store.searchFacet("procedure", scoped(a), { signal: ctx?.signal })).map((x) => ({ value: x.value, total: h.withEstimated(x.total) })),
    consortia: async (a: FilterArg & { limit?: number }, ctx: Ctx) =>
      (await store.roleConsortia(scoped(a), { limit: capped(a.limit, 10) }, { signal: ctx?.signal })).map((c) => ({
        members: c.members.map((m) => ({ naturalPerson: m.naturalPerson, publishedName: m.name, share: m.share, entity: m.entity ? h.entityObject(m.entity) : null })),
        total: h.withEstimated(c.total),
      })),
    frameworks: (a: FilterArg, ctx: Ctx) => store.roleFrameworks(scoped(a), { signal: ctx?.signal }),
    largestRecords: async (a: FilterArg & { limit?: number }, ctx: Ctx) =>
      (await store.roleLargest(scoped(a), { limit: capped(a.limit, 10) }, { signal: ctx?.signal })).map(h.recordRow),
    // Signals are the next ticket's (#74): an empty page, so the persisted EntityOverview still answers
    signals: () => ({ count: 0, rows: [] }), // TODO #74: the Signal model
    records: (a: FilterArg) => h.search(scoped(a), otherSide(side)),
    timeline: async (a: FilterArg & { counterparty?: string | null }, ctx: Ctx) => {
      // a counterparty is picked by its entity key; a natural person has none, so cannot be picked
      const f = a.counterparty ? withCounterparty(side, a.counterparty, scoped(a)) : scoped(a);
      return (await store.searchMonths(f, { signal: ctx?.signal })).map((m) => ({ month: m.month, total: h.withEstimated(m.total) }));
    },
    // drawn on the counterparty's side: a supplier's page shows its authorities' counties, an authority's its suppliers'
    flow: (a: FilterArg, ctx: Ctx) => h.moneyMap(otherSide(side), scoped(a), ctx),
  };
}
