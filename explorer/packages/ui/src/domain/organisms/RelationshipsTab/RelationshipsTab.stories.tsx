import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../../../atoms/Button/index.ts";
import { LoadingStatus } from "../../molecules/LoadingStatus/index.ts";
import { StateNote } from "../../molecules/StateNote/index.ts";
import { localeOf, sampleCopy } from "../../samples/copy.ts";
import { authorityHome, authorityNationwideFlow } from "../../samples/flowMaps.ts";
import { countiesTopology } from "../../samples/geo/counties.topo.ts";
import { FlowLensMap } from "../FlowLensMap/index.ts";
import {
  authorityDirectSupplierPanel, authorityPickedPanel, authorityTypicalPickedDirectTimeline, authorityTypicalPickedTimeline, authorityTypicalRelationships, consortiumHeavyRelationships,
  emptyRelationships, naturalPersonRelationships, oneCounterpartyRelationships, supplierPickedPanel, supplierPickedRelationships,
} from "../../samples/fixtureData.ts";
import type { CounterpartyRecordsData, EntityRole, RelationshipsTimeline } from "../../types.ts";
import { RelationshipsTab } from "./index.ts";

const meta = { title: "Domain/RelationshipsTab", component: RelationshipsTab } satisfies Meta<Record<string, unknown>>;
export default meta;
type Story = StoryObj;

type Sample = typeof authorityTypicalRelationships;
interface Picked { panel: CounterpartyRecordsData; timeline: RelationshipsTimeline }

/**
 * The tab with the pick held by the story (the real one holds it in the URL). A counterparty with no data in `picked` shows the loading state,
 * which is what a slow query looks like.
 */
