-- The shared core, entity side (ADR 0003, 0004): entities, their aliases and the ANAF Reference source's companies. Derived
-- data: `pipeline rebuild` recreates these tables from the raw archive. They are joined to SEAP's tables (schema `seap`) only
-- through entity keys: the CUI, `vat-<id>`, `name-<slug>` or a key the identity override file pins. (The operational
-- pipeline ledger, which is not rebuilt, lives beside them and is never dropped here.)
CREATE SCHEMA IF NOT EXISTS core;
DROP TABLE IF EXISTS core.placement, core.uat, core.county, core.alias, core.entity, core.anaf_company CASCADE;

-- One row per CUI ANAF answered "found" for, from the latest archived answer. Placement (#67) reads the address columns:
-- they are stored exactly as ANAF sent them (`sdenumire_Localitate`, `scod_JudetAuto`, `scod_Judet`, `scod_Postal`, ...).
CREATE TABLE core.anaf_company (
    cui               text PRIMARY KEY,           -- normalised: no `RO`, no leading zeros
    name              text NOT NULL,              -- `denumire` as ANAF sent it (cedilla letters included)
    status            text NOT NULL,              -- ACTIV | RADIERE | FUZIUNE ... | INACTIV (see pipeline/anaf.py `status_of`)
    registration      text,                       -- `stare_inregistrare` verbatim
    address           text,                       -- `date_generale.adresa`, the one-line address
    postal_code       text,                       -- `date_generale.codPostal`
    seat              jsonb,                      -- `adresa_sediu_social`: sdenumire_Localitate, scod_Localitate, scod_JudetAuto, scod_Judet, scod_Postal ...
    fiscal_domicile   jsonb,                      -- `adresa_domiciliu_fiscal`
    fetched_at        timestamptz NOT NULL,       -- from the archive manifest
    archive_path      text NOT NULL               -- the response file, relative to the archive root
);

CREATE TABLE core.entity (
    key               text PRIMARY KEY,
    identity          text NOT NULL CHECK (identity IN ('CUI', 'NAME_ONLY')),
    cui               text,
    foreign_vat_id    text,
    display_name      text NOT NULL,
    name_folded       text NOT NULL DEFAULT '',   -- fold(display_name) (pipeline/fold.py): the Go-to lookup of a name query (#69); '' when only legal forms
    anaf_status       text,
    identity_curated  boolean NOT NULL DEFAULT false,
    provenance_source text NOT NULL CHECK (provenance_source IN ('ANAF', 'SEAP')),
    provenance_via    text,                       -- SEAP: the file the latest naming Record came from; ANAF: null
    fetched_at        timestamptz NOT NULL
);

-- Every spelling an entity was published under, with its Record count and first and last award date. Never used to merge.
CREATE TABLE core.alias (
    entity_key        text NOT NULL REFERENCES core.entity(key),
    name              text NOT NULL,
    records           integer NOT NULL,
    first_date        date NOT NULL,
    last_date         date NOT NULL,
    differs_from_anaf boolean NOT NULL,
    PRIMARY KEY (entity_key, name)
);

-- Placement (#67): the geography Reference tables and where each entity sits. Rebuilt from the checked-in tables, the archived
-- ANAF answers, the archived SEAP lookups and the reviewed national-authority file; never edited in place.
CREATE TABLE core.county (
    iso               text PRIMARY KEY,           -- ISO 3166-2:RO without `RO-`: `BV`, `B` for Bucharest
    siruta_jud        text NOT NULL,              -- SIRUTA's JUD code (ANAF's `scod_Judet`)
    name              text NOT NULL               -- Romanian, comma-below diacritics
);

-- One row per UAT and per Bucharest sector (Municipiul Bucuresti itself is its six sectors). lon/lat = Wikidata inside the
-- ANCPI polygon, else ANCPI's point on surface; kept for the maps, not served by the GraphQL API.
CREATE TABLE core.uat (
    siruta            text PRIMARY KEY,
    county_iso        text NOT NULL REFERENCES core.county(iso),
    tip               text NOT NULL,              -- SIRUTA TIP: 1/4 municipality, 2 town, 3 commune, 6 Bucharest sector
    name              text NOT NULL,              -- display name, comma-below diacritics, no MUNICIPIUL / ORAS
    name_folded       text NOT NULL,
    lon               double precision,
    lat               double precision,
    point_source      text CHECK (point_source IN ('wikidata', 'ancpi_pos'))
);

-- Where an entity sits. A row exists when the county is known, or the entity is a national authority. `uat_siruta` null =
-- county known, UAT not. `village_siruta` is stored, never plotted. A national authority keeps the seat it was found at, but
-- the API serves no county or UAT for it (it is not placed in Bucharest on the map).
CREATE TABLE core.placement (
    entity_key        text PRIMARY KEY REFERENCES core.entity(key),
    county_iso        text REFERENCES core.county(iso),
    uat_siruta        text REFERENCES core.uat(siruta),
    village_siruta    text,
    sector            smallint,
    national          boolean NOT NULL,
    national_by       text NOT NULL,              -- award-notice | file | file-override | default
    placed_by         text NOT NULL CHECK (placed_by IN ('ANAF', 'SEAP')),
    located_on        timestamptz,                -- when the answer it came from was fetched
    source_path       text                        -- that answer, relative to the archive root
);
