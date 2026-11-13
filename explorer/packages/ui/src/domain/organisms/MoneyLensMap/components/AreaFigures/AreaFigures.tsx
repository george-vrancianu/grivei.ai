import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { leftOut } from "../../../../molecules/TotalFigure/totalFigure.utils.ts";
import type { Total } from "../../../../types.ts";
import { mapTooltipLine } from "../../../BaseMap/index.ts";
import type { OffMapTilesCopy } from "../../moneyLensMap.types.ts";

export interface AreaFiguresProps {
  total: Total;
  locale: Locale;
  copy: Pick<OffMapTilesCopy, "records" | "suspectLeftOut">;
  /** The map tooltip's treatment: every line in the `meta` variant, `text2`. Off for tiles. */
  dense?: boolean;
}

/** An area's Total as lines: the awarded amount, the Records behind it, and the suspect Records it left out (only when there are some). */
export function AreaFigures({ total, locale, copy, dense = false }: AreaFiguresProps) {
  const { suspect } = leftOut(total);
  const amountProps = dense ? mapTooltipLine : ({ variant: "body2", sx: { display: "block" } } as const);
  const noteProps = dense ? mapTooltipLine : ({ variant: "caption", sx: { display: "block" } } as const);
  return (
    <>
      <Typography component="span" {...amountProps}><MoneyAmount bani={total.awarded} locale={locale} /></Typography>
      <Typography component="span" {...noteProps}>{copy.records(total.records, formatCount(total.records, total.estimated, locale))}</Typography>
      {suspect > 0 && (
        <Typography component="span" {...noteProps}>{copy.suspectLeftOut(suspect, formatCount(suspect, false, locale))}</Typography>
      )}
    </>
  );
}
