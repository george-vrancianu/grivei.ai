import { Stack } from "../../../atoms/Stack/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { RecordResultRow, type RecordResultRowCopy } from "../RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordResult } from "../../types.ts";
import { listSx } from "../../utils/listSx.ts";

export interface RecordResultListProps {
  rows: readonly RecordResult[];
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  locale: Locale;
  copy: RecordResultRowCopy;
}

/** The rows of the Records tab. */
export function RecordResultList({ rows, entityHref, recordHref, locale, copy }: RecordResultListProps) {
  return (
    <Stack component="ul" sx={listSx}>
      {rows.map((row) => (
        <RecordResultRow key={row.record.code} row={row} recordHref={recordHref(row.record)} entityHref={entityHref} locale={locale} copy={copy} />
      ))}
    </Stack>
  );
}
