import { OnrcCountMap, Typography, type Locale, type OnrcCountMapCopy, type OnrcCountMapData } from "@grivei/ui";
import type { CountyTopologyState } from "../../geo/index.ts";

export interface OnrcCountLensSectionProps {
  /** The count lens of the current search; null while it loads or when the search failed (the page says so). */
  map: OnrcCountMapData | null;
  loading: boolean;
  topology: CountyTopologyState;
  /** The filter's `county` (the URL is its only home) and the county the filter should hold after a click (`undefined` clears it). */
  county: string | undefined;
  onSelect: (county: string | undefined) => void;
  locale: Locale;
  copy: OnrcCountMapCopy;
  /** What to say when the outlines cannot be loaded, and while they load. */
  status: { unavailable: string; loading: string };
}

/** The count lens of the ONRC screen: the county map and its Unplaced tile for one search; a click on the chosen county takes it back. */
export function OnrcCountLensSection({ map, loading, topology, county, onSelect, locale, copy, status }: OnrcCountLensSectionProps) {
  if (topology.status === "error") return <Typography role="alert">{status.unavailable}</Typography>;
  if (topology.status === "loading" || (map === null && loading)) return <Typography aria-busy="true">{status.loading}</Typography>;
  if (map === null) return null;
  return <OnrcCountMap map={map} topology={topology.topology} selected={county} onSelect={(area) => onSelect(area === county ? undefined : area)} locale={locale} copy={copy} />;
}
