import { ARC_COLOR, type FlowArc } from "../../flowLensMap.utils.ts";

export interface FlowArcsProps {
  arcs: readonly FlowArc[];
}

/** One curve per county with money, width by money, with an arrowhead at the receiving county (`data-from` leaves, `data-to` receives). Decorative for assistive tech. */
export function FlowArcs({ arcs }: FlowArcsProps) {
  return (
    <g data-flow-arcs aria-hidden="true" pointerEvents="none">
      {arcs.map((arc) => (
        <g key={arc.code} data-arc data-county={arc.code} data-from={arc.from} data-to={arc.to}>
          <path d={arc.d} fill="none" stroke={ARC_COLOR} strokeOpacity={0.85} strokeWidth={arc.width} strokeLinecap="round" />
          <polygon data-arrowhead points={arc.head} fill={ARC_COLOR} fillOpacity={0.75} />
        </g>
      ))}
    </g>
  );
}
