import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { SignalRuleBaseRateData } from "../../types.ts";
import { busyProps } from "../../utils/busy.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { skeletonBlock } from "../../utils/skeletonBlock.tsx";
import { InsetFigure } from "../InsetFigure/index.ts";
import { baseRateNote, baseRateValue, windowWords } from "./signalRuleBaseRate.utils.ts";

export interface SignalRuleBaseRateCopy {
  /** "Time window" */
  windowLabel: string;
  /** The window as a range, both ends as formatted dates: "1 January 2021 to 30 November 2024". */
  range: (from: string, to: string) => string;
  /** A window with no start (the rule sees everything loaded): "From the first Record loaded to 30 November 2024". */
  openStart: (to: string) => string;
  /** "How often it fires nationally" */
  rateLabel: string;
  /** "5.7% of contracting authorities had at least one in 2024", from the percentage and the year. */
  rate: (percent: string, year: number) => string;
  /** The rate is zero: no contracting authority had one that year. */
  none: (year: number) => string;
  /** "Data through 30 November 2024", from the formatted date (the reference lines under the general sections too). */
  dataThrough: (date: string) => string;
  /** "Data through": the label over the date. */
  dataThroughLabel: string;
  /** The loading line, beside the Signal rules' heading. */
  loading: string;
  /** The figures could not be loaded; the rules' prose stays. Shown by the page in a `StateNote`, not by this slot. */
  error: string;
  /** The answer had no entry for this rule. */
  missing: string;
}

export type SignalRuleBaseRateProps =
  /** Waiting for the answer: the three labels are real, the values are placeholder blocks. */
  | { status: "loading"; rule?: undefined; busy?: undefined; locale: Locale; copy: SignalRuleBaseRateCopy }
  /** `rule` is null when the answer holds no entry for this rule; `busy` while this is the held answer and the next one loads (dimmed, `aria-busy`). */
  | { status: "ready"; rule: SignalRuleBaseRateData | null; busy?: boolean; locale: Locale; copy: SignalRuleBaseRateCopy };

/**
 * The figures of one Signal rule on the methodology page, as three inset figures in a row: the window the rule sees, how often it fires nationally (the share of contracting
 * authorities with at least one such Signal in the base-rate year, as a percentage with its sentence as the note; recomputed on every load) and the data-through date. Numbers only; the rule's wording sits around it.
 */
export function SignalRuleBaseRate(props: SignalRuleBaseRateProps) {
  const { copy, locale } = props;
  if (props.status === "ready" && !props.rule) {
    return (
      <Typography role="status" color="text.secondary">
        {copy.missing}
      </Typography>
    );
  }
  const rule = props.status === "ready" ? props.rule : null;
  const busy = busyProps(props.busy);
  return (
    <Box {...busy} sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, ...busy.sx }}>
      <InsetFigure label={copy.windowLabel}>{rule ? windowWords(rule, locale, copy) : skeletonBlock(160, 22)}</InsetFigure>
      <InsetFigure label={copy.rateLabel} note={rule ? baseRateNote(rule, copy, locale) : undefined}>
        {rule ? baseRateValue(rule, locale) : skeletonBlock(64, 22)}
      </InsetFigure>
      <InsetFigure label={copy.dataThroughLabel}>{rule ? formatDate(rule.dataThrough, locale, "long") : skeletonBlock(120, 22)}</InsetFigure>
    </Box>
  );
}
