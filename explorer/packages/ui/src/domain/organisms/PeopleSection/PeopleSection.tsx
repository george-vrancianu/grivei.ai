import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { color, radius } from "../../../theme/tokens.ts";
import { SectionHeading } from "../../atoms/SectionHeading/index.ts";
import type { OrganisationPeopleData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";
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
  /** "Source: ONRC, snapshot of 6 May 2026", given the formatted date. */
  source: (snapshot: string) => string;
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
}

/**
 * The administrators and legal representatives of a SEAP counterparty as ONRC lists them (public tier): name and role as published, the birth year, and the snapshot that
 * is their basis. A holder with no birth date is an unlinked role holder: named here, linked to nobody. Never a birthplace, a full birth date or a CNP.
 */
export function PeopleSection({ people, personHref, onNavigate, locale, copy }: PeopleSectionProps) {
  const snapshot = formatDate(people.snapshot, locale, "long");
  return (
    <Stack component="section" id="people" aria-label={copy.heading} spacing={2} sx={{ p: 2, bgcolor: color.panel, border: `1px solid ${color.line}`, borderRadius: `${radius.card}px` }}>
      <SectionHeading>{copy.heading}</SectionHeading>
      <Typography variant="body2" color="text.secondary">
        {copy.intro}
      </Typography>
      {people.holders.length === 0 ? (
        <Typography color="text.secondary">{copy.none}</Typography>
      ) : (
        <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {people.holders.map((h, i) => (
            <Typography component="li" key={`${h.name}-${h.role}-${i}`}>
              {/* the name and the role are source data, shown as ONRC wrote them */}
              {h.person ? (
                <Link href={personHref(h.person.id)} onClick={followLink(personHref(h.person.id), onNavigate)} aria-label={copy.personLink(h.name)}>
                  <strong>{h.name}</strong>
                </Link>
              ) : (
                <strong>{h.name}</strong>
              )}{" "}
              <Typography component="span" color="text.secondary">
                {h.role} · {h.birthYear === null ? copy.unlinked : copy.born(h.birthYear)}
              </Typography>
            </Typography>
          ))}
        </Stack>
      )}
      <Typography variant="caption" color="text.secondary">
        {people.provenance.url ? (
          <Link href={people.provenance.url} target="_blank">
            {copy.source(snapshot)}
          </Link>
        ) : (
          copy.source(snapshot)
        )}
      </Typography>
    </Stack>
  );
}
