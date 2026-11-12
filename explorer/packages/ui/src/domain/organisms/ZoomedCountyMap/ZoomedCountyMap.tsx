import { useMemo } from "react";
import type { Topology } from "topojson-specification";
import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatMoney } from "../../atoms/MoneyAmount/index.ts";
import type { Siruta, UatMap } from "../../types.ts";
import { BaseMap, type AreaInfo } from "../BaseMap/index.ts";
import { moneyMapValues, totalsByCounty } from "../MoneyLensMap/index.ts";
import { AuthorityCircles } from "./components/AuthorityCircles/index.ts";
import { UatTooltip } from "./components/UatTooltip/index.ts";
import { UnknownUatRow } from "./components/UnknownUatRow/index.ts";
import type { ZoomedCountyMapCopy } from "./zoomedCountyMap.types.ts";
import { authoritiesByUat } from "./zoomedCountyMap.utils.ts";

export type ZoomedCountyMapProps = {
  /** The zoomed county's UATs of the current search (`seap.search.uatMap(county:)`), authority side. */
  map: UatMap;
  /** The county's UAT outlines (properties `{ code, name }`, `code` = SIRUTA); Bucharest's are its six sectors. Built at load time. */
  topology: Topology;
  /** The selected UAT's SIRUTA (the `RecordFilter.uat` value). */
  selected?: Siruta;
  /** Emits the clicked UAT's SIRUTA (also on Enter or Space). */
  onSelect: (siruta: Siruta) => void;
  /** Draws a small circle per UAT for its number of authorities. Off by default. */
  showAuthorityCircles?: boolean;
  locale: Locale;
  copy: ZoomedCountyMapCopy;
};

/**
 * The Money lens zoomed into one county: UATs coloured by awarded value on a log scale, grey where no authority bought anything
 * (a UAT of the topology that `map.uats` lacks), an optional circle per UAT, and the row for authorities with no UAT. Presentational.
 */
export function ZoomedCountyMap({ map, topology, selected, onSelect, showAuthorityCircles = false, locale, copy }: ZoomedCountyMapProps) {
  // A UAT row has the shape of a county row (area, total), so the Money lens's lookups serve both.
  const values = useMemo(() => moneyMapValues({ counties: map.uats }), [map]);
  const totals = useMemo(() => totalsByCounty({ counties: map.uats }), [map]);
  const authorities = useMemo(() => authoritiesByUat(map), [map]);
  const formatValue = (value: number, code?: string) => {
    const total = code === undefined ? undefined : totals.get(code);
    return formatMoney(total ? total.awarded : String(Math.round(value)), locale);
  };
  const renderTooltip = ({ name, code }: AreaInfo) => (
    <UatTooltip name={name} total={totals.get(code)} authorities={showAuthorityCircles ? authorities.get(code) : undefined} locale={locale} copy={copy} />
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <BaseMap
        topology={topology}
        values={values}
        scale="log"
        formatValue={formatValue}
        renderTooltip={renderTooltip}
        renderOverlay={showAuthorityCircles ? ({ centroids }) => <AuthorityCircles centroids={centroids} authorities={authorities} /> : undefined}
        onSelect={onSelect}
        selected={selected}
        tiles={map.unknownUat ? <UnknownUatRow total={map.unknownUat} locale={locale} copy={copy} /> : undefined}
        copy={copy.map}
      />
      {showAuthorityCircles && <Typography variant="caption">{copy.circleKey}</Typography>}
    </Box>
  );
}
