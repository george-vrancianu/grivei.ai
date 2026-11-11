-- =====================================================================
--  Investigation queries (views). All start from the graph (edge) or
--  from the typed SEAP tables and can be filtered on any authority.
-- =====================================================================

-- Legal thresholds for direct purchases (Law 98/2016 art. 7 para. 5, values in force 2023-2026)
CREATE TABLE IF NOT EXISTS legal_threshold (
    kind text PRIMARY KEY, ron numeric NOT NULL, note text
);
INSERT INTO legal_threshold VALUES
 ('direct_goods_services', 270120, 'direct purchase of goods/services, excl. VAT'),
 ('direct_works',          900400, 'direct purchase of works, excl. VAT')
ON CONFLICT (kind) DO UPDATE SET ron = EXCLUDED.ron;

-- Money received per supplier from an authority, by channel (DA vs contract)
CREATE OR REPLACE VIEW v_supplier_totals AS
SELECT a.id AS authority_id, a.canonical_name AS authority,
       s.id AS supplier_id, s.canonical_name AS supplier, s.cui,
       s.attrs->>'county' AS county, (s.attrs->>'is_sme')::boolean AS is_sme,
       count(*) FILTER (WHERE e.relation='DIRECT_PURCHASE')   AS n_direct,
       sum(e.amount_ron) FILTER (WHERE e.relation='DIRECT_PURCHASE')   AS ron_direct,
       count(*) FILTER (WHERE e.relation='AWARDED_CONTRACT')  AS n_contracts,
       sum(e.amount_ron) FILTER (WHERE e.relation='AWARDED_CONTRACT')  AS ron_contracts,
       sum(e.amount_ron) AS ron_total,
       -- value split equally among consortium members (avoids counting the same contract N times)
       sum(e.amount_ron / greatest((e.attrs->>'n_winners')::int, 1)) AS ron_total_share,
       min(e.valid_from) AS first_seen, max(e.valid_from) AS last_seen
  FROM edge e
  JOIN entity a ON a.id = e.src_id
  JOIN entity s ON s.id = e.dst_id
 WHERE e.relation IN ('DIRECT_PURCHASE','AWARDED_CONTRACT')
 GROUP BY a.id, a.canonical_name, s.id, s.canonical_name, s.cui, s.attrs;

-- Direct purchases above the legal threshold (either a data-entry error or a real problem)
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

-- Suspected splitting: same supplier, same CPV, several accepted DAs in the same calendar month,
-- each at or below the threshold, cumulatively above it.
-- Grouping is by calendar month, not a rolling 30-day window: DAs split across a month boundary are not caught.
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

-- Procedures without real competition
CREATE OR REPLACE VIEW v_noncompetitive_awards AS
SELECT n.notice_no, n.published_at::date AS published, n.procedure_type, n.contract_type, n.title,
       c.contract_no, c.contract_date, c.value_ron, s.canonical_name AS winner, s.cui
  FROM seap_award_notice n
  JOIN seap_contract c ON c.ca_notice_id = n.ca_notice_id
  JOIN seap_contract_winner w ON w.contract_id = c.id
  JOIN entity s ON s.id = w.entity_id
 WHERE n.procedure_type ILIKE '%negociere fara%' OR n.procedure_type ILIKE '%fara publicare%';

-- Concentration: the top N suppliers' share of the total
CREATE OR REPLACE VIEW v_concentration AS
WITH t AS (SELECT supplier, ron_total_share AS ron_total, sum(ron_total_share) OVER () AS grand FROM v_supplier_totals),
     r AS (SELECT supplier, ron_total, grand, row_number() OVER (ORDER BY ron_total DESC) AS rn FROM t)
SELECT rn, supplier, ron_total, round(100*ron_total/grand,2) AS pct,
       round(100*sum(ron_total) OVER (ORDER BY rn)/grand,2) AS cum_pct
  FROM r;

-- Identical company name, different CUI (possible "phoenix company" or SEAP error) — check against ONRC
CREATE OR REPLACE VIEW v_same_name_different_cui AS
SELECT norm_company_name(canonical_name) AS name_norm, count(*) AS n,
       string_agg(canonical_name || ' [' || cui || ']', ' | ') AS variants
  FROM entity WHERE kind='company' AND cui IS NOT NULL
 GROUP BY 1 HAVING count(*) > 1;

-- Consortium networks: who won together with whom
CREATE OR REPLACE VIEW v_consortia AS
SELECT a.canonical_name AS firm_a, a.cui AS cui_a, b.canonical_name AS firm_b, b.cui AS cui_b,
       count(*) AS n_contracts, string_agg(DISTINCT e.attrs->>'notice_no', ', ') AS notices
  FROM edge e JOIN entity a ON a.id=e.src_id JOIN entity b ON b.id=e.dst_id
 WHERE e.relation='CONSORTIUM_WITH'
 GROUP BY 1,2,3,4 ORDER BY n_contracts DESC;

-- An entity's neighbourhood in the graph (for exploration): all edges 1 hop away
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
