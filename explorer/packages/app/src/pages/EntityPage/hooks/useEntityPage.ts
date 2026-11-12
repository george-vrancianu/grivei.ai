import { useEffect, useState } from "react";
import type { EntityHeaderData, EntityPageView, EntityPageRole } from "@grivei/ui";
import type { RecordFilter, RecordOrder, SignalOrder } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import type { GraphqlClient } from "../../../graphql/client.ts";
import { EntityOverview, EntityRecords, EntityRelationships } from "../../../graphql/operations.ts";

/** Records per page of the Records tab (a first page; #57 owns paging). */
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
  | { status: "loading"; entity: EntityHeaderData | null }
  | { status: "error" }
  /** `entity` is null when no entity has that key. */
  | { status: "ready"; entity: EntityHeaderData | null };
type Settled = Exclude<EntityPageState, { status: "loading" }>;
/** The entity a request is about: the header is the same across its tabs. */
const subjectOf = (r: EntityPageRequest) => `${r.role}:${r.key}`;

/** Each tab runs its own operation; every one of them carries the header fields, which are all this page reads so far. */
function fetchHeader(client: GraphqlClient, r: EntityPageRequest, signal: AbortSignal): Promise<EntityHeaderData | null> {
  const { key, role, filter } = r;
  switch (r.view) {
    case "overview":
      return client.query(EntityOverview, { key, role, filter, signalOrder: r.signalOrder }, { signal }).then((d) => d.entity);
    case "records":
      return client
        .query(EntityRecords, { key, role, filter, limit: RECORDS_PAGE_SIZE, offset: ((r.page ?? 1) - 1) * RECORDS_PAGE_SIZE, order: r.order }, { signal })
        .then((d) => d.entity);
    case "relationships":
      return client.query(EntityRelationships, { key, role, filter }, { signal }).then((d) => d.entity);
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
  const [lastHeader, setLastHeader] = useState<{ subject: string; entity: EntityHeaderData } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchHeader(client, JSON.parse(key) as EntityPageRequest, controller.signal)
      .then((entity) => {
        setSettled({ key, state: { status: "ready", entity } });
        if (entity) setLastHeader({ subject, entity });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ key, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [client, key, subject]);

  return settled?.key === key ? settled.state : { status: "loading", entity: lastHeader?.subject === subject ? lastHeader.entity : null };
}
