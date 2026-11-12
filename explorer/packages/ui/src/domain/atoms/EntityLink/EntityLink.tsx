import { Chip } from "../../../atoms/Chip/index.ts";
import { Link } from "../../../atoms/Link/index.ts";
import { Tooltip } from "../../../atoms/Tooltip/index.ts";
import type { EntityRef } from "../../types.ts";

export interface MarkerText {
  label: string;
  explanation: string;
}

export interface EntityLinkCopy {
  /** Marker for an Entity identified by name only (no CUI): its figures may merge or split namesakes. */
  nameOnly: MarkerText;
  /** Marker for an Entity whose identity a person curated. */
  identityCurated: MarkerText;
}

export interface EntityLinkProps {
  entity: EntityRef;
  /** The entity page's URL. The caller owns routing (role, language prefix); this component has no router. */
  href: string;
  copy: EntityLinkCopy;
  /** `Entity.identityCurated`; only the entity page's header selects it. */
  identityCurated?: boolean;
}

function Marker({ label, explanation }: MarkerText) {
  return (
    <Tooltip title={explanation} describeChild>
      <Chip size="small" variant="outlined" label={label} tabIndex={0} sx={{ ml: 0.5 }} />
    </Tooltip>
  );
}

/** An Entity's display name linking to its page, with markers for name-only identity and curated identity. */
export function EntityLink({ entity, href, copy, identityCurated = false }: EntityLinkProps) {
  return (
    <span>
      <Link href={href}>{entity.displayName}</Link>
      {entity.identity === "NAME_ONLY" && <Marker {...copy.nameOnly} />}
      {identityCurated && <Marker {...copy.identityCurated} />}
    </span>
  );
}
