// The hand-written RecordPage fixtures: only the states a recorded run cannot produce yet. Every other Record page is the API's own
// answer (`recorded/RecordPage.json`, recorded by seam 1, ticket #85). Kept by hand and why:
//  - `no-public-page`: a Record with no `provenance.url` (a code the redirect cannot resolve: RFQA, PCA, ...): the fixture archives hold none
//    of those codes, so it is the recorded crawled-provisional answer under another code, with the URL taken away.
// (Records inside a splitting or a framework-overrun Signal are recorded: archive-splitting by #85, archive-framework-overrun by #89.)
import type { RecordPageQuery, RecordPageQueryVariables } from "../generated/operations.ts";
import { recordedRecordPage } from "./recorded/record.ts";
import type { FixtureSet } from "./types.ts";

type Page = NonNullable<RecordPageQuery["seap"]["record"]>;

type RecordFixtures = FixtureSet<RecordPageQuery, RecordPageQueryVariables>;
const fx = (name: string, kind: "typical" | "empty" | "extreme", description: string, code: string, record: Page | null): RecordFixtures[number] => ({
  name, kind, description, variables: { code }, data: { seap: { record } },
});

export const recordPageHand: RecordFixtures = [
  fx("no-public-page", "extreme", "a Record whose code the redirect cannot resolve (RFQA ...): no URL, so the page says there is no stable public page (the recorded crawled-provisional answer under another code)", "RFQA9100077",
    noPublicPage()),
];

function noPublicPage(): Page {
  const base = recordedRecordPage.find((f) => f.name === "crawled-provisional")!.data.seap.record!;
  return { ...base, code: "RFQA9100077", provenance: { ...base.provenance, url: null } };
}
