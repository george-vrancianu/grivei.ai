import duckdb, sys
c = duckdb.connect('/tmp/elink-scratch-PROTOTYPE.duckdb')
for q in sys.stdin.read().split(';;'):
    q=q.strip()
    if not q: continue
    print('>>', q.splitlines()[0][:100]); r=c.execute(q); print(r.fetchdf().to_string(max_colwidth=60)) if r.description else None; print()
