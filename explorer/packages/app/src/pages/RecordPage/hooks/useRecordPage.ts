import type { RecordPageData } from "@grivei/ui";
import { RecordPage } from "../../../graphql/operations.ts";
import { useHeldQuery } from "../../../graphql/useHeldQuery.ts";

export type RecordPageState =
  | { status: "loading" }
  | { status: "error"; retry: () => void }
  /** `record` is null when no Record has that code. `stale`: this is the last answer, held while the next request (a retry, another code) is in flight. */
  | { status: "ready"; record: RecordPageData | null; stale: boolean };

/**
 * Runs the `RecordPage` query for a code and keeps the last Record on screen while the next loads (a retry, or a click to another Record): `loading` only when there is
 * nothing to show. A held "not found" is not shown beside a new request: that reads as loading. A superseded request is cancelled.
 */
export function useRecordPage(code: string): RecordPageState {
  const query = useHeldQuery(RecordPage, { code });
  if (query.status === "loading") return { status: "loading" };
  if (query.status === "error") return { status: "error", retry: query.retry };
  const record = query.data.seap.record;
  if (query.stale && record === null) return { status: "loading" };
  return { status: "ready", record, stale: query.stale };
}
