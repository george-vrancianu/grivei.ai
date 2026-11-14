import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { color, radius } from "../../../theme/tokens.ts";
import { SectionHeading } from "../../atoms/SectionHeading/index.ts";
import type { PersonPageData } from "../../types.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { pageSx } from "../../utils/pageSx.ts";
import { followLink } from "../../utils/followLink.ts";

export interface PersonDetailCopy {
  /** The notice at the top: this page exists only in a Private view (Restricted, ADR 0015). */
  privateView: string;
  /** "born 1975", given the year. */
  born: (year: number) => string;
  rolesHeading: string;
  /** "3 roles", given the count (the person's roles across organisations; Restricted like the list). */
  roleCount: (count: number) => string;
  /** The organisation has no entity page (its ONRC registration carries no valid CUI). */
  noPage: string;
  /** Said once under the roles: what links these roles and what does not. */
  basis: string;
  /** "Source: ONRC, snapshot of 6 May 2026", given the formatted date. */
  source: (snapshot: string) => string;
}

export interface PersonDetailProps {
  /** `person` of `PersonPage`. */
  person: PersonPageData;
  /** An organisation's entity page, by key and the role page to open it on (the app owns routing and the language prefix). */
  entityHref: (key: string, role: "AUTHORITY" | "SUPPLIER") => string;
  onNavigate?: ((href: string) => void) | undefined;
  locale: Locale;
  copy: PersonDetailCopy;
}

/**
 * A person page (Restricted, ADR 0015): the name and the birth year, and the person's roles across organisations, each citing its ONRC snapshot. Never the full birth
 * date or the birthplace. It exists only where the host shows Restricted content, and says so.
 */
export function PersonDetail({ person, entityHref, onNavigate, locale, copy }: PersonDetailProps) {
  const snapshot = formatDate(person.snapshot, locale, "long");
  return (
    <Stack component="main" spacing={3} sx={pageSx}>
      <Typography variant="body2" color="text.secondary" role="note">
        {copy.privateView}
      </Typography>
      <Stack spacing={0.5}>
        {/* the name is source data, shown as ONRC wrote it */}
        <Typography variant="h1" component="h1">
          {person.name}
        </Typography>
        <Typography color="text.secondary">{copy.born(person.birthYear)}</Typography>
      </Stack>
      <Stack component="section" aria-label={copy.rolesHeading} spacing={2} sx={{ p: 2, bgcolor: color.panel, border: `1px solid ${color.line}`, borderRadius: `${radius.card}px` }}>
        <SectionHeading>{`${copy.rolesHeading} · ${copy.roleCount(person.roleCount)}`}</SectionHeading>
        <Typography variant="body2" color="text.secondary">
          {copy.basis}
        </Typography>
        <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: "none" }}>
          {person.roles.map((r, i) => (
            <Typography component="li" key={`${r.organisationName}-${r.role}-${i}`}>
              {r.entityKey ? (
                <Link href={entityHref(r.entityKey, r.entityRole ?? "SUPPLIER")} onClick={followLink(entityHref(r.entityKey, r.entityRole ?? "SUPPLIER"), onNavigate)}>
                  <strong>{r.organisationName}</strong>
                </Link>
              ) : (
                <strong>{r.organisationName}</strong>
              )}{" "}
              <Typography component="span" color="text.secondary">
                {r.role}
                {r.entityKey ? "" : ` · ${copy.noPage}`}
              </Typography>
            </Typography>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {person.provenance.url ? (
            <Link href={person.provenance.url} target="_blank">
              {copy.source(snapshot)}
            </Link>
          ) : (
            copy.source(snapshot)
          )}
        </Typography>
      </Stack>
    </Stack>
  );
}
