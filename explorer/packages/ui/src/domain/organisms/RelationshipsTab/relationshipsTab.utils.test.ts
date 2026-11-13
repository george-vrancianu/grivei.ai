import { describe, expect, it } from "vitest";
import { color } from "../../../theme/tokens.ts";
import {
  CONTRACT_COLOR, DIRECT_PURCHASE_COLOR, MAX_EDGE_WIDTH, MIN_EDGE_WIDTH, edgeWidth, SIGNAL_RING_COLOR, MAX_NODE_RADIUS, MIN_NODE_RADIUS, channelColor, counterpartyKey, dominantChannel, layoutNodes, maxAwarded,
  nodeRadius, share, timelineBars,
} from "./relationshipsTab.utils.ts";
import {
  authorityTypicalPickedDirectTimeline, authorityTypicalPickedTimeline, authorityTypicalRelationships, supplierPickedRelationships,
} from "../../samples/fixtureData.ts";
import type { RelationshipsCounterparty, RelationshipsTimeline, Total } from "../../types.ts";

const total = (awarded: string, records = 1): Total => ({
  awarded, records, estimated: false, suspectLeftOut: 0, noValue: 0, frameworkCeilings: "0", subsequentReported: "0",
}) as Total;
const row = (key: string | null, awarded: string, direct = "0", contract = awarded, o: Partial<RelationshipsCounterparty> = {}): RelationshipsCounterparty => ({
  entity: key ? { key, displayName: `E${key}`, identity: "CUI" } : null, naturalPerson: key === null,
  total: total(awarded), viaDirectPurchase: total(direct), viaContract: total(contract), wonTogether: false, hasSignals: false, ...o,
});

describe("share and node radius", () => {
  it("is exact on Bani beyond Number's safe range", () => {
    expect(share("9007199254740993000", "9007199254740993000")).toBe(1);
    expect(share("0", "100")).toBe(0);
    expect(share("50", "0")).toBe(0);
    expect(share("25", "100")).toBe(0.25);
  });
  it("gives the largest counterparty the maximum radius and the area follows the money", () => {
    expect(nodeRadius("400", "400")).toBe(MAX_NODE_RADIUS);
    expect(nodeRadius("100", "400")).toBeCloseTo(MAX_NODE_RADIUS / 2);
  });
  it("never goes below the minimum, even with no money", () => {
    expect(nodeRadius("0", "400")).toBe(MIN_NODE_RADIUS);
    expect(nodeRadius("1", "1000000000")).toBe(MIN_NODE_RADIUS);
  });
  it("finds the largest amount", () => {
    expect(maxAwarded([row("1", "30"), row("2", "900"), row("3", "5")])).toBe("900");
    expect(maxAwarded([])).toBe("0");
  });
});

describe("edge style", () => {
  it("colours by the channel holding the most RON with that counterparty", () => {
    expect(dominantChannel(row("1", "100", "70", "30"))).toBe("directPurchase");
    expect(dominantChannel(row("1", "100", "30", "70"))).toBe("contract");
  });
  it("reads a tie as contract", () => {
    expect(dominantChannel(row("1", "100", "50", "50"))).toBe("contract");
  });
  it("uses two different colours", () => {
    expect(channelColor("contract")).toBe(CONTRACT_COLOR);
    expect(channelColor("directPurchase")).toBe(DIRECT_PURCHASE_COLOR);
    expect(CONTRACT_COLOR).not.toBe(DIRECT_PURCHASE_COLOR);
  });
});

describe("counterpartyKey", () => {
  it("is the Entity key", () => expect(counterpartyKey(row("4000001", "1"))).toBe("4000001"));
  it("is null for a natural person, even if an entity were attached", () => {
    expect(counterpartyKey(row(null, "1"))).toBeNull();
    expect(counterpartyKey({ ...row("4000001", "1"), naturalPerson: true })).toBeNull();
  });
});

