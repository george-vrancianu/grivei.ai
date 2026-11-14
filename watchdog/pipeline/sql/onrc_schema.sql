-- The `onrc` schema (spec #173, #175): ONRC's registrations as the open "Firme inregistrate la Registrul Comertului" snapshots list them,
-- joined to the shared core only through the CUI (`registration.cui` = `core.entity.key`, ADR 0018). Derived data: `pipeline rebuild` drops
-- and recreates it from the raw archive (ADR 0004). ONRC carries no CNP and no field is stripped; the people files are ticket #177's.
DROP SCHEMA IF EXISTS onrc CASCADE;
CREATE SCHEMA onrc;

-- One row per held snapshot that was read: the provenance of every fact derived from it. `earliest` marks the first held snapshot: a status
-- or name it already shows is dated "since at least" it, never "first seen".
CREATE TABLE onrc.snapshot (
    snapshot_date date PRIMARY KEY,           -- the date the register is as of
    layout        text NOT NULL CHECK (layout IN ('current', 'legacy')),
    dataset       text,                       -- the data.gov.ro dataset name
    title         text,                       -- the dataset as ONRC titles it
    url           text,                       -- the dataset's public page
    fetched_at    timestamptz NOT NULL,       -- from the archive manifest
    archive_path  text NOT NULL,              -- the unit, relative to the archive root
    companies     integer NOT NULL,           -- registrations the snapshot lists
    earliest      boolean NOT NULL
);

-- The registrations of the newest readable snapshot. `cui` is set only when the CUI passes the check digit (ADR 0018); a registration with
-- none is not an entity. Several registrations can carry one CUI: `primary_for_cui` marks the one the entity's page shows (lowest number).
CREATE TABLE onrc.registration (
    reg_no            text PRIMARY KEY,       -- COD_INMATRICULARE, e.g. J40/1234/2010
    cui               text,
    primary_for_cui   boolean NOT NULL,
    name              text NOT NULL,          -- as ONRC writes it (cedilla letters included)
    registration_date date,                   -- null in the legacy layout
    legal_form        text,
    euid              text,
    county_name       text,                   -- ADR_JUDET as published
    county_iso        text,                   -- ISO 3166-2:RO without `RO-` when it reads as a county (the placement gazetteer), else null
    locality          text,
    address           text,                   -- the registered seat, one line, as published
    postal_code       text,
    snapshot_date     date NOT NULL REFERENCES onrc.snapshot(snapshot_date)
);

-- Authorised CAEN codes of the newest snapshot (the legacy layout has none).
CREATE TABLE onrc.caen (
    reg_no  text NOT NULL,
    code    text NOT NULL,
    version smallint,                         -- the CAEN revision: 0 = 1998, 1 = 2003, 2 = 2008, 3 = 2025 (ONRC's N_VERSIUNE_CAEN)
    PRIMARY KEY (reg_no, code)
);

-- ONRC's status nomenclature (code -> name, as published), from the newest snapshot that carries one.
CREATE TABLE onrc.status_name (
    code          integer PRIMARY KEY,
    name          text NOT NULL,
    snapshot_date date NOT NULL
);

-- Status history, derived by comparing consecutive held snapshots (ONRC's statuses are undated). One row per run of snapshots in which a
-- registration shows a status code: `first_seen` is the first snapshot of the run, `last_seen` the last. A code that disappears and comes back
-- starts a new run. `since_at_least` is set for a run that starts in the earliest held snapshot: the status is at least that old.
CREATE TABLE onrc.status_span (
    reg_no         text NOT NULL,
    code           integer NOT NULL,
    first_seen     date NOT NULL,
    last_seen      date NOT NULL,
    since_at_least boolean NOT NULL,
    PRIMARY KEY (reg_no, code, first_seen)
);

-- The same for the registration's name: every spelling ONRC listed it under, with the snapshots it was seen in. These are aliases only
-- (ADR 0018): they never rename an entity.
CREATE TABLE onrc.name_span (
    reg_no         text NOT NULL,
    name           text NOT NULL,
    first_seen     date NOT NULL,
    last_seen      date NOT NULL,
    since_at_least boolean NOT NULL,
    PRIMARY KEY (reg_no, name, first_seen)
);
