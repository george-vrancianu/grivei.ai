create or replace macro strip_init(s) as array_to_string(list_filter(string_split(s,' '), lambda x: length(x)>2),' ');;
create or replace table pfa as select f.cui, f.forma, canjud(norm(f.jud)) fjud, s.val,
  strip_init(trim(regexp_replace(norm(f.den), ' (PERSOANA FIZICA AUTORIZATA|INTREPRINDERE INDIVIDUALA|INTREPRINDERE FAMILIALA|PFA|II|IF)( .*)?$',''))) pname
 from seap s join firme f on f.cui=s.cui where f.forma in ('PFA','II','IF');;
create or replace table adm as select distinct strip_init(name) pname, dob, bjud, fjud from t;;
create or replace table pm as select p.cui, p.val, count(distinct a.dob) k,
   count(distinct a.dob) filter (where a.bjud=p.fjud or a.fjud=p.fjud) kc
 from pfa p left join adm a using (pname) group by 1,2;;
select 'name only' rule, count(*) suppliers, avg((k=0)::int) none, avg((k=1)::int) unique_, avg((k>1)::int) ambiguous, quantile_cont(k,0.99) p99, sum(val) filter (where k>1)/sum(val) ambig_value_share from pm
union all select 'name + county', count(*), avg((kc=0)::int), avg((kc=1)::int), avg((kc>1)::int), quantile_cont(kc,0.99), sum(val) filter (where kc>1)/sum(val) from pm;;
select pname, fjud from pfa using sample 8
