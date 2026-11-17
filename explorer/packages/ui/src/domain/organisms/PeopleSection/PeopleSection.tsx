import { Link } from "../../../atoms/Link/index.ts";
import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import type { OrganisationPeopleData } from "../../types.ts";
import { Tag } from "../../atoms/Tag/index.ts";
import { listRowSx, listSx } from "../../utils/listSx.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { SourceCaption } from "../../molecules/SourceCaption/index.ts";
import { followLink } from "../../utils/followLink.ts";

export interface PeopleSectionCopy {
  heading: string;
  /** Said once under the heading: who is listed, and that namesakes are never merged. */
  intro: string;
  none: string;
  /** "born 1975", given the year. */
  born: (year: number) => string;
  /** The line of a holder with no birth date in ONRC (an unlinked role holder): it is on this page only. */
  unlinked: string;
  /** The accessible name of a link to a holder's person page (Restricted, Private view only), given the holder's name. */
  personLink: (name: string) => string;
  /** The header's right slot, the Source and its snapshot: "ONRC · snapshot of 6 May 2026", given the formatted date. */
  aside: (snapshot: string) => string;
  /** "Source: ONRC, snapshot of 6 May 2026", given the formatted date (under the rows). */
  source: (snapshot: string) => string;
  /** The foot: the privacy rule in one sentence, shown on every host ("Names link to a person page only in a Private view."). */
  foot: string;
}

export interface PeopleSectionProps {
  /** `entity.people` of `EntityOverview`. */
  people: OrganisationPeopleData;
  /**
   * The person page's URL for an id. A holder links only when the API sent it a `person` (a Private view: the host's Restricted switch is `show`), so a public host never shows a link.
   */
  personHref: (id: string) => string;
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
  copy: PeopleSectionCopy;
  /** The panel shows its last answer while the next loads: its body is dimmed with `aria-busy="true"`; the header and the foot stay at full strength. */
  busy?: boolean | undefined;
}

/**
 * The administrators and legal representatives of a SEAP counterparty as ONRC lists them (public tier): name and role as published, the birth year, and the snapshot that
 * is their basis. A holder with no birth date is an unlinked role holder: named here, linked to nobody. Never a birthplace, a full birth date or a CNP.
 */
export function PeopleSection({ people, personHref, onNavigate, locale, copy, busy }: PeopleSectionProps) {
  const snapshot = formatDate(people.snapshot, locale, "long");
  return (
    <Panel id="people" heading={copy.heading} level="h2" flush busy={busy} aside={copy.aside(snapshot)} foot={copy.foot}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, px: 2, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {copy.intro}
        </Typography>
        {people.holders.length === 0 && <Typography color="text.secondary">{copy.none}</Typography>}
      </Box>
      {people.holders.length > 0 && (
        <Box component="ul" sx={{ ...listSx, borderTop: 1, borderColor: "divider" }}>
          {people.holders.map((h, i) => (
            <Box component="li" key={`${h.name}-${h.role}-${i}`} sx={{ ...listRowSx, display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", columnGap: 2, rowGap: 0.5 }}>
              <Box sx={{ minWidth: 0 }}>
                {/* the name and the role are source data, shown as ONRC wrote them */}
                {h.person ? (
                  <Link href={personHref(h.person.id)} onClick={followLink(personHref(h.person.id), onNavigate)} aria-label={copy.personLink(h.name)}>
                    <strong>{h.name}</strong>
                  </Link>
                ) : (
                  <strong>{h.name}</strong>
                )}{" "}
                <Typography component="span" color="text.secondary">
                  {h.birthYear === null ? copy.unlinked : copy.born(h.birthYear)}
                </Typography>
              </Box>
              <Tag>{h.role}</Tag>
            </Box>
          ))}
        </Box>
      )}
      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>
        <SourceCaption label={copy.source(snapshot)} url={people.provenance.url} />
      </Box>
    </Panel>
  );
}
