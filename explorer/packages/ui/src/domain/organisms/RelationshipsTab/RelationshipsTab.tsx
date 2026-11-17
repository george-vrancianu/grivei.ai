import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Stack } from "../../../atoms/Stack/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import { Well } from "../../../atoms/Well/index.ts";
import { SectionHeading } from "../../atoms/SectionHeading/index.ts";
import type { Locale } from "../../../theme/index.ts";
import type {
  CounterpartyRecordsData, EntityRef, EntityRole, RecordResult, RelationshipsCounterparties, RelationshipsTimeline,
} from "../../types.ts";
import { counterpartyRole } from "../EntityOverview/entityOverview.utils.ts";
import { CounterpartyGraph } from "./components/CounterpartyGraph/index.ts";
import { CounterpartyPanel } from "./components/CounterpartyPanel/index.ts";
import { GraphLegend } from "./components/GraphLegend/index.ts";
import { MonthlyTimeline } from "./components/MonthlyTimeline/index.ts";
import { Panel } from "../../molecules/Panel/index.ts";
import type { RelationshipsTabCopy } from "./relationshipsTab.types.ts";

export type { RelationshipsTabCopy, CounterpartyGraphCopy, GraphLegendCopy, MonthlyTimelineCopy, CounterpartyPanelCopy, NodeNameParts } from "./relationshipsTab.types.ts";

