"""PROTOTYPE (#136), throwaway. Extract per winner: kind, award date, supplier name as SEAP spelled it, supplier CUI, value share (RON),
authority name, authority CUI, from the SEAP Raw archive with the repo's bulk parser.
argv: watchdog_dir archive_dir kind out_file"""
import sys, pathlib
sys.path.insert(0, sys.argv[1])
from pipeline.bulk.records import parse_file

clean = lambda s: (s or '').replace('\t', ' ').replace('\n', ' ').replace('\r', ' ')
archive = pathlib.Path(sys.argv[2]); kind = sys.argv[3]; out = open(sys.argv[4], 'w')
for unitdir in sorted((archive / kind).iterdir()):
    dates = sorted(d for d in unitdir.iterdir() if (d / 'manifest.json').exists())
    if not dates: continue
    for f in sorted(dates[-1].iterdir()):
        if f.name == 'manifest.json': continue
        try:
            recs = parse_file(kind, unitdir.name, f)
        except Exception as e:
            print('error', f, repr(e)[:200], file=sys.stderr, flush=True); continue
        for r in recs:
            ws = r.all_winners
            share = (r.value_bani or 0) / 100 / max(len(ws), 1)
            for w in ws:
                out.write(f"{r.kind}\t{r.award_date.isoformat()}\t{clean(w.name)}\t{w.cui or ''}\t{share:.2f}\t{clean(r.authority_name)}\t{r.authority_cui or ''}\n")
        del recs
        out.flush()
        print(kind, unitdir.name, file=sys.stderr, flush=True)
out.close()
print('done', kind, file=sys.stderr)
