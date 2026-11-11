-- =====================================================================
--  Loads a batch of SEAP data (JSON produced by connectors/seap_harvest.*)
--  from the import_batch table into the document -> typed -> graph layers.
--
--  Run:  psql -v ON_ERROR_STOP=1 -v batch_id=<id> -f sql/002_load_seap.sql
--  Idempotent: re-running on the same batch does not duplicate rows.
-- =====================================================================

CREATE TABLE IF NOT EXISTS import_batch (
    id          bigserial PRIMARY KEY,
    source_id   text NOT NULL REFERENCES source(id),
    loaded_at   timestamptz NOT NULL DEFAULT now(),
    payload     jsonb NOT NULL
);

BEGIN;

-- The current batch (the latest one if not given explicitly)
CREATE TEMP TABLE cur AS
SELECT payload FROM import_batch
 WHERE id = coalesce(NULLIF(:'batch_id','')::bigint, (SELECT max(id) FROM import_batch WHERE source_id='seap'));

-- ---------------------------------------------------------------
-- 1. DOCUMENTS (raw, with provenance)
-- ---------------------------------------------------------------
INSERT INTO document (source_id, kind, external_id, url, raw)
SELECT 'seap', 'direct_acquisition', d->>'code',
       'https://e-licitatie.ro/pub/direct-acquisition/view/' || (d->>'id'), d
  FROM cur, jsonb_array_elements(cur.payload->'da') d
ON CONFLICT (source_id, kind, external_id) DO UPDATE SET raw = EXCLUDED.raw, fetched_at = now();

INSERT INTO document (source_id, kind, external_id, url, raw)
SELECT 'seap', 'award_notice', n->>'caNoticeId',
       'https://e-licitatie.ro/pub/notices/ca-notices/view-c/' || (n->>'caNoticeId'),
       n || jsonb_build_object('contracts',
             coalesce((SELECT jsonb_agg(c) FROM jsonb_array_elements(cur.payload->'contracts') c
                        WHERE c->>'caNoticeId' = n->>'caNoticeId'), '[]'::jsonb))
  FROM cur, jsonb_array_elements(cur.payload->'notices') n
ON CONFLICT (source_id, kind, external_id) DO UPDATE SET raw = EXCLUDED.raw, fetched_at = now();

-- ---------------------------------------------------------------
-- 2. ENTITIES
-- ---------------------------------------------------------------
-- The contracting authority
CREATE TEMP TABLE auth AS
SELECT upsert_entity('institution', cur.payload->'authority'->>'name', cur.payload->'authority'->>'cui',
                     (SELECT min(id) FROM document WHERE source_id='seap'),
                     (cur.payload->'authority'->>'seapId')::bigint,
                     jsonb_build_object('seap_ca_id', cur.payload->'authority'->>'seapId')) AS id
FROM cur;

-- Suppliers from direct purchases: the "supplier" field looks like "RO 16310091 Q TEST SA" / "22676950 NAME"
CREATE TEMP TABLE da_rows AS
SELECT d, doc.id AS document_id,
       (regexp_match(d->>'supplier', '^\s*(RO\s*)?([0-9]{2,10})\s+(.*)$', 'i')) AS m
  FROM cur, jsonb_array_elements(cur.payload->'da') d
  JOIN document doc ON doc.source_id='seap' AND doc.kind='direct_acquisition' AND doc.external_id = d->>'code';

CREATE TEMP TABLE da_sup AS
SELECT DISTINCT ON (d->>'code')
       d->>'code' AS code,
       upsert_entity('company', coalesce(m[3], d->>'supplier'), m[2], document_id) AS supplier_id
  FROM da_rows;

-- Winners from contracts
CREATE TEMP TABLE win_rows AS
SELECT (c->>'id')::bigint AS contract_id, w, doc.id AS document_id
  FROM cur, jsonb_array_elements(cur.payload->'contracts') c
  JOIN document doc ON doc.source_id='seap' AND doc.kind='award_notice' AND doc.external_id = c->>'caNoticeId',
       jsonb_array_elements(c->'winners') w;

CREATE TEMP TABLE win AS
SELECT contract_id, w->>'name' AS name_as_published,
       upsert_entity('company', w->>'name', w->>'cui', document_id, (w->>'entityId')::bigint,
                     jsonb_strip_nulls(jsonb_build_object('city', w->>'city', 'county', w->>'county',
                                       'country', w->>'country', 'is_sme', (w->>'isSME')::boolean,
                                       'address', w->>'addr'))) AS entity_id
  FROM win_rows;

-- ---------------------------------------------------------------
-- 3. TYPED TABLES
-- ---------------------------------------------------------------
INSERT INTO seap_direct_acquisition (id, code, document_id, authority_id, supplier_id, name, state, cpv,
                                     published_at, finalized_at, estimated_ron, value_ron)
