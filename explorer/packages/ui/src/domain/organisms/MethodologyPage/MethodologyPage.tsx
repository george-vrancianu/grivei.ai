import type { Locale } from "../../../theme/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { layout } from "../../../theme/tokens.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { SignalRuleBaseRate, type SignalRuleBaseRateCopy } from "../../molecules/SignalRuleBaseRate/index.ts";
import type { SignalRule, SignalRuleBaseRateData } from "../../types.ts";
import { METHODOLOGY_ANCHORS, METHODOLOGY_SECTIONS, signalAnchor, type MethodologySectionKey } from "../../utils/methodologyAnchors.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { SIGNAL_RULES } from "../../utils/signalWording.ts";
import { MethodologyContents } from "./components/MethodologyContents/index.ts";
import { MethodologySection, type MethodologySectionCopy } from "./components/MethodologySection/index.ts";
import { useScrollToAnchor } from "./hooks/useScrollToAnchor.ts";

export interface MethodologyRuleCopy extends MethodologySectionCopy {
  /** The one line on the lawful explanations, after the base rate. */
  lawful: string;
}

export interface MethodologyPageCopy {
  /** The mono amber line above the title. */
  eyebrow: string;
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
  /** The line under a Reference source's section: "Data through 13 January 2026". */
  referenceDataThrough: (date: string) => string;
  /** The line under the financial statements' section: "Data through fiscal year 2025" (the newest fiscal year held). */
  referenceFiscalYearThrough: (year: number) => string;
}

/** What the `MethodologyBaseRates` query gives the page: nothing yet, a failure, or the rules' windows and base rates. */
export type MethodologyBaseRates = { status: "loading" | "error" } | { status: "ready"; rules: readonly SignalRuleBaseRateData[] };

/** What the `MethodologyReferenceSources` query gives the page: the day AMEPIP's held list was published (null when none is held or the query failed: the prose stands alone). */
export interface MethodologyReferenceDates {
  publicEnterprises: string | null;
  /** The newest fiscal year MF's statements held (null when none is held or the query failed). */
  financialStatements: number | null;
}

export interface MethodologyPageProps {
  baseRates: MethodologyBaseRates;
  /** The data-through date of the Reference sources the page describes (AMEPIP); absent until it loads. */
  referenceDates?: MethodologyReferenceDates;
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
export function MethodologyPage({ baseRates, referenceDates, anchor = null, sectionHref, onNavigate, locale, copy }: MethodologyPageProps) {
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
        gridTemplateColumns: { xs: "minmax(0, 1fr)", md: `${layout.contentsColumn}px minmax(0, 1fr)` },
        alignItems: "start",
      }}
    >
      <MethodologyContents label={copy.contents} entries={contents} sectionHref={sectionHref} {...(onNavigate ? { onNavigate } : {})} />
      <Stack component="article" spacing={4.5} sx={{ maxWidth: layout.articleMaxWidth, minWidth: 0 }}>
        <Stack spacing={1.5}>
          <Typography variant="label" component="p" color="primary.main" sx={{ m: 0 }}>
            {copy.eyebrow}
          </Typography>
          <Typography variant="h1" component="h1" sx={{ textWrap: "balance" }}>
            {copy.title}
          </Typography>
          <Typography variant="lead" sx={{ textWrap: "pretty" }}>{copy.intro}</Typography>
        </Stack>
        {METHODOLOGY_SECTIONS.map((key) => (
          <MethodologySection key={key} id={METHODOLOGY_ANCHORS[key]} locale={locale} copy={copy.sections[key]}>
            {key === "publicEnterprises" && referenceDates?.publicEnterprises && (
              <Typography sx={{ color: "text.secondary" }}>{copy.referenceDataThrough(formatDate(referenceDates.publicEnterprises, locale, "long"))}</Typography>
            )}
            {key === "financialStatements" && referenceDates?.financialStatements != null && (
              <Typography sx={{ color: "text.secondary" }}>{copy.referenceFiscalYearThrough(referenceDates.financialStatements)}</Typography>
            )}
          </MethodologySection>
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
