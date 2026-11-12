import { useEffect, useState } from "react";
import type { EntityHeaderData, EntityPageView, EntityPageRole, RecordsTabData } from "@grivei/ui";
import type { RecordFilter, RecordOrder, SignalOrder } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import type { GraphqlClient } from "../../../graphql/client.ts";
import { EntityOverview, EntityRecords, EntityRelationships } from "../../../graphql/operations.ts";

/** Records per page of the Records tab. */
export const RECORDS_PAGE_SIZE = 100;

export interface EntityPageRequest {
  key: string;
  role: EntityPageRole;
  view: EntityPageView;
  filter: RecordFilter;
  /** 1-based page of the Records tab. */
  page?: number;
  order?: RecordOrder;
  signalOrder?: SignalOrder;
}

export type EntityPageState =
  /** `entity` is the header of the same entity (same key and role) from the tab before, so the page can keep it on screen. Null on a first load. */
  | { status: "loading"; entity: EntityHeaderData | null; records: RecordsTabData | null }
  | { status: "error" }
  /** `entity` is null when no entity has that key. `records` is the Records tab's data (null on the other tabs, or when the role has none). */
  | { status: "ready"; entity: EntityHeaderData | null; records: RecordsTabData | null };
type Settled = Exclude<EntityPageState, { status: "loading" }>;
/** The entity a request is about: the header is the same across its tabs. */
const subjectOf = (r: EntityPageRequest) => `${r.role}:${r.key}`;

interface Fetched {
  entity: EntityHeaderData | null;
  records: RecordsTabData | null;
}

/** Each tab runs its own operation; every one of them carries the header fields. The Records tab's also brings its `records(filter)`. */
function fetchPage(client: GraphqlClient, r: EntityPageRequest, signal: AbortSignal): Promise<Fetched> {
  const { key, role, filter } = r;
  switch (r.view) {
    case "overview":
      return client.query(EntityOverview, { key, role, filter, signalOrder: r.signalOrder }, { signal }).then((d) => ({ entity: d.entity, records: null }));
    case "records":
      return client
        .query(EntityRecords, { key, role, filter, limit: RECORDS_PAGE_SIZE, offset: ((r.page ?? 1) - 1) * RECORDS_PAGE_SIZE, order: r.order }, { signal })
        .then((d) => ({ entity: d.entity, records: d.entity?.seap.role?.records ?? null }));
    case "relationships":
      return client.query(EntityRelationships, { key, role, filter }, { signal }).then((d) => ({ entity: d.entity, records: null }));
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
  const [last, setLast] = useState<{ subject: string; entity: EntityHeaderData; records: RecordsTabData | null } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchPage(client, JSON.parse(key) as EntityPageRequest, controller.signal)
      .then(({ entity, records }) => {
        setSettled({ key, state: { status: "ready", entity, records } });
        // the last Records of this entity stay on screen while the next filter loads (the panel keeps its place and focus)
        if (entity) setLast((before) => ({ subject, entity, records: records ?? (before?.subject === subject ? before.records : null) }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [client, key, subject]);

  if (settled?.key === key) return settled.state;
  const same = last?.subject === subject ? last : null;
  return { status: "loading", entity: same?.entity ?? null, records: same?.records ?? null };
}
