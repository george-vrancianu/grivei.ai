-- =====================================================================
--  WATCHDOG — base schema (PostgreSQL 14+)
--
--  Principle: a graph of entities (people, companies, institutions) linked
--  by edges that ALWAYS come from a source document.
--  No claim without provenance: every row in `edge` and every
--  alias/attribute points to the `document.id` it was extracted from.
--
--  Layers:
--    1. raw        — what we received from the source, untouched (jsonb)
--    2. typed      — typed tables per domain (procurement, later ONRC, ANI)
--    3. graph      — entity / edge, shared by all domains
--    4. views      — the investigation queries
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- fuzzy name matching
CREATE EXTENSION IF NOT EXISTS unaccent;     -- "Brașov" = "Brasov"

-- ---------------------------------------------------------------------
-- 1. SOURCES AND PROVENANCE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source (
    id          text PRIMARY KEY,               -- 'seap', 'onrc', 'ani', 'mfinante', 'just'
    name        text NOT NULL,
    base_url    text,
    notes       text
);

INSERT INTO source (id, name, base_url, notes) VALUES
 ('seap',     'SEAP / SICAP (e-licitatie.ro)',     'https://e-licitatie.ro', 'Public procurement: award notices, contracts, direct purchases'),
 ('onrc',     'Oficiul Național al Registrului Comerțului', 'https://portal.onrc.ro', 'Shareholders, directors, registered offices (paid access / recom)'),
 ('mfinante', 'Ministerul Finanțelor — balance sheets',   'https://mfinante.gov.ro', 'Turnover, profit, employees per CUI'),
 ('ani',      'Agenția Națională de Integritate',   'https://declaratii.integritate.eu', 'Asset and interest declarations (PDF)'),
 ('just',     'Portalul instanțelor',              'https://portal.just.ro', 'Cases, parties, rulings'),
 ('anaf',     'ANAF — public taxpayer data', 'https://www.anaf.ro', 'VAT status, inactive taxpayers, CUI validity')
ON CONFLICT (id) DO NOTHING;

-- A document = one retrievable unit from the source (a notice, a company record, a PDF).
CREATE TABLE IF NOT EXISTS document (
    id           bigserial PRIMARY KEY,
    source_id    text NOT NULL REFERENCES source(id),
    kind         text NOT NULL,                 -- 'award_notice', 'direct_acquisition', 'company_profile', 'asset_declaration'
    external_id  text NOT NULL,                 -- the id in the source (caNoticeId, DA code, CUI...)
    url          text,
    fetched_at   timestamptz NOT NULL DEFAULT now(),
    content_hash text,                          -- to detect changes between runs
    raw          jsonb NOT NULL,                -- the original payload, untouched
    UNIQUE (source_id, kind, external_id)
);
CREATE INDEX IF NOT EXISTS document_raw_gin ON document USING gin (raw jsonb_path_ops);

-- ---------------------------------------------------------------------
-- 3. THE ENTITY GRAPH  (defined before the typed tables that reference it)
-- ---------------------------------------------------------------------
CREATE TYPE entity_kind AS ENUM ('person', 'company', 'institution', 'other');

