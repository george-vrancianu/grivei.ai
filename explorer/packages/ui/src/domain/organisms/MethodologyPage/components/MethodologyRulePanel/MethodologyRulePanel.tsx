import type { Locale } from "../../../../../theme/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import { Well } from "../../../../../atoms/Well/index.ts";
import { SignalMark } from "../../../../atoms/SignalMark/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { SignalRuleBaseRate, type SignalRuleBaseRateCopy } from "../../../../molecules/SignalRuleBaseRate/index.ts";
import type { SignalRuleBaseRateData } from "../../../../types.ts";
import { MethodologyProse } from "../MethodologyProse/index.ts";
import type { MethodologySectionCopy } from "../MethodologySection/index.ts";

export interface MethodologyRulePanelProps {
  /** The panel's anchor (`signalAnchor(rule)`): the `section` element's id. */
  id: string;
  locale: Locale;
  copy: MethodologySectionCopy & {
    /** The one line on the lawful explanations, set in a well at the end. */
    lawful: string;
  };
  baseRateCopy: SignalRuleBaseRateCopy;
  /** The rule's figures: waiting, the answer's entry for this rule (null when it has none; `stale` while the next answer loads), or none at all when the request failed (the page's note says so). */
  figures: { status: "loading" } | { status: "ready"; rule: SignalRuleBaseRateData | null; stale: boolean } | null;
}

/**
 * One Signal rule on the methodology page: a titled `Panel` (`h3` under the Signal rules' `h2`) with the amber ring and the rule's name in the header strip, then the definition, the
 * conditions as a list, the rule's three figures (window, how often it fires nationally, data-through date) and the lawful explanations in a `Well`. Neutral: no score, no rank.
 */
export function MethodologyRulePanel({ id, locale, copy, baseRateCopy, figures }: MethodologyRulePanelProps) {
  return (
    <Panel
      id={id}
      heading={
        <>
          <SignalMark />
          <Typography variant="h4" component="span">
            {copy.heading}
          </Typography>
        </>
      }
      label={copy.heading}
    >
      <MethodologyProse locale={locale} copy={copy} />
      {figures?.status === "loading" && <SignalRuleBaseRate status="loading" locale={locale} copy={baseRateCopy} />}
      {figures?.status === "ready" && <SignalRuleBaseRate status="ready" rule={figures.rule} busy={figures.stale} locale={locale} copy={baseRateCopy} />}
      <Well component="p" sx={{ m: 0, px: 2, py: 1.5 }}>
        <Typography variant="body2" component="span" color="text.secondary" sx={{ textWrap: "pretty" }}>
          {copy.lawful}
        </Typography>
      </Well>
    </Panel>
  );
}
