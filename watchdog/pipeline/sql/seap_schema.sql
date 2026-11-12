-- The `seap` schema: SEAP's typed Record table and search table, joined to the shared core only through entity keys
-- (core.entity.key). Derived data: `pipeline rebuild` drops and recreates it from the raw archive (ADR 0004). Money is
-- integer bani everywhere it is summed.
DROP SCHEMA IF EXISTS seap CASCADE;
CREATE SCHEMA seap;

-- One row per archived file that was loaded: the provenance of every Record loaded from it.
CREATE TABLE seap.source_file (
    id          integer PRIMARY KEY,
    kind        text NOT NULL,            -- 'DA' | 'DAN' | 'CONTRACT' | 'AWARD_NOTICE'
    unit        text NOT NULL,            -- '2022Q1'
    file_name   text NOT NULL,
    sha256      text NOT NULL,
    via         text,                     -- the file as the Source titles it
    url         text,
    fetched_at  timestamptz NOT NULL,     -- from the archive manifest
    row_count   integer NOT NULL,
    stream      text NOT NULL DEFAULT 'bulk'  -- 'bulk' (a published file) | 'crawl' (a crawled day, #77; `unit` is the day, via and url are null) | 'backfill' (a backfilled week, #78; `unit` is its first day)
);

-- The Record. DA and DAN identity = the public code; a CONTRACT is `<award notice code>~<contract number>` (e.g.
-- CAN1069731~54202) and an AWARD_NOTICE is its notice code (ADR 0002 as amended), so `code` is the one public key. Two dates (ADR 0002): publication assigns the quarter,
-- the award date drives aggregation and chips, falling back to the publication date. When a code arrives again with
-- different content, the later publication date wins (a tie: the later file).
CREATE TABLE seap.record (
    code             text PRIMARY KEY,
    kind             text NOT NULL CHECK (kind IN ('DA', 'DAN', 'CONTRACT', 'AWARD_NOTICE')),
    channel          text NOT NULL CHECK (channel IN ('DIRECT_PURCHASE', 'CONTRACT')),
    title            text NOT NULL,
    state            text,
    authority_cui    text,                -- the authority's normalised CUI, when it passes the check digit
    authority_key    text,                -- its entity key (core.entity.key): the CUI, else `name-<slug>`
    authority_name   text NOT NULL,
    supplier_cui     text,                -- the first winner's ANAF-confirmed CUI (its entity key), else null
    supplier_name    text,                -- the first winner's spelling; null for a natural person (ADR 0003)
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
    -- Winners in their published (file row) order: [{"name", "key", "identity", "naturalPerson", "curated", "differsFromAnaf",
    -- "cuiMismatch"}, ...]. A DA or DAN has its one supplier. `key` joins core.entity; a natural person has no key and no
    -- name, and the published id (a CNP) is never stored (ADR 0003). supplier_cui / supplier_name above are the first winner.
    winners          jsonb NOT NULL DEFAULT '[]',
    -- Identity badges (ADR 0003): CUI_MISMATCH, NAME_DIFFERS_FROM_ANAF, IDENTITY_CURATED.
    badges           text[] NOT NULL DEFAULT '{}',
    -- Contracts and award notices (null / empty for DA and DAN). Kept for the counting rule (#65): the framework
    -- column and the award notice a subsequent contract links to its framework by.
    notice_code      text,                -- the award notice (CAN / SCNA ...)
    contract_numbers text[] NOT NULL DEFAULT '{}',  -- a contract: its number; an award notice: its contracts
    procedure        text,
    concluded_by     text,                -- `Incheiat prin`: Cu acord cadru | Cu acord cadru subsecvent | Fara acord cadru
    initiation_code  text,                -- the initiation notice (CN / SCN ...), when the file has it
    lot_count        integer,
    -- How it was obtained (#77). A bulk Record supersedes a crawled one of the same code whatever the dates; a crawled Record
    -- the bulk does not have stays. crawl_status is set after the load, for the crawled survivors only: PROVISIONAL when no
    -- bulk file of its kind and quarter is loaded (the bulk has not reached it), CRAWL_ONLY when one is (and has no match).
    via              text NOT NULL DEFAULT 'BULK' CHECK (via IN ('BULK', 'CRAWL')),
    crawl_status     text CHECK (crawl_status IN ('PROVISIONAL', 'CRAWL_ONLY')),
    url              text,                -- crawled Records: the e-licitatie page, built at load time from the notice type and version
    ca_notice_id     bigint,              -- crawled Records: the internal id
    sys_notice_type_id    integer,
    sys_notice_version_id integer,
    source_file_id   integer NOT NULL REFERENCES seap.source_file(id)
);

-- How far the crawl is complete at the time of the rebuild, per Record kind (the last day of the unbroken run of complete days
-- after the kind's last bulk quarter, derived from the archive; the cursor itself may be further when there are holes): what
-- `sources` reports as the data-through date of the crawled kinds.
CREATE TABLE seap.crawl_state (
    stream  text NOT NULL,      -- the crawl kind in the archive, e.g. 'award-notices'
    kind    text NOT NULL,      -- the Record kind it yields: CONTRACT or AWARD_NOTICE
    through date NOT NULL,
    PRIMARY KEY (stream, kind)
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
    supplier_cui     text,                -- the winner's ANAF-confirmed CUI (= supplier_key then), else null
    supplier_key     text,                -- the winner's entity key (core.entity.key); null for a natural person
    supplier_spelling text,               -- the winner's name as published on this Record; null for a natural person
    supplier_vat     text,                -- a foreign VAT id, when the key is `vat-<id>`
    supplier_curated boolean NOT NULL DEFAULT false,
    supplier_differs boolean NOT NULL DEFAULT false,  -- the spelling differs from ANAF's name under a confirmed CUI
    doc              text NOT NULL,
    PRIMARY KEY (record_code, winner_position)
);
CREATE INDEX search_award_date_idx ON seap.search (award_date);
