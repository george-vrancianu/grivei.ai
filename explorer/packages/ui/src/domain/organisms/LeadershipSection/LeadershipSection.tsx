import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { ViaSentence } from "../../molecules/ViaSentence/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { MandateBasisLine, type MandateBasisCopy } from "../../molecules/MandateBasisLine/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import type { LeadershipData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";

export interface LeadershipSectionCopy {
  heading: string;
  /** The caveat: the party is as registered at the election and may have changed since; leaders are not linked to a person. */
  caveat: string;
  /** Shown for a mandate with no end. */
  inForce: string;
  /** "27 September 2024 – 27 October 2024", given the formatted start and end (or `inForce`). */
  period: (from: string, to: string) => string;
  gapHeading: string;
  gaps: Record<LeadershipData["gaps"][number]["kind"], string>;
  /** The basis of a subordinate body's list, given the authority's name and the formatted MF snapshot day. */
  via: (authority: string, snapshot: string) => string;
  mandateBasis: MandateBasisCopy;
}

export interface LeadershipSectionProps {
  /** `LeadershipFields` of the entity query. */
  leadership: LeadershipData;
  /** The entity page's URL for the authority a subordinate body is shown through. */
  authorityHref: (key: string) => string;
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: LeadershipSectionCopy;
}

/**
 * An authority's Leadership list: each Mandate (leader's name as AEP wrote it, the list as registered, dates, the AEP basis), the caveat that the leader may have switched
 * party since, and the gaps listed as gaps. For a subordinate body it is its authority's list with the basis of the tie. Leaders are never links.
 */
export function LeadershipSection({ leadership, authorityHref, onNavigate, locale, copy }: LeadershipSectionProps) {
  const period = (from: string, to: string | null) => copy.period(formatDate(from, locale, "long"), to ? formatDate(to, locale, "long") : copy.inForce);
  return (
    <Panel heading={copy.heading} level="h2">
      <Typography variant="body2">{copy.caveat}</Typography>
      {leadership.via && (
        <Typography variant="body2">
          <ViaSentence via={leadership.via} sentence={copy.via} href={authorityHref(leadership.via.authority)} onNavigate={onNavigate} locale={locale} />
        </Typography>
      )}
      <Stack component="ol" spacing={1.5} sx={{ m: 0, p: 0, listStyle: "none" }}>
        {leadership.mandates.map((m) => (
          <Stack component="li" key={`${m.startDate}-${m.list}`} spacing={0.25}>
            <Typography variant="body1">{m.leaderName} · {m.list}</Typography>
            <Typography variant="caption" color="text.secondary">{period(m.startDate, m.endDate)}</Typography>
            <MandateBasisLine mandate={m} locale={locale} copy={copy.mandateBasis} />
          </Stack>
        ))}
      </Stack>
      {leadership.gaps.length > 0 && (
        <Stack spacing={0.5}>
          <Typography variant="overline" color="text.secondary">{copy.gapHeading}</Typography>
          <Stack component="ul" spacing={0.5} sx={{ m: 0, pl: 2 }}>
            {leadership.gaps.map((g) => (
              <li key={`${g.kind}-${g.startDate}`}>
                <Typography variant="body2">{period(g.startDate, g.endDate)}: {copy.gaps[g.kind]}</Typography>
              </li>
            ))}
          </Stack>
        </Stack>
      )}
    </Panel>
  );
}

