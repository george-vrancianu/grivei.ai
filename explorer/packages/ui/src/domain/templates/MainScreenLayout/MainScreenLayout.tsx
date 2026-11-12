import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
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
  /** Optional: the Total above the result tabs. */
  summary?: ReactNode;
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
        <Box>
          {filters}
        </Box>
      </Stack>
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 3fr) minmax(0, 2fr)" }, alignItems: "start" }}>
        <Stack component="section" aria-label={copy.regions.map} spacing={2}>
          <OptionToggle options={MAP_LENSES} value={shown} onChange={select} labels={copy.lens} label={copy.lens.label} />
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