function Harness({ data, role, picked = {}, initial = null, loading = false, holdKey = null, busy = false, failure = false, pickedFailure = false, locale, flow = false, flowOpen = false }: {
  data: Sample | null; role: EntityRole; picked?: Record<string, Picked>; initial?: string | null; loading?: boolean; locale: "en" | "ro"; flow?: boolean; flowOpen?: boolean;
  /** Another counterparty's answer is held while the picked one loads (its key). */
  holdKey?: string | null;
  /** The tab is refetching: its last answer is dimmed. */
  busy?: boolean;
  /** The tab's request failed. */
  failure?: boolean;
  /** The picked counterparty's request failed. */
  pickedFailure?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(initial);
  const held = holdKey === null ? undefined : picked[holdKey];
  const current = selected === null ? undefined : (held ?? picked[selected]);
  const t = sampleCopy.relationshipsTab(locale);
  const loadingLabel = locale === "ro" ? "Se încarcă…" : "Loading…";
  const note = (kind: "error") => (
    <StateNote kind={kind} action={<Button size="small">{locale === "ro" ? "Reîncearcă" : "Retry"}</Button>}>
      {locale === "ro" ? "Cererea a eșuat." : "The request failed."}
    </StateNote>
  );
  const pickedLoading = loading || holdKey !== null || (selected !== null && !current);
  return (
    <RelationshipsTab
      entity={(data ?? authorityTypicalRelationships).entity}
      role={role}
      counterparties={data?.counterparties ?? null}
      timeline={data?.timeline ?? null}
      selectedTimeline={current?.timeline ?? null}
      selected={selected}
      onSelect={setSelected}
      sidePanel={current?.panel ?? null}
      sidePanelKey={holdKey}
      sidePanelLoading={pickedLoading && !pickedFailure}
      sidePanelStatus={pickedLoading && !pickedFailure ? <LoadingStatus label={loadingLabel} /> : undefined}
      sidePanelFailure={pickedFailure ? note("error") : undefined}
      counterpartyHref={(key, kind) => `/explore/${role === "authority" ? "authority" : "supplier"}/key/records?counterparty=${key}${kind === "signals" ? "&hasSignals=true" : ""}`}
      busy={busy}
      status={busy ? <LoadingStatus label={loadingLabel} /> : undefined}
      failure={failure ? note("error") : undefined}
      entityHref={(entity, r) => `/explore/${r}/${entity.key}`}
      recordHref={(record) => `/explore/record/${record.code}`}
      flowMap={
        flowOpen ? (
          <FlowLensMap flow={authorityNationwideFlow} role="authority" home={authorityHome} topology={countiesTopology} onSelect={() => undefined} locale={locale} copy={sampleCopy.flowLensMap(locale)} />
        ) : undefined
      }
      flowToggle={flow || flowOpen ? <Button variant="outlined" size="small">{locale === "ro" ? "Flux de bani" : "Money flow"}</Button> : undefined}
      locale={locale}
      copy={t}
    />
  );
}

const render =
  (props: Omit<Parameters<typeof Harness>[0], "locale">): Story["render"] =>
  (_args, { globals }) => <Harness {...props} locale={localeOf(globals["locale"])} />;

const typicalPicked = {
  "30000002": { panel: authorityPickedPanel, timeline: authorityTypicalPickedTimeline },
  "30000001": { panel: authorityDirectSupplierPanel, timeline: authorityTypicalPickedDirectTimeline },
} satisfies Record<string, Picked>;

/** An authority with eight of thirteen counterparties: blue edges for contracts, green for direct purchases, one Signal ring, a natural person and an unidentified group. Click a node. */
export const TypicalEntity: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", picked: typicalPicked, flow: true }) };
/** A counterparty picked: the side panel lists its Records and the timeline marks its months over the overall bars. */
export const PickedCounterparty: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", picked: typicalPicked, initial: "30000002" }) };
/** A direct-purchase supplier with Signals picked. */
export const PickedDirectPurchaseSupplier: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", picked: typicalPicked, initial: "30000001" }) };
/** An entity with a single counterparty: a graph of one node. */
export const SingleCounterparty: Story = { render: render({ data: oneCounterpartyRelationships, role: "authority" }) };
/** A supplier that mostly wins in consortia: its authorities with many dashed (won together) edges, and the equal-split convention note. */
export const ConsortiumHeavySupplier: Story = { render: render({ data: consortiumHeavyRelationships, role: "supplier" }) };
/** A supplier page with its largest authority picked. */
export const SupplierPickedAuthority: Story = {
  render: render({ data: supplierPickedRelationships, role: "supplier", picked: { "4000001": { panel: supplierPickedPanel, timeline: supplierPickedRelationships.timeline } }, initial: "4000001" }),
};
/** A natural person is a labelled mark: no name, no link, not pickable (ADR 0003). */
export const NaturalPersonCounterparty: Story = { render: render({ data: naturalPersonRelationships, role: "authority" }) };
/** No counterparties in the filter. */
export const EmptyEntity: Story = { render: render({ data: emptyRelationships, role: "authority" }) };
/** The pick has been made but its Records have not arrived. */
export const LoadingSidePanel: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", initial: "30000002", loading: true }) };
/** The pick has been made and the last counterparty's answer is held: its body is dimmed (aria-busy) while the next loads, the header at full strength with its loading status. */
export const PickedCounterpartyRefetching: Story = {
  render: render({ data: authorityTypicalRelationships, role: "authority", picked: typicalPicked, initial: "30000001", holdKey: "30000002" }),
};
/** The picked counterparty's request failed: the note with its retry sits inside the picked panel; the graph stays. */
export const PickedCounterpartyFailed: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", picked: typicalPicked, initial: "30000002", pickedFailure: true }) };
/** The tab is refetching (a filter changed): the last graph and months stay, dimmed, with the loading status in the headers. */
export const Refetching: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", picked: typicalPicked, initial: "30000002", busy: true }) };
/** The tab's request failed with nothing held: the note with its retry inside the graph panel; no "By month". */
export const Failed: Story = { render: render({ data: null, role: "authority", failure: true }) };
/** The tab's request failed with an answer held: the note sits above the held graph. */
export const FailedWithHeldAnswer: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", picked: typicalPicked, initial: "30000002", failure: true }) };
/** The Money flow view: its one panel is the whole view under the heading and the toggle (no graph, "By month" or picked panel). */
export const FlowLensOpen: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", flowOpen: true }) };
/** No counterparty carries a Signal: no amber ring on the graph and no ring entry in the legend. */
export const WithoutSignals: Story = {
  render: render({
    data: { ...authorityTypicalRelationships, counterparties: { ...authorityTypicalRelationships.counterparties, rows: authorityTypicalRelationships.counterparties.rows.map((row) => ({ ...row, hasSignals: false })) } },
    role: "authority", picked: typicalPicked, initial: "30000002",
  }),
};
