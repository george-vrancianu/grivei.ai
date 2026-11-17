import { Box } from "../../../../../atoms/Box/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { ShareBar } from "../../../../atoms/ShareBar/index.ts";
import { formatPercent } from "../../../../utils/formatPercent.ts";
import { listRowSx, listSx } from "../../../../utils/listSx.ts";
import { ratio, type CountyListRow } from "../../flowLensMap.utils.ts";

export interface CountyListProps {
  rows: readonly CountyListRow[];
  /** The Bani the shares are of: the sum of `rows`. */
  total: string;
  locale: Locale;
  /** The list's accessible name ("Money by county"). */
  label: string;
}

/** The counties that hold money, largest first, each as a flush row: name, amount, the share of the flow's total as text and a `ShareBar` (decoration). */
export function CountyList({ rows, total, locale, label }: CountyListProps) {
  return (
    <Stack component="ul" aria-label={label} sx={listSx}>
      {rows.map((row) => {
        const share = ratio(row.awarded, total);
        return (
          <Stack key={row.key} component="li" spacing={0.75} sx={listRowSx} data-county={row.key}>
            <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", rowGap: 0.25, columnGap: 1.75 }}>
              <Typography component="span" sx={{ fontWeight: 600 }}>{row.name}</Typography>
              <Typography variant="label" component="span" sx={{ display: "flex", flexWrap: "wrap", columnGap: 1, fontVariantNumeric: "tabular-nums" }}>
                <Typography variant="label" component="span" color="text.primary" sx={{ fontWeight: 600 }}>{formatPercent(share, locale)}</Typography>
                <MoneyAmount bani={row.awarded} locale={locale} />
              </Typography>
            </Box>
            <ShareBar share={share} />
          </Stack>
        );
      })}
    </Stack>
  );
}
