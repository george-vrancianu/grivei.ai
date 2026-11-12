import type { EntityRole, MoneyMap } from "../../types.ts";

/** Largest bubble radius, in SVG units (the map is 640 wide). */
export const MAX_BUBBLE_RADIUS = 30;
/** A county with money always gets a visible bubble, even when it is tiny next to the largest. */
export const MIN_BUBBLE_RADIUS = 2.5;
export const MAX_ARC_WIDTH = 12;
/** A county with money always gets a visible arc. */
export const MIN_ARC_WIDTH = 1;

/** The home county's fill, the other counties with money, and the bubbles and arcs drawn over them. */
export const HOME_COLOR = "#f3c969";
export const OTHER_COLOR = "#e3e8ee";
export const BUBBLE_FILL = "#0f766e";
export const BUBBLE_OUTLINE = "#134e4a";
export const ARC_COLOR = "#1e3a5f";

/** The side a Flow lens map has for a page's role: a supplier's money comes from authority counties, an authority's goes to supplier counties. */
export const flowSide = (role: EntityRole): MoneyMap["side"] => (role === "supplier" ? "AUTHORITY" : "SUPPLIER");

export type FlowRow = { code: string; name: string; awarded: string; records: number; estimated: boolean };

/** The counties that hold money (Bani above zero): a zero county gets no bubble and no arc. Same Totals as the Money lens, not recomputed. */
export function flowRows(flow: Pick<MoneyMap, "counties">): FlowRow[] {
  return flow.counties
    .filter((county) => BigInt(county.total.awarded) > 0n)
    .map((county) => ({ code: county.area, name: county.name, awarded: county.total.awarded, records: county.total.records, estimated: county.total.estimated }));
}

/** The largest amount among the rows, as a Bani string ("0" for none). */
export function maxAwarded(rows: readonly Pick<FlowRow, "awarded">[]): string {
  return rows.reduce((max, row) => (BigInt(row.awarded) > BigInt(max) ? row.awarded : max), "0");
}

/** value / max as a number in [0, 1], computed from the exact Bani (BigInt); only geometry reads it. */
export function ratio(awarded: string, max: string): number {
  const top = BigInt(max);
  const value = BigInt(awarded);
  if (top <= 0n || value <= 0n) return 0;
  return Number((value * 1_000_000_000_000n) / top) / 1_000_000_000_000;
}

/** Bubble radius: area proportional to money (sqrt), zero at zero, never smaller than `MIN_BUBBLE_RADIUS` when there is money. */
export function bubbleRadius(awarded: string, max: string): number {
  const share = ratio(awarded, max);
  return share === 0 ? 0 : Math.max(MIN_BUBBLE_RADIUS, MAX_BUBBLE_RADIUS * Math.sqrt(share));
}

/** Arc stroke width: linear in money, never thinner than `MIN_ARC_WIDTH` when there is money. */
export function arcWidth(awarded: string, max: string): number {
  const share = ratio(awarded, max);
  return share === 0 ? 0 : Math.max(MIN_ARC_WIDTH, MAX_ARC_WIDTH * share);
}

type Point = readonly [number, number];

export type FlowBubble = { code: string; x: number; y: number; r: number; awarded: string };
export type FlowArc = {
  code: string;
  /** County codes: the arc leaves `from` and arrives at `to` (the arrowhead is at `to`). */
  from: string;
  to: string;
  awarded: string;
  width: number;
  /** SVG path of the curve, trimmed to the bubbles' edges. */
  d: string;
  /** SVG polygon points of the arrowhead. */
  head: string;
};

const unit = (dx: number, dy: number): Point => {
  const length = Math.hypot(dx, dy) || 1;
  return [dx / length, dy / length];
};

/** A quadratic curve between two bubbles, bowed to the left of the travel direction, with an arrowhead at the end. Null when the two centres coincide. */
export function arcShape(from: Point, to: Point, fromRadius: number, toRadius: number, width: number): Pick<FlowArc, "d" | "head"> | null {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 1) return null;
  const control: Point = [(from[0] + to[0]) / 2 - (dy / length) * length * 0.22, (from[1] + to[1]) / 2 + (dx / length) * length * 0.22];
  const [sx, sy] = unit(control[0] - from[0], control[1] - from[1]);
  const [ex, ey] = unit(to[0] - control[0], to[1] - control[1]);
  const start: Point = [from[0] + sx * fromRadius, from[1] + sy * fromRadius];
  const tip: Point = [to[0] - ex * toRadius, to[1] - ey * toRadius];
  const headLength = 5 + width;
  const halfWidth = 2.5 + width * 0.7;
  const base: Point = [tip[0] - ex * headLength, tip[1] - ey * headLength];
  const f = (n: number) => Math.round(n * 100) / 100;
  return {
    d: `M${f(start[0])},${f(start[1])} Q${f(control[0])},${f(control[1])} ${f(base[0])},${f(base[1])}`,
    head: `${f(tip[0])},${f(tip[1])} ${f(base[0] - ey * halfWidth)},${f(base[1] + ex * halfWidth)} ${f(base[0] + ey * halfWidth)},${f(base[1] - ex * halfWidth)}`,
  };
}

/**
 * The marks of a Flow lens: a bubble per county with money, and an arc from every county with money to the home county (a supplier's page: the
 * money comes in) or from the home county to every one of them (an authority's page: it goes out). The home county gets a bubble and no arc;
 * without a home county (null, or one the map has no outline for) there are bubbles only.
 */
export function flowMarks(
  rows: readonly FlowRow[],
  centroids: ReadonlyMap<string, Point>,
  home: string | null,
  role: EntityRole,
): { bubbles: FlowBubble[]; arcs: FlowArc[] } {
  const max = maxAwarded(rows);
  const bubbles: FlowBubble[] = [];
  for (const row of rows) {
    const at = centroids.get(row.code);
    if (at) bubbles.push({ code: row.code, x: at[0], y: at[1], r: bubbleRadius(row.awarded, max), awarded: row.awarded });
  }
  const homeAt = home === null ? undefined : centroids.get(home);
  if (home === null || !homeAt) return { bubbles, arcs: [] };
  const homeRadius = bubbles.find((bubble) => bubble.code === home)?.r ?? 0;
  const others = bubbles.filter((bubble) => bubble.code !== home);
  const arcMax = maxAwarded(others);
  const arcs: FlowArc[] = [];
  for (const bubble of others) {
    const width = arcWidth(bubble.awarded, arcMax);
    const inbound = role === "supplier";
    const shape = inbound
      ? arcShape([bubble.x, bubble.y], homeAt, bubble.r, homeRadius, width)
      : arcShape(homeAt, [bubble.x, bubble.y], homeRadius, bubble.r, width);
    if (shape) arcs.push({ code: bubble.code, from: inbound ? bubble.code : home, to: inbound ? home : bubble.code, awarded: bubble.awarded, width, ...shape });
  }
  return { bubbles, arcs };
}

/** True when a flow holds no money anywhere: no county with awarded value above zero (as for the bubbles), and no Total on a tile with any Record or value (a no-value Record on a tile still shows the map). */
export function isEmptyFlow(flow: Pick<MoneyMap, "counties" | "national" | "unplaced" | "unknownSupplierCounty">): boolean {
  const zero = (total: { awarded: string; records: number }) => total.records === 0 && BigInt(total.awarded) === 0n;
  return flowRows(flow).length === 0 && zero(flow.national) && (!flow.unplaced || zero(flow.unplaced.total)) && (!flow.unknownSupplierCounty || zero(flow.unknownSupplierCounty));
}
