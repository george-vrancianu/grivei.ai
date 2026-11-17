import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import type { EntityRole } from "../../types.ts";
import { Panel } from "../../molecules/Panel/index.ts";

export interface MoneyFlowPanelCopy {
  /** The panel's title ("Money flow"). */
  heading: string;
  /** The header's meta line by the page's role: "where this authority's money goes" / "where this supplier's money comes from". */
  meta: Record<EntityRole, string>;
}

export interface MoneyFlowPanelProps {
  /** The page's role: it picks the meta line. */
  role: EntityRole;
  /** The panel's header, right of the title: the page's `LoadingStatus` while a request is in flight, after the meta line. */
  status?: ReactNode;
  /** The body is dimmed with `aria-busy="true"` while the next answer loads; the header strip and the foot stay at full strength. */
  busy?: boolean | undefined;
  /** The foot strip: the map's caption. Absent while there is no map. */
  foot?: ReactNode;
  /** The body has no padding: the caller lays out the map and the county list (and pads a state note itself). */
  flush?: boolean;
  /** The body: the map and its county list, a skeleton, or a state note. */
  children: ReactNode;
  copy: MoneyFlowPanelCopy;
}

/**
 * The Relationships tab's Money flow view: one titled panel holding the map, the county list and the caption. The panel is the shell every state of the lens sits in
 * (the map, its skeleton, a failed outline load), so the header strip stays whatever the body shows.
 */
export function MoneyFlowPanel({ role, status, busy, foot, flush = false, children, copy }: MoneyFlowPanelProps) {
  return (
    <Panel
      heading={copy.heading}
      busy={busy}
      flush={flush}
      foot={foot}
      aside={
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", columnGap: 2, rowGap: 0.5 }}>
          <span>{copy.meta[role]}</span>
          {status}
        </Box>
      }
    >
      {children}
    </Panel>
  );
}
