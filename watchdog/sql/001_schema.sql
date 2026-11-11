-- =====================================================================
--  WATCHDOG — schema de bază (PostgreSQL 14+)
--
--  Principiu: un graf de entități (persoane, firme, instituții) legate
--  prin muchii (edge) care provin ÎNTOTDEAUNA dintr-un document-sursă.
--  Nicio afirmație fără proveniență: fiecare rând din `edge` și fiecare
--  alias/atribut indică `document.id` de unde a fost extras.
--
--  Straturi:
--    1. raw        — ce am primit de la sursă, neatins (jsonb)
--    2. typed      — tabele tipizate per domeniu (achiziții, ulterior ONRC, ANI)
--    3. graph      — entity / edge, comune tuturor domeniilor
--    4. views      — interogările de investigație
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- potrivire fuzzy pe nume
CREATE EXTENSION IF NOT EXISTS unaccent;     -- "Brașov" = "Brasov"

-- ---------------------------------------------------------------------
-- 1. SURSE ȘI PROVENIENȚĂ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS source (
    id          text PRIMARY KEY,               -- 'seap', 'onrc', 'ani', 'mfinante', 'just'
    name        text NOT NULL,
    base_url    text,
    notes       text
);

INSERT INTO source (id, name, base_url, notes) VALUES
 ('seap',     'SEAP / SICAP (e-licitatie.ro)',     'https://e-licitatie.ro', 'Achiziții publice: anunțuri de atribuire, contracte, achiziții directe'),
 ('onrc',     'Oficiul Național al Registrului Comerțului', 'https://portal.onrc.ro', 'Asociați, administratori, sedii (acces contra cost / recom)'),
 ('mfinante', 'Ministerul Finanțelor — bilanțuri',   'https://mfinante.gov.ro', 'Cifra de afaceri, profit, angajați per CUI'),
 ('ani',      'Agenția Națională de Integritate',   'https://declaratii.integritate.eu', 'Declarații de avere și interese (PDF)'),
 ('just',     'Portalul instanțelor',              'https://portal.just.ro', 'Dosare, părți, soluții'),
 ('anaf',     'ANAF — date publice contribuabili', 'https://www.anaf.ro', 'Stare TVA, inactivi, CUI valid')
ON CONFLICT (id) DO NOTHING;

-- Un document = o unitate recuperabilă de la sursă (un anunț, o fișă de firmă, un PDF).
CREATE TABLE IF NOT EXISTS document (
    id           bigserial PRIMARY KEY,
    source_id    text NOT NULL REFERENCES source(id),
    kind         text NOT NULL,                 -- 'award_notice', 'direct_acquisition', 'company_profile', 'asset_declaration'
    external_id  text NOT NULL,                 -- id-ul din sursă (caNoticeId, DA code, CUI...)
    url          text,
    fetched_at   timestamptz NOT NULL DEFAULT now(),
    content_hash text,                          -- pentru a detecta modificări între rulări
    raw          jsonb NOT NULL,                -- payload-ul original, neatins
    UNIQUE (source_id, kind, external_id)
);
CREATE INDEX IF NOT EXISTS document_raw_gin ON document USING gin (raw jsonb_path_ops);

-- ---------------------------------------------------------------------
-- 3. GRAFUL DE ENTITĂȚI  (definit înaintea tabelelor tipizate care îl referă)
-- ---------------------------------------------------------------------
CREATE TYPE entity_kind AS ENUM ('person', 'company', 'institution', 'other');

