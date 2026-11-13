import type { Locale } from "../../../theme/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { layout } from "../../../theme/tokens.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { SignalRuleBaseRate, type SignalRuleBaseRateCopy } from "../../molecules/SignalRuleBaseRate/index.ts";
import type { SignalRule, SignalRuleBaseRateData } from "../../types.ts";
import { METHODOLOGY_ANCHORS, METHODOLOGY_SECTIONS, signalAnchor, type MethodologySectionKey } from "../../utils/methodologyAnchors.ts";
import { SIGNAL_RULES } from "../../utils/signalWording.ts";
import { MethodologyContents } from "./components/MethodologyContents/index.ts";
import { MethodologySection, type MethodologySectionCopy } from "./components/MethodologySection/index.ts";
import { useScrollToAnchor } from "./hooks/useScrollToAnchor.ts";

export interface MethodologyRuleCopy extends MethodologySectionCopy {
  /** The one line on the lawful explanations, after the base rate. */
  lawful: string;
}

export interface MethodologyPageCopy {
  title: string;
  intro: string;
  /** The table of contents' name: "On this page". */
  contents: string;
  /** The general sections; their ids are `METHODOLOGY_ANCHORS`. */
  sections: Record<Exclude<MethodologySectionKey, "signals">, MethodologySectionCopy>;
  /** The Signal rules' group: what a Signal is, before the four rules. */
  signals: MethodologySectionCopy;
  /** One section per rule; its id is `signalAnchor(rule)`. */
  rules: Record<SignalRule, MethodologyRuleCopy>;
  baseRate: SignalRuleBaseRateCopy;
}

/** What the `MethodologyBaseRates` query gives the page: nothing yet, a failure, or the rules' windows and base rates. */
export type MethodologyBaseRates = { status: "loading" | "error" } | { status: "ready"; rules: readonly SignalRuleBaseRateData[] };

export interface MethodologyPageProps {
  baseRates: MethodologyBaseRates;
  /** The section to bring into view (the URL's `#fragment`), or null. */
  anchor?: string | null;
  /** The URL of a section of this page (the contents' links). */
  sectionHref: (anchor: string) => string;
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: MethodologyPageCopy;
}

/**
 * "About the numbers" / "Despre cifre": how every number in the explorer is counted, section by section, each with a stable anchor, and one
 * section per Signal rule with its exact rule, its window and how often it fires nationally. The prose is the copy; the figures of the
 * Signal rules come from the API and, when they cannot be had, leave the prose readable.
 */
export function MethodologyPage({ baseRates, anchor = null, sectionHref, onNavigate, locale, copy }: MethodologyPageProps) {
  useScrollToAnchor(anchor);
  const contents = [
    ...METHODOLOGY_SECTIONS.map((key) => ({ anchor: METHODOLOGY_ANCHORS[key], label: copy.sections[key].heading })),
    { anchor: METHODOLOGY_ANCHORS.signals, label: copy.signals.heading },
    ...SIGNAL_RULES.map((rule) => ({ anchor: signalAnchor(rule), label: copy.rules[rule].heading, indent: true })),
  ];
  return (
    <Box
      sx={{
        pt: 5,
        pb: 8,
        px: layout.gutter,
        maxWidth: layout.maxWidth,
        width: "100%",
        boxSizing: "border-box",
        mx: "auto",
        display: "grid",
        gap: 5,
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "200px minmax(0, 1fr)" },
        alignItems: "start",
      }}
    >
      <MethodologyContents label={copy.contents} entries={contents} sectionHref={sectionHref} {...(onNavigate ? { onNavigate } : {})} />
      <Stack component="article" spacing={4.5} sx={{ maxWidth: 800, minWidth: 0 }}>
        <Stack spacing={1.5}>
          <Typography variant="h1" component="h1" sx={{ textWrap: "balance" }}>
            {copy.title}
          </Typography>
          <Typography sx={{ fontSize: 17, color: "text.secondary", textWrap: "pretty" }}>{copy.intro}</Typography>
        </Stack>
        {METHODOLOGY_SECTIONS.map((key) => (
          <MethodologySection key={key} id={METHODOLOGY_ANCHORS[key]} locale={locale} copy={copy.sections[key]} />
        ))}
        <MethodologySection id={METHODOLOGY_ANCHORS.signals} locale={locale} copy={copy.signals}>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {SIGNAL_RULES.map((rule) => (
              <MethodologySection key={rule} id={signalAnchor(rule)} level={3} locale={locale} copy={copy.rules[rule]}>
                {baseRates.status === "ready" ? (
                  <SignalRuleBaseRate status="ready" rule={baseRates.rules.find((r) => r.slug === rule) ?? null} locale={locale} copy={copy.baseRate} />
                ) : (
                  <SignalRuleBaseRate status={baseRates.status} locale={locale} copy={copy.baseRate} />
                )}
                <Typography sx={{ mt: 1, color: "text.secondary" }}>{copy.rules[rule].lawful}</Typography>
              </MethodologySection>
            ))}
          </Stack>
        </MethodologySection>
      </Stack>
    </Box>
  );
}
