-- PROTOTYPE (ticket #123), throwaway. Run after measure.py: python -I q.py < conflicts.sql
-- (name, dob) persons with >1 birth locality, then the "hard" ones (dissimilar localities), then across counties.
create or replace table conf as select name, dob, bool_or(named) named, list(distinct bloc) locs, list(distinct bjud) filter (where bjud is not null) juds,
  count(distinct bjud) njud, count(distinct reg) nreg from t where bloc is not null group by 1,2 having count(distinct bloc)>1;;
create or replace macro fold(s) AS replace(replace(s,'TIRGU','TARGU'),'TG ','TARGU ');;
create or replace table hard as
 select c.*, (select min(greatest(jaro_winkler_similarity(fold(a),fold(b)),
            (strpos(fold(a), split_part(fold(b),' ',1))>0 or strpos(fold(b), split_part(fold(a),' ',1))>0)::int))
          from unnest(locs) x(a), unnest(locs) y(b)) sim
 from conf c;;
create or replace table jc as select * from (values ('AB','ALBA'),('AR','ARAD'),('AG','ARGES'),('BC','BACAU'),('BH','BIHOR'),('BN','BISTRITA NASAUD'),('BT','BOTOSANI'),('BV','BRASOV'),('BR','BRAILA'),('B','BUCURESTI'),('BZ','BUZAU'),('CS','CARAS SEVERIN'),('CL','CALARASI'),('CJ','CLUJ'),('CT','CONSTANTA'),('CV','COVASNA'),('DB','DAMBOVITA'),('DJ','DOLJ'),('GL','GALATI'),('GR','GIURGIU'),('GJ','GORJ'),('HR','HARGHITA'),('HD','HUNEDOARA'),('IL','IALOMITA'),('IS','IASI'),('IF','ILFOV'),('MM','MARAMURES'),('MH','MEHEDINTI'),('MS','MURES'),('NT','NEAMT'),('OT','OLT'),('PH','PRAHOVA'),('SM','SATU MARE'),('SJ','SALAJ'),('SB','SIBIU'),('SV','SUCEAVA'),('TR','TELEORMAN'),('TM','TIMIS'),('TL','TULCEA'),('VS','VASLUI'),('VL','VALCEA'),('VN','VRANCEA'),('DIMBOVITA','DAMBOVITA'),('VILCEA','VALCEA'),('IA I','IASI'),('BISTRITA','BISTRITA NASAUD'),('CARAS','CARAS SEVERIN')) t(k,v);;
create or replace macro cj(s) as coalesce((select v from jc where k=trim(regexp_replace(s,' ROMANIA$',''))), trim(regexp_replace(s,' ROMANIA$','')));;
create or replace table hard2 as select h.name, h.dob, h.named, h.nreg, h.sim,
   (select count(distinct cj(x)) from unnest(h.juds) u(x) where cj(x) in (select v from jc) ) nj from hard h;;
select named, count(*) conf, count(*) filter (where sim<0.8) hard, count(*) filter (where sim<0.8 and nj>1) hard_diff_county from hard2 group by 1
