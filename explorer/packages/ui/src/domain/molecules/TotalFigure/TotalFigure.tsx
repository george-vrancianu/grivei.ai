import type { ReactNode } from "react";
import type { Locale } from "../../../theme/index.ts";
import type { Total } from "../../types.ts";
import type { InsetTotalCopy, TotalFigureCopy } from "./totalFigure.types.ts";
import { InsetTotal } from "./components/InsetTotal/index.ts";
import { StackedTotal } from "./components/StackedTotal/index.ts";

interface TotalFigureBase {
  total: Total;
  locale: Locale;
  /** The methodology page; the ⓘ links here. */
  methodologyHref: string;
  /** Where the suspect Records are listed; required, so a Total can never leave them out without a way to see them. */
  suspectHref: string;
}

/**
 * Two layouts. Stacked (the default, the entity page, the Records tab and the Money lens): the amount, then one line of what it left out.
 * Inset (the main screen, which opts in): the amount on the left, each part that is not zero as an inset figure beside it, wrapping under it on a narrow screen.
 */
export type TotalFigureProps = TotalFigureBase &
  ({ copy: TotalFigureCopy; inset?: undefined } | { copy: InsetTotalCopy; inset: { /** Shown above the amount, in the amount's column. */ heading?: ReactNode } });

/**
 * A Total: the awarded value and what it left out. A Total always says what it left out,
 * so the parts that are zero are the ones that stay silent (the Records count is the one line a Total always has).
 */
export function TotalFigure(props: TotalFigureProps) {
  const { total, locale, methodologyHref, suspectHref } = props;
  if (props.inset) {
    return <InsetTotal total={total} locale={locale} copy={props.copy} methodologyHref={methodologyHref} suspectHref={suspectHref} heading={props.inset.heading} />;
  }
  return <StackedTotal total={total} locale={locale} copy={props.copy} methodologyHref={methodologyHref} suspectHref={suspectHref} />;
}
