// Fixtures recorded from seam 1 runs (ticket #86): the API's own answers to the persisted EntityOverview, after a real rebuild of
// `watchdog/tests/fixtures/archive-roles` (+ `archive-roles-names`) and `archive-signals`. Nothing here is hand-written: the JSON is
// rewritten by `RECORD_FIXTURES=1` (see ../../../README.md) and the seam 1 block "recorded fixtures (#86)" fails when the API
// drifts from it. Kept in its own file so each operation's recording is its own change (the main screen's, #83, is in ./index.ts).
import type { EntityOverviewQuery, EntityOverviewQueryVariables } from "../../generated/operations.ts";
import type { FixtureSet } from "../types.ts";
import entityOverviewJson from "./EntityOverview.json" with { type: "json" };

// JSON carries `kind` as a plain string; the recording harness only writes the three FixtureKinds, and the shape of `data` is checked
// against the operation by the fixture tests, so the cast is the typed door.
export const recordedEntityOverview = entityOverviewJson as unknown as FixtureSet<EntityOverviewQuery, EntityOverviewQueryVariables>;
