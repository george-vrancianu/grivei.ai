-- The `seap` schema: SEAP's typed Record table and search table, joined to the shared core only through entity keys
-- (a CUI today). Derived data: `pipeline rebuild` drops and recreates it from the raw archive (ADR 0004). Money is
-- integer bani everywhere it is summed.
DROP SCHEMA IF EXISTS seap CASCADE;
CREATE SCHEMA seap;

-- One row per archived file that was loaded: the provenance of every Record loaded from it.
CREATE TABLE seap.source_file (
    id          integer PRIMARY KEY,
    kind        text NOT NULL,            -- 'DA' | 'DAN'
    unit        text NOT NULL,            -- '2022Q1'
    file_name   text NOT NULL,
    sha256      text NOT NULL,
    via         text,                     -- the file as the Source titles it
    url         text,
    fetched_at  timestamptz NOT NULL,     -- from the archive manifest
    row_count   integer NOT NULL
);

-- The Record. DA and DAN identity = the public code. Two dates (ADR 0002): publication assigns the quarter,
-- the award date drives aggregation and chips, falling back to the publication date. When a code arrives again with
-- different content, the later publication date wins (a tie: the later file).
CREATE TABLE seap.record (
    code             text PRIMARY KEY,
    kind             text NOT NULL CHECK (kind IN ('DA', 'DAN')),
    channel          text NOT NULL CHECK (channel IN ('DIRECT_PURCHASE', 'CONTRACT')),
    title            text NOT NULL,
    state            text,
    authority_cui    text,
    authority_name   text NOT NULL,
    supplier_cui     text,
    supplier_name    text,
    cpv_code         text,
    cpv_description  text,
    contract_type    text,                -- Furnizare / Servicii / Lucrari, as published (DAN)
    published_on     date NOT NULL,
    quarter          text NOT NULL,       -- from published_on: '2024Q2'
    award_date       date NOT NULL,
    estimated_bani   bigint,
    value_bani       bigint,              -- null = no value in SEAP
    counted_bani     bigint,              -- null = not summed (no value; later: suspect, framework ceiling)
    load_notes       text[] NOT NULL DEFAULT '{}',  -- quirks seen on load, e.g. 'supplier_cui:scientific_notation'
    source_file_id   integer NOT NULL REFERENCES seap.source_file(id)
);

-- TODO (search-engine ticket): nothing reads this table yet; the tracer API serves seap.record. It is filled on every
-- rebuild so the search engine starts from real rows.
-- The search table: one row per Record x winner. The tracer fills the columns the empty-filter Total and Records list
-- need and the folded text document; the chip, placement and pg_search columns arrive with the search engine.
CREATE TABLE seap.search (
    record_code      text NOT NULL REFERENCES seap.record(code),
    winner_position  integer NOT NULL,
    winners          integer NOT NULL,
    channel          text NOT NULL,
    award_date       date NOT NULL,
    award_year       integer NOT NULL,
    value_bani       bigint,
    counted_bani     bigint,
    share_bani       bigint,
    authority_cui    text,
    supplier_cui     text,
    doc              text NOT NULL,
    PRIMARY KEY (record_code, winner_position)
);
CREATE INDEX search_award_date_idx ON seap.search (award_date);
