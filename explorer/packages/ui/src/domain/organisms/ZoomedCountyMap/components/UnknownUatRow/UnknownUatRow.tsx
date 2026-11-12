import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { Total } from "../../../../types.ts";
import { AreaFigures } from "../../../MoneyLensMap/index.ts";
import type { ZoomedCountyMapCopy } from "../../zoomedCountyMap.types.ts";

export interface UnknownUatRowProps {
  /** Authorities with a known county but no UAT: their Total. */
  total: Total;
  locale: Locale;
  copy: Pick<ZoomedCountyMapCopy, "figures" | "unknownUat">;
}

/**
 * The row for authorities placed in the county but in no UAT. Not interactive: the contract has no filter value for
 * "county known, UAT unknown", so a click would have nothing to emit.
 */
export function UnknownUatRow({ total, locale, copy }: UnknownUatRowProps) {
  return (
    <Box role="group" aria-label={copy.unknownUat} sx={{ border: 1, borderColor: "divider", borderRadius: 1, px: 2, py: 1, minWidth: 200 }}>
      <Typography component="span" variant="subtitle2" sx={{ display: "block" }}>{copy.unknownUat}</Typography>
      <AreaFigures total={total} locale={locale} copy={copy.figures} />
    </Box>
  );
}
