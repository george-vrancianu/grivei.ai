-- The shared core, entity side (ADR 0003, 0004): entities, their aliases and the ANAF Reference source's companies. Derived
-- data: `pipeline rebuild` recreates these tables from the raw archive. They are joined to SEAP's tables (schema `seap`) only
-- through entity keys: the CUI, `vat-<id>`, `name-<slug>` or a key the identity override file pins. (The operational
-- pipeline ledger, which is not rebuilt, lives beside them and is never dropped here.)
CREATE SCHEMA IF NOT EXISTS core;
DROP TABLE IF EXISTS core.alias, core.entity, core.anaf_company CASCADE;

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
