import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { type as typeScale } from "../../../theme/tokens.ts";
import type { EntityHeaderData, EntityPageRole } from "../../types.ts";
import { AnafStatusBadge, type AnafStatusBadgeCopy } from "./components/AnafStatusBadge/index.ts";
import { IdentityMarkers, type IdentityMarkersCopy } from "./components/IdentityMarkers/index.ts";
import { PlacementLine, type PlacementLineCopy } from "./components/PlacementLine/index.ts";
import { SeapNamesLine, type SeapNamesLineCopy } from "./components/SeapNamesLine/index.ts";
import { RoleSwitch, type RoleSwitchCopy } from "./components/RoleSwitch/index.ts";
import { SourceLine, type SourceLineCopy } from "./components/SourceLine/index.ts";

export interface EntityHeaderCopy {
  identity: IdentityMarkersCopy;
  anafStatus: AnafStatusBadgeCopy;
  placement: PlacementLineCopy;
  source: SourceLineCopy;
  roles: RoleSwitchCopy;
  seapNames: SeapNamesLineCopy;
}

export interface EntityHeaderProps {
  /** `EntityHeaderFields` of the entity query. */
  entity: EntityHeaderData;
  /** The role the page shows (the URL's /authority/ or /supplier/). */
  role: EntityPageRole;
  /** The entity's page in a role, for the role chips. The caller owns routing (language prefix, view, query). */
  roleHref: (role: EntityPageRole) => string;
  /** Called with the href on a plain click on a link, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: EntityHeaderCopy;
}

/**
 * The top of an Entity page: the display name as the page heading, the two role chips (the page's role filled, the other linking when
 * the entity has Records in it, muted when it has not), how the entity is identified (CUI, foreign VAT id, "identified by name only",
 * curated), its placement and who placed it, a badge for an ANAF status that is not active, the names SEAP publishes it under, and where
 * the name came from.
 */
export function EntityHeader({ entity, role, roleHref, onNavigate, locale, copy }: EntityHeaderProps) {
  return (
    <Stack component="header" spacing={1.25}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <Typography variant="h1" component="h1" sx={{ fontSize: typeScale.entityTitle.size, overflowWrap: "anywhere" }}>
          {entity.displayName}
        </Typography>
        <AnafStatusBadge status={entity.anafStatus} copy={copy.anafStatus} />
      </Stack>
      <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", rowGap: 0.75, columnGap: 1.5 }}>
        <RoleSwitch role={role} roles={entity.seap.roles} hrefFor={roleHref} onNavigate={onNavigate} copy={copy.roles} />
        <IdentityMarkers entity={entity} copy={copy.identity} />
        <PlacementLine entity={entity} copy={copy.placement} />
      </Box>
      <SeapNamesLine aliases={entity.aliases} locale={locale} copy={copy.seapNames} />
      <SourceLine entity={entity} locale={locale} copy={copy.source} />
    </Stack>
  );
}
