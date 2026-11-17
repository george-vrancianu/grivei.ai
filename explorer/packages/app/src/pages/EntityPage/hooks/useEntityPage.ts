import { useCallback, useEffect, useState } from "react";
import type { EntityHeaderData, EntityOverviewData, EntityPageView, EntityPageRole, FinancialStatementsData, FirmDonationsData, LeadershipData, OnrcRegistrationData, OrganisationPeopleData, PublicEnterpriseData, RecordsTabData, RelationshipsData } from "@grivei/ui";
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
  | { status: "loading"; entity: EntityHeaderData | null; records: RecordsTabData | null; overview: EntityOverviewData | null; onrc: OnrcRegistrationData | null; publicEnterprise: PublicEnterpriseData | null; financials: FinancialStatementsData | null; leadership: LeadershipData | null; donations: FirmDonationsData | null; people: OrganisationPeopleData | null; onrcListed: boolean; relationships: RelationshipsData | null }
  /** The request failed. `entity` is the header of the same entity from before (null when the first load failed), so the page keeps it and its tabs on screen; `records` is the last Records of that entity (the Records tab keeps its filter bar around its failed panel); `retry` asks again. */
  | { status: "error"; entity: EntityHeaderData | null; records: RecordsTabData | null; relationships: RelationshipsData | null; onrcListed: boolean; retry: () => void }
  /**
   * `onrcListed` is whether ONRC lists a registration under the entity's CUI (the Records tab's question for its Source switch; false on the other tabs).
   * `onrc` is the Overview's ONRC section (null on the other tabs, or when ONRC lists no registration under the entity's CUI).
   * `entity` is null when no entity has that key. `records` is the Records tab's data (null on the other tabs, or when the role has none);
   * `overview` is the Overview tab's and `relationships` the Relationships tab's (each null on the other tabs, or when the entity lacks the page's role). While loading, the Overview and the Relationships tab keep the last one of the same entity and role (a new filter, Signals order or page, or a retry), so the page keeps its place, focus and scroll and shows the old answer dimmed and `aria-busy` until the next lands; a different entity or role shows the first-load state.
   */
  | { status: "ready"; entity: EntityHeaderData | null; records: RecordsTabData | null; overview: EntityOverviewData | null; onrc: OnrcRegistrationData | null; publicEnterprise: PublicEnterpriseData | null; financials: FinancialStatementsData | null; leadership: LeadershipData | null; donations: FirmDonationsData | null; people: OrganisationPeopleData | null; onrcListed: boolean; relationships: RelationshipsData | null };
type Settled = Extract<EntityPageState, { status: "ready" }>;
/** The entity a request is about: the header is the same across its tabs. */
const subjectOf = (r: EntityPageRequest) => `${r.role}:${r.key}`;

interface Fetched {
  entity: EntityHeaderData | null;
  records: RecordsTabData | null;
  overview: EntityOverviewData | null;
  onrc: OnrcRegistrationData | null; publicEnterprise: PublicEnterpriseData | null; financials: FinancialStatementsData | null; leadership: LeadershipData | null; donations: FirmDonationsData | null; people: OrganisationPeopleData | null;
  onrcListed: boolean;
  relationships: RelationshipsData | null;
}

/** Each tab runs its own operation; every one of them carries the header fields. The Records tab's also brings its `records(filter)`. */
function fetchPage(client: GraphqlClient, r: EntityPageRequest, signal: AbortSignal): Promise<Fetched> {
  const { key, role, filter } = r;
  switch (r.view) {
    case "overview":
      return client.query(EntityOverview, { key, role, filter, signalOrder: r.signalOrder, signalOffset: r.page && r.page > 1 ? (r.page - 1) * SIGNALS_PAGE_SIZE : undefined }, { signal }).then((d) => ({ entity: d.entity, records: null, overview: d.entity?.seap.role ?? null, onrc: d.entity?.onrc ?? null, publicEnterprise: d.entity?.publicEnterprise ?? null, financials: d.entity?.financials ?? null, leadership: d.entity?.leadership ?? null, donations: d.entity?.donations ?? null, people: d.entity?.people ?? null, onrcListed: false, relationships: null }));
    case "records":
      return client
        .query(EntityRecords, { key, role, filter, limit: RECORDS_PAGE_SIZE, offset: ((r.page ?? 1) - 1) * RECORDS_PAGE_SIZE, order: r.order }, { signal })
        .then((d) => ({ entity: d.entity, records: d.entity?.seap.role?.records ?? null, overview: null, onrc: null, publicEnterprise: null, financials: null, leadership: null, donations: null, people: null, onrcListed: d.entity?.onrc != null, relationships: null }));
    case "relationships":
      return client.query(EntityRelationships, { key, role, filter }, { signal }).then((d) => ({ entity: d.entity, records: null, overview: null, onrc: null, publicEnterprise: null, financials: null, leadership: null, donations: null, people: null, onrcListed: false, relationships: d.entity?.seap.role ?? null }));
  }
}

