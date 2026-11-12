import { Link } from "../../../../../atoms/Link/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { EntityPageRole } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { ROLES } from "../../entityHeader.utils.ts";

export interface RoleSwitchCopy {
  /** The accessible name of the switch's navigation. */
  label: string;
  authority: string;
  supplier: string;
}

export interface RoleSwitchProps {
  /** The role the page shows now; its link is marked `aria-current="page"`. */
  role: EntityPageRole;
  /** The page of this entity in a role. The caller owns routing. */
  hrefFor: (role: EntityPageRole) => string;
  onNavigate?: (href: string) => void;
  copy: RoleSwitchCopy;
}

/** Two links, one per role, for an entity that both buys and sells. The caller decides when to show it. */
export function RoleSwitch({ role, hrefFor, onNavigate, copy }: RoleSwitchProps) {
  const names: Record<EntityPageRole, string> = {
    AUTHORITY: copy.authority,
    SUPPLIER: copy.supplier,
  };
  return (
    <Stack component="nav" aria-label={copy.label} direction="row" spacing={2} sx={{ alignItems: "center" }}>
      <Typography variant="body2" component="span" color="text.secondary" aria-hidden>
        {copy.label}
      </Typography>
      {ROLES.map((r) => {
        const href = hrefFor(r);
        const current = r === role;
        return (
          <Link
            key={r}
            href={href}
            aria-current={current ? "page" : undefined}
            underline={current ? "none" : "always"}
            sx={{ fontWeight: current ? 700 : 400 }}
            onClick={followLink(href, onNavigate)}
          >
            {names[r]}
          </Link>
        );
      })}
    </Stack>
  );
}
