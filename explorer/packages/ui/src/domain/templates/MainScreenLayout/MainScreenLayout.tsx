import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { LensToggle, type LensToggleCopy } from "./components/LensToggle/index.ts";
import { useMapLens } from "./hooks/useMapLens.ts";
import type { MapLens } from "./mainScreenLayout.utils.ts";

export interface MainScreenLayoutCopy {
  lens: LensToggleCopy;
  /** The accessible names of the page's regions. */
  regions: { search: string; filters: string; map: string; results: string };
}

export interface MainScreenLayoutProps {
  /** The search input, on top. */
  search: ReactNode;
  /** The filter chips, under the search. */
  filters: ReactNode;
  /** The map of each lens (with its own tiles and toggles); only the shown lens's slot is rendered. */
  maps: Record<MapLens, ReactNode>;
  /** Optional: the Total above the result tabs. */
  summary?: ReactNode;
  /** The result tabs, in the right column. */
  results: ReactNode;
  /** The shown lens. Leave it out for an uncontrolled template that starts on Money. */
  lens?: MapLens;
  onLensChange?: (lens: MapLens) => void;
  copy: MainScreenLayoutCopy;
}

/**
 * The layout of the main screen: search and filter chips across the top, then the map (with the lens toggle) beside the results.
 * From the md breakpoint (900 px, so laptops of 1024 to 1280 px get two columns) the map takes the wider column; below it the
 * results stack under the map. It fetches nothing and knows no router; the page fills the slots.
 */
export function MainScreenLayout({ search, filters, maps, summary, results, lens, onLensChange, copy }: MainScreenLayoutProps) {
  const [shown, select] = useMapLens(lens, onLensChange);
  return (
    <Stack component="main" spacing={3} sx={{ p: 3, maxWidth: 1400, mx: "auto" }}>
      <Stack spacing={2}>
        <Box component="section" aria-label={copy.regions.search}>
          {search}
        </Box>
        <Box component="section" aria-label={copy.regions.filters}>
          {filters}
        </Box>
      </Stack>
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 3fr) minmax(0, 2fr)" }, alignItems: "start" }}>
        <Stack component="section" aria-label={copy.regions.map} spacing={2}>
          <LensToggle lens={shown} onLensChange={select} copy={copy.lens} />
          {maps[shown]}
        </Stack>
        <Stack component="section" aria-label={copy.regions.results} spacing={2}>
          {summary}
          {results}
        </Stack>
      </Box>
    </Stack>
  );
}
