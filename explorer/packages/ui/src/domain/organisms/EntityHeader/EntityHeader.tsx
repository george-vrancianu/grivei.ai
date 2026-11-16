import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Card } from "../../../atoms/Card/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { type as typeScale } from "../../../theme/tokens.ts";
import { PanelFoot } from "../../molecules/Panel/index.ts";
import type { EntityHeaderData, EntityPageRole } from "../../types.ts";
import { AnafStatusBadge, type AnafStatusBadgeCopy } from "./components/AnafStatusBadge/index.ts";
import { IdentityMarkers, type IdentityMarkersCopy } from "./components/IdentityMarkers/index.ts";
import { PlacementLine, type PlacementLineCopy } from "./components/PlacementLine/index.ts";
import { SeapNamesLine, type SeapNamesLineCopy } from "./components/SeapNamesLine/index.ts";
import { Breadcrumb, type BreadcrumbCopy } from "./components/Breadcrumb/index.ts";
import { RoleSwitch, type RoleSwitchCopy } from "./components/RoleSwitch/index.ts";
import { SourceLine, type SourceLineCopy } from "./components/SourceLine/index.ts";

export interface EntityHeaderCopy {
  breadcrumb: BreadcrumbCopy;
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
  /** The explorer's home, for the breadcrumb's "explore" link. The caller owns routing (language prefix). */
  homeHref: string;
  /** The entity's page in a role, for the role chips. The caller owns routing (language prefix, view, query). */
  roleHref: (role: EntityPageRole) => string;
  /** Called with the href on a plain click on a link, so the app can change page without a load. */
  onNavigate?: (href: string) => void;
  /** The foot strip's left: the page's tabs (an `EntityTabNav`). */
  tabs?: ReactNode;
  /** The foot strip's right end: the page's address (a `CiteLine`). It wraps under the tabs below `md`. */
  address?: ReactNode;
  locale: Locale;
  copy: EntityHeaderCopy;
}

/**
 * The top of an Entity page, one panel with no header strip. The body holds the breadcrumb ("explore / contracting authority"), the display name as the page heading,
 * the two role chips (the page's role filled, the other linking when the entity has Records in it, muted when it has not), the identity facts as a wrapping row of
 * label-over-value pairs (CUI or foreign VAT id, Location and who placed it, ANAF status, the names SEAP publishes it under; with the identity markers and their explanations),
 * and where the name came from. The foot strip, drawn when `tabs` or `address` is given, holds the tabs and, at its right end, the address.
 */
export function EntityHeader({ entity, role, homeHref, roleHref, onNavigate, tabs, address, locale, copy }: EntityHeaderProps) {
  return (
    <Card component="header" sx={{ p: 0, display: "flex", flexDirection: "column", minWidth: 0 }}>
      <Stack data-panel-part="body" spacing={1.75} sx={{ px: 2.5, pt: 2.5, pb: 2.25, minWidth: 0 }}>
        <Breadcrumb role={role} homeHref={homeHref} onNavigate={onNavigate} copy={copy.breadcrumb} />
        <Typography variant="h1" component="h1" sx={{ fontSize: typeScale.entityTitle.size, overflowWrap: "anywhere" }}>
          {entity.displayName}
        </Typography>
        <RoleSwitch role={role} roles={entity.seap.roles} hrefFor={roleHref} onNavigate={onNavigate} copy={copy.roles} />
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", rowGap: 1.5, columnGap: 3 }}>
          <IdentityMarkers entity={entity} copy={copy.identity} />
          <PlacementLine entity={entity} copy={copy.placement} />
          <AnafStatusBadge status={entity.anafStatus} copy={copy.anafStatus} />
          <SeapNamesLine aliases={entity.aliases} locale={locale} copy={copy.seapNames} />
        </Box>
        <SourceLine entity={entity} locale={locale} copy={copy.source} />
      </Stack>
      {(tabs != null || address != null) && (
        <PanelFoot>
          {tabs}
          {address != null && <Box sx={{ minWidth: 0, flexBasis: { xs: "100%", md: "auto" }, ml: { md: "auto" } }}>{address}</Box>}
        </PanelFoot>
      )}
    </Card>
  );
}
