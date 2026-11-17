import { useState, type ReactNode } from "react";
import type { MoneyMapFieldsFragment } from "@grivei/contract";
import type { EntityRoute } from "../../routing/routes.ts";
import { Button, FlowLensMap, MapSkeleton, MoneyFlowPanel, StateNote, type FlowLensMapCopy, type Locale, type MapArea } from "@grivei/ui";
import type { CountyTopologyState } from "../../geo/index.ts";

export interface FlowLensSectionProps {
  /** The role's `flow`, drawn on the counterparty's side. */
  flow: MoneyMapFieldsFragment;
  role: EntityRoute;
  /** The county outlines (the page loads them when the lens opens). */
  topology: CountyTopologyState;
  /** The entity's own county code (its header's placement county), or null when it has none. */
  home: string | null;
  locale: Locale;
  copy: FlowLensMapCopy;
  /** What to say when the outlines cannot be loaded (with the retry button's text), and while they load. */
  status: { unavailable: string; loading: string; retry: string };
  /** The flow request is refetching (a filter changed): the last map stays, dimmed, with `loadingStatus` in the panel's header. */
  busy?: boolean;
  loadingStatus?: ReactNode;
  /** The tab's request failed with this map held: the note sits inside the panel above the held map. */
  failure?: ReactNode;
}

/** The Money flow panel of an Entity page's Relationships tab: the area picked on the map is the map's own highlight. Every state (outlines loading, outlines failed, the map) sits in the same panel. */
export function FlowLensSection({ flow, role, topology, home, locale, copy, status, busy, loadingStatus, failure }: FlowLensSectionProps) {
  const [selected, setSelected] = useState<MapArea | undefined>(undefined);
  if (topology.status === "error") {
    return (
      <MoneyFlowPanel role={role} copy={copy.panel}>
        {failure}
        <StateNote kind="error" action={topology.retry ? <Button size="small" onClick={topology.retry}>{status.retry}</Button> : undefined}>
          {status.unavailable}
        </StateNote>
      </MoneyFlowPanel>
    );
  }
  if (topology.status === "loading") {
    return (
      <MoneyFlowPanel role={role} copy={copy.panel}>
        {failure}
        <MapSkeleton label={status.loading} />
      </MoneyFlowPanel>
    );
  }
  return (
    <FlowLensMap
      flow={flow}
      role={role}
      home={home}
      topology={topology.topology}
      {...(selected !== undefined ? { selected } : {})}
      onSelect={(area) => setSelected((current) => (current === area ? undefined : area))}
      locale={locale}
      copy={copy}
      busy={busy}
      status={loadingStatus}
      failure={failure}
    />
  );
}
