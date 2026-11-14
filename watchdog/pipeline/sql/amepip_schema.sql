-- AMEPIP's list of public enterprises (a Reference source, ticket #183): the companies under OUG 109/2011, as the newest archived list
-- names them. Derived data: `pipeline rebuild` drops and recreates it from the raw archive (ADR 0004). An entity is a public enterprise when
-- its key (the CUI) is in `amepip.enterprise`; the basis shown with it is this row and its snapshot. Nothing else reads this schema.
DROP SCHEMA IF EXISTS amepip CASCADE;
CREATE SCHEMA amepip;

-- One row: the list that was read. snapshot_date is the day AMEPIP published it (the list's data-through date).
CREATE TABLE amepip.snapshot (
    snapshot_date     date PRIMARY KEY,
    fetched_at        timestamptz NOT NULL,
    archive_path      text NOT NULL,              -- the file, relative to the archive root
    dataset_url       text,                       -- AMEPIP's dataset page on data.gov.ro
    via               text,                       -- the resource's title as the portal gives it (source data)
    license           text,
    enterprises       integer NOT NULL
);

CREATE TABLE amepip.enterprise (
    cui                 text PRIMARY KEY,         -- normalised: no `RO`, no leading zeros (an entity's key)
    name                text NOT NULL,            -- as AMEPIP writes it
    registration_number text,                     -- ONRC's J-number as AMEPIP writes it
    status              text,                     -- ONRC status as AMEPIP writes it (Romanian source data)
    first_year          integer,                  -- the first and last financial year AMEPIP holds indicators for
    last_year           integer,
    snapshot_date       date NOT NULL REFERENCES amepip.snapshot(snapshot_date)
);
