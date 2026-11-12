import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type {
  CounterpartyRecordsData, EntityRef, EntityRole, RecordResult, RelationshipsCounterparties, RelationshipsTimeline,
} from "../../types.ts";
import { CounterpartyGraph } from "./components/CounterpartyGraph/index.ts";
import { CounterpartyPanel } from "./components/CounterpartyPanel/index.ts";
import { GraphLegend } from "./components/GraphLegend/index.ts";
import { MonthlyTimeline } from "./components/MonthlyTimeline/index.ts";
import type { RelationshipsTabCopy } from "./relationshipsTab.types.ts";

export type { RelationshipsTabCopy, CounterpartyGraphCopy, GraphLegendCopy, MonthlyTimelineCopy, CounterpartyPanelCopy, NodeNameParts } from "./relationshipsTab.types.ts";

export interface RelationshipsTabProps {
  /** The entity whose page this is: the centre of the graph. */
  entity: EntityRef;
  /** The page's role. A counterparty gets the other one (an authority's counterparties are suppliers and the reverse). */
  role: EntityRole;
  /** `entity.seap.role.counterparties` of `EntityRelationships`: the top rows, their `count` and `topShare`. */
  counterparties: RelationshipsCounterparties;
  /** The entity's months in the filter (`timeline` queried without a counterparty). */
  timeline: RelationshipsTimeline;
  /**
   * The picked counterparty's months (`timeline(counterparty:)`), drawn over `timeline` on the same scale so the highlight reads as its share
   * of each month. Null when nothing is picked or while it loads: the overall bars show alone.
   */
  selectedTimeline?: RelationshipsTimeline | null;
  /** The picked counterparty's Entity key, or null. The tab holds no selection: the caller keeps it (the URL) and `onSelect` asks to change it. */
  selected: string | null;
  onSelect: (key: string | null) => void;
  /**
   * Records with the picked counterparty (`EntityRecords` with it in the filter); null while they have not arrived or when nothing is picked.
   * A counterparty beyond the graph's rows is named from these Records (their `authority`, or a winner's Entity).
   */
  sidePanel: CounterpartyRecordsData | null;
  sidePanelLoading?: boolean;
  /** Paging of the side panel's Records, when they span several pages. */
  sidePanelPaging?: { page: number; pageSize: number; pageHref: (page: number) => string };
  onNavigate?: ((href: string) => void) | undefined;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  /** A slot in the toolbar for the Flow lens toggle (#52's map is the caller's to place). */
  flowToggle?: ReactNode;
  locale: Locale;
  copy: RelationshipsTabCopy;
}

/** The Entity with this key among the Records' authorities and winners: every Record with a counterparty carries it. */
const entityInRecords = (sidePanel: CounterpartyRecordsData | null, key: string): EntityRef | null => {
  for (const { record } of sidePanel?.records.rows ?? []) {
    if (record.authority.key === key) return record.authority;
    const winner = record.winners.find((party) => party.entity?.key === key);
    if (winner?.entity) return winner.entity;
  }
  return null;
};

const otherRole = (role: EntityRole): EntityRole => (role === "authority" ? "supplier" : "authority");

/**
 * The Relationships tab of an Entity page: a radial graph of the top counterparties (size = money, colour = contracts or direct purchases,
 * dashed = won together, ring = has Signals), the monthly timeline, and a side panel with every Record with the picked counterparty.
 */
export function RelationshipsTab({
  entity, role, counterparties, timeline, selectedTimeline = null, selected, onSelect, sidePanel, sidePanelLoading = false, sidePanelPaging,
  onNavigate, entityHref, recordHref, flowToggle, locale, copy,
}: RelationshipsTabProps) {
  const rows = counterparties.rows;
  const pickedRow = selected === null ? null : (rows.find((row) => row.entity?.key === selected && !row.naturalPerson) ?? null);
  // A key beyond the shown rows (the top 30) is named by the panel's own Records. Until they arrive it has no name (none is invented), and
  // the panel shows its loading state.
  const picked: EntityRef | null = selected === null ? null : (pickedRow?.entity ?? entityInRecords(sidePanel, selected));
  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" component="h2">{copy.heading}</Typography>
        {flowToggle && <Box data-slot="flow-toggle">{flowToggle}</Box>}
      </Box>
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) minmax(280px, 380px)" }, alignItems: "start" }}>
        <Stack spacing={2}>
          <CounterpartyGraph entity={entity} counterparties={counterparties} selected={selected} onSelect={onSelect} locale={locale} copy={copy} />
          {rows.length > 0 && (
            <>
              <GraphLegend copy={copy.legend} hasWonTogether={rows.some((row) => row.wonTogether)} hasSignals={rows.some((row) => row.hasSignals)} />
              {rows.some((row) => row.wonTogether) && <Typography variant="caption" color="text.secondary">{copy.graph.consortiumNote}</Typography>}
            </>
          )}
          <MonthlyTimeline
            timeline={timeline}
            pickedTimeline={selected !== null ? selectedTimeline : null}
            pickedName={picked?.displayName ?? null}
            locale={locale}
            copy={copy.timeline}
          />
        </Stack>
        <CounterpartyPanel
          picked={selected !== null}
          counterparty={picked}
          records={sidePanel}
          loading={sidePanelLoading}
          counterpartyRole={otherRole(role)}
          onClose={() => onSelect(null)}
          paging={sidePanelPaging}
          onNavigate={onNavigate}
          entityHref={entityHref}
          recordHref={recordHref}
          locale={locale}
          copy={copy}
        />
      </Box>
    </Stack>
  );
}
