import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { layout, radius } from "../../../theme/tokens.ts";
import { OptionToggle } from "../../molecules/OptionToggle/index.ts";
import { useMapLens } from "./hooks/useMapLens.ts";
import { MAP_LENSES, type MapLens } from "./mainScreenLayout.utils.ts";

export interface MainScreenLayoutCopy {
  /** The lens toggle: its accessible name and the name of each lens. */
  lens: { label: string } & Record<MapLens, string>;
  /** The accessible names of the page's regions. */
  regions: { search: string; map: string; results: string };
}

export type MainScreenLayoutProps = MainScreenLayoutBase & LensControl;

interface MainScreenLayoutBase {
  /** The search input, on top. */
  search: ReactNode;
  /** The filter chips, under the search. */
  filters: ReactNode;
  /** The map of each lens (with its own tiles and toggles); only the shown lens's slot is rendered. */
  maps: Record<MapLens, ReactNode>;
  /** Optional: the Total, in a band across the page between the filter chips and the two columns. */
  summary?: ReactNode;
  /** Optional: a note at the foot of the map panel (the "data through" lines). */
  mapNote?: ReactNode;
  /** The result tabs, in the right column. */
  results: ReactNode;
  copy: MainScreenLayoutCopy;
}

/**
 * The shown lens: `lens` and `onLensChange` come as a pair (the page keeps the lens in the URL), or neither
 * (the template keeps it itself and starts on Money). A `lens` without `onLensChange` would be a toggle that does nothing, so the type rejects it.
 */
export type LensControl = { lens: MapLens; onLensChange: (lens: MapLens) => void } | { lens?: undefined; onLensChange?: (lens: MapLens) => void };

/**
 * The layout of the main screen: search and filter chips across the top, then the Total as a band, then the map (with the lens toggle) beside the results.
 * From the md breakpoint (900 px, so laptops of 1024 to 1280 px get two columns) the results take the slightly wider column; below it the
 * results stack under the map. It fetches nothing and knows no router; the page fills the slots.
 */
export function MainScreenLayout({ search, filters, maps, summary, mapNote, results, lens, onLensChange, copy }: MainScreenLayoutProps) {
  const [shown, select] = useMapLens(lens, onLensChange);
  return (
    <Stack component="main" spacing={3} sx={{ pt: 3.5, pb: 5, px: layout.gutter, maxWidth: layout.maxWidth, width: "100%", boxSizing: "border-box", mx: "auto" }}>
      <Stack spacing={2}>
        <Box component="section" aria-label={copy.regions.search}>
          {search}
        </Box>
        <Box>
          {filters}
        </Box>
      </Stack>
      {summary && <Box sx={{ py: 2.25, borderTop: 1, borderBottom: 1, borderColor: "divider" }}>{summary}</Box>}
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1.15fr)" }, alignItems: "start" }}>
        <Stack component="section" aria-label={copy.regions.map} spacing={2} sx={{ p: 2, minWidth: 0, bgcolor: "background.paper", border: 1, borderColor: "divider", borderRadius: `${radius.card}px` }}>
          <OptionToggle options={MAP_LENSES} value={shown} onChange={select} labels={copy.lens} label={copy.lens.label} />
          {maps[shown]}
          {mapNote}
        </Stack>
        <Stack component="section" aria-label={copy.regions.results} spacing={2} sx={{ minWidth: 0 }}>
          {results}
        </Stack>
      </Box>
    </Stack>
  );
}
