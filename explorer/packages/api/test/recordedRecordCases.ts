/**
 * The cases whose answers are recorded as the contract's RecordPage fixtures (ticket #85): each is one persisted-query request
 * (`RecordPage` for one code), asked of the API after a real rebuild (seam 1). The block "recorded fixtures (#85)" in
 * `seam1.test.ts` compares each answer with the committed JSON and, with `RECORD_FIXTURES=1`, rewrites it. The app's seam 3 tests
 * ask for exactly these variables, so a case here is also a page a test can open. Same convention as `recordedCases.ts` (#83) and
 * `recordedEntityCases.ts` (#86), in its own file.
 *
 * Seven small existing archives, each rebuilt into its own database: `counting` (the counting rule: suspect values, no value, a
 * framework agreement and its subsequent contracts, a consortium with a natural person), `contracts` (contracts and award notices as
 * the Contracte files publish them, with the odd codes), `bulk` (DA and DAN files), `identity` (every identity case, the override
 * file), `crawl` (crawled Records beside the bulk), `signals` (Records inside over-cap and no-publication Signals) and `splitting` (a Record inside a splitting Signal). A code is asked in ONE archive only:
 * the app's fixture client answers by variables, so two archives holding the same code would collide.
 */
import type { FixtureKind } from "@grivei/contract/fixtures";

export type RecordedRecordArchive = "counting" | "contracts" | "bulk" | "identity" | "crawl" | "signals" | "splitting";

export interface RecordedRecordCase {
  operation: "RecordPage";
  /** Unique within its operation. */
  name: string;
  archive: RecordedRecordArchive;
  kind: FixtureKind;
  description: string;
  variables: { code: string };
}

const c = (archive: RecordedRecordArchive, kind: FixtureKind, name: string, code: string, description: string): RecordedRecordCase => ({
  operation: "RecordPage", name, archive, kind, description, variables: { code },
});

export const RECORDED_RECORD_CASES: readonly RecordedRecordCase[] = [
  // counting (archive-counting)
  c("counting", "typical", "direct-purchase-counted", "DA94000002", "a direct purchase just under 10x the cap: value as published = counted value, no badge, and the over-cap Signal that lists it"),
  c("counting", "extreme", "direct-purchase-suspect", "DA94000001", "a direct purchase at 10x the cap or more: shown, flagged by the 10x-cap rule with its threshold, left out of sums"),
  c("counting", "typical", "direct-purchase-no-value", "DA94000009", "a direct purchase with no value in SEAP: the no-value badge, nothing counted"),
  c("counting", "extreme", "contract-suspect-over-estimate", "CAN9810001~1", "a contract of 1 bn RON or more at 100x its e-licitatie estimate: shown, flagged, left out of sums"),
  c("counting", "extreme", "contract-suspect-no-estimate", "CAN9810004~1", "a contract above 50 bn RON with no estimate: shown, flagged, left out of sums"),
  c("counting", "typical", "framework-agreement", "CAN9800001~1", "a framework agreement: ceiling not counted, what its subsequent contracts reported, the ratio, the subsequent contracts listed"),
  c("counting", "typical", "subsequent-contract", "CAN9800001~2", "a subsequent contract pointing back to its framework agreement"),
  c("counting", "extreme", "framework-blank-ceiling", "CAN9800005~1", "a subsequent contract of a framework with a blank ceiling: reported value, no ceiling, no ratio"),
  c("counting", "typical", "consortium-with-natural-person", "CAN9800006~1", "a consortium of three, a natural person among them: full value once, an equal share each (a convention), the person unnamed and unlinked"),
  c("counting", "empty", "not-found", "CAN0000000", "no Record under that code"),
  // contracts (archive-contracts)
  c("contracts", "typical", "contract-single-winner", "CAN9000003~5", "a contract that recurs in a later quarter: one Record carrying the newer notice version, one winner"),
  c("contracts", "typical", "contract-code-with-slash", "CAN9000010~1398514/1", "a subsequent contract whose number holds a slash: the code is encoded in the URL and in the redirect link; its framework agreement and ratio"),
  c("contracts", "typical", "framework-consortium", "CAN9000002~77/2022", "a framework contract won by two firms: a ceiling (not counted) and the consortium marker together"),
  c("contracts", "typical", "award-notice-consortium", "CAN9100002", "an award notice (not a contract): one Record for the notice, two winners sharing it equally"),
  // bulk (archive-bulk)
  c("bulk", "typical", "direct-purchase-pipe-title", "DA91000002", "a direct purchase loaded from a pipe-shaped CSV: the title holds a pipe, provenance names the bulk file"),
  c("bulk", "typical", "direct-purchase-notice", "DAN9100001", "a direct-purchase award notice (DAN): its own kind, the redirect goes to the award-notice page"),
  // identity (archive-identity, with its override file)
  c("identity", "typical", "natural-person-winner", "DA93000008", "a winner published with a CNP: a natural person, never named, never linked"),
  c("identity", "typical", "cui-mismatch", "DA93000009", "a supplier CUI equal to the authority's: unresolved, with the CUI-mismatch badge"),
  c("identity", "typical", "name-differs-from-anaf", "DA93000003", "the supplier is spelled as ANAF's old name: resolved by CUI, with the name-differs badge"),
  c("identity", "typical", "identity-curated", "DA93000013", "a wrong CUI mapped by the override file to the entity it really is: curated and name-differs badges"),
  c("identity", "typical", "consortium-name-only-members", "CAN9700001~C-1", "a consortium of a CUI firm, a natural person and a foreign firm known by its VAT id"),
  // crawl (archive-crawl)
  c("crawl", "typical", "bulk-over-crawl", "CAN9200001~C-1", "a contract the bulk has, crawled too: the bulk version stands, no badge, the redirect link"),
  c("crawl", "typical", "crawl-only", "CAN9200002~C-7", "a crawled contract the bulk does not have (in a quarter it covers): crawl-only badge, crawl provenance, the e-licitatie page"),
  c("crawl", "typical", "crawled-provisional", "CAN9200003~9/2026", "a crawled contract in a quarter the bulk has not reached: provisional badge, the re-crawled version"),
  c("crawl", "typical", "crawled-request-for-quotation", "SCNA9200004~S-1", "a crawled simplified award notice: provisional, linked to the RFQ page"),
  // signals (archive-signals)
  c("signals", "typical", "over-cap-signal", "DA98000001", "a direct purchase above the cap: the over-cap Signal with its two Records and its numbers"),
  c("signals", "typical", "signal-natural-person", "DA98000010", "an over-cap Signal whose only winner is a natural person: no name, no link"),
  c("splitting", "typical", "splitting-signal", "DA97000005", "a direct purchase inside a splitting Signal (three purchases, each under the cap, together over it): the Signal's numbers and its three Records"),
  c("signals", "typical", "no-publication-signal", "CAN9400001", "a backfilled award notice negotiated without prior publication: the no-publication Signal, crawl-only badge and provenance"),
];