describe("layoutNodes", () => {
  it("puts the first at the top and spreads the others around", () => {
    const nodes = layoutNodes([row("1", "400"), row("2", "100"), row("3", "100"), row("4", "100")]);
    expect(nodes[0]!.x).toBeCloseTo(0);
    expect(nodes[0]!.y).toBeLessThan(0);
    expect(nodes[1]!.x).toBeGreaterThan(0);
    expect(nodes[2]!.y).toBeGreaterThan(0);
    expect(nodes[3]!.x).toBeLessThan(0);
    expect(nodes[0]!.r).toBeGreaterThan(nodes[1]!.r);
  });
  it("puts a single counterparty above the centre", () => {
    const [node] = layoutNodes([row("1", "400")]);
    expect(node!.x).toBe(0);
    expect(node!.y).toBeLessThan(0);
  });
  it("is empty for no rows", () => expect(layoutNodes([])).toEqual([]));
});

describe("timelineBars", () => {
  const overall: RelationshipsTimeline = [
    { month: "2024-02", total: total("200") }, { month: "2024-01", total: total("400") }, { month: "2024-03", total: total("0") },
  ];
  it("orders the months and scales heights to the largest month", () => {
    const bars = timelineBars(overall, null, 300, 100);
    expect(bars.map((b) => b.month)).toEqual(["2024-01", "2024-02", "2024-03"]);
    expect(bars[0]!.height).toBeCloseTo(100);
    expect(bars[1]!.height).toBeCloseTo(50);
    expect(bars[2]!.height).toBe(0);
    expect(bars[0]!.x).toBeLessThan(bars[1]!.x);
    expect(bars.every((b) => b.pickedHeight === 0)).toBe(true);
  });
  it("draws the picked series on the same scale", () => {
    const bars = timelineBars(overall, [{ month: "2024-01", total: total("100") }], 300, 100);
    expect(bars[0]!.pickedHeight).toBeCloseTo(25);
    expect(bars[1]!.pickedHeight).toBe(0);
  });
  it("adds months only the picked series has", () => {
    const bars = timelineBars(overall, [{ month: "2024-04", total: total("100") }], 300, 100);
    expect(bars.map((b) => b.month)).toContain("2024-04");
  });
  it("is empty for an empty series", () => expect(timelineBars([], null, 300, 100)).toEqual([]));
});

describe("the stories' timelines", () => {
  const sum = (series: RelationshipsTimeline) => series.reduce((acc, p) => acc + BigInt(p.total.awarded), 0n);
  const never = (overall: RelationshipsTimeline, picked: RelationshipsTimeline) => {
    const all = new Map(overall.map((p) => [p.month, BigInt(p.total.awarded)]));
    for (const p of picked) expect(BigInt(p.total.awarded)).toBeLessThanOrEqual(all.get(p.month) ?? 0n);
  };
  it("never draw a picked month taller than the overall month it belongs to", () => {
    never(authorityTypicalRelationships.timeline, authorityTypicalPickedTimeline);
    never(authorityTypicalRelationships.timeline, authorityTypicalPickedDirectTimeline);
  });
  it("sum, overall, to about the shown rows over the top share", () => {
    const { counterparties, timeline } = authorityTypicalRelationships;
    const shown = counterparties.rows.reduce((acc, r) => acc + BigInt(r.total.awarded), 0n);
    expect(Number(sum(timeline)) * counterparties.topShare! / Number(shown)).toBeCloseTo(1, 3);
  });
  it("of a supplier with one authority add up to that authority's row", () => {
    expect(sum(supplierPickedRelationships.timeline)).toBe(BigInt(supplierPickedRelationships.counterparties.rows[0]!.total.awarded));
  });
});

describe("edge width and the dark-ground colours", () => {
  it("is linear in money between the minimum and the maximum width", () => {
    expect(edgeWidth("0", "1000")).toBe(MIN_EDGE_WIDTH);
    expect(edgeWidth("1000", "1000")).toBe(MAX_EDGE_WIDTH);
    expect(edgeWidth("500", "1000")).toBeCloseTo((MIN_EDGE_WIDTH + MAX_EDGE_WIDTH) / 2, 2);
    expect(edgeWidth("5", "0")).toBe(MIN_EDGE_WIDTH);
  });

  it("draws a Signal ring in amber (never red)", () => {
    expect(SIGNAL_RING_COLOR).toBe(color.accent);
  });
});
