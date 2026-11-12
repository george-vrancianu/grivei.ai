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
    value_bani       bigint,              -- null = no value in SEAP (blank or zero)
    -- The counting rule (#65, pipeline/counting.py), decided once at load: what the Record adds to a sum. Null = not summed
    -- (no value, a suspect value or a framework ceiling); else = value_bani. Every Total sums this column and nothing else.
    counted_bani     bigint,
    ceiling_bani     bigint,              -- a framework ceiling's value when it is not suspect, else null; the Total's frameworkCeilings sums it
    suspect          boolean NOT NULL DEFAULT false,  -- the rule left it out as a suspect value (= suspect_rule IS NOT NULL)
    framework_role   text CHECK (framework_role IN ('CEILING', 'SUBSEQUENT')),  -- `Incheiat prin`: Cu acord cadru | ... subsecvent
    suspect_rule     text CHECK (suspect_rule IN ('DIRECT_PURCHASE_10X_CAP', 'CONTRACT_100X_ESTIMATE', 'CONTRACT_OVER_50BN')),
    suspect_threshold_bani bigint,        -- the cap in force, or the estimated value (null for CONTRACT_OVER_50BN)
    load_notes       text[] NOT NULL DEFAULT '{}',  -- quirks seen on load, e.g. 'supplier_cui:scientific_notation'
    -- Winners in their published (file row) order: [{"name", "key", "identity", "naturalPerson", "curated", "differsFromAnaf",
    -- "cuiMismatch", "share"}, ...]; `share` is the winner's equal share of the value in bani (a string), only when there are several. A DA or DAN has its one supplier. `key` joins core.entity; a natural person has no key and no
    -- name, and the published id (a CNP) is never stored (ADR 0003). supplier_cui / supplier_name above are the first winner.
    winners          jsonb NOT NULL DEFAULT '[]',
    -- Badges the rebuild sets: the counting rule's (FRAMEWORK_CEILING, SUBSEQUENT_CONTRACT, CONSORTIUM_SHARE, SUSPECT_VALUE,
    -- NO_VALUE) and the identity ones (ADR 0003: CUI_MISMATCH, NAME_DIFFERS_FROM_ANAF, IDENTITY_CURATED). They double as filter chips.
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

-- Framework agreements (#65), one row per award notice that has a framework or subsequent Record: how much of the ceiling the
-- subsequent contracts reported so far use. Filled at the end of the rebuild from seap.record (framework_role, notice_code):
-- a subsequent contract links to its framework by the award notice number it shares with the framework's own contract(s).
CREATE TABLE seap.framework (
    notice_code      text PRIMARY KEY,
    agreement_code   text REFERENCES seap.record(code),  -- the framework Record shown as "the agreement" (lowest code); null when the framework is not loaded
    ceiling_bani     bigint,              -- sum of the notice's framework ceilings that have a value and are not suspect; null when none does
    subsequent_bani  bigint NOT NULL,     -- sum of the notice's subsequent contracts' counted values
    subsequent_count integer NOT NULL,
    ratio            double precision     -- subsequent_bani / ceiling_bani; null when the ceiling is blank
);

-- The search table (#68): one row per Record x winner, money in integer bani, the share precomputed. `pg_search` (BM25) indexes it
-- (`seap.search_bm25`, created by `pipeline/search.py` after the load, inside its transaction, and followed by VACUUM ANALYZE of
-- this table), so the index is part of every load transaction and a load is visible to search only once it commits. Every
-- column the query filters or sums on is in the index; `doc` is the one folded text document per Record (pipeline/fold.py).
CREATE TABLE seap.search (
    id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- the index's key field
    record_code      text NOT NULL REFERENCES seap.record(code),
    winner_position  integer NOT NULL,
    winners          integer NOT NULL,    -- number of winners of the Record
    -- chip columns
    channel          text NOT NULL,
    award_date       date NOT NULL,
    award_year       integer NOT NULL,
    value_bani       bigint,
    value_bucket     text,                -- the ValueBucket enum (contract value-buckets.ts, bani, upper edge inclusive); null = no value
    has_signals      boolean NOT NULL DEFAULT false,  -- Signals arrive with their own tickets; false until then
    badges           text[] NOT NULL DEFAULT '{}',    -- the Record's badges (counting, identity, crawl), also the filter chips
    procedure        text,
    cpv_code         text,                -- as published (45233140-2): a prefix filter and a text token
    -- money
    counted_bani     bigint,              -- the Record's counted value (null: not summed); the authority side sums it once per Record
    ceiling_bani     bigint,              -- as on seap.record (once per Record: sum over winner_position = 1 on the authority side)
    suspect          boolean NOT NULL DEFAULT false,  -- as on seap.record
    share_bani       bigint,              -- this winner's equal share of counted_bani (a sole winner has all of it); the supplier side sums it
    -- placement (#67 fills the county and UAT columns; null until a Source places the entity)
    authority_key    text,                -- the authority's entity key
    authority_cui    text,
    authority_county text,                -- ISO 3166-2:RO, e.g. RO-BV
    authority_uat    text,                -- SIRUTA
    supplier_cui     text,                -- the winner's ANAF-confirmed CUI (= supplier_key then), else null
    supplier_key     text,                -- the winner's entity key (core.entity.key); null for a natural person
    supplier_county  text,
    supplier_spelling text,               -- the winner's name as published on this Record; null for a natural person
    supplier_vat     text,                -- a foreign VAT id, when the key is `vat-<id>`
    supplier_curated boolean NOT NULL DEFAULT false,
    supplier_differs boolean NOT NULL DEFAULT false,  -- the spelling differs from ANAF's name under a confirmed CUI
    doc              text NOT NULL,       -- folded text: title, authority name, every winner's name, CPV code and description, public code, CUIs
    UNIQUE (record_code, winner_position)
);
CREATE INDEX search_award_date_idx ON seap.search (award_date);
