import { useEffect, useState } from "react";
import type { CounterpartyRecordsData, EntityPageRole, RelationshipsTimeline } from "@grivei/ui";
import type { RecordFilter } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { EntityRecords, EntityRelationships } from "../../../graphql/operations.ts";
import { RECORDS_PAGE_SIZE } from "./useEntityPage.ts";

export interface PickedRequest {
  key: string;
  role: EntityPageRole;
  filter: RecordFilter;
  /** The picked counterparty's Entity key; null runs nothing. */
  counterparty: string | null;
  /** 1-based page of the side panel's Records. */
  page: number;
}

export type PickedState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; timeline: RelationshipsTimeline; panel: CounterpartyRecordsData | null };

/** The picked counterparty's Records are the entity's, with the counterparty in the filter: `supplier` on an authority's page, `authority` on a supplier's. */
export const withCounterparty = (role: EntityPageRole, filter: RecordFilter, counterparty: string): RecordFilter =>
  role === "AUTHORITY" ? { ...filter, supplier: counterparty } : { ...filter, authority: counterparty };

/**
 * What the picked counterparty adds to the Relationships tab: its own months (`EntityRelationships` with `counterparty`, drawn over the overall bars)
 * and every Record with it (`EntityRecords` with it in the filter). Both start when the pick or the page changes, and a superseded pair is cancelled.
 */
export function usePickedCounterparty(request: PickedRequest): PickedState {
  const client = useClient();
  const text = JSON.stringify(request);
  const [settled, setSettled] = useState<{ text: string; state: Exclude<PickedState, { status: "idle" | "loading" }> } | null>(null);

  useEffect(() => {
    const { key, role, filter, counterparty, page } = JSON.parse(text) as PickedRequest;
    if (counterparty === null) return;
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      client.query(EntityRelationships, { key, role, filter, counterparty }, { signal }),
      client.query(EntityRecords, { key, role, filter: withCounterparty(role, filter, counterparty), limit: RECORDS_PAGE_SIZE, offset: (page - 1) * RECORDS_PAGE_SIZE }, { signal }),
    ]).then(
      ([months, records]) => setSettled({ text, state: { status: "ready", timeline: months.entity?.seap.role?.timeline ?? [], panel: records.entity?.seap.role?.records ?? null } }),
      () => {
        if (!signal.aborted) setSettled({ text, state: { status: "error" } });
      },
    );
    return () => controller.abort();
  }, [client, text]);

  if (request.counterparty === null) return { status: "idle" };
  return settled?.text === text ? settled.state : { status: "loading" };
}
