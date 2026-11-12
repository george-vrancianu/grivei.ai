/** The lenses of the main screen's map, in toggle order. Money is the default (see GLOSSARY: Lens). */
export const MAP_LENSES = ["money", "coverage"] as const;
export type MapLens = (typeof MAP_LENSES)[number];
export const DEFAULT_MAP_LENS: MapLens = "money";

/** Reads a lens from a URL value; anything unknown (or missing) is the default lens. */
export function toMapLens(value: string | null | undefined): MapLens {
  return MAP_LENSES.find((lens) => lens === value) ?? DEFAULT_MAP_LENS;
}
