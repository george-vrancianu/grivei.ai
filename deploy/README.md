# Running the explorer (Docker Compose)

One Compose project, `compose.yaml` at the repo root, inside WSL2. Run everything from the repo root, in the WSL ext4 filesystem (not under `/mnt/c`).

| Service | What | Limits | Reachable at |
| --- | --- | --- | --- |
| `db` | ParadeDB Postgres (`paradedb/paradedb:0.26.6-pg18`, pinned), `shared_buffers` 3 GB | 8 CPU, 12 GB | compose network only |
| `api` | the TypeScript GraphQL API (`explorer/packages/api`), persisted queries only | 2 CPU, 2 GB | via Caddy at `/graphql` |
| `web` | Caddy: `site/` at `/` and `/ro/`, the explorer build at `/explore/` and `/ro/explore/`, `/graphql` proxied to the API | 2 CPU, 2 GB | http://localhost:8080 |
| `pipeline` | one-shot Python pipeline (profile `pipeline`, not started by `up`) | 2 CPU, 2 GB | `docker compose run` |

## Start

```bash
docker compose up -d --build        # db, api, web
docker compose run --rm pipeline rebuild   # fill the database from the raw archive (first time, and after any new file)
```

Then open http://localhost:8080/ (landing page, English), http://localhost:8080/ro/ (Romanian), http://localhost:8080/explore/ and http://localhost:8080/ro/explore/ (the explorer). Until a `rebuild` has run, the explorer says the data could not be loaded (there is no `seap` schema yet).

## Where the data lives

- **Postgres:** the named volume `pgdata` (on the WSL ext4 disk, under Docker's data root). The graph is derived: losing it costs a rebuild, not data (ADR 0004).
- **Raw archive:** the bind mount `./archive` (override with `GRIVEI_ARCHIVE_DIR`, ideally an absolute path on the WSL disk; gitignored). Layout, written by the pipeline:

```
archive/seap/bulk/da/2022Q1/2022-06-15/raport-achizitii-directe-t1-2022.csv   # the file, unchanged
archive/seap/bulk/da/2022Q1/2022-06-15/manifest.json                           # written last; sha256 of every file
archive/quarantine/seap/bulk/da/2022Q2/2022-09-15/{file, manifest.json, reason.json}
```

A unit without a valid manifest is skipped by `rebuild`; a file that fails validation is moved to `quarantine/` with its reason.

## Pipeline verbs

```bash
docker compose run --rm pipeline fetch-bulk --unit 2022Q1 \
    --via "Achiziții directe 2022 - T1" \
    --url https://data.gov.ro/dataset/<id>/resource/<id>/download/raport-achizitii-directe-t1-2022.csv
docker compose run --rm pipeline rebuild
```

`fetch-bulk` only downloads into the archive; `rebuild` drops and recreates the `seap` schema from every complete unit in one transaction. Without Docker, from `watchdog/`: `python -m pipeline --archive <dir> rebuild --db postgresql://...`.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `GRIVEI_DB_PASSWORD` | `grivei` | Postgres password (the database is not published to the host) |
| `GRIVEI_ARCHIVE_DIR` | `./archive` | host directory mounted as the raw archive |
| `GRIVEI_UID` / `GRIVEI_GID` | `1000` / `1000` | user the pipeline runs as, so archive files stay yours |

Put overrides in a `.env` file beside `compose.yaml` (gitignored; do not commit secrets).

## Checks

```bash
docker compose config -q                       # the file is valid
docker compose --profile pipeline build        # every image builds (cap parallelism: COMPOSE_PARALLEL_LIMIT=1)
cd explorer/packages/api && npx vitest run test/seam1.test.ts   # seam 1, in a throwaway pp37-seam1-* ParadeDB container (3 GB cap)
```

## Notes

- **Routing (Caddyfile):** `/explore/assets/*` are the hashed bundle files; every other path under `/explore*` or `/ro/explore*` gets the SPA's `index.html`. Anything else is the landing page (`/` and `/ro/`).
- **Upgrades:** a Postgres/ParadeDB upgrade is a rebuild from the archive into a fresh volume beside the old one, then a switch-over (ADR 0004). No in-place `pg_upgrade`.
- **Images are pinned** (`paradedb`, `caddy`, `node`); `python:3.12-slim` floats on the patch level.
