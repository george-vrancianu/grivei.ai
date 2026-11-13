import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { RecordSignal } from "../../../../types.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { SignalList } from "../../../SignalList/index.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { formatDate } from "../../../../utils/formatDate.ts";

export interface SignalsSectionCopy {
  heading: string;
  /** One neutral label per rule. The Signal card and its wording catalogue replace this entry. */
  rules: Record<RecordSignal["rule"], string>;
  /** "dated 12 March 2024" (the date of the latest Record in the Signal, not a start), given the formatted date. */
  date: (when: string) => string;
  /** "13 Records", given the count and its formatted number. */
  records: (n: number, formatted: string) => string;
}

export interface SignalsSectionProps {
  signals: readonly RecordSignal[];
  recordHref: (code: string) => string;
  onNavigate?: (href: string) => void;
  /** The Signal card of a Signal (the app builds it); with it each entry is the card followed by its Records, without it the minimal label and date. */
  renderCard?: ((signal: RecordSignal) => ReactNode) | undefined;
  locale: Locale;
  copy: SignalsSectionCopy;
}

/**
 * The Signals this Record belongs to, as a minimal neutral entry each: the rule's label, its date, how many Records it consists of
 * and links to those Records. The full Signal card (numbers, lawful explanations, wording) is the Signal card organism's, not this one's.
 */
export function SignalsSection({ signals, recordHref, onNavigate, renderCard, locale, copy }: SignalsSectionProps) {
  if (signals.length === 0) return null;
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <SectionHeading>{copy.heading}</SectionHeading>
      <SignalList
        signals={signals}
        locale={locale}
        renderItem={(signal) => (
          <>
            {renderCard ? (
              renderCard(signal)
            ) : (
              <>
                <Typography variant="subtitle2" component="h3">
                  {copy.rules[signal.rule]}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {copy.date(formatDate(signal.date, locale, "long"))} · {copy.records(signal.recordCount, formatCount(signal.recordCount, false, locale))}
                </Typography>
              </>
            )}
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {signal.records.map((r) => (
                <li key={r.code}>
                  <Link href={recordHref(r.code)} onClick={followLink(recordHref(r.code), onNavigate)}>
                    {r.title}
                  </Link>
                </li>
              ))}
            </Box>
          </>
        )}
      />
    </Stack>
  );
}
