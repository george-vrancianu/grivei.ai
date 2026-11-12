import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import type { CountCopy } from "../../../../molecules/TotalFigure/index.ts";
import type { OverviewProcedure } from "../../../../types.ts";
import { listSx } from "../../../../utils/listSx.ts";

export interface ProcedureTypesCopy {
  heading: string;
  /** "41 Records" */
  records: CountCopy;
  empty: string;
}

export interface ProcedureTypesProps {
  procedures: readonly OverviewProcedure[];
  locale: Locale;
  copy: ProcedureTypesCopy;
}

/** The procedure types the Records were awarded by (the procedure's name as SEAP publishes it), each with its Total. */
export function ProcedureTypes({ procedures, locale, copy }: ProcedureTypesProps) {
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      {procedures.length === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <Stack component="ul" sx={listSx}>
          {procedures.map(({ value, total }) => (
            <Box key={value} component="li" sx={{ py: 1, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between" }}>
              <Typography>{value}</Typography>
              <Typography variant="body2">
                <MoneyAmount bani={total.awarded} locale={locale} />{" "}
                <Typography component="span" variant="body2" color="text.secondary">
                  {copy.records(total.records, formatCount(total.records, total.estimated, locale))}
                </Typography>
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
