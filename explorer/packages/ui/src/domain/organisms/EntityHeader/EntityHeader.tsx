import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type { EntityHeaderData, EntityPageRole } from "../../types.ts";
import { AnafStatusBadge, type AnafStatusBadgeCopy } from "./components/AnafStatusBadge/index.ts";
import { IdentityMarkers, type IdentityMarkersCopy } from "./components/IdentityMarkers/index.ts";
import { PlacementLine, type PlacementLineCopy } from "./components/PlacementLine/index.ts";
import { RoleSwitch, type RoleSwitchCopy } from "./components/RoleSwitch/index.ts";
import { SourceLine, type SourceLineCopy } from "./components/SourceLine/index.ts";
import { hasBothRoles } from "./entityHeader.utils.ts";

export interface EntityHeaderCopy {
  identity: IdentityMarkersCopy;
  anafStatus: AnafStatusBadgeCopy;
  placement: PlacementLineCopy;
  source: SourceLineCopy;
  roles: RoleSwitchCopy;
}

export interface EntityHeaderProps {
  /** `EntityHeaderFields` of the entity query. */
  entity: EntityHeaderData;
  /** The role the page shows (the URL's /authority/ or /supplier/). */
  role: EntityPageRole;
  /** The entity's page in a role, for the role switch. The caller owns routing (language prefix, view, query). */
  roleHref: (role: EntityPageRole) => string;
  /** Called with the href on a plain click on a link, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  locale: Locale;
  copy: EntityHeaderCopy;
}

/**
 * The top of an Entity page: the display name as the page heading, how the entity is identified (CUI, foreign VAT id,
 * "identified by name only", curated), a badge for an ANAF status that is not active, its placement, where the name came from,
 * and, only when the entity both buys and sells, a switch between its two role pages.
 */
export function EntityHeader({ entity, role, roleHref, onNavigate, locale, copy }: EntityHeaderProps) {
  return (
    <Stack component="header" spacing={1.5}>
      <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <Typography variant="h4" component="h1">
          {entity.displayName}
        </Typography>
        <AnafStatusBadge status={entity.anafStatus} copy={copy.anafStatus} />
      </Stack>
      <IdentityMarkers entity={entity} copy={copy.identity} />
      <PlacementLine entity={entity} copy={copy.placement} />
      <SourceLine entity={entity} locale={locale} copy={copy.source} />
      {hasBothRoles(entity) && <RoleSwitch role={role} hrefFor={roleHref} onNavigate={onNavigate} copy={copy.roles} />}
    </Stack>
  );
}
