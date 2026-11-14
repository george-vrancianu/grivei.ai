/**
 * The MainScreen answers recorded from `archive-party` (#181): the Party chip's options and a Party-filtered Total with its coverage. The block
 * "Party filter (#181)" in `seam1.test.ts` compares each answer with `recorded/party/MainScreen.json` and, with `RECORD_FIXTURES=1`, rewrites it.
 * Every case carries the channel chip, so no case shares its variables with the moneymap run's recorded answers (the fixture client matches on variables).
 * The unfiltered case is the one the options ride on: a recorded moneymap run has no AEP archive, so its answers offer none.
 */
import type { FixtureKind } from "@grivei/contract/fixtures";

export interface RecordedPartyCase {
  /** Unique. */
  name: string;
  kind: FixtureKind;
  description: string;
  variables: { filter: Record<string, unknown> };
}

const channel = "DIRECT_PURCHASE";

export const RECORDED_PARTY_CASES: readonly RecordedPartyCase[] = [
  { name: "party-options", kind: "typical", description: "no Party chosen: the lists the chip offers, no coverage", variables: { filter: { channel } } },
  { name: "party-direct-and-subordinate", kind: "typical", description: "a list that leads town halls directly and a hospital through its principal: the Total is direct + subordinate, the coverage names the rest", variables: { filter: { channel, party: "PARTIDUL NAȚIONAL LIBERAL" } } },
  { name: "party-direct-only", kind: "typical", description: "a list with no subordinate bodies in the set", variables: { filter: { channel, party: "PARTIDUL SOCIAL DEMOCRAT" } } },
  { name: "party-alliance", kind: "typical", description: "an alliance matches under its own registered name only", variables: { filter: { channel, party: "ALIANȚA USR PLUS" } } },
  { name: "party-independent", kind: "empty", description: "\"Independent\" is not a list: nothing matches, and the coverage says so", variables: { filter: { channel, party: "Independent" } } },
];
