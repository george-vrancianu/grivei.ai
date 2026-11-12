import type { DataThroughFieldsFragment, TotalFieldsFragment } from "@grivei/contract";
import { Card, CardContent, DataThroughDate, Stack, TotalFigure, Typography, type DataThroughDateCopy, type Locale, type TotalFigureCopy } from "@grivei/ui";

export interface MainTotalProps {
  total: TotalFieldsFragment;
  /** The Sources' "data through" dates; only a harvested Source has any. */
  sources: readonly DataThroughFieldsFragment[];
  copy: { heading: string; total: TotalFigureCopy; dataThrough: DataThroughDateCopy; kinds: Partial<Record<string, string>> };
  locale: Locale;
  /** The methodology page the ⓘ links to. */
  methodologyHref: string;
  /** The suspect Records the Total left out. */
  suspectHref: string;
}

/** The main screen's Total: the awarded value, what it left out (with the ⓘ link and the way to the suspect Records) and how recent the data is. */
export function MainTotal({ total, sources, copy, locale, methodologyHref, suspectHref }: MainTotalProps) {
  const dates = sources.flatMap((source) => source.dataThrough);
  return (
    <Card variant="outlined" data-testid="main-total">
      <CardContent>
        <Stack spacing={1}>
          <Typography variant="overline" component="h2">
            {copy.heading}
          </Typography>
          <TotalFigure total={total} locale={locale} copy={copy.total} methodologyHref={methodologyHref} suspectHref={suspectHref} />
          {dates.map((dataThrough) => (
            <Typography key={dataThrough.kind} variant="caption" color="text.secondary" component="p">
              <DataThroughDate dataThrough={dataThrough} locale={locale} copy={copy.dataThrough} kindLabel={copy.kinds[dataThrough.kind] ?? dataThrough.kind} />
            </Typography>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
