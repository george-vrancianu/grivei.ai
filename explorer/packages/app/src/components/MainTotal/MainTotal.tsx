import type { TotalFieldsFragment } from "@grivei/contract";
import { Stack, TotalFigure, Typography, type Locale, type TotalFigureCopy } from "@grivei/ui";

export interface MainTotalProps {
  total: TotalFieldsFragment;
  copy: { heading: string; total: TotalFigureCopy };
  locale: Locale;
  /** The methodology page the ⓘ links to. */
  methodologyHref: string;
  /** The suspect Records the Total left out. */
  suspectHref: string;
}

/** The main screen's Total: the awarded value, what it left out (with the ⓘ link and the way to the suspect Records). */
export function MainTotal({ total, copy, locale, methodologyHref, suspectHref }: MainTotalProps) {
  return (
    <Stack spacing={1} data-testid="main-total">
      <Typography variant="meta" component="h2">
        {copy.heading}
      </Typography>
      <TotalFigure total={total} locale={locale} copy={copy.total} methodologyHref={methodologyHref} suspectHref={suspectHref} />
    </Stack>
  );
}
