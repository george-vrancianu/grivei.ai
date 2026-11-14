import { useEffect, useState } from "react";
import type { EntityHeaderData, EntityOverviewData, EntityPageView, EntityPageRole, OnrcRegistrationData, PublicEnterpriseData, LeadershipData, RecordsTabData, RelationshipsData } from "@grivei/ui";
import type { RecordFilter, RecordOrder, SignalOrder } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import type { GraphqlClient } from "../../../graphql/client.ts";
import { EntityOverview, EntityRecords, EntityRelationships } from "../../../graphql/operations.ts";

/** Signals per page of the Overview (the `limit` of `EntityOverview`'s `signals`). */
export const SIGNALS_PAGE_SIZE = 20;

/** Records per page of the Records tab. */
export const RECORDS_PAGE_SIZE = 100;

export interface EntityPageRequest {
  key: string;
  role: EntityPageRole;
  view: EntityPageView;
  filter: RecordFilter;
  /** 1-based page of the Records tab, or of the Overview's Signals. */
  page?: number;
  order?: RecordOrder;
  signalOrder?: SignalOrder;
}

export type EntityPageState =
  /** `entity` is the header of the same entity (same key and role) from the tab before, so the page can keep it on screen. Null on a first load. */
  | { status: "loading"; entity: EntityHeaderData | null; records: RecordsTabData | null; overview: EntityOverviewData | null; onrc: OnrcRegistrationData | null; publicEnterprise: PublicEnterpriseData | null; leadership: LeadershipData | null; relationships: null }
  | { status: "error" }
  /**
   * `onrc` is the Overview's ONRC section (null on the other tabs, or when ONRC lists no registration under the entity's CUI).
   * `entity` is null when no entity has that key. `records` is the Records tab's data (null on the other tabs, or when the role has none);
   * `overview` is the Overview tab's and `relationships` the Relationships tab's (each null on the other tabs, or when the entity lacks the page's role). While loading, the Overview keeps the last one of the same entity and filter, so a new Signals order or page leaves the page, its focus and scroll in place; a different entity or filter shows loading, since its numbers follow the filter.
   */
  | { status: "ready"; entity: EntityHeaderData | null; records: RecordsTabData | null; overview: EntityOverviewData | null; onrc: OnrcRegistrationData | null; publicEnterprise: PublicEnterpriseData | null; leadership: LeadershipData | null; relationships: RelationshipsData | null };
type Settled = Exclude<EntityPageState, { status: "loading" }>;
/** The entity a request is about: the header is the same across its tabs. */
const subjectOf = (r: EntityPageRequest) => `${r.role}:${r.key}`;
/** What an Overview's numbers follow: the entity and the filter. The Signals order and page change only the list. */
const overviewScopeOf = (r: EntityPageRequest) => `${subjectOf(r)}:${JSON.stringify(r.filter)}`;

interface Fetched {
  entity: EntityHeaderData | null;
  records: RecordsTabData | null;
  overview: EntityOverviewData | null;
  onrc: OnrcRegistrationData | null; publicEnterprise: PublicEnterpriseData | null; leadership: LeadershipData | null;
  relationships: RelationshipsData | null;
}

/** Each tab runs its own operation; every one of them carries the header fields. The Records tab's also brings its `records(filter)`. */
function fetchPage(client: GraphqlClient, r: EntityPageRequest, signal: AbortSignal): Promise<Fetched> {
  const { key, role, filter } = r;
  switch (r.view) {
    case "overview":
      return client.query(EntityOverview, { key, role, filter, signalOrder: r.signalOrder, signalOffset: r.page && r.page > 1 ? (r.page - 1) * SIGNALS_PAGE_SIZE : undefined }, { signal }).then((d) => ({ entity: d.entity, records: null, overview: d.entity?.seap.role ?? null, onrc: d.entity?.onrc ?? null, publicEnterprise: d.entity?.publicEnterprise ?? null, leadership: d.entity?.leadership ?? null, relationships: null }));
    case "records":
      return client
        .query(EntityRecords, { key, role, filter, limit: RECORDS_PAGE_SIZE, offset: ((r.page ?? 1) - 1) * RECORDS_PAGE_SIZE, order: r.order }, { signal })
        .then((d) => ({ entity: d.entity, records: d.entity?.seap.role?.records ?? null, overview: null, onrc: null, publicEnterprise: null, leadership: null, relationships: null }));
    case "relationships":
      return client.query(EntityRelationships, { key, role, filter }, { signal }).then((d) => ({ entity: d.entity, records: null, overview: null, onrc: null, publicEnterprise: null, leadership: null, relationships: d.entity?.seap.role ?? null }));
  }
}

/**
 * Runs the operation of the open tab. A different request reads as loading again (carrying the last header of the same entity,
 * so a tab change does not blank the page); a superseded one is cancelled.
 */
export function useEntityPage(request: EntityPageRequest): EntityPageState {
  const client = useClient();
  const key = JSON.stringify(request);
  const subject = subjectOf(request);
  const [settled, setSettled] = useState<{ key: string; state: Settled } | null>(null);
  const scope = request.view === "overview" ? overviewScopeOf(request) : null;
  const [last, setLast] = useState<{ subject: string; entity: EntityHeaderData; records: RecordsTabData | null; overview: { scope: string; data: EntityOverviewData } | null; onrc: OnrcRegistrationData | null; publicEnterprise: PublicEnterpriseData | null; leadership: LeadershipData | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPage(client, JSON.parse(key) as EntityPageRequest, controller.signal)
      .then(({ entity, records, overview, onrc, publicEnterprise, leadership, relationships }) => {
        setSettled({ key, state: { status: "ready", entity, records, overview, onrc, publicEnterprise, leadership, relationships } });
        // the last Records of this entity stay on screen while the next filter loads (the panel keeps its place and focus)
        if (entity) setLast((before) => ({ subject, entity, records: records ?? (before?.subject === subject ? before.records : null), overview: overview && scope ? { scope, data: overview } : null, onrc: scope ? onrc : null, publicEnterprise: scope ? publicEnterprise : null, leadership: scope ? leadership : null }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [client, key, subject, scope]);

  if (settled?.key === key) return settled.state;
  const same = last?.subject === subject ? last : null;
  return { status: "loading", entity: same?.entity ?? null, records: same?.records ?? null, overview: scope && same?.overview?.scope === scope ? same.overview.data : null, onrc: scope ? (same?.onrc ?? null) : null, publicEnterprise: scope && same?.overview?.scope === scope ? same.publicEnterprise : null, leadership: scope && same?.overview?.scope === scope ? same.leadership : null, relationships: null };
}
