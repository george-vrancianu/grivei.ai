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
    stream      text NOT NULL DEFAULT 'bulk', -- 'bulk' (a published file) | 'crawl' (a crawled day, #77; `unit` is the day, via and url are null) | 'backfill' (a backfilled week, #78; `unit` is its first day)
    load_notes  text[] NOT NULL DEFAULT '{}'  -- what the load left out of the file, e.g. `set_aside:CONTRACT:from_line_415944:87912_rows` (a file that switches kind partway)
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
-- The Coverage lens (#80) reads the distinct authorities of a date window straight from the Records (an index-only scan, not a table scan).
CREATE INDEX record_award_date_authority_idx ON seap.record (award_date, authority_key);

-- How far the crawl is complete at the time of the rebuild, per Record kind (the last day of the unbroken run of complete days
-- after the kind's last bulk quarter, derived from the archive; the cursor itself may be further when there are holes): what
-- `sources` reports as the data-through date of the crawled kinds.
CREATE TABLE seap.crawl_state (
    stream  text NOT NULL,      -- the crawl kind in the archive, e.g. 'award-notices'
    kind    text NOT NULL,      -- the Record kind it yields: CONTRACT or AWARD_NOTICE
    through date NOT NULL,
    PRIMARY KEY (stream, kind)
);

-- The Coverage grid (#79): one row per (quarter, record kind) from 2021 Q1 to the quarter of the rebuild's day, computed at the end of
-- every rebuild (pipeline/coverage/grid.py holds the states and their precedence). `quarter` is the contract's `2024-Q4`; state and rule
-- are the contract's GapState and GapRule; `note` is the hand-entered gap's reason, verbatim (null otherwise).
CREATE TABLE seap.coverage_cell (
    quarter       text NOT NULL,
    kind          text NOT NULL CHECK (kind IN ('DA', 'DAN', 'CONTRACT', 'AWARD_NOTICE')),
    state         text NOT NULL CHECK (state IN ('LOADED', 'KNOWN_GAP', 'POSSIBLY_INCOMPLETE', 'NOT_IN_SOURCE', 'CRAWLED_PROVISIONAL', 'NOT_YET_LOADED')),
    rule          text CHECK (rule IN ('AWAITING_BULK_FILE', 'NO_PRIOR_CALL_BEFORE_BACKFILL', 'COUNT_BELOW_NEIGHBOURS', 'HAND_ENTERED')),
    note          text,
    records       integer NOT NULL,
    data_through  date,
    crawl_only    integer NOT NULL DEFAULT 0,  -- of `records`, the crawl-only ones: crawled or backfilled, not in the bulk file of their quarter (#60/#90)
    PRIMARY KEY (quarter, kind)
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
    has_signals      boolean NOT NULL DEFAULT false,  -- the Record belongs to at least one public Signal (pipeline/signals, set before the rollup and the index are built; a Restricted rule does not count)
    signals          text[] NOT NULL DEFAULT '{}',    -- the rule slugs (OVER_CAP, ...) of the Signals it belongs to, Restricted rules left out (#185): the `signal` filter reads this
    badges           text[] NOT NULL DEFAULT '{}',    -- the Record's badges (counting, identity, crawl), also the filter chips
    procedure        text,
    cpv_code         text,                -- as published (45233140-2): a prefix filter and a text token
    -- money
    counted_bani     bigint,              -- the Record's counted value (null: not summed); the authority side sums it once per Record
    ceiling_bani     bigint,              -- as on seap.record (once per Record: sum over winner_position = 1 on the authority side)
    suspect          boolean NOT NULL DEFAULT false,  -- as on seap.record
    share_bani       bigint,              -- this winner's equal share of counted_bani (a sole winner has all of it); the supplier side sums it
    -- placement (#67 fills these from core.placement in the rebuild; null when the entity is unplaced or a national authority)
    authority_key    text,                -- the authority's entity key
    authority_cui    text,
    authority_county text,                -- ISO 3166-2:RO, e.g. RO-BV
    authority_uat    text,                -- SIRUTA
    -- the Money lens areas (#71): never null, so the map groups on one indexed column. A national authority is NATIONAL (not in its seat's county);
    -- an authority neither ANAF nor SEAP places is UNPLACED; a winner with no county of its own (foreign, unplaced, a natural person, a national entity) is UNKNOWN_SUPPLIER_COUNTY
    authority_area   text NOT NULL DEFAULT 'UNPLACED',               -- 'RO-BV' | 'NATIONAL' | 'UNPLACED'
    supplier_area    text NOT NULL DEFAULT 'UNKNOWN_SUPPLIER_COUNTY', -- 'RO-BV' | 'UNKNOWN_SUPPLIER_COUNTY'
    supplier_cui     text,                -- the winner's ANAF-confirmed CUI (= supplier_key then), else null
    supplier_key     text,                -- the winner's entity key (core.entity.key); null for a natural person
    supplier_county  text,                -- ISO 3166-2:RO, from the supplier's own placement (null when foreign or unplaced)
    supplier_spelling text,               -- the winner's name as published on this Record; null for a natural person
    supplier_vat     text,                -- a foreign VAT id, when the key is `vat-<id>`
    supplier_curated boolean NOT NULL DEFAULT false,
    supplier_differs boolean NOT NULL DEFAULT false,  -- the spelling differs from ANAF's name under a confirmed CUI
    -- Party per Record (#181), copied from aep.record_party at the end of the aep step (null on every row when the Record has no Mandate): the party filter reads these indexed columns
    party            text,                -- the list as registered ('PSD', an alliance's own name); null for no Mandate AND for an Independent leader, who is never a party
    party_basis      text,                -- DIRECT (the authority's own Mandate) | SUBORDINATE (inherited through its principal credit holder); null = no Mandate. Set for an Independent too (the coverage counts it apart)
    doc              text NOT NULL,       -- folded text: title, authority name, every winner's name, CPV code and description, public code, CUIs
    UNIQUE (record_code, winner_position)
);
CREATE INDEX search_award_date_idx ON seap.search (award_date);

-- The rollup (#70): what the empty and chips-only search states read instead of scanning `seap.search`. Filled by
-- `pipeline/rollup.py` inside the load transaction, from the search table, so it is exactly as fresh as the load.
-- The cube: one row per year x channel x value bucket x has-Signals x authority county x supplier county. `records` counts a
-- Record once (on its first winner's row, so it is right whenever the supplier county is not filtered), `awarded` sums the
-- winners' shares (null: no row of the group had a share), the rest are the Total's other numbers, with the same definitions
-- the scan uses (see the API's searchTotal).
CREATE TABLE seap.rollup_cube (
    award_year       integer NOT NULL,
    channel          text NOT NULL,
    value_bucket     text,
    has_signals      boolean NOT NULL,
    authority_county text,
    supplier_county  text,
    records          integer NOT NULL,
    awarded          bigint,
    suspect_left_out integer NOT NULL,
    no_value         integer NOT NULL,
    framework_ceilings bigint NOT NULL
);
-- Per-entity rows: one per (side, entity) x year x channel x value bucket x has-Signals, each Record counted once per entity
-- (a supplier's consortium shares are summed, as in the scan). The two entity tabs are a GROUP BY entity_key over these.
CREATE TABLE seap.rollup_entity (
    side             text NOT NULL,       -- 'AUTHORITY' | 'SUPPLIER'
    entity_key       text NOT NULL,
    award_year       integer NOT NULL,
    channel          text NOT NULL,
    value_bucket     text,
    has_signals      boolean NOT NULL,
    records          integer NOT NULL,
    awarded          bigint,
    suspect_left_out integer NOT NULL,
    no_value         integer NOT NULL,
    framework_ceilings bigint NOT NULL
);
CREATE INDEX rollup_entity_side_idx ON seap.rollup_entity (side, award_year, channel);
-- One entity's rows (the entity page's awards per year, #179).
CREATE INDEX rollup_entity_key_idx ON seap.rollup_entity (entity_key, side);
-- The load generation: one row, a fresh value for every load. The API's result cache is valid for one generation only.
CREATE TABLE seap.rollup_meta (generation text NOT NULL);
-- The 2-character prefixes the tokens of this load start with (the API's cache warms these).
CREATE TABLE seap.rollup_prefix (prefix text PRIMARY KEY);

-- Signals (#74, pipeline/signals/): sets of Records a rule picks out, recomputed from scratch in every load transaction, before the rollup
-- and the search index. A Signal has no public id: `id` is an ordinal of this load only, and the API addresses a Signal by its
-- reproducing filter (`reproduce`).
CREATE TABLE seap.signal (
    id             integer PRIMARY KEY,
    rule           text NOT NULL,        -- the GraphQL SignalRuleSlug: OVER_CAP | SPLITTING | FRAMEWORK_OVERRUN | NO_PUBLICATION | YOUNG_FIRM | NO_CONSTRUCTION_CAEN | AFTER_STRIKE_OFF | INSOLVENCY | FEW_EMPLOYEES | NO_FINANCIAL_STATEMENT | DONOR_TO_PARTY | SOE_BOARD_IN_SUPPLIER (Restricted: never on a search row)
    authority_key  text NOT NULL,        -- one authority per Signal
    last_date      date NOT NULL,        -- dated by its latest Record (award date, ADR 0002)
    first_date     date NOT NULL,
    record_count   integer NOT NULL,
    value_bani     bigint NOT NULL,      -- what its Records add to a sum (counted values): the VALUE_DESC order
    supplier_keys  text[] NOT NULL DEFAULT '{}',  -- every winner entity of its Records, consortium members included; natural persons have no key and are omitted
    numbers        jsonb NOT NULL,       -- the fields of the rule's GraphQL numbers type (bani as strings)
    reproduce      jsonb NOT NULL        -- the RecordFilterValue that returns exactly its Records through seap.search
);
CREATE INDEX signal_authority_idx ON seap.signal (authority_key);
CREATE TABLE seap.signal_member (
    signal_id    integer NOT NULL REFERENCES seap.signal(id),
    record_code  text NOT NULL REFERENCES seap.record(code),
    PRIMARY KEY (signal_id, record_code)
);
CREATE INDEX signal_member_record_idx ON seap.signal_member (record_code);
-- The methodology numbers per rule (story 80), recomputed with the Signals. A rule that has seen no data has no row.
CREATE TABLE seap.signal_rule (
    slug            text PRIMARY KEY,
    window_from     date NOT NULL,       -- 1 January of the first year the rule has Records for
    window_to       date,                -- null: open, up to data_through
    base_rate       double precision NOT NULL,  -- with_signal / authorities in base_rate_year
    base_rate_year  integer NOT NULL,
    data_through    date NOT NULL,       -- the earliest data-through of the Record kinds the rule reads
    authorities     integer NOT NULL,    -- authorities with a Record of the rule's kinds in base_rate_year
    with_signal     integer NOT NULL     -- of those, authorities with a Signal of the rule dated in base_rate_year
);
