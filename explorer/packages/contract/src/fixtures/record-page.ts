import type {
  RecordPageQuery, RecordPageQueryVariables, RecordRowFieldsFragment, SignalFieldsFragment,
} from "../generated/operations.ts";
import { ron } from "./builders.ts";
import type { FixtureSet } from "./types.ts";
import * as w from "./world.ts";

type Page = NonNullable<RecordPageQuery["seap"]["record"]>;

const provenance = (o: Partial<Page["provenance"]> = {}): Page["provenance"] => ({
  source: "SEAP", url: "https://e-licitatie.ro/pub/notices/contract-notices/view/100000",
  via: "data.gov.ro 2024 Q1 Contracte", kind: "BULK", fetchedAt: "2024-10-02T06:15:00Z", ...o,
});

/** A Signal with the Records it consists of, as the Record page lists them. */
const signal = (s: SignalFieldsFragment, records: RecordRowFieldsFragment[]): Page["signals"][number] => ({ ...s, records: records.map(brief) });

const brief = (r: RecordRowFieldsFragment) => ({ code: r.code, title: r.title, date: r.date, value: r.value, counted: r.counted, badges: r.badges });

/** A Record page from a row plus what the page adds. */
const page = (r: RecordRowFieldsFragment, o: Partial<Page> = {}): Page => {
  return {
    code: r.code, title: r.title, date: r.date, kind: r.kind, channel: r.channel, procedure: r.procedure,
    contractType: "Servicii", value: r.value, counted: r.counted, authority: r.authority, winners: r.winners,
    cpv: { code: "90620000-9", description: "Servicii de deszăpezire" },
    badges: r.badges, suspect: null, provenance: provenance(), framework: null,
    signals: [],
    ...o,
  };
};

type RecordFixtures = FixtureSet<RecordPageQuery, RecordPageQueryVariables>;
const fx = (name: string, kind: "typical" | "empty" | "extreme", description: string, code: string, record: Page | null): RecordFixtures[number] => ({
  name, kind, description, variables: { code }, data: { seap: { record } },
});

export const recordPage: RecordFixtures = [
  fx("direct-purchase-over-cap", "typical", "a direct purchase above the cap: over-cap Signal listing its Record", "DA12345678",
    page(w.rDirect, { signals: [signal(w.sOverCap, [w.rDirect])], provenance: provenance({ url: "https://e-licitatie.ro/pub/direct-acquisition/view/200000", via: "data.gov.ro 2024 Q1 Achiziții directe" }) })),
  fx("contract-single-winner", "typical", "a plain contract: one winner, counted in full, no caveats", "CAN1166685",
    page(w.rContract, { contractType: "Lucrări", cpv: { code: "45233140-2", description: "Lucrări de drumuri" } })),
  fx("consortium-contract", "typical", "a consortium Record: full value plus each member's equal share, a natural-person-free winner list", "CAN1170001",
    page(w.rConsortium, { contractType: "Lucrări", cpv: { code: "45221111-3", description: "Lucrări de construcții de poduri" } })),
  fx("consortium-name-only", "typical", "a consortium of a foreign firm and a name-only association: no CUI-keyed entity link for either", "CAN1170002",
    page(w.rConsortiumNameOnly, { contractType: "Furnizare" })),
  fx("framework-ceiling", "typical", "a framework agreement: ceiling not summed, subsequent contracts listed, overrun Signal", "CAN1160100",
    page(w.rFrameworkCeiling, {
      contractType: "Lucrări",
      framework: { ceiling: ron(100_000_000), subsequentReported: ron(112_400_000), ratio: 1.124, agreement: null, subsequent: [w.rSubsequent] },
      signals: [signal(w.sFrameworkOverrun, [w.rFrameworkCeiling, w.rSubsequent])],
    })),
  fx("subsequent-contract", "typical", "a subsequent contract pointing back to its framework", "CAN1180042",
    page(w.rSubsequent, {
      contractType: "Lucrări",
      framework: { ceiling: ron(100_000_000), subsequentReported: ron(112_400_000), ratio: 1.124, agreement: { code: w.rFrameworkCeiling.code, title: w.rFrameworkCeiling.title }, subsequent: [] },
    })),
  fx("framework-blank-ceiling", "extreme", "a framework whose ceiling is blank: no ratio", "CAN1160101",
    page({ ...w.rFrameworkCeiling, code: "CAN1160101", value: null, badges: ["FRAMEWORK_CEILING", "NO_VALUE"] }, {
      framework: { ceiling: null, subsequentReported: "0", ratio: null, agreement: null, subsequent: [] },
    })),
  fx("suspect-value", "extreme", "a suspect value: shown, flagged by the 10x-cap rule, left out of sums", "DA12399999",
    page(w.rSuspect, { suspect: { rule: "DIRECT_PURCHASE_10X_CAP", threshold: ron(270_120) } })),
  fx("suspect-contract-over-estimate", "extreme", "a contract of 1 bn RON or more at 100x its e-licitatie estimate: shown, flagged, left out of sums", "CAN1198888",
    page({ ...w.rSuspect, code: "CAN1198888", kind: "CONTRACT", channel: "CONTRACT", value: ron(5_000_000_000) }, { suspect: { rule: "CONTRACT_100X_ESTIMATE", threshold: ron(40_000_000) } })),
  fx("suspect-contract-no-estimate", "extreme", "a contract above 50 bn RON with no estimate", "CAN1199999",
    page({ ...w.rSuspect, code: "CAN1199999", kind: "CONTRACT", channel: "CONTRACT", value: ron(80_000_000_000) }, { suspect: { rule: "CONTRACT_OVER_50BN", threshold: null } })),
  fx("no-value", "typical", "no value in SEAP, a no-publication Signal", "SCNA700123",
    page(w.rNoValue, { signals: [signal(w.sNoPublication, [w.rNoValue])], cpv: null, contractType: null })),
  fx("natural-person-winner", "typical", "a natural-person winner: never named, never linked", "DA12350005",
    page(w.rNaturalPerson)),
  fx("splitting-signal", "typical", "a Record inside a splitting Signal, which lists its Records", "DA12370002",
    page(w.rSplit2, { signals: [signal(w.sSplitting, [w.rSplit1, w.rSplit2])] })),
  fx("provisional-and-mismatch", "typical", "crawled provisional with no stable public URL, plus the CUI-mismatch and name badges", "CAN1190777",
    page({ ...w.rProvisional, badges: ["CRAWLED_PROVISIONAL", "CUI_MISMATCH", "NAME_DIFFERS_FROM_ANAF", "IDENTITY_CURATED", "CRAWL_ONLY"] }, { provenance: provenance({ url: null, via: null, kind: "CRAWL", fetchedAt: "2024-11-21T02:00:00Z" }) })),
  fx("not-found", "empty", "no Record under that code", "CAN0000000", null),
];
