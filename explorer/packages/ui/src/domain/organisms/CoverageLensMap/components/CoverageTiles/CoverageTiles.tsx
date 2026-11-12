import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import type { CountyCoverage, CoverageLens } from "../../../../types.ts";
import { AreaFigures, MapTile, OFF_MAP_TILE_AREAS, type MapArea } from "../../../MoneyLensMap/index.ts";
import type { CoverageLensMapCopy } from "../../coverageLensMap.types.ts";
import { CoverageFigures } from "../CoverageFigures/index.ts";

export interface CoverageTilesProps {
  lens: CoverageLens;
  /** Each area's coverage row by code, as the map built it (NATIONAL included). */
  coverage: ReadonlyMap<string, CountyCoverage>;
  selected?: MapArea;
  onSelect: (area: MapArea) => void;
  locale: Locale;
  copy: CoverageLensMapCopy;
}

/**
 * The tiles beside the map. National shows NATIONAL's status and its N of M sentence. Unplaced (authorities no Source places in a county)
 * shows their count and their Total, and is drawn only when there are such authorities. Coverage has no unknown-supplier-county tile (authority side only).
 */
export function CoverageTiles({ lens, coverage, selected, onSelect, locale, copy }: CoverageTilesProps) {
  const national = coverage.get(OFF_MAP_TILE_AREAS.national);
  const { unplacedAuthorities } = lens.coverage;
  return (
    <>
      <Typography variant="caption">{copy.tiles.heading}</Typography>
      <MapTile title={copy.tiles.national} selected={selected === OFF_MAP_TILE_AREAS.national} onSelect={() => onSelect(OFF_MAP_TILE_AREAS.national)}>
        <CoverageFigures row={national} lens={lens} locale={locale} copy={copy} />
      </MapTile>
      {unplacedAuthorities.authorities > 0 && (
        <MapTile title={copy.tiles.unplaced} selected={selected === OFF_MAP_TILE_AREAS.unplaced} onSelect={() => onSelect(OFF_MAP_TILE_AREAS.unplaced)}>
          <Typography component="span" variant="body2" sx={{ display: "block" }}>
            {copy.tiles.unplacedAuthorities(unplacedAuthorities.authorities, formatCount(unplacedAuthorities.authorities, false, locale))}
          </Typography>
          <AreaFigures total={unplacedAuthorities.total} locale={locale} copy={copy.tiles} />
        </MapTile>
      )}
    </>
  );
}
