/** The lenses of the main screen's map, in toggle order. Money is the default (see GLOSSARY: Lens). */
export const MAP_LENSES = ["money", "coverage"] as const;
export type MapLens = (typeof MAP_LENSES)[number];
export const DEFAULT_MAP_LENS: MapLens = "money";

/** Reads a lens from a URL value; anything unknown (or missing) is the default lens. */
export function toMapLens(value: string | null | undefined): MapLens {
  return MAP_LENSES.find((lens) => lens === value) ?? DEFAULT_MAP_LENS;
}

/** The opacity of a region that shows its last answer while the next one loads (design handoff, "Refetch"). */
export const BUSY_OPACITY = 0.6;

/** The regions that can show a held answer: the Total panel, the map's content (not its header strip) and the results. */
export type BusyRegions = Partial<Record<"summary" | "map" | "results", boolean>>;

