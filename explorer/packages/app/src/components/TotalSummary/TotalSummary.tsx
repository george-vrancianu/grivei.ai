import type { TotalFieldsFragment } from "@grivei/contract";
import { Card, CardContent, MoneyAmount, Stack, Typography, type Locale } from "@grivei/ui";

export interface TotalSummaryProps {
  total: TotalFieldsFragment;
  copy: { total: string; records: (n: number, formatted: string) => string };
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
            {copy.records(total.records, total.records.toLocaleString(locale === "ro" ? "ro-RO" : "en-GB"))}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
