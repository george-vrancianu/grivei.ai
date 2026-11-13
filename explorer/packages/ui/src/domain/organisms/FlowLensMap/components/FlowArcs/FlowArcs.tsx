import { ARC_COLOR, ARC_OPACITY, ARROWHEAD_OPACITY, type FlowArc } from "../../flowLensMap.utils.ts";

export interface FlowArcsProps {
  arcs: readonly FlowArc[];
}

/** One curve per county with money, width by money, with an arrowhead at the receiving county (`data-from` leaves, `data-to` receives). Decorative for assistive tech. */
export function FlowArcs({ arcs }: FlowArcsProps) {
  return (
    <g data-flow-arcs aria-hidden="true" pointerEvents="none">
      {arcs.map((arc) => (
        <g key={arc.code} data-arc data-county={arc.code} data-from={arc.from} data-to={arc.to}>
          <path d={arc.d} fill="none" stroke={ARC_COLOR} strokeOpacity={ARC_OPACITY} strokeWidth={arc.width} strokeLinecap="round" />
          <polygon data-arrowhead points={arc.head} fill={ARC_COLOR} fillOpacity={ARROWHEAD_OPACITY} />
        </g>
      ))}
    </g>
  );
}
