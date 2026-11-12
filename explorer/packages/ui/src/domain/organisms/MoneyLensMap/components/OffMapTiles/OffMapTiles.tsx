import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import type { MoneyMap } from "../../../../types.ts";
import { OFF_MAP_TILE_AREAS, type MapArea, type OffMapTilesCopy } from "../../moneyLensMap.types.ts";
import { AreaFigures } from "../AreaFigures/index.ts";
import { MapTile } from "../MapTile/index.ts";

export interface OffMapTilesProps {
  map: Pick<MoneyMap, "national" | "unplaced" | "unknownSupplierCounty">;
  selected?: MapArea;
  onSelect: (area: MapArea) => void;
  locale: Locale;
  copy: OffMapTilesCopy;
}

/**
 * The tiles beside the map: National always, Unplaced when there are authorities no Source places (authority side),
 * the unknown-supplier-county bucket when money went abroad or to unplaced suppliers (supplier side). A tile the data does not have is not drawn.
 */
export function OffMapTiles({ map, selected, onSelect, locale, copy }: OffMapTilesProps) {
  const { national, unplaced, unknownSupplierCounty } = map;
  return (
    <>
      <Typography variant="caption">{copy.heading}</Typography>
      <MapTile title={copy.national} selected={selected === OFF_MAP_TILE_AREAS.national} onSelect={() => onSelect(OFF_MAP_TILE_AREAS.national)}>
        <AreaFigures total={national} locale={locale} copy={copy} />
      </MapTile>
      {unplaced && (
        <MapTile title={copy.unplaced} selected={selected === OFF_MAP_TILE_AREAS.unplaced} onSelect={() => onSelect(OFF_MAP_TILE_AREAS.unplaced)}>
          <Typography component="span" variant="body2" sx={{ display: "block" }}>{copy.unplacedAuthorities(unplaced.authorities, formatCount(unplaced.authorities, false, locale))}</Typography>
          <AreaFigures total={unplaced.total} locale={locale} copy={copy} />
        </MapTile>
      )}
      {unknownSupplierCounty && (
        <MapTile title={copy.unknownSupplierCounty} selected={selected === OFF_MAP_TILE_AREAS.unknownSupplierCounty} onSelect={() => onSelect(OFF_MAP_TILE_AREAS.unknownSupplierCounty)}>
          <AreaFigures total={unknownSupplierCounty} locale={locale} copy={copy} />
        </MapTile>
      )}
    </>
  );
}
