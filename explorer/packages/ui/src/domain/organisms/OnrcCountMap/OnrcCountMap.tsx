import { useMemo } from "react";
import type { Topology } from "topojson-specification";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import type { OnrcCountMapData } from "../../types.ts";
import { BaseMap, type AreaInfo, type BaseMapCopy } from "../BaseMap/index.ts";
import { MapTile, type MapArea } from "../MoneyLensMap/index.ts";

export interface OnrcCountMapCopy {
  map: BaseMapCopy;
  /** The tile for registrations with no county: its title. */
  unplaced: string;
  /** The heading above the off-map tiles. */
  tilesHeading: string;
  /** "12 registrations" (the language's plural rule). */
  registrations: (n: number, formatted: string) => string;
}

export interface OnrcCountMapProps {
  /** The count lens of the current search (`onrc.search.map`). */
  map: OnrcCountMapData;
  /** County outlines (properties `{ code, name }`, ISO 3166-2:RO codes), built at load time. */
  topology: Topology;
  /** The selected area: a county code or `UNPLACED`. */
  selected?: MapArea | undefined;
  /** Emits the clicked county's code or the Unplaced tile's area. */
  onSelect: (area: MapArea) => void;
  locale: Locale;
  copy: OnrcCountMapCopy;
}

export const UNPLACED_AREA = "UNPLACED";

/**
 * ONRC's count lens at county level, on the base map: counties coloured by how many registrations match the search (a count, on a linear scale, so colour tracks
 * size; every shown number is the exact count), and an Unplaced tile for registrations with no county. A county click is a chip of the ONRC filter. Presentational.
 */
export function OnrcCountMap({ map, topology, selected, onSelect, locale, copy }: OnrcCountMapProps) {
  const values = useMemo(() => Object.fromEntries(map.counties.map((c) => [c.area, c.registrations])), [map]);
  const format = (value: number) => copy.registrations(value, formatCount(value, false, locale));
  return (
    <BaseMap
      topology={topology}
      values={values}
      scale="linear"
      formatValue={(value) => format(value)}
      renderTooltip={({ name, code }: AreaInfo) => (
        <Typography variant="meta" component="span">
          {name}: {format(values[code] ?? 0)}
        </Typography>
      )}
      onSelect={onSelect}
      selected={selected}
      tiles={
        <>
          <Typography variant="caption">{copy.tilesHeading}</Typography>
          <MapTile title={copy.unplaced} selected={selected === UNPLACED_AREA} onSelect={() => onSelect(UNPLACED_AREA)}>
            <Typography component="span" variant="body2" sx={{ display: "block" }}>{format(map.unplacedRegistrations)}</Typography>
          </MapTile>
        </>
      }
      copy={copy.map}
    />
  );
}
