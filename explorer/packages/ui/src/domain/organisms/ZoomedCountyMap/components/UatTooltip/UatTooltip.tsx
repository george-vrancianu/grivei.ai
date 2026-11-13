import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { color } from "../../../../../theme/tokens.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import type { Total } from "../../../../types.ts";
import { AreaFigures } from "../../../MoneyLensMap/index.ts";
import type { ZoomedCountyMapCopy } from "../../zoomedCountyMap.types.ts";

export interface UatTooltipProps {
  /** The UAT's name as published (source data). */
  name: string;
  /** The UAT's Total, or undefined when no authority of it bought anything. */
  total: Total | undefined;
  /** Distinct authorities behind the Total; shown only when given (circles on). */
  authorities?: number;
  locale: Locale;
  copy: Pick<ZoomedCountyMapCopy, "map" | "figures" | "authorities">;
}

/** What the tooltip says about a UAT: its name, its Total (or that no authority bought anything) and, with circles on, its authorities. */
export function UatTooltip({ name, total, authorities, locale, copy }: UatTooltipProps) {
  return (
    <>
      <Typography component="span" variant="meta" sx={{ display: "block", color: color.text, fontWeight: 600 }}>{name}</Typography>
      {total ? (
        <AreaFigures dense total={total} locale={locale} copy={copy.figures} />
      ) : (
        <Typography component="span" variant="meta" sx={{ display: "block", color: color.text2 }}>{copy.map.noData}</Typography>
      )}
      {authorities !== undefined && (
        <Typography component="span" variant="meta" sx={{ display: "block", color: color.text2 }}>{copy.authorities(authorities, formatCount(authorities, false, locale))}</Typography>
      )}
    </>
  );
}