CREATE TABLE IF NOT EXISTS entity (
    id             bigserial PRIMARY KEY,
    kind           entity_kind NOT NULL,
    canonical_name text NOT NULL,
    name_norm      text GENERATED ALWAYS AS (lower(regexp_replace(canonical_name, '\s+', ' ', 'g'))) STORED,
    -- identificatori "tari" (fac rezoluția entităților deterministă când există)
    cui            text,                        -- cod fiscal fără prefix RO, doar cifre (firme, instituții)
    onrc_reg_no    text,                        -- J08/123/2001
    seap_entity_id bigint,                      -- entityId din SEAP (stabil per firmă în SEAP)
    -- persoanele nu au identificator public; rezoluția e pe nume + context (vezi entity_alias)
    attrs          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- oraș, județ, IMM, CAEN, etc.
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS entity_cui_uq ON entity (cui) WHERE cui IS NOT NULL;
CREATE INDEX IF NOT EXISTS entity_name_trgm ON entity USING gin (name_norm gin_trgm_ops);
CREATE INDEX IF NOT EXISTS entity_kind_idx ON entity (kind);

-- Toate numele sub care a apărut o entitate, cu documentul în care a apărut așa.
CREATE TABLE IF NOT EXISTS entity_alias (
    entity_id    bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    alias        text   NOT NULL,
    alias_norm   text GENERATED ALWAYS AS (lower(regexp_replace(alias, '\s+', ' ', 'g'))) STORED,
    document_id  bigint REFERENCES document(id),
    PRIMARY KEY (entity_id, alias_norm)
);
CREATE INDEX IF NOT EXISTS entity_alias_trgm ON entity_alias USING gin (alias_norm gin_trgm_ops);

-- Tipurile de relații. Le ținem într-un tabel ca să fie documentate, nu enum.
CREATE TABLE IF NOT EXISTS relation_type (
    id          text PRIMARY KEY,
    description text NOT NULL,
    directed    boolean NOT NULL DEFAULT true
);
INSERT INTO relation_type VALUES
 ('AWARDED_CONTRACT',   'instituție -> firmă: contract atribuit (anunț de atribuire SEAP)', true),
 ('DIRECT_PURCHASE',    'instituție -> firmă: achiziție directă finalizată (SEAP)', true),
 ('ADMINISTERS',        'persoană -> firmă: administrator / director (ONRC)', true),
 ('OWNS_SHARES',        'persoană/firmă -> firmă: asociat / acționar (ONRC); attrs.pct', true),
 ('HOLDS_OFFICE',       'persoană -> instituție: funcție publică (ANI, HCL)', true),
 ('DECLARED_INTEREST',  'persoană -> firmă: menționată în declarația de interese (ANI)', true),
 ('DECLARED_ASSET',     'persoană -> entitate/obiect: declarația de avere (ANI)', true),
 ('SAME_ADDRESS',       'entitate <-> entitate: sediu identic', false),
 ('FAMILY',             'persoană <-> persoană: rudenie declarată sau publică', false),
 ('PARTY_IN_CASE',      'entitate -> dosar (just.ro)', true),
 ('CONSORTIUM_WITH',    'firmă <-> firmă: au câștigat împreună (asociere)', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS edge (
    id           bigserial PRIMARY KEY,
    src_id       bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    dst_id       bigint NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
    relation     text   NOT NULL REFERENCES relation_type(id),
    document_id  bigint NOT NULL REFERENCES document(id),   -- PROVENIENȚA, obligatorie
    valid_from   date,
    valid_to     date,
    amount_ron   numeric(18,2),                 -- pentru contracte / achiziții
    ref          text   NOT NULL DEFAULT '',          -- identifică faptul în interiorul documentului (nr. contract, cod DA)
    attrs        jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE (src_id, dst_id, relation, document_id, ref)
);
CREATE INDEX IF NOT EXISTS edge_src_idx ON edge (src_id, relation);
CREATE INDEX IF NOT EXISTS edge_dst_idx ON edge (dst_id, relation);
CREATE INDEX IF NOT EXISTS edge_doc_idx ON edge (document_id);

-- ---------------------------------------------------------------------
-- 2. TABELE TIPIZATE — domeniul ACHIZIȚII PUBLICE (SEAP)
-- ---------------------------------------------------------------------

-- Anunț de atribuire (CAN / RFQ award / SCN award ...). Un anunț poate avea mai multe contracte.
CREATE TABLE IF NOT EXISTS seap_award_notice (
    ca_notice_id     bigint PRIMARY KEY,         -- caNoticeId din SEAP
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

-- Un contract poate avea mai mulți câștigători (asociere).
CREATE TABLE IF NOT EXISTS seap_contract_winner (
    contract_id      bigint NOT NULL REFERENCES seap_contract(id) ON DELETE CASCADE,
    entity_id        bigint NOT NULL REFERENCES entity(id),
    name_as_published text,
    PRIMARY KEY (contract_id, entity_id)
);

-- Achiziții directe (sub prag) — volum mare, valori mici, dar aici se văd "furnizorii de casă".
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
-- Funcții utilitare
-- ---------------------------------------------------------------------

-- Normalizează un cod fiscal: "RO 16310091" / "ro16310091" / "16310091" -> "16310091"
CREATE OR REPLACE FUNCTION norm_cui(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT NULLIF(regexp_replace(upper(coalesce(t,'')), '[^0-9]', '', 'g'), '')
$$;

-- Nume normalizat pentru comparații (fără diacritice, fără forma juridică, fără punctuație)
CREATE OR REPLACE FUNCTION norm_company_name(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(regexp_replace(
           regexp_replace(
             lower(unaccent(coalesce(t,''))),
             '\m(s\.?c\.?|s\.?r\.?l\.?|s\.?a\.?|srl|sa|pfa|i\.?i\.?|s\.?n\.?c\.?|societatea|comerciala)\M', ' ', 'g'),
           '[^a-z0-9]+', ' ', 'g'))
$$;

-- Upsert entitate după CUI (dacă există) sau după nume normalizat.
-- Întoarce entity.id. Adaugă aliasul + documentul de proveniență.
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
  IF v_id IS NULL AND v_cui IS NULL THEN
    -- fără identificator tare: potrivire exactă pe nume normalizat, același tip
    SELECT e.id INTO v_id FROM entity e
     WHERE e.kind = p_kind AND norm_company_name(e.canonical_name) = norm_company_name(p_name)
     LIMIT 1;
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
