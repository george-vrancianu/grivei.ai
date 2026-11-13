import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { CountCopy } from "../../../../molecules/TotalFigure/index.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";
import type { Bani, OverviewProcedure } from "../../../../types.ts";
import { shareOfTotal } from "../../entityOverview.utils.ts";
import { ShareBar } from "../../../../atoms/ShareBar/index.ts";
import { listSx } from "../../../../utils/listSx.ts";

export interface ProcedureTypesCopy {
  heading: string;
  /** "41 Records" */
  records: CountCopy;
  empty: string;
}

export interface ProcedureTypesProps {
  procedures: readonly OverviewProcedure[];
  /** The entity's total awarded: each bar is a procedure's share of it. */
  total: Bani;
  locale: Locale;
  copy: ProcedureTypesCopy;
}

/** The procedure types the Records were awarded by (the procedure's name as SEAP publishes it), each with its Total. */
export function ProcedureTypes({ procedures, total, locale, copy }: ProcedureTypesProps) {
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <SectionHeading>{copy.heading}</SectionHeading>
      {procedures.length === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <Stack component="ul" sx={listSx}>
          {procedures.map(({ value, total: amount }) => (
            <Stack key={value} component="li" spacing={0.75} sx={{ py: 1.25 }}>
              <Box sx={{ display: "flex", gap: "2px 14px", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between" }}>
                <Typography>{value}</Typography>
                <Typography variant="label" component="span" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  <MoneyAmount bani={amount.awarded} locale={locale} />{" "}
                  <Typography component="span" variant="label" color="text.disabled">
                    · {copy.records(amount.records, formatCount(amount.records, amount.estimated, locale))}
                  </Typography>
                </Typography>
              </Box>
              <ShareBar share={shareOfTotal(amount.awarded, total)} />
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
