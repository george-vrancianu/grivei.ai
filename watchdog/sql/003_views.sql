-- =====================================================================
--  Interogări de investigație (views). Toate pornesc din graf (edge) sau
--  din tabelele tipizate SEAP și pot fi filtrate pe orice autoritate.
-- =====================================================================

-- Praguri legale pentru achiziția directă (Legea 98/2016 art. 7 alin. 5, valori în vigoare 2023-2026)
CREATE TABLE IF NOT EXISTS legal_threshold (
    kind text PRIMARY KEY, ron numeric NOT NULL, note text
);
INSERT INTO legal_threshold VALUES
 ('direct_goods_services', 270120, 'achiziție directă produse/servicii, fără TVA'),
 ('direct_works',          900400, 'achiziție directă lucrări, fără TVA')
ON CONFLICT (kind) DO UPDATE SET ron = EXCLUDED.ron;

-- Bani primiți per furnizor de la o autoritate, pe canal (DA vs contract)
CREATE OR REPLACE VIEW v_supplier_totals AS
SELECT a.id AS authority_id, a.canonical_name AS authority,
       s.id AS supplier_id, s.canonical_name AS supplier, s.cui,
       s.attrs->>'county' AS county, (s.attrs->>'is_sme')::boolean AS is_sme,
       count(*) FILTER (WHERE e.relation='DIRECT_PURCHASE')   AS n_direct,
       sum(e.amount_ron) FILTER (WHERE e.relation='DIRECT_PURCHASE')   AS ron_direct,
       count(*) FILTER (WHERE e.relation='AWARDED_CONTRACT')  AS n_contracts,
       sum(e.amount_ron) FILTER (WHERE e.relation='AWARDED_CONTRACT')  AS ron_contracts,
       sum(e.amount_ron) AS ron_total,
       -- valoarea împărțită egal între membrii asocierii (evită numărarea de N ori a aceluiași contract)
       sum(e.amount_ron / greatest((e.attrs->>'n_winners')::int, 1)) AS ron_total_share,
       min(e.valid_from) AS first_seen, max(e.valid_from) AS last_seen
  FROM edge e
  JOIN entity a ON a.id = e.src_id
  JOIN entity s ON s.id = e.dst_id
 WHERE e.relation IN ('DIRECT_PURCHASE','AWARDED_CONTRACT')
 GROUP BY a.id, a.canonical_name, s.id, s.canonical_name, s.cui, s.attrs;

-- Achiziții directe peste pragul legal (ori eroare de introducere, ori problemă reală)
CREATE OR REPLACE VIEW v_da_over_threshold AS
SELECT d.code, d.state, d.finalized_at::date AS finalized, s.canonical_name AS supplier, s.cui,
       d.name, d.cpv_code, d.estimated_ron, d.value_ron,
       CASE WHEN d.cpv_code LIKE '45%' THEN 'direct_works' ELSE 'direct_goods_services' END AS threshold_kind,
       t.ron AS threshold_ron,
       round(d.value_ron / t.ron, 1) AS x_threshold
  FROM seap_direct_acquisition d
  JOIN entity s ON s.id = d.supplier_id
  JOIN legal_threshold t ON t.kind = CASE WHEN d.cpv_code LIKE '45%' THEN 'direct_works' ELSE 'direct_goods_services' END
 WHERE d.value_ron > t.ron;

-- Divizare suspectă: același furnizor, același CPV, mai multe DA în 30 de zile, cumulat peste prag
CREATE OR REPLACE VIEW v_da_possible_splitting AS
WITH g AS (
  SELECT d.supplier_id, d.cpv_code,
         date_trunc('month', d.finalized_at)::date AS month,
         count(*) AS n, sum(d.value_ron) AS total, max(d.value_ron) AS max_single,
         string_agg(d.code, ', ' ORDER BY d.finalized_at) AS codes,
         min(d.name) AS sample_name
    FROM seap_direct_acquisition d
   WHERE d.state = 'Oferta acceptata'
   GROUP BY 1,2,3
)
SELECT s.canonical_name AS supplier, s.cui, g.cpv_code, g.month, g.n, g.total, g.max_single, g.sample_name, g.codes,
       t.ron AS threshold_ron
  FROM g JOIN entity s ON s.id = g.supplier_id
  JOIN legal_threshold t ON t.kind = CASE WHEN g.cpv_code LIKE '45%' THEN 'direct_works' ELSE 'direct_goods_services' END
 WHERE g.n >= 2 AND g.total > t.ron AND g.max_single <= t.ron
 ORDER BY g.total DESC;

