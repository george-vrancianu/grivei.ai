import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Card } from "../../../atoms/Card/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { layout } from "../../../theme/tokens.ts";
import { MapPanel } from "./components/MapPanel/index.ts";
import { useMapLens } from "./hooks/useMapLens.ts";
import { BUSY_OPACITY } from "../../utils/busy.ts";
import { MAP_LENSES, type BusyRegions, type MapLens } from "./mainScreenLayout.utils.ts";

export interface MainScreenLayoutCopy {
  /** The lens toggle: its accessible name and the name of each lens. */
  lens: { label: string } & Record<MapLens, string>;
  /** The accessible names of the page's regions. */
  regions: { search: string; map: string; results: string };
}

export type MainScreenLayoutProps = MainScreenLayoutBase & LensControl;

interface MainScreenLayoutBase {
  /** Optional: the page title (`h1`), above every panel. */
  title?: ReactNode;
  /** The search input (with its Source eyebrow and picker), at the top of the search panel. */
  search: ReactNode;
  /** The filter strip and, when something is set, the active strip, edge to edge under the search in the same panel. */
  filters: ReactNode;
  /** The map of each lens (with its own tiles and toggles); only the shown lens's slot is rendered. */
  maps: Record<MapLens, ReactNode>;
  /** Optional: the Total, in a panel across the page between the search panel and the two columns. */
  summary?: ReactNode;
  /** Optional: the right end of the map panel's header strip (the back link when a county is zoomed). */
  mapBack?: ReactNode;
  /** Optional: a note at the foot of the map panel (the "data through" lines). */
  mapNote?: ReactNode;
  /** The results column: it brings its own panel (the result tabs), so a Go-to card or a note can sit above it. */
  results: ReactNode;
  /** Optional: the regions showing their last answer while the next loads. Each is dimmed to 60% with `aria-busy="true"`; the map's header strip (the lens toggle) stays at full strength. The results are not here: `ResultTabs` takes its own `busy`. */
  busy?: BusyRegions;
  copy: MainScreenLayoutCopy;
}

/**
 * The shown lens: `lens` and `onLensChange` come as a pair (the page keeps the lens in the URL), or neither
 * (the template keeps it itself and starts on Money). A `lens` without `onLensChange` would be a toggle that does nothing, so the type rejects it.
 */
export type LensControl = { lens: MapLens; onLensChange: (lens: MapLens) => void } | { lens?: undefined; onLensChange?: (lens: MapLens) => void };

/**
 * The layout of the main screen, top to bottom: the title; the search panel (search, filter strip, active strip); the Total panel; then the map panel
 * (lens toggle and back link in its header strip, the foot note) beside the results column.
 * From the md breakpoint (900 px, so laptops of 1024 to 1280 px get two columns) the results take the slightly wider column; below it the
 * panels stack and nothing is wider than the page. It fetches nothing and knows no router; the page fills the slots.
 */
export function MainScreenLayout({ title, search, filters, maps, summary, mapBack, mapNote, results, lens, onLensChange, busy, copy }: MainScreenLayoutProps) {
  const [shown, select] = useMapLens(lens, onLensChange);
  return (
    <Stack component="main" spacing={3} sx={{ pt: 3.5, pb: 5, px: layout.gutter, maxWidth: layout.maxWidth, width: "100%", boxSizing: "border-box", mx: "auto" }}>
      {title}
      {/* The strips of the filters run edge to edge, so the panel clips them to its rounded corners. */}
      <Card sx={{ p: 0, minWidth: 0, overflow: "hidden" }}>
        <Box component="section" aria-label={copy.regions.search} sx={{ p: 2.5 }}>
          {search}
        </Box>
        {filters}
      </Card>
      {summary && (
        <Card aria-busy={busy?.summary || undefined} sx={{ px: 2.5, py: 2.25, minWidth: 0, ...(busy?.summary && { opacity: BUSY_OPACITY }) }}>
          {summary}
        </Card>
      )}
      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1fr) minmax(0, 1.15fr)" }, alignItems: "start" }}>
        <MapPanel label={copy.regions.map} lens={{ options: MAP_LENSES, value: shown, onChange: select, labels: copy.lens, label: copy.lens.label }} back={mapBack} note={mapNote} busy={busy?.map}>
          {maps[shown]}
        </MapPanel>
        <Stack component="section" aria-label={copy.regions.results} spacing={2} sx={{ minWidth: 0 }}>
          {results}
        </Stack>
      </Box>
    </Stack>
  );
}
