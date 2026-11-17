import { useCallback, useEffect, useState } from "react";
import { counterpartyField, type CounterpartyRecordsData, type EntityPageRole, type RelationshipsTimeline } from "@grivei/ui";
import type { RecordFilter } from "@grivei/contract";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { EntityRecords, EntityRelationships } from "../../../graphql/operations.ts";
import { routeOf } from "../entityPage.utils.ts";
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

/** What the picked counterparty adds, and the Entity key it is for (a held answer is for the last counterparty, not the one now picked). */
export interface PickedAnswer {
  counterparty: string;
  timeline: RelationshipsTimeline;
  panel: CounterpartyRecordsData | null;
}

/**
 * `held` is the last answer of the same entity and role, kept on screen (dimmed) while the next request loads or after it failed, so a change of counterparty,
 * a page of the panel or a filter never blanks the panel. Nothing picked: `idle`, and nothing is held.
 */
export type PickedState =
  | { status: "idle" }
  | { status: "loading"; held: PickedAnswer | null }
  | { status: "error"; held: PickedAnswer | null; retry: () => void }
  | ({ status: "ready" } & PickedAnswer);

/** The picked counterparty's Records are the entity's, with the counterparty in the filter: `supplier` on an authority's page, `authority` on a supplier's. */
export const withCounterparty = (role: EntityPageRole, filter: RecordFilter, counterparty: string): RecordFilter =>
  ({ ...filter, [counterpartyField(routeOf(role))]: counterparty });

/**
 * What the picked counterparty adds to the Relationships tab: its own months (`EntityRelationships` with `counterparty`, drawn over the overall bars)
 * and every Record with it (`EntityRecords` with it in the filter). Both start when the pick, the filter or the page changes, and a superseded pair is cancelled.
 */
export function usePickedCounterparty(request: PickedRequest): PickedState {
  const client = useClient();
  const text = JSON.stringify(request);
  const subject = `${request.role}:${request.key}`;
  const [settled, setSettled] = useState<{ text: string; state: { status: "ready"; answer: PickedAnswer } | { status: "error" } } | null>(null);
  const [held, setHeld] = useState<{ subject: string; answer: PickedAnswer } | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Nothing picked forgets what was held: the next first pick starts from placeholders
  if (request.counterparty === null && (held !== null || settled !== null)) {
    setHeld(null);
    setSettled(null);
  }

  useEffect(() => {
    const { key, role, filter, counterparty, page } = JSON.parse(text) as PickedRequest;
    if (counterparty === null) return;
    const controller = new AbortController();
    const { signal } = controller;
    Promise.all([
      client.query(EntityRelationships, { key, role, filter, counterparty }, { signal }),
      client.query(EntityRecords, { key, role, filter: withCounterparty(role, filter, counterparty), limit: RECORDS_PAGE_SIZE, offset: (page - 1) * RECORDS_PAGE_SIZE }, { signal }),
    ]).then(
      ([months, records]) => {
        if (signal.aborted) return;
        const answer = { counterparty, timeline: months.entity?.seap.role?.timeline ?? [], panel: records.entity?.seap.role?.records ?? null };
        setSettled({ text, state: { status: "ready", answer } });
        setHeld({ subject: `${role}:${key}`, answer });
      },
      () => {
        if (!signal.aborted) setSettled({ text, state: { status: "error" } });
      },
    );
    return () => controller.abort();
  }, [client, text, attempt]);

  const retry = useCallback(() => {
    setSettled(null);
    setAttempt((n) => n + 1);
  }, []);

  if (request.counterparty === null) return { status: "idle" };
  const keep = held?.subject === subject ? held.answer : null;
  if (settled?.text === text) return settled.state.status === "ready" ? { status: "ready", ...settled.state.answer } : { status: "error", held: keep, retry };
  return { status: "loading", held: keep };
}
