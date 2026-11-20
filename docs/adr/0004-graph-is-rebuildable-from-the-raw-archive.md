# The graph is rebuildable from the raw archive

Every file a Connector fetches (bulk CSVs, crawled award-notice JSON, ANAF responses) is written unchanged and dated to the **raw archive** before anything is loaded. The archive is the record of truth, and Postgres is derived from it. Without the archive, some data would live only in the database: crawl-only rows whose public code never reaches the bulk (ADR 0002), ANAF names as they stood on a given day, and notices SEAP later edits or removes. Losing the database would lose them for good ([decision](https://github.com/george-vrancianu/grivei.ai/issues/27)).

## Considered Options

- **Back up the database only** (`pg_dump` or server snapshots): rejected. It protects against a lost disk but not against a bad load. It can't replay a load under new rules, and it leaves provenance nothing to point at once the Source changes.

## Consequences

- A Postgres/ParadeDB upgrade, or a schema change that won't migrate cleanly, is a rebuild from the archive into a fresh volume beside the old one, switched over after checks. There is no in-place `pg_upgrade`. Each rebuild also proves the archive is complete.
- The archive gets an encrypted off-machine copy every night (restic to object storage). A weekly `pg_dump` goes alongside it, only for fast restores.
- The beside-the-live rebuild is a fresh database in the same cluster (`<db>_next`), swapped in by renaming (a **Switchover**); a major upgrade is the same rebuild into a new cluster on a new volume, then repointing (#82; `watchdog/README.md`).

## Amended 2026-11-13: the archive may hold a derived copy for declared personal fields

[ADR 0016](0016-public-tier-names-follow-their-source-publication-window.md): a Connector may declare personal fields it strips or tokenises at fetch. The archive then holds the file as fetched except those fields, recorded with the original file's hash. Natural persons' names from the fund Sources go to a name sidecar outside the archive, which is a rebuild input with its own backup. SEAP's CNPs are replaced by a marker, and files already archived are rewritten once, with a manifest.

## Amended 2026-11-20: a beside build may be interrupted and resumed

A beside build may be interrupted and resumed; resumed and uninterrupted builds of the same pinned inputs give the same graph (spec #285, #292). The build fixes its inputs at its start (the Raw archive units by manifest checksum, the code version, the schema files, the quarantine listing and the day that ends the Coverage grid) and a resume reads exactly that set; a unit that lands later waits for the next build. A resume happens only when those inputs are unchanged, and the code too, except that a change confined to Steps that have not run yet may be resumed (#295: each Step declares the code it owns); any other difference drops the next database and rebuilds it. The graph is still derived from the archive alone: a resume skips work already committed, it never adds an input. The `onrc` Step commits after every ONRC snapshot (#294), so a resume may continue in the middle of it with the same result. An `--in-place --staged` build into a fresh database nobody reads, the major-upgrade build, may be resumed the same way (#297); `--in-place` alone stays one transaction. A staged build may also be paused on request (the stop file `rebuild.stop`, the first SIGTERM, or `--pause-after`) at the next committed boundary, a Step, a unit or an ONRC snapshot, and resumed by the next run (#296): `paused` is a state of the build ledger and an outcome of the refresh run that is neither a success nor a failure, and the paused next database holds a full extra copy of the graph on disk until it is resumed or cleaned up.
