import { Box } from "../../../atoms/Box/index.ts";
import { TableBody } from "../../../atoms/TableBody/index.ts";
import { TableCell } from "../../../atoms/TableCell/index.ts";
import { TableHead } from "../../../atoms/TableHead/index.ts";
import { TableRow } from "../../../atoms/TableRow/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { ViaSentence } from "../../molecules/ViaSentence/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { MandateBasisLine, type MandateBasisCopy } from "../../molecules/MandateBasisLine/index.ts";
import { NumericCell } from "../../atoms/NumericCell/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { PanelTable } from "../../molecules/PanelTable/index.ts";
import type { LeadershipData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";

export interface LeadershipSectionCopy {
  heading: string;
  /** The caveat: the party is as registered at the election and may have changed since; leaders are not linked to a person. */
  caveat: string;
  /** Shown for a mandate with no end. */
  inForce: string;
  /** The table's column heads. */
  columns: { leader: string; list: string; period: string; basis: string };
  /** The table's accessible name ("Mandates"). */
  tableLabel: string;
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
  /** The held answer is being refreshed: the Panel body dims and is aria-busy. */
  busy?: boolean;
}

/**
 * An authority's Leadership list, a full-width panel: the caveat that the leader may have switched party since (and, for a subordinate body, the basis of the tie to its authority), then a table
 * of the Mandates (leader's name as AEP wrote it, the list as registered, the dates, the AEP basis) and the gaps, listed as gaps, in the foot. Leaders are never links.
 */
export function LeadershipSection({ leadership, authorityHref, onNavigate, locale, copy, busy }: LeadershipSectionProps) {
  const period = (from: string, to: string | null) => copy.period(formatDate(from, locale, "long"), to ? formatDate(to, locale, "long") : copy.inForce);
  const { columns } = copy;
  return (
    <Panel
      heading={copy.heading}
      level="h2"
      flush
      busy={busy}
      foot={
        leadership.gaps.length > 0 ? (
          <Box>
            <Typography variant="meta" component="p">{copy.gapHeading}</Typography>
            <Box component="ul" sx={{ m: 0, pl: 2 }}>
              {leadership.gaps.map((g) => (
                <li key={`${g.kind}-${g.startDate}`}>{period(g.startDate, g.endDate)}: {copy.gaps[g.kind]}</li>
              ))}
            </Box>
          </Box>
        ) : undefined
      }
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, px: 2, py: 1.5 }}>
        <Typography variant="body2">{copy.caveat}</Typography>
        {leadership.via && (
          <Typography variant="body2">
            <ViaSentence via={leadership.via} sentence={copy.via} href={authorityHref(leadership.via.authority)} onNavigate={onNavigate} locale={locale} />
          </Typography>
        )}
      </Box>
      <PanelTable label={copy.tableLabel} aria-label={copy.tableLabel} minWidth={720}>
        <TableHead>
          <TableRow>
            <TableCell>{columns.leader}</TableCell>
            <TableCell>{columns.list}</TableCell>
            <NumericCell align="left">{columns.period}</NumericCell>
            <TableCell>{columns.basis}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {leadership.mandates.map((m) => (
            <TableRow key={`${m.startDate}-${m.list}`} hover>
              <TableCell>{m.leaderName}</TableCell>
              <TableCell>{m.list}</TableCell>
              <NumericCell align="left">{period(m.startDate, m.endDate)}</NumericCell>
              <TableCell>
                <MandateBasisLine mandate={m} locale={locale} copy={copy.mandateBasis} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </PanelTable>
    </Panel>
  );
}
