// RecordPage answers recorded from seam 1 runs (ticket #85): the API's own answers for one Record per kind and state, after real
// rebuilds of six small fixture archives (cases: packages/api/test/recordedRecordCases.ts). Rewritten by `RECORD_FIXTURES=1`.
import type { RecordPageQuery, RecordPageQueryVariables } from "../../generated/operations.ts";
import type { FixtureSet } from "../types.ts";
import recordPageJson from "./RecordPage.json" with { type: "json" };

// JSON carries `kind` as a plain string; the recording harness only writes the three FixtureKinds, and the shape of `data` is checked
// against the operation by the fixture tests, so the cast is the typed door.
export const recordedRecordPage = recordPageJson as unknown as FixtureSet<RecordPageQuery, RecordPageQueryVariables>;
