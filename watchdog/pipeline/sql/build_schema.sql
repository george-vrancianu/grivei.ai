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

-- One row per Step of the rebuild (pipeline/build_steps.py), written in the transaction of the Step when it finishes (for `units`, which commits per unit, in a small final one): a row exists only for a Step that
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

-- One row per Raw archive unit the `units` Step's loop has finished (pipeline/build_steps.py `_load_units`), whatever its outcome (loaded, skipped or
-- quarantined), written in the unit's own transaction: a staged build commits each unit with its source_file, record and search rows, so a row means the
-- unit is committed and a resume continues from the next one (pipeline/resume.py). The per-unit lists the Step used to keep in its build.step row (duplicate
-- files, files set aside, the quarantine, the bulk row counts) live here and nowhere else (pipeline/hand_offs.py reads them back, in `ordinal` order).
-- Deterministic like the rest of `build`: no serial id and no times (a resumed build must dump the same rows), paths relative to the archive root.
CREATE TABLE build.unit (
    ordinal          integer PRIMARY KEY,  -- the unit's position in the loop, 1-based, oldest fetch first: the committed rows are always 1..N
    path             text NOT NULL UNIQUE, -- the fetch directory, relative to the archive root
    manifest_sha256  text,                 -- from the pinned inputs (build.run.pinned_units): null when it had no manifest at pin time
    status           text NOT NULL CHECK (status IN ('loaded', 'skipped', 'quarantined')),
    reason           text,                 -- why it was skipped or quarantined
    units_total      integer NOT NULL,     -- the units the loop planned: the same in every row (a resume names "unit N of M" from it)
    files            integer NOT NULL,     -- files its manifest lists
    rows             integer NOT NULL,     -- data rows read from them, duplicates included
    records          integer NOT NULL,     -- Records the files hold
    files_loaded     integer NOT NULL,     -- seap.source_file rows it created
    bulk_kind        text,                 -- of a loaded bulk unit: its Coverage cell (kind label and quarter), and `rows` is what the cell's largest unit says
    bulk_year        integer,
    bulk_quarter     integer,
    duplicate_files  jsonb NOT NULL DEFAULT '[]',  -- the files byte-identical to one already planned: relative paths, in order
    set_aside        jsonb NOT NULL DEFAULT '[]',  -- the tails set aside: [{"path", "line", "kind", "rows", "last_published"}]
    quarantined_to   text,                 -- of a quarantined unit: where its directory goes (relative to the archive root); the row commits BEFORE the move
    problems         jsonb NOT NULL DEFAULT '[]'   -- of a quarantined unit: the problems its reason file lists (a resume that finds the move pending writes the same file)
);
-- One row per ONRC snapshot the `onrc` Step handled (pipeline/onrc/build.py), written in the transaction that holds the snapshot's span work: a staged build
-- commits after every snapshot, so a resume continues from the next one and reads from these rows what the interrupted Step had done. A snapshot that did not
-- read is set aside (`applied` false, `skipped` the message). No timestamps: the rows of a resumed build equal an uninterrupted build's.
CREATE TABLE build.snapshot (
    snapshot_date  date PRIMARY KEY,
    ordinal        integer NOT NULL UNIQUE,  -- the snapshot's position in the Step's loop (oldest first)
    applied        boolean NOT NULL,
    skipped        text  -- why it was set aside; null when applied
);
