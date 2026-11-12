import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../../../atoms/Button/index.ts";
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
function Harness({ data, role, picked = {}, initial = null, loading = false, locale, flow = false, flowOpen = false }: {
  data: Sample; role: EntityRole; picked?: Record<string, Picked>; initial?: string | null; loading?: boolean; locale: "en" | "ro"; flow?: boolean; flowOpen?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(initial);
  const current = selected === null ? undefined : picked[selected];
  return (
    <RelationshipsTab
      entity={data.entity}
      role={role}
      counterparties={data.counterparties}
      timeline={data.timeline}
      selectedTimeline={current?.timeline ?? null}
      selected={selected}
      onSelect={setSelected}
      sidePanel={current?.panel ?? null}
      sidePanelLoading={loading || (selected !== null && !current)}
      entityHref={(entity, r) => `/explore/${r}/${entity.key}`}
      recordHref={(record) => `/explore/record/${record.code}`}
      flowMap={
        flowOpen ? (
          <FlowLensMap flow={authorityNationwideFlow} role="authority" home={authorityHome} topology={countiesTopology} onSelect={() => undefined} locale={locale} copy={sampleCopy.flowLensMap(locale)} />
        ) : undefined
      }
      flowToggle={flow || flowOpen ? <Button variant="outlined" size="small">{locale === "ro" ? "Fluxul banilor" : "Money flow"}</Button> : undefined}
      locale={locale}
      copy={sampleCopy.relationshipsTab(locale)}
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
/** The Flow lens open: the `flowMap` slot replaces the graph and its legend; the timeline and the side panel stay. */
export const FlowLensOpen: Story = { render: render({ data: authorityTypicalRelationships, role: "authority", flowOpen: true }) };
