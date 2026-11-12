import { createContext, useContext, type ReactNode } from "react";
import { createClient, type GraphqlClient } from "./client.ts";

const ClientContext = createContext<GraphqlClient | null>(null);
const defaultClient = createClient();

export function ClientProvider({ client = defaultClient, children }: { client?: GraphqlClient; children: ReactNode }) {
  return <ClientContext value={client}>{children}</ClientContext>;
}

export function useClient(): GraphqlClient {
  const client = useContext(ClientContext);
  if (!client) throw new Error("useClient needs a ClientProvider");
  return client;
}
