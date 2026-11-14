import type { ReactNode } from "react";
import type { CoverageLensQuery } from "@grivei/contract";
import { Box, CoverageGridCompact, CoverageLensMap, Typography, type CoverageGridCopy, type CoverageLensMapCopy, type GapCellData, type GridWindow, type Locale } from "@grivei/ui";
import type { CountyTopologyState } from "../../geo/index.ts";
import { countyAfterClick } from "../MoneyLensSection/index.ts";

export interface CoverageLensSectionProps {
  /** `CoverageLens` answer for the date chip's window; null while it loads or when it failed. */
  lens: CoverageLensQuery | null;
  loading: boolean;
  failed: boolean;
  topology: CountyTopologyState;
  /** The whole Coverage grid (`CoveragePage` with no window) for the compact grid; null while it loads or when it failed (the map still works). */
  cells: readonly GapCellData[] | null;
  /** The date chip's window, highlighted in the compact grid. */
  dateWindow: GridWindow | null;
  /** The Coverage page's path carrying the current search, for the compact grid's link. */
  pageHref: string;
  onNavigate: (href: string) => void;
  /** The Source selector (#178), above the map: SEAP's coverage here, ONRC's on its own screen. Absent = none. */
  sourceSelector?: ReactNode;
  /** The filter's `county` (the URL is its only home) and the county the filter should hold after a click (`undefined` clears it). */
  county: string | undefined;
  onSelect: (county: string | undefined) => void;
  locale: Locale;
  copy: { map: CoverageLensMapCopy; grid: CoverageGridCopy };
  /** What to say while things load, when the outlines cannot be loaded and when the query failed. */
  status: { loading: string; unavailable: string; failed: string };
}

/**
 * The Coverage lens of the main screen: the county map coloured by coverage status for the date chip's window, and under it the compact
 * Coverage grid with that window highlighted and the link to the Coverage page. A county click is the Money lens's: it filters the results.
 */
export function CoverageLensSection({ lens, loading, failed, topology, cells, dateWindow, pageHref, onNavigate, sourceSelector, county, onSelect, locale, copy, status }: CoverageLensSectionProps) {
  let map;
  if (topology.status === "error") map = <Typography role="alert">{status.unavailable}</Typography>;
  else if (failed) map = <Typography role="alert">{status.failed}</Typography>;
  else if (topology.status === "loading" || lens === null || loading) map = <Typography aria-busy="true">{status.loading}</Typography>;
  else
    map = (
      <CoverageLensMap
        lens={lens}
        topology={topology.topology}
        {...(county !== undefined ? { selected: county } : {})}
        onSelect={(area) => onSelect(countyAfterClick(county, area))}
        locale={locale}
        copy={copy.map}
      />
    );
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {sourceSelector}
      {map}
      {cells !== null && <CoverageGridCompact cells={cells} dateWindow={dateWindow} locale={locale} copy={copy.grid} href={pageHref} onNavigate={onNavigate} />}
    </Box>
  );
}
