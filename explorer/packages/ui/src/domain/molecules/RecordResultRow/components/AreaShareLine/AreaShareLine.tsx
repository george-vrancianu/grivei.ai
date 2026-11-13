import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { withNodes } from "../../../../utils/withNodes.tsx";

export interface AreaShareLineCopy {
  /** "equal shares in the county RON 15,000,000": the part of a consortium Record that went to winners in the selected supplier county, labelled as the equal-share convention. */
  areaShare: (amount: string) => string;
}

export interface AreaShareLineProps {
  /** The summed shares of the Record's winners in the selected county, in bani (`RecordResult.areaShare`). */
  bani: string;
  locale: Locale;
  copy: AreaShareLineCopy;
}

/** The second line under a Record's full value after a supplier-county click: its in-county share, so the rows add up to the headline Total. */
export function AreaShareLine({ bani, locale, copy }: AreaShareLineProps) {
  return (
    <Typography component="span" variant="caption" data-area-share>
      {withNodes(copy.areaShare, [<MoneyAmount bani={bani} locale={locale} showBani />])}
    </Typography>
  );
}
