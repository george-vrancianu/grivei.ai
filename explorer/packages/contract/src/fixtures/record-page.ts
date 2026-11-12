// The hand-written RecordPage fixtures: only the states a recorded run cannot produce yet. Every other Record page is the API's own
// answer (`recorded/RecordPage.json`, recorded by seam 1, ticket #85). Kept by hand and why:
//  - `framework-overrun-signal`: a framework whose subsequent contracts exceed its ceiling (ratio over 100%) with the framework-overrun
//    Signal: that rule is #76 (in progress), and no archive holds an overrun yet.
//  - `no-public-page`: a Record with no `provenance.url` (a code the redirect cannot resolve: RFQA, PCA, ...): the fixture archives hold none
//    of those codes, so it is the recorded crawled-provisional answer under another code, with the URL taken away.
// (A Record inside a splitting Signal, rule #75, is recorded from archive-splitting.) When #76 lands, record the overrun from its
// archive and delete the hand fixture.
import type {
  RecordPageQuery, RecordPageQueryVariables, RecordRowFieldsFragment, SignalFieldsFragment,
} from "../generated/operations.ts";
import { ron } from "./builders.ts";
import { recordedRecordPage } from "./recorded/record.ts";
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

export const recordPageHand: RecordFixtures = [
  fx("framework-overrun-signal", "typical", "a framework agreement whose subsequent contracts exceed its ceiling (112.4%), with the framework-overrun Signal (rule #76, not in the pipeline yet)", "CAN1160100",
    page(w.rFrameworkCeiling, {
      contractType: "Lucrări",
      framework: { ceiling: ron(100_000_000), subsequentReported: ron(112_400_000), ratio: 1.124, agreement: null, subsequent: [w.rSubsequent] },
      signals: [signal(w.sFrameworkOverrun, [w.rFrameworkCeiling, w.rSubsequent])],
    })),
  fx("no-public-page", "extreme", "a Record whose code the redirect cannot resolve (RFQA ...): no URL, so the page says there is no stable public page (the recorded crawled-provisional answer under another code)", "RFQA9100077",
    noPublicPage()),
];

function noPublicPage(): Page {
  const base = recordedRecordPage.find((f) => f.name === "crawled-provisional")!.data.seap.record!;
  return { ...base, code: "RFQA9100077", provenance: { ...base.provenance, url: null } };
}
