import { createContext, useContext, useMemo, useRef, type ReactNode } from "react";
import type { ZoomedCountyMapProps } from "@grivei/ui";

/** One county's UAT outlines (TopoJSON, properties `{ code, name }`, `code` = SIRUTA; object `uats`, or `sectors` for Bucharest). */
export type UatTopology = ZoomedCountyMapProps["topology"];

/** Where a county's outlines are served: the same `geo-topojson` output and mount as the county outlines (deploy/README.md). */
export const uatTopologyUrl = (county: string): string => `/geo/uats/${county}.topo.json`;

/** Fetches one county's outlines by its ISO code (`RO-BV`). Injectable (tests hand in small topologies), like `LoadCountyTopology`. */
export type LoadUatTopology = (county: string) => Promise<UatTopology>;

const fetchUatTopology: LoadUatTopology = async (county) => {
  const url = uatTopologyUrl(county);
  const response = await globalThis.fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return (await response.json()) as UatTopology;
};

const Context = createContext<LoadUatTopology>(fetchUatTopology);

/**
 * Gives pages one county's UAT outlines through `useUatTopology`. Lazy (a county is fetched when first zoomed into) and
 * cached per county: zooming back into a county asks again for nothing. A failed load is forgotten, so the next zoom retries.
 */
export function UatTopologyProvider({ load = fetchUatTopology, children }: { load?: LoadUatTopology; children: ReactNode }) {
  const pending = useRef(new Map<string, Promise<UatTopology>>());
  const shared = useMemo<LoadUatTopology>(
    () => (county) => {
      let promise = pending.current.get(county);
      if (!promise) {
        promise = load(county).catch((error: unknown) => {
          pending.current.delete(county);
          throw error;
        });
        pending.current.set(county, promise);
      }
      return promise;
    },
    [load],
  );
  return <Context value={shared}>{children}</Context>;
}

export function useLoadUatTopology(): LoadUatTopology {
  return useContext(Context);
}
