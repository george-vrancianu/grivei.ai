-- The build's own tables (spec #285): what the rebuild records about itself, in the graph it builds (the build ledger, GLOSSARY.md). Derived data like the
-- rest: `pipeline rebuild` drops and recreates it (ADR 0004), and it stays in the served graph as build provenance. The ledger code is pipeline/build_ledger.py
-- (the run and the Steps' times, the check a Switchover makes) and pipeline/hand_offs.py (what a Step hands to a later one).
DROP SCHEMA IF EXISTS build CASCADE;
CREATE SCHEMA build;

-- The build itself: one row (the key is always true), inserted by the schema Step, finished in the transaction of the last Step. `state` is 'building'
-- until then and 'complete' after: a Switchover refuses a graph whose run is not complete. `staged` is whether each Step committed on its own (a build
-- beside the live graph) or all of them in one transaction (`--in-place`).
CREATE TABLE build.run (
    one      boolean PRIMARY KEY DEFAULT true CHECK (one),
    started  timestamptz NOT NULL,
    ended    timestamptz,
    state    text NOT NULL,
    staged   boolean NOT NULL,
    -- the pinned inputs (pipeline/pins.py): what this build reads, fixed at its start; a resume reads exactly this set (pipeline/resume.py decides whether it may)
    pinned_units  jsonb NOT NULL,  -- Raw archive fetch directory, relative to the archive root -> sha256 of its manifest.json (null: no manifest at pin time)
    code_version  text NOT NULL,   -- content hash of the pipeline package (and of any input file passed from outside it)
    schema_files  jsonb NOT NULL,  -- sql/*_schema.sql file name -> sha256
    today         date NOT NULL,   -- the day that ends the Coverage grid's last quarter
    pinned_quarantine jsonb NOT NULL  -- the archive's quarantine listing at the start (paths relative to the quarantine area, sorted): a resume reads this listing, not the one of the day it runs
);

-- One row per Step of the rebuild (pipeline/build_steps.py), written in the transaction of the Step when it finishes: a row exists only for a Step that
-- is committed (in a staged build) or will be with the whole build. `summary` is what the Step hands to later Steps and to the run's output beyond what the
-- graph's own tables hold (pipeline/hand_offs.py): `{}` when it has nothing. Deterministic JSON (sorted keys, no timestamps), so a before/after comparison
-- of two builds sees no noise; the times are columns, which the graph dump leaves out.
CREATE TABLE build.step (
    name     text PRIMARY KEY,
    ordinal  integer NOT NULL UNIQUE,  -- the Step's position in STEPS
    summary  jsonb NOT NULL,
    started  timestamptz,
    ended    timestamptz
);
