import { useMemo } from "react";
import type { Topology } from "topojson-specification";
import type { ReactNode } from "react";
import { Box } from "../../../atoms/Box/index.ts";
import { Typography } from "../../../atoms/Typography/index.ts";
import type { Locale } from "../../../theme/index.ts";
import { formatCount } from "../../atoms/ApproxCount/index.ts";
import { formatMoney } from "../../atoms/MoneyAmount/index.ts";
import type { EntityRole, MoneyMap } from "../../types.ts";
import { BaseMap, featuresOf, type AreaInfo } from "../BaseMap/index.ts";
import { OffMapTiles, totalsByCounty, type MapArea } from "../MoneyLensMap/index.ts";
import { MoneyFlowPanel } from "../MoneyFlowPanel/index.ts";
import { CountyList } from "./components/CountyList/index.ts";
import { FlowArcs } from "./components/FlowArcs/index.ts";
import { FlowBubbles } from "./components/FlowBubbles/index.ts";
import { FlowCaption } from "./components/FlowCaption/index.ts";
import { FlowLegend } from "./components/FlowLegend/index.ts";
import { FlowTooltip } from "./components/FlowTooltip/index.ts";
import type { FlowLensMapCopy } from "./flowLensMap.types.ts";
import { HOME_COLOR, OTHER_COLOR, countyListRows, flowMarks, flowRows, flowSide, isEmptyFlow } from "./flowLensMap.utils.ts";

export type FlowLensMapProps = {
  /** The entity's Flow lens (`entity.seap.role(role:).flow`): drawn on the counterparty's side, so a supplier's carries `AUTHORITY` and an authority's `SUPPLIER`. */
  flow: MoneyMap;
  /** The page's entity role: it sets the direction of the arcs (a supplier's money comes in, an authority's goes out). */
  role: EntityRole;
  /** The entity's own county code (its header's placement county): the home end of every arc. Null or absent: bubbles only, no arcs. */
  home?: string | null;
  /** County outlines (properties `{ code, name }`, ISO 3166-2:RO codes), built at load time. */
  topology: Topology;
  /** The selected area: a county code, `NATIONAL`, `UNPLACED` or `UNKNOWN_SUPPLIER_COUNTY`. */
  selected?: MapArea;
  /** Emits the clicked county's code, or the clicked tile's off-map area. */
  onSelect: (area: MapArea) => void;
  locale: Locale;
  copy: FlowLensMapCopy;
  /** The panel's header: the page's `LoadingStatus` while a request is in flight. */
  status?: ReactNode;
  /** The panel shows its last answer while the next loads: the body is dimmed with `aria-busy="true"`, the header and the caption stay at full strength. */
  busy?: boolean | undefined;
};

/**
 * The Money flow panel (the Relationships tab's Flow lens at county level): a bubble per county that holds money (area by awarded value), an arc between each of them and the entity's own
 * county (width by money, arrowhead showing the direction by role), the home county highlighted, and the off-map tiles. It draws the same Totals
 * the Money lens does. Presentational: data in, clicks out.
 */
export function FlowLensMap({ flow, role, home = null, topology, selected, onSelect, locale, copy, status, busy }: FlowLensMapProps) {
  const names = useMemo(() => new Map(featuresOf(topology).map((area) => [area.properties.code, area.properties.name])), [topology]);
  const rows = useMemo(() => flowRows(flow), [flow]);
  const totals = useMemo(() => totalsByCounty(flow), [flow]);
  // A home county the outlines don't have can't anchor arcs: treated as unknown.
  const homeCode = home !== null && names.has(home) ? home : null;
  const homeName = homeCode === null ? null : (names.get(homeCode) ?? null);
  const localOnly = rows.length > 0 && rows.every((row) => row.code === homeCode);
  if (flow.side !== flowSide(role)) throw new Error(`A ${role}'s Flow lens is drawn on the ${flowSide(role)} side, not ${flow.side}`);

  if (isEmptyFlow(flow)) {
    return (
      <MoneyFlowPanel role={role} status={status} busy={busy} copy={copy.panel}>
        <Typography variant="body2" data-flow-empty>{copy.empty}</Typography>
      </MoneyFlowPanel>
    );
  }
  const list = countyListRows(flow, copy.tiles);

  const describeArea = ({ code }: AreaInfo) => {
    const total = totals.get(code);
    const figures = total
      ? `${formatMoney(total.awarded, locale)}, ${copy.tiles.records(total.records, formatCount(total.records, total.estimated, locale))}`
      : copy.map.noData;
    return code === homeCode ? `${figures}. ${copy.tooltip.homeCounty}` : figures;
  };
  const colorOf = (code: string) => (code === homeCode ? HOME_COLOR : rows.some((row) => row.code === code) ? OTHER_COLOR : null);

  return (
    <MoneyFlowPanel
      role={role}
      status={status}
      busy={busy}
      flush
      copy={copy.panel}
      foot={<FlowCaption role={role} homeName={homeName} localOnly={homeCode !== null && localOnly} copy={copy.caption} />}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.7fr) minmax(220px, 1fr)" } }}>
        <Box sx={{ p: 2, minWidth: 0 }}>
          <BaseMap
        topology={topology}
        // The fill is categorical (home / has money / none): the money is in the bubbles and arcs, and exact in the names and tooltips.
        values={{}}
        formatValue={() => ""}
        colorOf={colorOf}
        describeArea={describeArea}
        legend={<FlowLegend role={role} hasHome={homeCode !== null} copy={copy.legend} />}
        renderOverlay={({ centroids }) => {
          const { bubbles, arcs } = flowMarks(rows, centroids, homeCode, role);
          return (
            <>
              <FlowArcs arcs={arcs} />
              <FlowBubbles bubbles={bubbles} />
            </>
          );
        }}
        renderTooltip={({ code, name }) => (
          <FlowTooltip name={name} total={totals.get(code)} role={role} isHome={code === homeCode} homeName={homeName} locale={locale} copy={copy} />
        )}
        onSelect={onSelect}
        selected={selected}
        tiles={<OffMapTiles map={flow} selected={selected} onSelect={onSelect} locale={locale} copy={copy.tiles} />}
        copy={copy.map}
      />
        </Box>
        <Box sx={{ minWidth: 0, borderTop: { xs: 1, md: 0 }, borderLeft: { xs: 0, md: 1 }, borderColor: "divider" }}>
          <CountyList rows={list.rows} total={list.total} locale={locale} label={copy.counties.label} />
        </Box>
      </Box>
    </MoneyFlowPanel>
  );
}
