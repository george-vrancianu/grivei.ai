-- Firm donations and loans to parties (a Reference source, ticket #182): the firm table of Expert Forum's BaniPartide (CC BY 4.0), loaded once from an
-- archived export. Derived data: `pipeline rebuild` drops and recreates it from the raw archive (ADR 0004). Only CUI-keyed donors and lenders are here
-- (ADR 0009): an individual's row is dropped when the file is read, so no individual's name, CNP or amount reaches this schema, and the donor's published name and
-- the company representative's name are not stored at all (a firm is named by its CUI's entity). Sole traders (PFA, II, IF) are not loaded either: a political
-- donation is not published against a person's name through this section. Amounts are integer bani (RON x 100). Nothing here is ever a Party, a
-- Signal or part of awarded value (ADR 0014); the party-name equivalence table and the match to a Party or mandate are ticket #185's.
DROP SCHEMA IF EXISTS donations CASCADE;
CREATE SCHEMA donations;

-- The archived export the rows were read from: what each donation cites. One row per rebuild (the newest held copy).
CREATE TABLE donations.source_file (
    id              integer PRIMARY KEY,
    database_hash   text NOT NULL,            -- BaniPartide's Datasette database hash the export was taken from
    table_name      text NOT NULL,            -- `Donatori persoane juridice`
    dataset_url     text,                     -- BaniPartide's page for the table
    table_url       text,                     -- the CSV export's own URL
    license         text,                     -- as BaniPartide's metadata gives it (CC Attribution 4.0)
    license_url     text,
    source          text,                     -- Expert Forum
    source_url      text,
    underlying      text,                     -- the underlying source of every row, as BaniPartide's methodology states it
    underlying_url  text,
    archive_path    text NOT NULL,            -- relative to the archive root
    fetched_at      timestamptz NOT NULL,
    row_count       integer NOT NULL,         -- rows in the archived table
    loaded_count    integer NOT NULL,         -- CUI-keyed firm rows kept here
    through_year    integer                   -- the newest year any row covers: the data-through year
);

CREATE TABLE donations.donation (
    id              integer PRIMARY KEY,
    donor_cui       text NOT NULL,            -- normalised: no `RO`, no leading zeros (an entity's key)
    party           text NOT NULL,            -- `Partid` exactly as published: no normalisation, never a Party entity (#185)
    donation_year   integer,                  -- `An`
    donation_date   date,                     -- set only when ONE date is readable from the published cell and it falls in the year
    date_text       text NOT NULL,            -- the published `Data donației`, verbatim (a cell can list several dates or none)
    amount_bani     bigint NOT NULL CHECK (amount_bani > 0),
    kind            text NOT NULL CHECK (kind IN ('DONATION', 'LOAN')),
    source_file_id  integer NOT NULL REFERENCES donations.source_file(id),
    source_row      integer NOT NULL          -- BaniPartide's `rowid` in the export: the row a citation points at
);
CREATE INDEX donation_donor_idx ON donations.donation (donor_cui);
