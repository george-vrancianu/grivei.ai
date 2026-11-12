import { useState } from "react";
import { DEFAULT_MAP_LENS, type MapLens } from "../mainScreenLayout.utils.ts";

/** The shown lens: the caller's (`lens` given, controlled) or the template's own, starting on Money. */
export function useMapLens(lens: MapLens | undefined, onLensChange: ((lens: MapLens) => void) | undefined) {
  const [own, setOwn] = useState<MapLens>(DEFAULT_MAP_LENS);
  const selected = lens ?? own;
  const select = (next: MapLens) => {
    if (lens === undefined) setOwn(next);
    onLensChange?.(next);
  };
  return [selected, select] as const;
}
