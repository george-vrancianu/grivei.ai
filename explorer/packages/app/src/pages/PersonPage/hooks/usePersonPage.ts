import type { PersonPageData } from "@grivei/ui";
import { PersonPage } from "../../../graphql/operations.ts";
import { useHeldQuery } from "../../../graphql/useHeldQuery.ts";

export type PersonPageState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  /** `person` is null when the host hides Restricted content, and when no confirmed person has the id: the API answers the same for both. `stale`: this is the last answer, held while a retry is in flight. */
  | { status: "ready"; person: PersonPageData | null; stale: boolean };

/**
 * Runs the `PersonPage` query for an id and keeps the last answer on screen while the next loads (a retry): `loading` only when there is nothing to show, so another id is a first load again.
 * A held "not available" is not shown beside a new request: that reads as loading. A superseded request is cancelled.
 */
export function usePersonPage(id: string): PersonPageState {
  const query = useHeldQuery(PersonPage, { id }, id);
  if (query.status === "loading") return { status: "loading" };
  if (query.status === "error") return { status: "error", retry: query.retry };
  const person = query.data.person;
  if (query.stale && person === null) return { status: "loading" };
  return { status: "ready", person, stale: query.stale };
}
