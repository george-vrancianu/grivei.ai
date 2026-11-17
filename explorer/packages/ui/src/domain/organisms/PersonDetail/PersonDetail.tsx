import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Card } from "../../../atoms/Card/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { type as typeScale } from "../../../theme/tokens.ts";
import { Tag } from "../../atoms/Tag/index.ts";
import { InsetFigure } from "../../molecules/InsetFigure/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import { SourceCaption } from "../../molecules/SourceCaption/index.ts";
import type { PersonPageData } from "../../types.ts";
import { busyProps } from "../../utils/busy.ts";
import { followLink } from "../../utils/followLink.ts";
import { formatDate } from "../../utils/formatDate.ts";
import { listRowSx, listSx } from "../../utils/listSx.ts";
import { PersonBreadcrumb, type PersonBreadcrumbCopy } from "./components/PersonBreadcrumb/index.ts";
import { PersonFrame, type PrivateViewCopy } from "./components/PersonFrame/index.ts";

export interface PersonFiguresCopy {
  /** The figure labels: the birth year, the number of roles, and where the person comes from. */
  born: string;
  roles: string;
  source: string;
  /** The Source figure's value: the register's name ("ONRC"). */
  sourceName: string;
  /** The Source figure's note, given the formatted date: "snapshot of 6 May 2026". */
  snapshot: (date: string) => string;
}

export interface PersonDetailCopy {
  /** The notice at the top: this page exists only in a Private view (Restricted, ADR 0015). */
  privateView: PrivateViewCopy;
  breadcrumb: PersonBreadcrumbCopy;
  figures: PersonFiguresCopy;
  rolesHeading: string;
  /** "3 roles", given the count (the person's roles across organisations; Restricted like the list). */
  roleCount: (count: number) => string;
  /** The line under an organisation that has a page: "CUI 3100020 · supplier", given its key and the role page it opens on. */
  keyLine: (key: string, role: "AUTHORITY" | "SUPPLIER") => string;
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
  /** The explorer's home, for the breadcrumb's "explore" link. The caller owns routing (language prefix). */
  homeHref: string;
  /** An organisation's entity page, by key and the role page to open it on (the app owns routing and the language prefix). */
  entityHref: (key: string, role: "AUTHORITY" | "SUPPLIER") => string;
  onNavigate?: ((href: string) => void) | undefined;
  /** The last answer is on screen while the next loads: the name, the figures and the roles are dimmed with `aria-busy`; the Roles header strip stays at full strength. */
  busy?: boolean | undefined;
  /** The Roles panel's header strip, right end, while `busy`: the page's `LoadingStatus`. Replaces the count meanwhile. */
  status?: ReactNode;
  locale: Locale;
  copy: PersonDetailCopy;
}

/**
 * A person page (Restricted, ADR 0015), 960 px wide: the Private view notice, a panel with the breadcrumb, the name as ONRC wrote it and three figures (Born: the birth year only, never the full date
 * or the birthplace; Roles: the count; Source: ONRC with its snapshot date), then the Roles panel: a row per organisation (a link when it has a page, with its key and the page's role, else plain with
 * "no organisation page") and the role held as a tag; under the rows, the basis sentence and the source line. It exists only where the host shows Restricted content, and says so.
 */
export function PersonDetail({ person, homeHref, entityHref, onNavigate, busy, status, locale, copy }: PersonDetailProps) {
  const snapshot = formatDate(person.snapshot, locale, "long");
  return (
    <PersonFrame privateView={copy.privateView}>
      <Card component="header" sx={{ p: 0, minWidth: 0 }}>
        <Stack spacing={1.75} sx={{ px: 2.5, pt: 2.5, pb: 2.25, minWidth: 0 }}>
          <PersonBreadcrumb homeHref={homeHref} onNavigate={onNavigate} copy={copy.breadcrumb} />
          <Stack spacing={1.75} {...busyProps(busy)}>
            {/* the name is source data, shown as ONRC wrote it */}
            <Typography variant="h1" component="h1" sx={{ fontSize: typeScale.entityTitle.size, overflowWrap: "anywhere" }}>
              {person.name}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              <InsetFigure label={copy.figures.born}>{person.birthYear}</InsetFigure>
              <InsetFigure label={copy.figures.roles}>{person.roleCount}</InsetFigure>
              <InsetFigure label={copy.figures.source} note={copy.figures.snapshot(snapshot)}>
                {copy.figures.sourceName}
              </InsetFigure>
            </Box>
          </Stack>
        </Stack>
      </Card>
      <Panel heading={copy.rolesHeading} level="h2" flush busy={busy} aside={status ?? copy.roleCount(person.roleCount)}>
        <Box component="ul" sx={listSx}>
          {person.roles.map((r, i) => {
            const href = r.entityKey ? entityHref(r.entityKey, r.entityRole ?? "SUPPLIER") : null;
            return (
              <Box component="li" key={`${r.organisationName}-${r.role}-${i}`} sx={{ ...listRowSx, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                  {href !== null ? (
                    <Link href={href} onClick={followLink(href, onNavigate)}>
                      <strong>{r.organisationName}</strong>
                    </Link>
                  ) : (
                    <strong>{r.organisationName}</strong>
                  )}
                  <Typography variant="meta" component="span">
                    {r.entityKey ? copy.keyLine(r.entityKey, r.entityRole ?? "SUPPLIER") : copy.noPage}
                  </Typography>
                </Stack>
                <Typography variant="body2" component="span" sx={{ flex: "none", maxWidth: "50%", display: "flex" }}>
                  <Tag>{r.role}</Tag>
                </Typography>
              </Box>
            );
          })}
        </Box>
        <Stack spacing={1.5} sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
          <Typography variant="body2" color="text.secondary">
            {copy.basis}
          </Typography>
          <SourceCaption label={copy.source(snapshot)} url={person.provenance.url} />
        </Stack>
      </Panel>
    </PersonFrame>
  );
}
