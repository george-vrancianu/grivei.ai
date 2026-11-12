import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { Total } from "../../../../types.ts";
import type { MoneyLensMapCopy } from "../../moneyLensMap.types.ts";
import { AreaFigures } from "../AreaFigures/index.ts";

export interface CountyTooltipProps {
  name: string;
  /** The county's Total, or undefined when the map has no row for it. */
  total: Total | undefined;
  locale: Locale;
  copy: Pick<MoneyLensMapCopy, "map" | "tiles">;
}

/** What the map's tooltip says about a county: its name, then its Total or "No data". */
export function CountyTooltip({ name, total, locale, copy }: CountyTooltipProps) {
  return (
    <>
      <Typography component="span" variant="subtitle2" sx={{ display: "block" }}>{name}</Typography>
      {total ? (
        <AreaFigures total={total} locale={locale} copy={copy.tiles} />
      ) : (
        <Typography component="span" variant="body2" sx={{ display: "block" }}>{copy.map.noData}</Typography>
      )}
    </>
  );
}
