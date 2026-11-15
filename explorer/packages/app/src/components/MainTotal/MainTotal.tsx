import type { MainScreenQuery } from "@grivei/contract";
import { PartyCoverage, Stack, TotalFigure, Typography, type Locale, type InsetTotalCopy, type PartyCoverageCopy } from "@grivei/ui";

export interface MainTotalProps {
  /** The search's Total; a Party-filtered search carries its coverage. */
  total: MainScreenQuery["seap"]["search"]["total"];
  copy: { heading: string; total: InsetTotalCopy; partyCoverage: PartyCoverageCopy };
  locale: Locale;
  /** The methodology page the ⓘ links to. */
  methodologyHref: string;
  /** The methodology section on Party and Leadership, which the coverage statement links to. */
  partyHref: string;
  /** The suspect Records the Total left out. */
  suspectHref: string;
}

/**
 * The main screen's Total: the awarded value, with what it left out as inset figures beside it (each only when not zero; the ⓘ link, and the way to the
 * suspect Records) and, under a Party filter, what the filter covers: direct against subordinate, and the value no Party is attributed to (#181). Party
 * coverage is a block of its own (a list, not one figure), so it stays under the figures.
 */
export function MainTotal({ total, copy, locale, methodologyHref, partyHref, suspectHref }: MainTotalProps) {
  return (
    <Stack spacing={2} data-testid="main-total">
      <TotalFigure
        total={total}
        locale={locale}
        copy={copy.total}
        methodologyHref={methodologyHref}
        suspectHref={suspectHref}
        inset={{
          heading: (
            <Typography variant="meta" component="h2">
              {copy.heading}
            </Typography>
          ),
        }}
      />
      {total.partyCoverage && <PartyCoverage coverage={total.partyCoverage} locale={locale} copy={copy.partyCoverage} methodologyHref={partyHref} />}
    </Stack>
  );
}
