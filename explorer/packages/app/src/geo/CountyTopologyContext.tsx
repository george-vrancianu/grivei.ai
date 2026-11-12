import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { MoneyLensMapProps } from "@grivei/ui";

/** The county outlines the Money lens draws (TopoJSON, properties `{ code, name }`, ISO 3166-2:RO codes). */
export type CountyTopology = MoneyLensMapProps["topology"];

/** Where the outlines are served: the operator's `geo-topojson` output, mounted by Caddy at `/geo/` (deploy/README.md). */
export const COUNTY_TOPOLOGY_URL = "/geo/counties.topo.json";

/** Fetches the outlines. Injectable (tests hand in a small topology), like the GraphQL client's `fetch`. */
export type LoadCountyTopology = () => Promise<CountyTopology>;

const fetchCountyTopology: LoadCountyTopology = async () => {
  const response = await globalThis.fetch(COUNTY_TOPOLOGY_URL);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${COUNTY_TOPOLOGY_URL}`);
  return (await response.json()) as CountyTopology;
};

const Context = createContext<LoadCountyTopology>(fetchCountyTopology);

/**
 * Gives pages the outlines through `useCountyTopology`. The load is lazy (the first page that draws a map asks) and
 * shared: one request however many times the map remounts. A failed load is forgotten, so the next mount tries again.
 */
export function CountyTopologyProvider({ load = fetchCountyTopology, children }: { load?: LoadCountyTopology; children: ReactNode }) {
  const pending = useRef<Promise<CountyTopology> | null>(null);
  const shared = useMemo<LoadCountyTopology>(
    () => () => {
      pending.current ??= load().catch((error: unknown) => {
        pending.current = null;
        throw error;
      });
      return pending.current;
    },
    [load],
  );
  return <Context value={shared}>{children}</Context>;
}

export function useLoadCountyTopology(): LoadCountyTopology {
  return useContext(Context);
}