/**
 * Runs the operation of the open tab. A different request reads as loading again (carrying the last header of the same entity,
 * so a tab change does not blank the page); a superseded one is cancelled.
 */
export function useEntityPage(request: EntityPageRequest): EntityPageState {
  const client = useClient();
  // The Relationships tab's request has no page, order or Signals order: paging the picked panel (`?page=n`) must not ask the graph, the months and the flow again
  const key = JSON.stringify(request.view === "relationships" ? { ...request, page: undefined, order: undefined, signalOrder: undefined } : request);
  const subject = subjectOf(request);
  const [settled, setSettled] = useState<{ key: string; state: Settled } | null>(null);
  const [failed, setFailed] = useState<{ key: string; attempt: number } | null>(null);
  const overviewOpen = request.view === "overview";
  const relationshipsOpen = request.view === "relationships";
  const [attempt, setAttempt] = useState(0);
  const [last, setLast] = useState<{ subject: string; entity: EntityHeaderData; records: RecordsTabData | null; overview: EntityOverviewData | null; onrc: OnrcRegistrationData | null; publicEnterprise: PublicEnterpriseData | null; financials: FinancialStatementsData | null; leadership: LeadershipData | null; donations: FirmDonationsData | null; people: OrganisationPeopleData | null; onrcListed: boolean; relationships: RelationshipsData | null } | null>(null);

  // Asks again: the failed request becomes a loading one (holding the last answer, if any) and runs once more
  const retry = useCallback(() => {
    setFailed(null);
    setSettled(null);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchPage(client, JSON.parse(key) as EntityPageRequest, controller.signal)
      .then(({ entity, records, overview, onrc, publicEnterprise, financials, leadership, donations, people, onrcListed, relationships }) => {
        setFailed(null);
        setSettled({ key, state: { status: "ready", entity, records, overview, onrc, publicEnterprise, financials, leadership, donations, people, onrcListed, relationships } });
        // the last Records of this entity stay on screen while the next filter loads (the panel keeps its place and focus)
        if (entity) setLast((before) => ({ subject, entity, records: records ?? (before?.subject === subject ? before.records : null), overview, onrc: overviewOpen ? onrc : null, publicEnterprise: overviewOpen ? publicEnterprise : null, financials: overviewOpen ? financials : null, leadership: overviewOpen ? leadership : null, donations: overviewOpen ? donations : null, people: overviewOpen ? people : null, onrcListed: onrcListed || (before?.subject === subject && before.onrcListed), relationships: relationshipsOpen ? relationships : null }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed({ key, attempt });
      });
    return () => controller.abort();
  }, [client, key, subject, overviewOpen, relationshipsOpen, attempt]);

  const same = last?.subject === subject ? last : null;
  if (failed?.key === key && failed.attempt === attempt) return { status: "error", entity: same?.entity ?? null, records: same?.records ?? null, relationships: relationshipsOpen ? (same?.relationships ?? null) : null, onrcListed: same?.onrcListed ?? false, retry };
  if (settled?.key === key) return settled.state;
  return { status: "loading", entity: same?.entity ?? null, records: same?.records ?? null, overview: overviewOpen ? (same?.overview ?? null) : null, onrc: overviewOpen ? (same?.onrc ?? null) : null, publicEnterprise: overviewOpen ? (same?.publicEnterprise ?? null) : null, financials: overviewOpen ? (same?.financials ?? null) : null, leadership: overviewOpen ? (same?.leadership ?? null) : null, donations: overviewOpen ? (same?.donations ?? null) : null, people: overviewOpen ? (same?.people ?? null) : null, onrcListed: same?.onrcListed ?? false, relationships: relationshipsOpen ? (same?.relationships ?? null) : null };
}
