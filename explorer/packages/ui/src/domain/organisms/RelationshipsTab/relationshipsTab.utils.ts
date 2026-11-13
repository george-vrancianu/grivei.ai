import { scaleBand, scaleLinear } from "d3-scale";
import { color, map } from "../../../theme/tokens.ts";
import type { Bani, RelationshipsCounterparty, RelationshipsTimeline } from "../../types.ts";

/** The graph's drawing box, in SVG units (it scales to the container). */
export const GRAPH_WIDTH = 640;
export const GRAPH_HEIGHT = 440;
export const CENTRE_RADIUS = 30;
/** The largest and smallest counterparty node. A counterparty always gets a node it can be picked by, even with no money. */
export const MAX_NODE_RADIUS = 34;
export const MIN_NODE_RADIUS = 6;
/** Counterparties sit on an ellipse around the centre, a little flatter than the box so labels fit. */
export const ORBIT_X = 235;
export const ORBIT_Y = 145;

/** Edge and node colours (tokens): contracts are amber, direct purchases blue; the Signal ring is the amber of every Signal mark, never red. */
export const CONTRACT_COLOR = color.accent;
export const DIRECT_PURCHASE_COLOR = color.directPurchase;
export const SIGNAL_RING_COLOR = color.accent;
/** The centre node, and the surface a counterparty node is filled with (the graph sits on a panel). */
export const CENTRE_COLOR = color.text;
export const NODE_FILL = color.panel;
/** The selected node's outline: a solid light stroke (the map's highlight). The keyboard focus ring is a separate dashed ring, apart from it. */
export const SELECTED_STROKE = map.highlight;
export const FOCUS_COLOR = color.text;
/** Legend marks that stand for no channel in particular, and a won-together edge: hollow marks and dashed lines only. */
export const NEUTRAL_MARK_COLOR = color.idle;
/** The dash pattern of a won-together edge. */
export const WON_TOGETHER_DASH = "5 5";
/** The timeline's bars: all amber alone; with a counterparty picked the overall bars step back to `idle` and its months are amber over them. */
export const TIMELINE_COLOR = color.accent;
export const TIMELINE_DIMMED_COLOR = color.idle;
export const TIMELINE_PICKED_COLOR = color.accent;
/** An edge's width: linear in the counterparty's money between these two, as the drawing does. */
export const MIN_EDGE_WIDTH = 1.5;
export const MAX_EDGE_WIDTH = 9;

export type Channel = "contract" | "directPurchase";

/** value / max in [0, 1] from exact Bani (BigInt); only geometry reads the Number. */
export function share(awarded: Bani, max: Bani): number {
  const top = BigInt(max);
  const value = BigInt(awarded);
  if (top <= 0n || value <= 0n) return 0;
  return Number((value * 1_000_000_000_000n) / top) / 1_000_000_000_000;
}

/** The largest `total.awarded` among the rows, as a Bani string ("0" for none). */
export function maxAwarded(rows: readonly Pick<RelationshipsCounterparty, "total">[]): Bani {
  return rows.reduce((max, row) => (BigInt(row.total.awarded) > BigInt(max) ? row.total.awarded : max), "0");
}

/** Node radius: area proportional to money (sqrt), between `MIN_NODE_RADIUS` and `MAX_NODE_RADIUS`. */
export function nodeRadius(awarded: Bani, max: Bani): number {
  return Math.max(MIN_NODE_RADIUS, MAX_NODE_RADIUS * Math.sqrt(share(awarded, max)));
}

/**
 * The channel an edge is coloured by: the one holding the most RON with that counterparty. The graph shows one colour per counterparty, not a split
 * (the tooltip and the accessible name give both amounts); a tie reads as contract.
 */
export function dominantChannel(row: Pick<RelationshipsCounterparty, "viaContract" | "viaDirectPurchase">): Channel {
  return BigInt(row.viaDirectPurchase.awarded) > BigInt(row.viaContract.awarded) ? "directPurchase" : "contract";
}

/** Edge width for a counterparty: `MIN_EDGE_WIDTH` for no money up to `MAX_EDGE_WIDTH` for the largest. */
export function edgeWidth(awarded: Bani, max: Bani): number {
  return Math.round((MIN_EDGE_WIDTH + (MAX_EDGE_WIDTH - MIN_EDGE_WIDTH) * share(awarded, max)) * 100) / 100;
}

export const channelColor = (channel: Channel): string => (channel === "contract" ? CONTRACT_COLOR : DIRECT_PURCHASE_COLOR);

/**
 * What a node can be picked by: the counterparty's Entity key. A natural person (ADR 0003: no page, no name) or the unidentified group (a winner nobody could link, a Record
 * with no winner, an unknown authority) has no Entity, so there is no key to filter Records or the timeline by and its node is not pickable.
 */
export function counterpartyKey(row: Pick<RelationshipsCounterparty, "entity" | "naturalPerson">): string | null {
  return row.naturalPerson ? null : (row.entity?.key ?? null);
}

const round = (n: number) => Math.round(n * 100) / 100;

export interface GraphNode {
  row: RelationshipsCounterparty;
  key: string | null;
  x: number;
  y: number;
  r: number;
  channel: Channel;
  /** The edge's stroke width (money, linear). */
  edgeWidth: number;
}

/** Counterparties spread evenly on the ellipse, the first (largest) at the top and the rest clockwise; the centre is (0, 0). */
export function layoutNodes(rows: readonly RelationshipsCounterparty[]): GraphNode[] {
  const max = maxAwarded(rows);
  return rows.map((row, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, rows.length);
    return {
      row,
      key: counterpartyKey(row),
      x: rows.length === 1 ? 0 : round(Math.cos(angle) * ORBIT_X),
      y: rows.length === 1 ? -ORBIT_Y : round(Math.sin(angle) * ORBIT_Y),
      r: nodeRadius(row.total.awarded, max),
      channel: dominantChannel(row),
      edgeWidth: edgeWidth(row.total.awarded, max),
    };
  });
}

export interface TimelineBar {
  month: string;
  x: number;
  width: number;
  /** The overall bar, top edge and height. */
  y: number;
  height: number;
  /** The picked counterparty's bar over it (height 0 when there is none that month or nothing is picked). */
  pickedY: number;
  pickedHeight: number;
}

/**
 * Bars for the months of the overall series (and of the picked series when it has others), left to right.
 * Heights are linear in money on one shared scale, so a picked bar is never taller than the month it belongs to.
 */
export function timelineBars(overall: RelationshipsTimeline, picked: RelationshipsTimeline | null, width: number, height: number): TimelineBar[] {
  const byMonth = (series: RelationshipsTimeline | null) => new Map((series ?? []).map((point) => [point.month, point.total.awarded]));
  const all = byMonth(overall);
  const one = byMonth(picked);
  const months = [...new Set([...all.keys(), ...one.keys()])].sort();
  const max = [...all.values(), ...one.values()].reduce((m, v) => (BigInt(v) > BigInt(m) ? v : m), "0");
  const x = scaleBand<string>().domain(months).range([0, width]).paddingInner(0.2).paddingOuter(0.1);
  const y = scaleLinear().domain([0, 1]).range([height, 0]);
  return months.map((month) => {
    const top = y(share(all.get(month) ?? "0", max));
    const pickedTop = y(share(one.get(month) ?? "0", max));
    return {
      month, x: x(month) ?? 0, width: x.bandwidth(),
      y: top, height: height - top, pickedY: pickedTop, pickedHeight: height - pickedTop,
    };
  });
}
