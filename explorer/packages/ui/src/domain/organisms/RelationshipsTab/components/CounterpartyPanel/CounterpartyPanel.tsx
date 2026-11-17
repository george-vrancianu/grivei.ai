import type { ReactNode } from "react";
import { Box } from "../../../../../atoms/Box/index.ts";
import { Button } from "../../../../../atoms/Button/index.ts";
import { Link } from "../../../../../atoms/Link/index.ts";
import { Typography } from "../../../../../atoms/Typography/index.ts";
import type { Locale } from "../../../../../theme/index.ts";
import { formatCount } from "../../../../atoms/ApproxCount/index.ts";
import { EntityLink } from "../../../../atoms/EntityLink/index.ts";
import { MoneyAmount } from "../../../../atoms/MoneyAmount/index.ts";
import { InsetFigure } from "../../../../molecules/InsetFigure/index.ts";
import { PageNav } from "../../../../molecules/PageNav/index.ts";
import { Panel } from "../../../../molecules/Panel/index.ts";
import { RecordResultList } from "../../../../molecules/RecordResultList/index.ts";
import { SignalLinkChip } from "../../../../molecules/SignalLinkChip/index.ts";
import type { CounterpartyRecordsData, EntityRef, EntityRole, RecordResult } from "../../../../types.ts";
import { followLink } from "../../../../utils/followLink.ts";
import { skeletonBlock } from "../../../../utils/skeletonBlock.tsx";
import type { RelationshipsTabCopy } from "../../relationshipsTab.types.ts";

export interface CounterpartyPanelProps {
  /** Whether a counterparty is picked; false shows the hint. */
  picked: boolean;
  /** The picked counterparty, or null while its name is not known yet (it is beyond the graph's rows and its Records have not arrived). */
  counterparty: EntityRef | null;
  /** Records with it (`EntityRecords` with the counterparty in the filter); null while they have not arrived. */
  records: CounterpartyRecordsData | null;
  /**
   * A request for the picked counterparty is in flight. With `records` held (the last counterparty's, or this one's other page) the body stays, dimmed with `aria-busy="true"`;
   * with none the body shows placeholder blocks where the figures and rows will be.
   */
  loading: boolean;
  /** The header's right slot, before the close button: the page's `LoadingStatus` while a request is in flight. */
  status?: ReactNode;
  /** A failed request: the note with its retry takes the place of the figures and rows; the header and the name stay. */
  failure?: ReactNode;
  /** The counterparty's row in the graph says it carries Signals / won together with the entity. Both false when it is beyond the graph's rows (unknown). */
  hasSignals?: boolean;
  wonTogether?: boolean;
  /** The Records tab with only the Records with this counterparty (every one of them), and with only the ones carrying Signals. Null: no link. */
  allRecordsHref: string | null;
  signalsHref: string | null;
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

/**
 * The picked-counterparty panel: "Picked counterparty" with the close button in the header strip; the body starts with the name as a link, then the Awarded and Records inset figures,
 * the Signals chip and the "won together" sentence, then the Records as flush rows; the foot reads "n of m shown", links to all of them and carries the paging.
 * Nothing picked: the same header and a hint.
 */
export function CounterpartyPanel({
  picked, counterparty, records, loading, status, failure, hasSignals = false, wonTogether = false, allRecordsHref, signalsHref, counterpartyRole, onClose, paging, onNavigate, entityHref, recordHref, locale, copy,
}: CounterpartyPanelProps) {
  const { panel } = copy;
  if (!picked) {
    return (
      <Panel heading={panel.eyebrow} label={panel.label}>
        <Typography variant="body2" color="text.secondary">{panel.hint}</Typography>
      </Panel>
    );
  }
  const count = records?.records.count ?? 0;
  const rows = records?.records.rows ?? [];
  const pages = records && paging ? Math.ceil(count / Math.max(1, paging.pageSize)) : 1;
  const shownFoot = records && !failure && count > 0;
  const foot = shownFoot ? (
    <>
      <span>{panel.shown(formatCount(rows.length, false, locale), formatCount(count, records.total.estimated, locale))}</span>
      {allRecordsHref !== null && counterparty && count > 1 && (
        <Link href={allRecordsHref} onClick={followLink(allRecordsHref, onNavigate)}>
          {panel.all(copy.recordCount(count, formatCount(count, records.total.estimated, locale)), counterparty.displayName)}
        </Link>
      )}
      {paging && pages > 1 && <PageNav page={paging.page} pages={pages} pageHref={paging.pageHref} onNavigate={onNavigate} locale={locale} copy={copy.pagination} />}
    </>
  ) : undefined;
  return (
    <Panel
      heading={panel.eyebrow}
      label={panel.label}
      flush
      busy={loading && records !== null && !failure}
      foot={foot}
      aside={
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
          {status}
          <Button size="small" onClick={onClose}>{panel.close}</Button>
        </Box>
      }
    >
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 0 }}>
        {counterparty && (
          <Typography variant="h4" component="h4">
            <EntityLink entity={counterparty} href={entityHref(counterparty, counterpartyRole)} copy={copy.entityLink} />
          </Typography>
        )}
        {failure ?? (
          <>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              <InsetFigure label={panel.awarded}>{records ? <MoneyAmount bani={records.total.awarded} locale={locale} /> : skeletonBlock(96, 18)}</InsetFigure>
              <InsetFigure label={panel.records}>{records ? formatCount(records.total.records, records.total.estimated, locale) : skeletonBlock(48, 18)}</InsetFigure>
            </Box>
            {hasSignals && signalsHref !== null && (
              <Box>
                <SignalLinkChip href={signalsHref} label={panel.signals} onClick={followLink(signalsHref, onNavigate)} />
              </Box>
            )}
            {wonTogether && <Typography variant="body2" color="text.secondary">{panel.wonTogether}</Typography>}
            {records && count === 0 && <Typography color="text.secondary">{panel.empty}</Typography>}
          </>
        )}
      </Box>
      {!failure && rows.length > 0 && <RecordResultList rows={rows} entityHref={entityHref} recordHref={recordHref} locale={locale} copy={copy.recordRow} inset />}
    </Panel>
  );
}
