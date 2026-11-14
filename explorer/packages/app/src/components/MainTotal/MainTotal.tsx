import type { MainScreenQuery } from "@grivei/contract";
import { PartyCoverage, Stack, TotalFigure, Typography, type Locale, type PartyCoverageCopy, type TotalFigureCopy } from "@grivei/ui";

export interface MainTotalProps {
  /** The search's Total; a Party-filtered search carries its coverage. */
  total: MainScreenQuery["seap"]["search"]["total"];
  copy: { heading: string; total: TotalFigureCopy; partyCoverage: PartyCoverageCopy };
  locale: Locale;
  /** The methodology page the ⓘ links to. */
  methodologyHref: string;
  /** The methodology section on Party and Leadership, which the coverage statement links to. */
  partyHref: string;
  /** The suspect Records the Total left out. */
  suspectHref: string;
}

/**
 * The main screen's Total: the awarded value, what it left out (with the ⓘ link and the way to the suspect Records) and, under a Party filter, what the
 * filter covers: direct against subordinate, and the value no Party is attributed to (#181).
 */
export function MainTotal({ total, copy, locale, methodologyHref, partyHref, suspectHref }: MainTotalProps) {
  return (
    <Stack spacing={1} data-testid="main-total">
      <Typography variant="meta" component="h2">
        {copy.heading}
      </Typography>
      <TotalFigure total={total} locale={locale} copy={copy.total} methodologyHref={methodologyHref} suspectHref={suspectHref} />
      {total.partyCoverage && <PartyCoverage coverage={total.partyCoverage} locale={locale} copy={copy.partyCoverage} methodologyHref={partyHref} />}
    </Stack>
  );
}
