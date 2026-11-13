import { Box } from "../../../../../atoms/Box/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { color, font, radius, type } from "../../../../../theme/tokens.ts";
import type { EntityPageRole } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { ROLES } from "../../entityHeader.utils.ts";

export interface RoleSwitchCopy {
  /** The accessible name of the role chips' navigation. */
  label: string;
  /** "buys · contracting authority" */
  authority: string;
  /** "sells · supplier" */
  supplier: string;
  /** The muted chip of a role the entity has no Records in: "sells · no Records as supplier". */
  none: Record<EntityPageRole, string>;
}

export interface RoleSwitchProps {
  /** The role the page shows now: its chip is filled. */
  role: EntityPageRole;
  /** The roles the entity has Records in (`entity.seap.roles`). The other role's chip links to its page when the entity has it, and is muted when it has not. */
  roles: readonly EntityPageRole[];
  /** The page of this entity in a role. The caller owns routing. */
  hrefFor: (role: EntityPageRole) => string;
  onNavigate?: (href: string) => void;
  copy: RoleSwitchCopy;
}

const chipSx = {
  display: "inline-flex",
  alignItems: "center",
  px: "10px",
  py: "3px",
  borderRadius: `${radius.chip}px`,
  border: `1px solid transparent`,
  fontFamily: font.mono,
  fontSize: type.meta.size,
  lineHeight: type.meta.lineHeight,
} as const;

const activeSx = { ...chipSx, backgroundColor: color.accent, borderColor: color.accent, color: color.onAccent, fontWeight: 600 } as const;
const linkSx = { ...chipSx, borderColor: color.line, color: color.text2 } as const;
const mutedSx = { ...chipSx, borderColor: color.line, color: color.muted } as const;

/**
 * The two role chips: the page's role filled in the accent, the other role a link to its page when the entity has Records in it
 * and a muted chip saying it has none when it has not. The links are in a navigation only when there is a second page to go to.
 */
export function RoleSwitch({ role, roles, hrefFor, onNavigate, copy }: RoleSwitchProps) {
  const names: Record<EntityPageRole, string> = { AUTHORITY: copy.authority, SUPPLIER: copy.supplier };
  const both = ROLES.every((r) => roles.includes(r));
  const chips = ROLES.map((r) => {
    if (r === role) {
      return both ? (
        <Link key={r} href={hrefFor(r)} aria-current="page" underline="none" sx={activeSx} onClick={followLink(hrefFor(r), onNavigate)}>
          {names[r]}
        </Link>
      ) : (
        <Box key={r} component="span" aria-current="page" sx={activeSx}>
          {names[r]}
        </Box>
      );
    }
    return roles.includes(r) ? (
      <Link key={r} href={hrefFor(r)} underline="none" sx={linkSx} onClick={followLink(hrefFor(r), onNavigate)}>
        {names[r]}
      </Link>
    ) : (
      <Box key={r} component="span" sx={mutedSx}>
        {copy.none[r]}
      </Box>
    );
  });
  const rowSx = { display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px" } as const;
  return both ? (
    <Box component="nav" aria-label={copy.label} sx={rowSx}>
      {chips}
    </Box>
  ) : (
    <Box sx={rowSx}>{chips}</Box>
  );
}
