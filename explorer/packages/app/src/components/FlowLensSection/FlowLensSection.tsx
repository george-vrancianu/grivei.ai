import { useState } from "react";
import type { MoneyMapFieldsFragment } from "@grivei/contract";
import type { EntityRoute } from "../../routing/routes.ts";
import { FlowLensMap, Typography, type FlowLensMapCopy, type Locale, type MapArea } from "@grivei/ui";
import { useCountyTopology } from "../../geo/index.ts";

export interface FlowLensSectionProps {
  /** The role's `flow`, drawn on the counterparty's side. */
  flow: MoneyMapFieldsFragment;
  role: EntityRoute;
  /** The entity's own county code (its header's placement county), or null when it has none. */
  home: string | null;
  locale: Locale;
  copy: FlowLensMapCopy;
  /** What to say when the outlines cannot be loaded, and while they load. */
  status: { unavailable: string; loading: string };
}

/** The Flow lens of an Entity page's Relationships tab: the county outlines load when this opens (once for the app); the area picked on the map is the map's own highlight. */
export function FlowLensSection({ flow, role, home, locale, copy, status }: FlowLensSectionProps) {
  const topology = useCountyTopology();
  const [selected, setSelected] = useState<MapArea | undefined>(undefined);
  if (topology.status === "error") return <Typography role="alert">{status.unavailable}</Typography>;
  if (topology.status === "loading") return <Typography aria-busy="true">{status.loading}</Typography>;
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
    />
  );
}
