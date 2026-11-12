import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { leftOut } from "../../../../molecules/TotalFigure/totalFigure.utils.ts";
import type { Total } from "../../../../types.ts";
import type { OffMapTilesCopy } from "../../moneyLensMap.types.ts";

export interface AreaFiguresProps {
  total: Total;
  locale: Locale;
  copy: Pick<OffMapTilesCopy, "records" | "suspectLeftOut">;
}

/** An area's Total as lines: the awarded amount, the Records behind it, and the suspect Records it left out (only when there are some). */
export function AreaFigures({ total, locale, copy }: AreaFiguresProps) {
  const { suspect } = leftOut(total);
  return (
    <>
      <Typography component="span" variant="body2" sx={{ display: "block" }}><MoneyAmount bani={total.awarded} locale={locale} /></Typography>
      <Typography component="span" variant="caption" sx={{ display: "block" }}>{copy.records(total.records, formatCount(total.records, total.estimated, locale))}</Typography>
      {suspect > 0 && (
        <Typography component="span" variant="caption" sx={{ display: "block" }}>{copy.suspectLeftOut(suspect, formatCount(suspect, false, locale))}</Typography>
      )}
    </>
  );
}