CREATE TABLE IF NOT EXISTS entity (
    id             bigserial PRIMARY KEY,
    kind           entity_kind NOT NULL,
    canonical_name text NOT NULL,
    name_norm      text GENERATED ALWAYS AS (lower(regexp_replace(canonical_name, '\s+', ' ', 'g'))) STORED,
    -- "hard" identifiers (make entity resolution deterministic when present)
    cui            text,                        -- tax code without the RO prefix, digits only (companies, institutions)
    onrc_reg_no    text,                        -- J08/123/2001
    seap_entity_id bigint,                      -- SEAP entityId (stable per company within SEAP)
    -- people have no public identifier; resolution is by name + context (see entity_alias)
    attrs          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- city, county, SME, CAEN, etc.
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS entity_cui_uq ON entity (cui) WHERE cui IS NOT NULL;
CREATE INDEX IF NOT EXISTS entity_name_trgm ON entity USING gin (name_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS entity_kind_idx ON entity (kind);

-- Every name an entity has appeared under, with the document it appeared that way in.
CREATE TABLE IF NOT EXISTS entity_alias (
    entity_id    bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    alias        text   NOT NULL,
    alias_norm   text GENERATED ALWAYS AS (lower(regexp_replace(alias, '\s+', ' ', 'g'))) STORED,
    document_id  bigint REFERENCES document(id),
    PRIMARY KEY (entity_id, alias_norm)
);
CREATE INDEX IF NOT EXISTS entity_alias_trgm ON entity_alias USING gin (alias_norm gin_trgm_ops);

-- Relation types. Kept in a table so they are documented, not an enum.
CREATE TABLE IF NOT EXISTS relation_type (
    id          text PRIMARY KEY,
    description text NOT NULL,
    directed    boolean NOT NULL DEFAULT true
);
INSERT INTO relation_type VALUES
 ('AWARDED_CONTRACT',   'institution -> company: awarded contract (SEAP award notice)', true),
 ('DIRECT_PURCHASE',    'institution -> company: completed direct purchase (SEAP)', true),
 ('ADMINISTERS',        'person -> company: administrator / director (ONRC)', true),
 ('OWNS_SHARES',        'person/company -> company: partner / shareholder (ONRC); attrs.pct', true),
 ('HOLDS_OFFICE',       'person -> institution: public office (ANI, HCL)', true),
 ('DECLARED_INTEREST',  'person -> company: named in the declaration of interests (ANI)', true),
 ('DECLARED_ASSET',     'person -> entity/object: asset declaration (ANI)', true),
 ('SAME_ADDRESS',       'entity <-> entity: same registered office', false),
 ('FAMILY',             'person <-> person: declared or public family tie', false),
 ('PARTY_IN_CASE',      'entity -> court case (just.ro)', true),
 ('CONSORTIUM_WITH',    'company <-> company: won together (consortium)', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS edge (
    id           bigserial PRIMARY KEY,
    src_id       bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    dst_id       bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    relation     text   NOT NULL REFERENCES relation_type(id),
    document_id  bigint NOT NULL REFERENCES document(id),   -- PROVENANCE, mandatory
    valid_from   date,
    valid_to     date,
    amount_ron   numeric(18,2),                 -- for contracts / purchases
    ref          text   NOT NULL DEFAULT '',          -- identifies the fact within the document (contract no., DA code)
    attrs        jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (src_id, dst_id, relation, document_id, ref)
);
CREATE INDEX IF NOT EXISTS edge_src_idx ON edge (src_id, relation);
CREATE INDEX IF NOT EXISTS edge_dst_idx ON edge (dst_id, relation);
CREATE INDEX IF NOT EXISTS edge_doc_idx ON edge (document_id);

-- ---------------------------------------------------------------------
-- 2. TYPED TABLES — PUBLIC PROCUREMENT domain (SEAP)
-- ---------------------------------------------------------------------

-- Award notice (CAN / RFQ award / SCN award ...). A notice can have several contracts.
CREATE TABLE IF NOT EXISTS seap_award_notice (
    ca_notice_id     bigint PRIMARY KEY,         -- caNoticeId from SEAP
    notice_no        text NOT NULL,              -- CAN1176289
    document_id      bigint NOT NULL REFERENCES document(id),
    authority_id     bigint NOT NULL REFERENCES entity(id),
    notice_type_id   int,
    title            text,
    contract_type    text,                       -- Lucrari / Servicii / Furnizare
    procedure_type   text,                       -- Licitatie deschisa / Procedura simplificata / Negociere fara publicare...
    assignment_type  text,
    cpv              text,
    cpv_code         text GENERATED ALWAYS AS (substring(cpv from '^[0-9]{8}-[0-9]')) STORED,
    value_ron        numeric(18,2),
    published_at     timestamptz,
    is_online        boolean
);

CREATE TABLE IF NOT EXISTS seap_contract (
    id               bigint PRIMARY KEY,         -- caNoticeContractId
    ca_notice_id     bigint NOT NULL REFERENCES seap_award_notice(ca_notice_id) ON DELETE CASCADE,
    contract_no      text,
    contract_date    date,
    title            text,
    lots             text,
    value            numeric(18,2),
    currency         text,
    value_ron        numeric(18,2)
);

-- A contract can have several winners (consortium).
CREATE TABLE IF NOT EXISTS seap_contract_winner (
    contract_id      bigint NOT NULL REFERENCES seap_contract(id) ON DELETE CASCADE,
    entity_id        bigint NOT NULL REFERENCES entity(id),
    name_as_published text,
    PRIMARY KEY (contract_id, entity_id)
);

-- Direct purchases (below threshold) — high volume, small values, but this is where the "house suppliers" show up.
CREATE TABLE IF NOT EXISTS seap_direct_acquisition (
    id               bigint PRIMARY KEY,         -- directAcquisitionId
    code             text NOT NULL UNIQUE,       -- DA41479203
    document_id      bigint NOT NULL REFERENCES document(id),
    authority_id     bigint NOT NULL REFERENCES entity(id),
    supplier_id      bigint NOT NULL REFERENCES entity(id),
    name             text,
    state            text,
    cpv              text,
    cpv_code         text GENERATED ALWAYS AS (substring(cpv from '^[0-9]{8}-[0-9]')) STORED,
    published_at     timestamptz,
    finalized_at     timestamptz,
    estimated_ron    numeric(18,2),
    value_ron        numeric(18,2)
);
CREATE INDEX IF NOT EXISTS seap_da_supplier_idx ON seap_direct_acquisition (supplier_id);
CREATE INDEX IF NOT EXISTS seap_da_fin_idx ON seap_direct_acquisition (finalized_at);

-- ---------------------------------------------------------------------
-- Utility functions
-- ---------------------------------------------------------------------

-- Normalizes a Romanian tax code: "RO 16310091" / "ro16310091" / "16310091" -> "16310091". Only digits survive: a value that
-- holds anything else once `RO`, spaces and punctuation are gone (a foreign VAT id such as "BG103029862") is NOT a CUI and
-- gives NULL, never the digits inside it (ADR 0003). A 13-digit number is a person's CNP and gives NULL too. This is the
-- legacy loader's cleanup only; the pipeline's rules (check digit, ANAF confirmation) live in watchdog/pipeline/identity.py.
CREATE OR REPLACE FUNCTION norm_cui(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN c ~ '^[0-9]{1,12}$' THEN NULLIF(ltrim(c, '0'), '') END
  FROM (SELECT regexp_replace(regexp_replace(upper(coalesce(t, '')), '[^0-9A-Z]', '', 'g'), '^RO(?=[0-9])', '') AS c) x
$$;

-- Normalized name for comparisons (no diacritics, no legal form, no punctuation)
CREATE OR REPLACE FUNCTION norm_company_name(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(regexp_replace(
           regexp_replace(
             lower(unaccent(coalesce(t,''))),
             '\m(s\.?c\.?|s\.?r\.?l\.?|s\.?a\.?|srl|sa|pfa|i\.?i\.?|s\.?n\.?c\.?|societatea|comerciala)\M', ' ', 'g'),
           '[^a-z0-9]+', ' ', 'g'))
$$;

-- Upsert an entity by CUI (if present) or by SEAP entity id. Returns entity.id. Adds the alias + the provenance document.
-- A row with neither is a new entity: names never merge entities (ADR 0003: `DRUM CONSTRUCT SRL` in Sălaj and in Galați
-- are two companies). The pipeline's name-only suppliers are keyed in pipeline/identity.py, not here.
CREATE OR REPLACE FUNCTION upsert_entity(
    p_kind entity_kind, p_name text, p_cui text, p_document_id bigint,
    p_seap_entity_id bigint DEFAULT NULL, p_attrs jsonb DEFAULT '{}'::jsonb
) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE v_id bigint; v_cui text := norm_cui(p_cui);
BEGIN
  IF v_cui IS NOT NULL THEN
    SELECT id INTO v_id FROM entity WHERE cui = v_cui;
  END IF;
  IF v_id IS NULL AND p_seap_entity_id IS NOT NULL THEN
    SELECT id INTO v_id FROM entity WHERE seap_entity_id = p_seap_entity_id;
  END IF;
  IF v_id IS NULL THEN
    INSERT INTO entity (kind, canonical_name, cui, seap_entity_id, attrs)
    VALUES (p_kind, trim(p_name), v_cui, p_seap_entity_id, p_attrs)
    RETURNING id INTO v_id;
  ELSE
    UPDATE entity SET
      cui = coalesce(cui, v_cui),
      seap_entity_id = coalesce(seap_entity_id, p_seap_entity_id),
      attrs = attrs || p_attrs,
      updated_at = now()
    WHERE id = v_id;
  END IF;
  INSERT INTO entity_alias (entity_id, alias, document_id)
  VALUES (v_id, trim(p_name), p_document_id)
  ON CONFLICT DO NOTHING;
  RETURN v_id;
END $$;
