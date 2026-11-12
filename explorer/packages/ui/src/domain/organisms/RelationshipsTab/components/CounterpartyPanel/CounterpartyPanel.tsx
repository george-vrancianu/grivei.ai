import { Box } from "../../../../../atoms/Box/index.ts";
import { CircularProgress } from "../../../../../atoms/CircularProgress/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Stack } from "../../../../../atoms/Stack/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { EntityLink } from "../../../../atoms/EntityLink/index.ts";
import { formatMoney } from "../../../../atoms/MoneyAmount/index.ts";
import { PageNav } from "../../../../molecules/PageNav/index.ts";
import { RecordResultList } from "../../../../molecules/RecordResultList/index.ts";
import type { CounterpartyRecordsData, EntityRef, EntityRole, RecordResult } from "../../../../types.ts";
import type { RelationshipsTabCopy } from "../../relationshipsTab.types.ts";

export interface CounterpartyPanelProps {
  /** Whether a counterparty is picked; false shows the hint. */
  picked: boolean;
  /** The picked counterparty, or null while its name is not known yet (it is beyond the graph's rows and its Records have not arrived). */
  counterparty: EntityRef | null;
  /** Records with it (`EntityRecords` with the counterparty in the filter); null while they have not arrived. */
  records: CounterpartyRecordsData | null;
  loading: boolean;
  /** The counterparty's role: the other of the page's. */
  counterpartyRole: EntityRole;
  onClose: () => void;
  /** Paging, only when the Records span several pages. */
  paging?: { page: number; pageSize: number; pageHref: (page: number) => string } | undefined;
  onNavigate?: ((href: string) => void) | undefined;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  locale: Locale;
  copy: Pick<RelationshipsTabCopy, "panel" | "recordCount" | "entityLink" | "recordRow" | "pagination">;
}

/** The side panel: every Record with the picked counterparty, or a hint while nothing is picked. */
export function CounterpartyPanel({
  picked, counterparty, records, loading, counterpartyRole, onClose, paging, onNavigate, entityHref, recordHref, locale, copy,
}: CounterpartyPanelProps) {
  const { panel } = copy;
  if (!picked) {
    return (
      <Box component="aside" aria-label={panel.label}>
        <Typography color="text.secondary">{panel.hint}</Typography>
      </Box>
    );
  }
  const pages = records && paging ? Math.ceil(records.records.count / Math.max(1, paging.pageSize)) : 1;
  return (
    <Box component="aside" aria-label={panel.label} aria-busy={loading}>
      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 1 }}>
          <Typography variant="h6" component="h3">
            {panel.heading}{counterparty && <> <EntityLink entity={counterparty} href={entityHref(counterparty, counterpartyRole)} copy={copy.entityLink} /></>}
          </Typography>
          <Button size="small" onClick={onClose}>{panel.close}</Button>
        </Box>
        {records && (
          <Typography variant="body2" color="text.secondary">
            {panel.total(formatMoney(records.total.awarded, locale), copy.recordCount(records.total.records, formatCount(records.total.records, records.total.estimated, locale)))}
          </Typography>
        )}
        {loading && !records && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }} role="status">
            <CircularProgress size={16} />
            <Typography variant="body2">{panel.loading}</Typography>
          </Box>
        )}
        {records && records.records.count === 0 && <Typography color="text.secondary">{panel.empty}</Typography>}
        {records && records.records.rows.length > 0 && (
          <RecordResultList rows={records.records.rows} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.recordRow} />
        )}
        {paging && pages > 1 && (
          <PageNav page={paging.page} pages={pages} pageHref={paging.pageHref} onNavigate={onNavigate} locale={locale} copy={copy.pagination} />
        )}
      </Stack>
    </Box>
  );
}
