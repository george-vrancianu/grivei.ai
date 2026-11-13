import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { TotalFigure, type TotalFigureCopy } from "../../../../molecules/TotalFigure/index.ts";
import type { EntityOverviewData } from "../../../../types.ts";
import { formatPercent } from "../../../../utils/formatPercent.ts";
import { Figure } from "./components/Figure/index.ts";

export interface HeadlineNumbersCopy {
  /** The group's accessible name ("Headline numbers"). */
  label: string;
  total: string;
  counterparties: string;
  /** "The largest holds 82% of the total", given the formatted percentage. */
  topShare: (percent: string) => string;
  /** "Share via direct purchase" */
  directPurchase: string;
  signals: string;
  totalFigure: TotalFigureCopy;
}

export interface HeadlineNumbersProps {
  overview: Pick<EntityOverviewData, "total" | "counterparties" | "directPurchaseShare" | "signals">;
  locale: Locale;
  copy: HeadlineNumbersCopy;
  methodologyHref: string;
  suspectHref: string;
}

/** The four numbers on top: the total awarded (with what it left out), the counterparties with the top one's share, the share bought directly, and the Signals. */
export function HeadlineNumbers({ overview, locale, copy, methodologyHref, suspectHref }: HeadlineNumbersProps) {
  const { total, counterparties, directPurchaseShare, signals } = overview;
  const figure = (text: string) => (
    <Typography variant="stat" component="p">
      {text}
    </Typography>
  );
  return (
    <Box
      component="ul"
      aria-label={copy.label}
      sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", m: 0, p: 0 }}
    >
      <Figure label={copy.total}>
        <TotalFigure total={total} locale={locale} copy={copy.totalFigure} methodologyHref={methodologyHref} suspectHref={suspectHref} />
      </Figure>
      <Figure label={copy.counterparties}>
        {figure(formatCount(counterparties.count, false, locale))}
        {counterparties.topShare !== null && (
          <Typography variant="body2" color="text.secondary">
            {copy.topShare(formatPercent(counterparties.topShare, locale))}
          </Typography>
        )}
      </Figure>
      <Figure label={copy.directPurchase}>
        {/* a share of the money: with none awarded (no Records, or none with a value) there is no share to tell */}
        {figure(BigInt(total.awarded) > 0n ? formatPercent(directPurchaseShare, locale) : "–")}
      </Figure>
      <Figure label={copy.signals}>{figure(formatCount(signals.count, false, locale))}</Figure>
    </Box>
  );
}
