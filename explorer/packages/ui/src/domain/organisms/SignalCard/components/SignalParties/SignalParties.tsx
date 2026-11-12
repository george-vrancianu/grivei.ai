import { Box } from "../../../../../atoms/Box/index.ts";
import type { EntityRef, EntityRole } from "../../../../types.ts";
import { EntityLink, type EntityLinkCopy } from "../../../../atoms/EntityLink/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { shownSuppliers } from "../../signalCard.utils.ts";

export interface SignalPartiesCopy {
  authority: string;
  suppliers: string;
  /** "and 7 more", given the count and its formatted number. */
  moreSuppliers: (n: number, formatted: string) => string;
  entityLink: EntityLinkCopy;
}

export interface SignalPartiesProps {
  authority: EntityRef;
  suppliers: readonly EntityRef[];
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: SignalPartiesCopy;
}

/** The authority and the suppliers a Signal names (natural persons are already left out by the API), with the first few suppliers and a count of the rest. */
export function SignalParties({ authority, suppliers, entityHref, locale, copy }: SignalPartiesProps) {
  const { shown, more } = shownSuppliers(suppliers);
  return (
    <Box component="dl" sx={{ display: "grid", gridTemplateColumns: "max-content 1fr", columnGap: 2, rowGap: 0.5, m: 0, "& dd": { m: 0 } }}>
      <dt>{copy.authority}</dt>
      <dd>
        <EntityLink entity={authority} href={entityHref(authority, "authority")} copy={copy.entityLink} />
      </dd>
      {suppliers.length > 0 && (
        <>
          <dt>{copy.suppliers}</dt>
          <dd>
            {shown.map((supplier, i) => (
              <span key={supplier.key}>
                {i > 0 && "; "}
                <EntityLink entity={supplier} href={entityHref(supplier, "supplier")} copy={copy.entityLink} />
              </span>
            ))}
            {more > 0 && <span> {copy.moreSuppliers(more, formatCount(more, false, locale))}</span>}
          </dd>
        </>
      )}
    </Box>
  );
}
