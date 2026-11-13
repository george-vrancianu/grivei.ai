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
