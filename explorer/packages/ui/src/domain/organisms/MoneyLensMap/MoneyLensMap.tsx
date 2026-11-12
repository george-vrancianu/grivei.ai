import { useMemo } from "react";
import type { Topology } from "topojson-specification";
import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { formatMoney } from "../../atoms/MoneyAmount/index.ts";
import { BaseMap, type AreaInfo } from "../BaseMap/index.ts";
import { OffMapTiles } from "./components/OffMapTiles/index.ts";
import { SideToggle } from "./components/SideToggle/index.ts";
import type { MoneyMap } from "../../types.ts";
import type { CountySide, MapArea, MoneyLensMapCopy } from "./moneyLensMap.types.ts";
import { moneyMapValues, totalsByCounty } from "./moneyLensMap.utils.ts";

export type MoneyLensMapProps = {
  /** The money map of the current search (`seap.search.map`). */
  map: MoneyMap;
  /** County outlines (properties `{ code, name }`, ISO 3166-2:RO codes), built at load time. */
  topology: Topology;
  /** The selected area: a county code, `NATIONAL`, `UNPLACED` or `UNKNOWN_SUPPLIER_COUNTY`. */
  selected?: MapArea;
  /** Emits the clicked county's code, or the clicked tile's off-map area. */
  onSelect: (area: MapArea) => void;
  /** The side the counties show. The URL's `countySide` is its only source; this component never keeps it. */
  side: CountySide;
  onSideChange: (side: CountySide) => void;
  locale: Locale;
  copy: MoneyLensMapCopy;
};

/**
 * The Money lens at county level: counties coloured by absolute awarded value (a linear scale, so colour tracks size),
 * an authority/supplier toggle, and the off-map tiles. Presentational: it takes the data and reports clicks.
 */
export function MoneyLensMap({ map, topology, selected, onSelect, side, onSideChange, locale, copy }: MoneyLensMapProps) {
  const values = useMemo(() => moneyMapValues(map), [map]);
  const totals = useMemo(() => totalsByCounty(map), [map]);
  const formatValue = (value: number, code?: string) => {
    const total = code === undefined ? undefined : totals.get(code);
    return formatMoney(total ? total.awarded : String(Math.round(value)), locale);
  };
  const renderTooltip = ({ name, code }: AreaInfo) => {
    const total = totals.get(code);
    return (
      <>
        <Typography component="span" variant="subtitle2" sx={{ display: "block" }}>{name}</Typography>
        {total ? (
          <>
            <Typography component="span" variant="body2" sx={{ display: "block" }}>{formatMoney(total.awarded, locale)}</Typography>
            <Typography component="span" variant="caption" sx={{ display: "block" }}>{copy.tiles.records(total.records, formatCount(total.records, total.estimated, locale))}</Typography>
          </>
        ) : (
          <Typography component="span" variant="body2" sx={{ display: "block" }}>{copy.map.noData}</Typography>
        )}
      </>
    );
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <SideToggle side={side} onSideChange={onSideChange} copy={copy.side} />
      <BaseMap
        topology={topology}
        values={values}
        scale="linear"
        formatValue={formatValue}
        renderTooltip={renderTooltip}
        onSelect={onSelect}
        selected={selected}
        tiles={<OffMapTiles map={map} selected={selected} onSelect={onSelect} locale={locale} copy={copy.tiles} />}
        copy={copy.map}
      />
    </Box>
  );
}
