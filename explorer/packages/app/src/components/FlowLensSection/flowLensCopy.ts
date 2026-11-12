import type { Copy } from "../../copy/index.ts";

/** The Flow lens's copy: the Relationships tab's own strings over the shared map and tile strings. */
export const flowLensCopy = (t: Copy) => ({
  ...t.entityPage.relationships.flow,
  map: { ...t.moneyLensMap.map, ...t.entityPage.relationships.flow.map },
  tiles: t.moneyLensMap.tiles,
});
