import { circleRadius } from "../../zoomedCountyMap.utils.ts";

/** The circles' outline: dark enough to read on every fill of the choropleth. */
const CIRCLE_STROKE = "#1b2a41";

export interface AuthorityCirclesProps {
  /** The projected centre of each UAT, by SIRUTA (the base map's overlay context). */
  centroids: ReadonlyMap<string, readonly [number, number]>;
  /** Distinct authorities by SIRUTA. A UAT without an entry (or with none) gets no circle. */
  authorities: ReadonlyMap<string, number>;
}

/** One outlined circle per UAT, its area following the number of authorities. Decorative: hidden from assistive tech, pointer events off. */
export function AuthorityCircles({ centroids, authorities }: AuthorityCirclesProps) {
  const most = Math.max(0, ...authorities.values());
  return (
    <g data-authority-circles aria-hidden="true" pointerEvents="none">
      {[...authorities].map(([code, entities]) => {
        const at = centroids.get(code);
        const r = circleRadius(entities, most);
        return at && r > 0 ? <circle key={code} data-uat={code} cx={at[0]} cy={at[1]} r={r} fill="none" stroke={CIRCLE_STROKE} strokeWidth={1.5} /> : null;
      })}
    </g>
  );
}
