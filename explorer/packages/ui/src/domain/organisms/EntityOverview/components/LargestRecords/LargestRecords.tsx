import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { RecordResultList } from "../../../../molecules/RecordResultList/index.ts";
import type { RecordResultRowCopy } from "../../../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordResult, RecordRow } from "../../../../types.ts";
import { SectionHeading } from "../../../../atoms/SectionHeading/index.ts";
import { countedRecords } from "../../entityOverview.utils.ts";

export interface LargestRecordsCopy {
  heading: string;
  /** Says what the list leaves out: suspect values and framework ceilings do not count, so they never rank here. */
  note: string;
  empty: string;
  recordRow: RecordResultRowCopy;
}

export interface LargestRecordsProps {
  records: readonly RecordRow[];
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  locale: Locale;
  copy: LargestRecordsCopy;
}

/** The largest counted Records. Only counted Records are listed, whatever the API sends: a Record with no counted value (suspect, framework ceiling) is filtered out. */
export function LargestRecords({ records, entityHref, recordHref, locale, copy }: LargestRecordsProps) {
  const rows = countedRecords(records).map((record) => ({ record, matchedField: null }));
  return (
    <Stack component="section" spacing={1} aria-label={copy.heading}>
      <SectionHeading>{copy.heading}</SectionHeading>
      {rows.length === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary">
            {copy.note}
          </Typography>
          <RecordResultList rows={rows} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.recordRow} />
        </>
      )}
    </Stack>
  );
}
