import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { EntityResultRow, type EntityResultRowCopy } from "../EntityResultRow/index.ts";
import type { EntityRef, EntityResult, EntityRole } from "../../types.ts";
import { ColumnHead } from "../ColumnHead/index.ts";
import { listSx } from "../../utils/listSx.ts";

export interface EntityResultListProps {
  rows: readonly EntityResult[];
  /** The role every row's entity page opens in: Authorities tab rows are authorities, Suppliers tab rows suppliers. */
  role: EntityRole;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  locale: Locale;
  copy: EntityResultRowCopy;
  onNavigate?: ((href: string) => void) | undefined;
  /** The list runs flush to a panel's edges (head and rows carry the 20 px side padding, so their fills span the panel). */
  inset?: boolean | undefined;
}

/** The Authorities or Suppliers tab: the column head (from 600 px up, outside the list so the `ul` holds only rows), then the rows. */
export function EntityResultList({ rows, role, entityHref, locale, copy, onNavigate, inset }: EntityResultListProps) {
  return (
    <>
      <ColumnHead role={role} copy={copy.head} inset={inset} />
      <Stack component="ul" sx={listSx}>
        {rows.map((row) => (
          <EntityResultRow key={row.entity.key} row={row} href={entityHref(row.entity, role)} locale={locale} copy={copy} onNavigate={onNavigate} inset={inset} />
        ))}
      </Stack>
    </>
  );
}
