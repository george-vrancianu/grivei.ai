import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { MoneyMap, Total } from "../../../../types.ts";
import { OFF_MAP_AREAS, type MapArea, type OffMapTilesCopy } from "../../moneyLensMap.types.ts";
import { MapTile } from "../MapTile/index.ts";

export interface OffMapTilesProps {
  map: Pick<MoneyMap, "national" | "unplaced" | "unknownSupplierCounty">;
  selected?: MapArea;
  onSelect: (area: MapArea) => void;
  locale: Locale;
  copy: OffMapTilesCopy;
}

function Figures({ total, locale, copy, extra }: { total: Total; locale: Locale; copy: OffMapTilesCopy; extra?: string }) {
  return (
    <>
      {extra && <Typography component="span" variant="body2" sx={{ display: "block" }}>{extra}</Typography>}
      <Typography component="span" variant="body2" sx={{ display: "block" }}><MoneyAmount bani={total.awarded} locale={locale} /></Typography>
      <Typography component="span" variant="caption" sx={{ display: "block" }}>{copy.records(total.records, formatCount(total.records, total.estimated, locale))}</Typography>
    </>
  );
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
      <MapTile title={copy.national} selected={selected === OFF_MAP_AREAS.national} onSelect={() => onSelect(OFF_MAP_AREAS.national)}>
        <Figures total={national} locale={locale} copy={copy} />
      </MapTile>
      {unplaced && (
        <MapTile title={copy.unplaced} selected={selected === OFF_MAP_AREAS.unplaced} onSelect={() => onSelect(OFF_MAP_AREAS.unplaced)}>
          <Figures total={unplaced.total} locale={locale} copy={copy} extra={copy.unplacedAuthorities(unplaced.authorities, formatCount(unplaced.authorities, false, locale))} />
        </MapTile>
      )}
      {unknownSupplierCounty && (
        <MapTile title={copy.unknownSupplierCounty} selected={selected === OFF_MAP_AREAS.unknownSupplierCounty} onSelect={() => onSelect(OFF_MAP_AREAS.unknownSupplierCounty)}>
          <Figures total={unknownSupplierCounty} locale={locale} copy={copy} />
        </MapTile>
      )}
    </>
  );
}