export interface RelationshipsTabProps {
  /** The entity whose page this is: the centre of the graph. */
  entity: EntityRef;
  /** The page's role. A counterparty gets the other one (an authority's counterparties are suppliers and the reverse). */
  role: EntityRole;
  /** `entity.seap.role.counterparties` of `EntityRelationships`: the top rows, their `count` and `topShare`. Null when the request failed with nothing held: the graph panel shows the `failure` alone. */
  counterparties: RelationshipsCounterparties | null;
  /** The entity's months in the filter (`timeline` queried without a counterparty). Null with `counterparties`: no "By month" panel. */
  timeline: RelationshipsTimeline | null;
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
  /**
   * The Entity key `sidePanel` and `selectedTimeline` are the answer for. While the next pick loads they still hold the last counterparty's (kept on screen, dimmed), so the panel names that one;
   * absent, they are the picked counterparty's own.
   */
  sidePanelKey?: string | null;
  /** A request for the picked counterparty is in flight: with `sidePanel` held the body is dimmed (`aria-busy`), without it the body shows placeholders. */
  sidePanelLoading?: boolean;
  /** The picked panel's header, before the close button: the page's `LoadingStatus` while a request for it is in flight. */
  sidePanelStatus?: ReactNode;
  /** The picked request failed: the note with its retry sits inside the picked panel, the graph stays. */
  sidePanelFailure?: ReactNode;
  /** The Records tab with only the Records with a counterparty (`records`: all of them) or only the ones carrying Signals (`signals`). */
  counterpartyHref: (key: string, kind: "records" | "signals") => string;
  /** The graph and "By month" panels show their last answer while the next loads: bodies dimmed with `aria-busy="true"`; header strips and the foot stay at full strength. */
  busy?: boolean | undefined;
  /** The graph and "By month" panels' headers: the page's `LoadingStatus` while the tab's request is in flight. */
  status?: ReactNode;
  /** The tab's request failed: the note with its retry sits inside the graph panel (above the held graph, if any). */
  failure?: ReactNode;
  /** Paging of the side panel's Records, when they span several pages. */
  sidePanelPaging?: { page: number; pageSize: number; pageHref: (page: number) => string };
  onNavigate?: ((href: string) => void) | undefined;
  entityHref: (entity: EntityRef, role: EntityRole) => string;
  recordHref: (record: RecordResult["record"]) => string;
  /** The Graph / Money flow toggle: it shares the heading's line above the panels. */
  flowToggle?: ReactNode;
  /** The Money flow panel: when given, it takes the graph panel's place (full width, the picked panel under it); "By month" and the picked panel stay as in the Graph view. */
  flowMap?: ReactNode;
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

/**
 * The Relationships tab of an Entity page: the heading and the Graph / Money flow toggle on one line, then in the Graph view a titled panel with the radial graph of the top counterparties
 * (size = money, colour = contracts or direct purchases, dashed = won together, ring = has Signals; the legend is its foot) beside the picked-counterparty panel, and "By month" full width below;
 * in the Money flow view the one Money flow panel takes the graph panel's place (full width, the picked panel under it) and "By month" stays. Presentational: the page owns the data, the refetch (`busy`, `status`) and the failures.
 */
export function RelationshipsTab({
  entity, role, counterparties, timeline, selectedTimeline = null, selected, onSelect, sidePanel, sidePanelKey = null, sidePanelLoading = false, sidePanelStatus, sidePanelFailure, counterpartyHref, busy, status, failure, sidePanelPaging,
  onNavigate, entityHref, recordHref, flowToggle, flowMap, locale, copy,
}: RelationshipsTabProps) {
  const rows = counterparties?.rows ?? [];
  // What the picked panel shows: the held answer's counterparty while the next pick loads, else the pick. A key beyond the shown rows (the top 30) is named by the panel's own Records;
  // until they arrive it has no name (none is invented), and the panel shows placeholders.
  const shown = selected === null ? null : sidePanel !== null && sidePanelKey !== null ? sidePanelKey : selected;
  const shownRow = shown === null ? null : (rows.find((row) => row.entity?.key === shown && !row.naturalPerson) ?? null);
  const picked: EntityRef | null = shown === null ? null : (shownRow?.entity ?? entityInRecords(sidePanel, shown));
  const heading = (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
      <SectionHeading>{copy.heading}</SectionHeading>
      {flowToggle && <Box data-slot="flow-toggle">{flowToggle}</Box>}
    </Box>
  );
  const graphPanel = (
    <Panel
      heading={copy.graph.heading}
      busy={busy}
      aside={status}
      foot={
        rows.length > 0 ? (
          <>
            <GraphLegend copy={copy.legend} hasWonTogether={rows.some((row) => row.wonTogether)} hasSignals={rows.some((row) => row.hasSignals)} />
            {rows.some((row) => row.wonTogether) && <Typography variant="meta" color="text.secondary" component="p" sx={{ m: 0, flex: "1 1 100%" }}>{copy.graph.consortiumNote}</Typography>}
          </>
        ) : undefined
      }
    >
      {failure}
      {counterparties && (
        <Well sx={{ p: 1.5 }}>
          <CounterpartyGraph entity={entity} counterparties={counterparties} selected={selected} onSelect={onSelect} locale={locale} copy={copy} />
        </Well>
      )}
    </Panel>
  );
  const pickedPanel = counterparties && (
    <CounterpartyPanel
      picked={selected !== null}
      counterparty={picked}
      records={sidePanel}
      loading={sidePanelLoading}
      status={sidePanelStatus}
      failure={sidePanelFailure}
      hasSignals={shownRow?.hasSignals ?? false}
      wonTogether={shownRow?.wonTogether ?? false}
      allRecordsHref={shown === null ? null : counterpartyHref(shown, "records")}
      signalsHref={shown === null ? null : counterpartyHref(shown, "signals")}
      counterpartyRole={counterpartyRole(role)}
      onClose={() => onSelect(null)}
      paging={sidePanelPaging}
      onNavigate={onNavigate}
      entityHref={entityHref}
      recordHref={recordHref}
      locale={locale}
      copy={copy}
    />
  );
  return (
    <Stack spacing={2}>
      {heading}
      {flowMap ? (
        <>
          {flowMap}
          {pickedPanel}
        </>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", gap: 3 }}>
          <Box sx={{ flex: "1.3 1 520px", minWidth: 0 }}>{graphPanel}</Box>
          {pickedPanel && <Box sx={{ flex: "1 1 380px", minWidth: 0 }}>{pickedPanel}</Box>}
        </Box>
      )}
      {timeline && (
        <MonthlyTimeline
          timeline={timeline}
          pickedTimeline={selected !== null ? selectedTimeline : null}
          pickedName={picked?.displayName ?? null}
          busy={busy}
          status={status}
          locale={locale}
          copy={copy.timeline}
        />
      )}
    </Stack>
  );
}
