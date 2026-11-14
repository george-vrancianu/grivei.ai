import { useEffect, useState } from "react";
import type { PersonPageData } from "@grivei/ui";
import { useClient } from "../../../graphql/ClientContext.tsx";
import { PersonPage } from "../../../graphql/operations.ts";

export type PersonPageState =
  | { status: "loading" }
  | { status: "error" }
  /** `person` is null when the host hides Restricted content, and when no confirmed person has the id: the API answers the same for both. */
  | { status: "ready"; person: PersonPageData | null };
type Settled = Exclude<PersonPageState, { status: "loading" }>;

/** Runs the `PersonPage` query for an id; a different id reads as loading again and the superseded request is cancelled. */
export function usePersonPage(id: string): PersonPageState {
  const client = useClient();
  const [settled, setSettled] = useState<{ id: string; state: Settled } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    client
      .query(PersonPage, { id }, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setSettled({ id, state: { status: "ready", person: data.person } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSettled({ id, state: { status: "error" } });
      });
    return () => controller.abort();
  }, [client, id]);

  return settled?.id === id ? settled.state : { status: "loading" };
}
