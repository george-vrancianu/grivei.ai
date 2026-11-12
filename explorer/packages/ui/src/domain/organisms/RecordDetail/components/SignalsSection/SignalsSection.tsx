import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import type { RecordSignal } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { formatDate } from "../../../../utils/formatDate.ts";

export interface SignalsSectionCopy {
  heading: string;
  /** One neutral label per rule. The Signal card and its wording catalogue replace this entry. */
  rules: Record<RecordSignal["rule"], string>;
  /** "since 12 March 2024", given the formatted date. */
  date: (when: string) => string;
  /** "13 Records", given the count and its formatted number. */
  records: (n: number, formatted: string) => string;
}

export interface SignalsSectionProps {
  signals: readonly RecordSignal[];
  recordHref: (code: string) => string;
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: SignalsSectionCopy;
}

/**
 * The Signals this Record belongs to, as a minimal neutral entry each: the rule's label, its date, how many Records it consists of
 * and links to those Records. The full Signal card (numbers, lawful explanations, wording) is the Signal card organism's, not this one's.
 */
export function SignalsSection({ signals, recordHref, onNavigate, locale, copy }: SignalsSectionProps) {
  if (signals.length === 0) return null;
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <Typography variant="h6" component="h2">
        {copy.heading}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", rowGap: 1.5 }}>
        {signals.map((signal) => (
          <li key={`${signal.rule}-${signal.date}-${signal.authority.key}`}>
            <Typography variant="subtitle2" component="h3">
              {copy.rules[signal.rule]}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {copy.date(formatDate(signal.date, locale, "long"))} · {copy.records(signal.recordCount, signal.recordCount.toLocaleString(locale))}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {signal.records.map((r) => (
                <li key={r.code}>
                  <Link href={recordHref(r.code)} onClick={followLink(recordHref(r.code), onNavigate)}>
                    {r.title}
                  </Link>
                </li>
              ))}
            </Box>
          </li>
        ))}
      </Box>
    </Stack>
  );
}
