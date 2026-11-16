import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { RecordResultList } from "../../../../molecules/RecordResultList/index.ts";
import type { RecordResultRowCopy } from "../../../../molecules/RecordResultRow/index.ts";
import type { EntityRef, EntityRole, RecordResult, RecordRow } from "../../../../types.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { countedRecords } from "../../entityOverview.utils.ts";

export interface LargestRecordsCopy {
  heading: string;
  /** The panel's foot; says what the list leaves out: suspect values and framework ceilings do not count, so they never rank here. */
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
  const rows = countedRecords(records).map((record) => ({ record, matchedField: null, areaShare: null }));
  return (
    <Panel heading={copy.heading} level="h2" flush={rows.length > 0} foot={rows.length > 0 ? copy.note : undefined}>
      {rows.length === 0 ? (
        <Typography color="text.secondary">{copy.empty}</Typography>
      ) : (
        <RecordResultList rows={rows} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.recordRow} inset />
      )}
    </Panel>
  );
}
