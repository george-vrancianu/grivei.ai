import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { createClient, type GraphqlClient } from "./client.ts";
import { countRequests, type RequestCounter } from "./requestCount.ts";

const ClientContext = createContext<GraphqlClient | null>(null);
/** Separate from the client, so only its readers (the shell) re-render when a request starts or ends. */
const RequestCounterContext = createContext<RequestCounter | null>(null);
const defaultClient = createClient();

/** Hands the client to every page, wrapped so each query is counted (`useRequestsInFlight`). The wrapper is stable per injected client. */
export function ClientProvider({ client = defaultClient, children }: { client?: GraphqlClient; children: ReactNode }) {
  const counted = useMemo(() => countRequests(client), [client]);
  return (
    <RequestCounterContext value={counted.counter}>
      <ClientContext value={counted.client}>{children}</ClientContext>
    </RequestCounterContext>
  );
}

export function useClient(): GraphqlClient {
  const client = useContext(ClientContext);
  if (!client) throw new Error("useClient needs a ClientProvider");
  return client;
}

/** Whether any data-client request is in flight, app-wide. */
export function useRequestsInFlight(): boolean {
  const counter = useContext(RequestCounterContext);
  if (!counter) throw new Error("useRequestsInFlight needs a ClientProvider");
  return useSyncExternalStore(counter.subscribe, () => counter.getCount() > 0);
}
