import { Box } from "../../../../../atoms/Box/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { ShareBar } from "../../../../atoms/ShareBar/index.ts";
import { InsetFigure } from "../../../../molecules/InsetFigure/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import type { OverviewFrameworks } from "../../../../types.ts";
import { formatPercent } from "../../../../utils/formatPercent.ts";
import { ratioOf, shareOfTotal } from "../../entityOverview.utils.ts";

export interface FrameworkLineCopy {
  heading: string;
  /** The first figure's label: how many framework agreements. */
  agreements: string;
  /** The second figure's label: the ceilings. */
  ceilings: string;
  /** The ceilings' note: they are never summed (into the total, or with each other as money awarded). */
  notSummed: string;
  /** The third figure's label: the subsequent contracts reported. */
  subsequent: string;
  /** The third figure's note, given the formatted share of the ceilings ("18.2% of the ceilings"). */
  ofCeilings: (percent: string) => string;
  /** The sentence when there are none. */
  none: string;
  /** Ceilings are never summed into the total. */
  note: string;
}

export interface FrameworkLineProps {
  frameworks: OverviewFrameworks;
  locale: Locale;
  copy: FrameworkLineCopy;
}

/**
 * The framework agreements: three inset figures (how many; their ceilings, "not summed"; what subsequent contracts reported, with its share of the ceilings), the share as a bar and the note.
 * Ceilings are shown beside the total, never in it. The share in the text is the real ratio (it can pass 100%); the bar stops at full.
 */
export function FrameworkLine({ frameworks, locale, copy }: FrameworkLineProps) {
  const ratio = ratioOf(frameworks.subsequentReported, frameworks.ceilings);
  return (
    <Panel heading={copy.heading} level="h2">
      {frameworks.count === 0 ? (
        <Typography color="text.secondary">{copy.none}</Typography>
      ) : (
        <>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <InsetFigure label={copy.agreements}>{formatCount(frameworks.count, false, locale)}</InsetFigure>
            <InsetFigure label={copy.ceilings} note={copy.notSummed}>
              <MoneyAmount bani={frameworks.ceilings} locale={locale} />
            </InsetFigure>
            <InsetFigure label={copy.subsequent} note={ratio === null ? undefined : copy.ofCeilings(formatPercent(ratio, locale))}>
              <MoneyAmount bani={frameworks.subsequentReported} locale={locale} />
            </InsetFigure>
          </Box>
          <ShareBar share={shareOfTotal(frameworks.subsequentReported, frameworks.ceilings)} />
          <Typography variant="body2" color="text.secondary">
            {copy.note}
          </Typography>
        </>
      )}
    </Panel>
  );
}
