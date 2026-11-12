// Fixtures recorded from seam 1 runs (ticket #87): the API's own answers to the persisted EntityRecords, after a real rebuild of
// `watchdog/tests/fixtures/archive-roles` (+ `archive-roles-names`), `archive-signals` and `archive-moneymap`. Nothing here is hand-written: the JSON is
// rewritten by `RECORD_FIXTURES=1` (see ../../../README.md) and the seam 1 block "recorded fixtures (#87)" fails when the API drifts from it.
import type { EntityRecordsQuery, EntityRecordsQueryVariables } from "../../generated/operations.ts";
import type { FixtureSet } from "../types.ts";
import entityRecordsJson from "./EntityRecords.json" with { type: "json" };

// JSON carries `kind` as a plain string; the recording harness only writes the three FixtureKinds, and the shape of `data` is checked
// against the operation by the fixture tests, so the cast is the typed door.
export const recordedEntityRecords = entityRecordsJson as unknown as FixtureSet<EntityRecordsQuery, EntityRecordsQueryVariables>;
