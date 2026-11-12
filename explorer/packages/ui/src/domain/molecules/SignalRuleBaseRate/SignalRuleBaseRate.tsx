import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { SignalRuleBaseRateData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { baseRateWords, windowWords } from "./signalRuleBaseRate.utils.ts";

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
  /** "Data through 30 November 2024", from the formatted date. */
  dataThrough: (date: string) => string;
  loading: string;
  /** The figures could not be loaded; the rule's prose above stays. */
  error: string;
  /** The answer had no entry for this rule. */
  missing: string;
}

export type SignalRuleBaseRateProps =
  | { status: "loading" | "error"; rule?: undefined; locale: Locale; copy: SignalRuleBaseRateCopy }
  /** `rule` is null when the answer holds no entry for this rule. */
  | { status: "ready"; rule: SignalRuleBaseRateData | null; locale: Locale; copy: SignalRuleBaseRateCopy };

/**
 * The slot of one Signal rule on the methodology page: the window the rule sees and how often it fires nationally (the share of
 * contracting authorities with at least one such Signal in the base-rate year; recomputed on every load). Numbers only; the rule's wording sits around it.
 */
export function SignalRuleBaseRate(props: SignalRuleBaseRateProps) {
  const { copy, locale } = props;
  const note = (text: string) => (
    <Typography role="status" color="text.secondary">
      {text}
    </Typography>
  );
  if (props.status === "loading") return note(copy.loading);
  if (props.status === "error") return note(copy.error);
  const rule = props.rule;
  if (!rule) return note(copy.missing);
  return (
    <Stack component="dl" spacing={1} sx={{ m: 0 }}>
      <div>
        <Typography component="dt" variant="subtitle2">{copy.windowLabel}</Typography>
        <Typography component="dd" sx={{ m: 0 }}>{windowWords(rule, locale, copy)}</Typography>
      </div>
      <div>
        <Typography component="dt" variant="subtitle2">{copy.rateLabel}</Typography>
        <Typography component="dd" sx={{ m: 0 }}>{baseRateWords(rule, locale, copy)}</Typography>
        <Typography component="dd" variant="body2" color="text.secondary" sx={{ m: 0 }}>{copy.dataThrough(formatDate(rule.dataThrough, locale, "long"))}</Typography>
      </div>
    </Stack>
  );
}
