import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { RecordResultRow, type RecordResultRowCopy, type RecordSignalBadges } from "../RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordResult } from "../../types.ts";
import { listSx } from "../../utils/listSx.ts";

export interface RecordResultListProps {
  rows: readonly RecordResult[];
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  locale: Locale;
  copy: RecordResultRowCopy;
  /** Each row's Signal badges; absent = none shown. */
  signalBadges?: RecordSignalBadges | undefined;
  onNavigate?: ((href: string) => void) | undefined;
  /** The list runs flush to a panel's edges (rows carry the 20 px side padding). */
  inset?: boolean | undefined;
}

/** The rows of the Records tab. */
export function RecordResultList({ rows, entityHref, recordHref, locale, copy, signalBadges, onNavigate, inset }: RecordResultListProps) {
  return (
    <Stack component="ul" sx={listSx}>
      {rows.map((row) => (
        <RecordResultRow key={row.record.code} row={row} recordHref={recordHref(row.record)} entityHref={entityHref} locale={locale} copy={copy} signalBadges={signalBadges} onNavigate={onNavigate} inset={inset} />
      ))}
    </Stack>
  );
}
