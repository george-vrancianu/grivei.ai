import type { TotalFieldsFragment } from "@grivei/contract";
import { Card, CardContent, MoneyAmount, Stack, Typography, type Locale } from "@grivei/ui";
import type { Copy } from "../../copy.ts";

export interface TotalSummaryProps {
  total: TotalFieldsFragment;
  copy: Pick<Copy, "total" | "records">;
  locale: Locale;
}

/** The Total: awarded value and how many Records it covers. */
export function TotalSummary({ total, copy, locale }: TotalSummaryProps) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="overline" component="h2">
            {copy.total}
          </Typography>
          <Typography variant="h4" component="p" data-testid="total-awarded">
            <MoneyAmount bani={total.awarded} locale={locale} />
          </Typography>
          <Typography variant="body2" data-testid="total-records">
            {total.records.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB")} {copy.records}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
