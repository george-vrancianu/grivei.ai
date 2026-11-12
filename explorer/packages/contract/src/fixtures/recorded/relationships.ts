// Fixtures recorded from seam 1 runs (ticket #88): the API's own answers to the persisted EntityRelationships, and to the EntityRecords the
// Relationships tab's side panel asks (the Records an entity shares with the picked counterparty), after a real rebuild of
// `watchdog/tests/fixtures/archive-roles` (+ `archive-roles-names`) and `archive-moneymap`. Nothing here is hand-written: the JSON is rewritten by
// `RECORD_FIXTURES=1` (see ../../../README.md) and the seam 1 block "recorded fixtures (#88)" fails when the API drifts from it.
import type { EntityRecordsQuery, EntityRecordsQueryVariables, EntityRelationshipsQuery, EntityRelationshipsQueryVariables } from "../../generated/operations.ts";
import type { FixtureSet } from "../types.ts";
import entityRecordsSidePanelJson from "./EntityRecordsSidePanel.json" with { type: "json" };
import entityRelationshipsJson from "./EntityRelationships.json" with { type: "json" };

// JSON carries `kind` as a plain string; the recording harness only writes the three FixtureKinds, and the shape of `data` is checked
// against the operation by the fixture tests, so the casts are the typed door.
export const recordedEntityRelationships = entityRelationshipsJson as unknown as FixtureSet<EntityRelationshipsQuery, EntityRelationshipsQueryVariables>;
export const recordedEntityRecordsSidePanel = entityRecordsSidePanelJson as unknown as FixtureSet<EntityRecordsQuery, EntityRecordsQueryVariables>;