-- Proceduri fără competiție reală
CREATE OR REPLACE VIEW v_noncompetitive_awards AS
SELECT n.notice_no, n.published_at::date AS published, n.procedure_type, n.contract_type, n.title,
       c.contract_no, c.contract_date, c.value_ron, s.canonical_name AS winner, s.cui
  FROM seap_award_notice n
  JOIN seap_contract c ON c.ca_notice_id = n.ca_notice_id
  JOIN seap_contract_winner w ON w.contract_id = c.id
  JOIN entity s ON s.id = w.entity_id
 WHERE n.procedure_type ILIKE '%negociere fara%' OR n.procedure_type ILIKE '%fara publicare%';

-- Concentrare: cota primilor N furnizori din total
CREATE OR REPLACE VIEW v_concentration AS
WITH t AS (SELECT supplier, ron_total_share AS ron_total, sum(ron_total_share) OVER () AS grand FROM v_supplier_totals),
     r AS (SELECT supplier, ron_total, grand, row_number() OVER (ORDER BY ron_total DESC) AS rn FROM t)
SELECT rn, supplier, ron_total, round(100*ron_total/grand,2) AS pct,
       round(100*sum(ron_total) OVER (ORDER BY rn)/grand,2) AS cum_pct
  FROM r;

-- Nume de firmă identic, CUI diferit (posibil "firmă-fenix" sau eroare SEAP) — de verificat la ONRC
CREATE OR REPLACE VIEW v_same_name_different_cui AS
SELECT norm_company_name(canonical_name) AS name_norm, count(*) AS n,
       string_agg(canonical_name || ' [' || cui || ']', ' | ') AS variants
  FROM entity WHERE kind='company' AND cui IS NOT NULL
 GROUP BY 1 HAVING count(*) > 1;

-- Rețele de asociere: cine a câștigat împreună cu cine
CREATE OR REPLACE VIEW v_consortia AS
SELECT a.canonical_name AS firm_a, a.cui AS cui_a, b.canonical_name AS firm_b, b.cui AS cui_b,
       count(*) AS n_contracts, string_agg(DISTINCT e.attrs->>'notice_no', ', ') AS notices
  FROM edge e JOIN entity a ON a.id=e.src_id JOIN entity b ON b.id=e.dst_id
 WHERE e.relation='CONSORTIUM_WITH'
 GROUP BY 1,2,3,4 ORDER BY n_contracts DESC;

-- Vecinătatea unei entități în graf (pentru explorare): toate muchiile la 1 pas
CREATE OR REPLACE FUNCTION neighbours(p_entity_id bigint)
RETURNS TABLE (relation text, direction text, other_id bigint, other_name text, other_cui text,
               amount_ron numeric, valid_from date, document_url text)
LANGUAGE sql STABLE AS $$
  SELECT e.relation, 'out', o.id, o.canonical_name, o.cui, e.amount_ron, e.valid_from, d.url
    FROM edge e JOIN entity o ON o.id=e.dst_id JOIN document d ON d.id=e.document_id WHERE e.src_id=p_entity_id
  UNION ALL
  SELECT e.relation, 'in', o.id, o.canonical_name, o.cui, e.amount_ron, e.valid_from, d.url
    FROM edge e JOIN entity o ON o.id=e.src_id JOIN document d ON d.id=e.document_id WHERE e.dst_id=p_entity_id
$$;