SELECT (d->>'id')::bigint, d->>'code', r.document_id, (SELECT id FROM auth), s.supplier_id,
       d->>'name', d->>'state', d->>'cpv',
       (d->>'pub')::timestamptz, (d->>'fin')::timestamptz, (d->>'est')::numeric, (d->>'val')::numeric
  FROM da_rows r JOIN da_sup s ON s.code = r.d->>'code'
ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, finalized_at=EXCLUDED.finalized_at, value_ron=EXCLUDED.value_ron;

INSERT INTO seap_award_notice (ca_notice_id, notice_no, document_id, authority_id, notice_type_id, title,
                               contract_type, procedure_type, assignment_type, cpv, value_ron, published_at, is_online)
SELECT (n->>'caNoticeId')::bigint, n->>'noticeNo', doc.id, (SELECT id FROM auth), (n->>'typeId')::int, n->>'title',
       n->>'contractType', n->>'procType', n->>'assignType', n->>'cpv', (n->>'value')::numeric,
       (n->>'date')::timestamptz, (n->>'isOnline')::boolean
  FROM cur, jsonb_array_elements(cur.payload->'notices') n
  JOIN document doc ON doc.source_id='seap' AND doc.kind='award_notice' AND doc.external_id = n->>'caNoticeId'
ON CONFLICT (ca_notice_id) DO UPDATE SET title=EXCLUDED.title, value_ron=EXCLUDED.value_ron, published_at=EXCLUDED.published_at;

INSERT INTO seap_contract (id, ca_notice_id, contract_no, contract_date, title, lots, value, currency, value_ron)
SELECT (c->>'id')::bigint, (c->>'caNoticeId')::bigint, c->>'contractNo', (c->>'date')::date, c->>'title',
       c->>'lots', (c->>'value')::numeric, c->>'cur',
       coalesce((c->>'valueRon')::numeric, CASE WHEN c->>'cur'='RON' THEN (c->>'value')::numeric END)
  FROM cur, jsonb_array_elements(cur.payload->'contracts') c
ON CONFLICT (id) DO UPDATE SET value_ron=EXCLUDED.value_ron, contract_date=EXCLUDED.contract_date;

INSERT INTO seap_contract_winner (contract_id, entity_id, name_as_published)
SELECT contract_id, entity_id, name_as_published FROM win
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------
-- 4. GRAPH EDGES (with provenance)
-- ---------------------------------------------------------------
INSERT INTO edge (src_id, dst_id, relation, document_id, ref, valid_from, amount_ron, attrs)
SELECT authority_id, supplier_id, 'DIRECT_PURCHASE', document_id, code, finalized_at::date, value_ron,
       jsonb_build_object('code', code, 'cpv', cpv_code, 'name', name, 'state', state)
  FROM seap_direct_acquisition
 WHERE state = 'Oferta acceptata'          -- only purchases actually concluded become edges; the rest stay in the typed table
ON CONFLICT DO NOTHING;

-- A contract with N winners => N AWARDED_CONTRACT edges (full value on each; attrs.n_winners tells you it is a consortium)
INSERT INTO edge (src_id, dst_id, relation, document_id, ref, valid_from, amount_ron, attrs)
SELECT n.authority_id, w.entity_id, 'AWARDED_CONTRACT', n.document_id, c.id::text, c.contract_date, c.value_ron,
       jsonb_build_object('notice_no', n.notice_no, 'contract_no', c.contract_no, 'contract_id', c.id,
                          'procedure', n.procedure_type, 'cpv', n.cpv_code,
                          'n_winners', (SELECT count(*) FROM seap_contract_winner x WHERE x.contract_id=c.id))
  FROM seap_contract c
  JOIN seap_award_notice n ON n.ca_notice_id = c.ca_notice_id
  JOIN seap_contract_winner w ON w.contract_id = c.id
ON CONFLICT DO NOTHING;

-- Consortia: companies that won the same contract together
INSERT INTO edge (src_id, dst_id, relation, document_id, ref, valid_from, attrs)
SELECT a.entity_id, b.entity_id, 'CONSORTIUM_WITH', n.document_id, c.id::text, c.contract_date,
       jsonb_build_object('contract_id', c.id, 'notice_no', n.notice_no)
  FROM seap_contract_winner a
  JOIN seap_contract_winner b ON a.contract_id=b.contract_id AND a.entity_id < b.entity_id
  JOIN seap_contract c ON c.id=a.contract_id
  JOIN seap_award_notice n ON n.ca_notice_id=c.ca_notice_id
ON CONFLICT DO NOTHING;

COMMIT;
