-- AEP's local elections as a Reference source (ticket #180, ADR 0012): Mandates of elected leaders, the Leadership list's gaps, which entities are
-- attributed authorities, which subordinate bodies inherit their Party, and Party per Record. Derived data: `pipeline rebuild` drops and recreates
-- it from the raw archive (ADR 0004). Nothing here is served for a supplier: a Party belongs to an authority for a mandate's dates, never to a company.
DROP SCHEMA IF EXISTS aep CASCADE;
CREATE SCHEMA aep;

-- One row per election round read: where it came from and the date its data runs through (the methodology page states these).
CREATE TABLE aep.snapshot (
    election_id   text PRIMARY KEY,               -- local-2020, local-2020-repeat, local-2024, local-2025-partial
    election_date date NOT NULL,
    basis         text NOT NULL CHECK (basis IN ('FINAL_MINUTES', 'REPEAT_ROUND', 'PARTIAL_MINUTES')),
    fetched_at    timestamptz NOT NULL,
    archive_path  text NOT NULL,                  -- the unit directory, relative to the archive root
    data_through  date NOT NULL,                  -- the election date, or the stated date of a one-off file
    races         integer NOT NULL
);

-- A Mandate: one elected leader's term at one area (a UAT's town hall, Bucharest's city hall or a county council). `area` = 'UAT:<siruta>',
-- 'COUNTY:<iso>' or 'GENERAL:B'. A mandate with no end is still in force. No Mandate exists for the handover window, an interim leader or an
-- area without a winner in the results.
CREATE TABLE aep.mandate (
    id            integer PRIMARY KEY,
    area          text NOT NULL,
    office        text NOT NULL CHECK (office IN ('MAYOR', 'COUNTY_PRESIDENT', 'GENERAL_MAYOR')),
    leader_name   text NOT NULL,                  -- as AEP writes it (source data); never linked to a person
    list_name     text NOT NULL,                  -- the list as registered, 'Independent' for an independent leader
    independent   boolean NOT NULL,
    member_parties text[] NOT NULL DEFAULT '{}',  -- an alliance's member parties (pipeline/aep/data/alliances.csv)
    election_id   text NOT NULL REFERENCES aep.snapshot(election_id),
    election_date date NOT NULL,
    basis         text NOT NULL,
    data_through  date NOT NULL,
    votes         integer NOT NULL,
    start_date    date NOT NULL,                  -- assumed oath date (pipeline/aep/mandates.py)
    end_date      date,
    end_basis     text                            -- HANDOVER_START | VACANCY_DATE | PARTIAL_VACANCY_BOUND | null
);
CREATE INDEX mandate_area_idx ON aep.mandate (area, start_date);

CREATE TABLE aep.gap (
    area          text NOT NULL,
    start_date    date NOT NULL,
    end_date      date,
    reason        text NOT NULL CHECK (reason IN ('HANDOVER_WINDOW', 'INTERIM', 'NO_RESULTS'))
);
CREATE INDEX gap_area_idx ON aep.gap (area);

-- The entities that are an attributed authority (town hall, sector, Bucharest city hall, county council) and the area they lead.
CREATE TABLE aep.authority (
    entity_key    text PRIMARY KEY,
    area          text NOT NULL,
    how           text NOT NULL                   -- name | override
);

-- A subordinate body: its principal set is exactly one attributed authority in every held MF snapshot that lists it.
CREATE TABLE aep.subordinate (
    entity_key     text PRIMARY KEY,
    authority_key  text NOT NULL REFERENCES aep.authority(entity_key),
    snapshot_date  date NOT NULL,                 -- the newest snapshot that shows the tie
    snapshots      integer NOT NULL               -- how many held snapshots list the body (all show the same tie)
);

-- Party per Record: the Mandate in force on the award date at the Record's authority (or, for a subordinate body, at its principal credit holder).
CREATE TABLE aep.record_party (
    record_code   text PRIMARY KEY,
    mandate_id    integer NOT NULL REFERENCES aep.mandate(id),
    via_key       text                            -- the principal credit holder's entity key for a subordinate body; null for a direct one
);
