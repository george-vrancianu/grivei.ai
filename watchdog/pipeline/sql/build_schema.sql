-- The build's own tables (spec #285): what the rebuild records about itself, in the graph it builds. Derived data like the rest: `pipeline rebuild` drops and
-- recreates it (ADR 0004). Ticket #291 grows this schema into the build ledger (`build.run`, `build.unit`, and the start, end and fingerprints of a step).
DROP SCHEMA IF EXISTS build CASCADE;
CREATE SCHEMA build;

-- One row per Step of the rebuild (pipeline/build_steps.py), written in the transaction of the Step when it finishes. `summary` is what the Step hands
-- to later Steps and to the run's output beyond what the graph's own tables hold (pipeline/hand_offs.py): `{}` when it has nothing. Deterministic JSON
-- (sorted keys, no timestamps), so a before/after comparison of two builds sees no noise.
CREATE TABLE build.step (
    name     text PRIMARY KEY,
    ordinal  integer NOT NULL UNIQUE,  -- the Step's position in STEPS
    summary  jsonb NOT NULL
);
