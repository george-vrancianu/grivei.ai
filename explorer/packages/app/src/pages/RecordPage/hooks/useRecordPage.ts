import { useEffect, useState } from "react";
import type { RecordPageData } from "@grivei/ui";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { RecordPage } from "../../../graphql/operations.ts";

export type RecordPageState =
  | { status: "loading" }
  | { status: "error" }
  /** `record` is null when no Record has that code. */
  | { status: "ready"; record: RecordPageData | null };
type Settled = Exclude<RecordPageState, { status: "loading" }>;

/** Runs the `RecordPage` query for a code; a different code reads as loading again and the superseded request is cancelled. */
export function useRecordPage(code: string): RecordPageState {
  const client = useClient();
  const [settled, setSettled] = useState<{ code: string; state: Settled } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    client
      .query(RecordPage, { code }, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setSettled({ code, state: { status: "ready", record: data.seap.record } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ code, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [client, code]);

  return settled?.code === code ? settled.state : { status: "loading" };
}
