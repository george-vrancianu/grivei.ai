-- The `withheld` schema: person-level data the load stores but nothing serves (ADR 0003 as amended 2026-11-12, ADR 0009).
-- The API never reads this schema: it is not in `seap.search`, in `seap.record.winners`, in the full-text index or in `core`.
-- Showing these names is a later switch, once a natural-person supplier's public money reaches the Naming threshold and the
-- Go-live conditions of ADR 0009 are met. Derived data: `pipeline rebuild` drops and recreates it from the raw archive (ADR 0004),
-- after the `seap` schema (its rows hang off seap.record). A database dump (backups) holds it: see deploy/README.md.
DROP SCHEMA IF EXISTS withheld CASCADE;
CREATE SCHEMA withheld;

-- One row per natural-person winner slot with a published name. Never a CNP, nor any id that holds one: the name is stored with
-- every run of six or more digits removed (identity.withheld_name), and `had_cnp` only says whether the published id was a CNP.
CREATE TABLE withheld.natural_person_name (
    record_code      text NOT NULL REFERENCES seap.record(code) ON DELETE CASCADE,
    winner_position  integer NOT NULL,          -- 1-based, as seap.search.winner_position and the order of seap.record.winners
    name             text NOT NULL,             -- the winner's name as published (ids removed)
    had_cnp          boolean NOT NULL,          -- the published id was a 13-digit CNP (the CNP itself is never stored)
    PRIMARY KEY (record_code, winner_position)
);
