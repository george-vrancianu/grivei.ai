import { Stack } from "../../../../../atoms/Stack/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { EntityResultRow, type EntityResultRowCopy } from "../../../../molecules/EntityResultRow/index.ts";
import type { EntityRef, EntityResult, EntityRole } from "../../../../types.ts";
import { listSx } from "../../resultTabs.utils.ts";

export interface EntityResultListProps {
  rows: readonly EntityResult[];
  /** The role every row's entity page opens in: Authorities tab rows are authorities, Suppliers tab rows suppliers. */
  role: EntityRole;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: EntityResultRowCopy;
}

/** The rows of the Authorities or Suppliers tab. */
export function EntityResultList({ rows, role, entityHref, locale, copy }: EntityResultListProps) {
  return (
    <Stack component="ul" sx={listSx}>
      {rows.map((row) => (
        <EntityResultRow key={row.entity.key} row={row} href={entityHref(row.entity, role)} locale={locale} copy={copy} />
      ))}
    </Stack>
  );
}
