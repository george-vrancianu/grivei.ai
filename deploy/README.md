# Running the explorer (Docker Compose)

One Compose project, `compose.yaml` at the repo root, inside WSL2. Run everything from the repo root, in the WSL ext4 filesystem (not under `/mnt/c`).

| Service | What | Limits | Reachable at |
| --- | --- | --- | --- |
| `db` | ParadeDB Postgres (`paradedb/paradedb:0.26.6-pg18`, pinned), `shared_buffers` 3 GB | 8 CPU, 12 GB | compose network only |
| `api` | the TypeScript GraphQL API (`explorer/packages/api`), persisted queries only | 2 CPU, 2 GB | via Caddy at `/graphql` |
| `web` | Caddy: `site/` at `/` and `/ro/`, the explorer build at `/explore/` and `/ro/explore/`, `/graphql` and `/source/*` proxied to the API | 2 CPU, 2 GB | http://localhost:8080 |
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

`status` shows how far a running or finished `rebuild` is (it reads `rebuild-progress.json` in the archive root); `rebuild` prints one timestamped line per unit. The operator's full-archive run (nohup, log, kill, rerun) is in `watchdog/README.md`, "Operator: rebuild the graph from the archive for real".

`fetch-bulk` only downloads into the archive; `anaf-lookup` asks ANAF about the CUIs in the archive and archives the answers (resumable; operator steps in `watchdog/README.md`); `rebuild` drops and recreates the `seap` schema and the core's entity tables (`core.entity`, `core.alias`, `core.anaf_company`) from every complete unit in one transaction. Without Docker, from `watchdog/`: `python -m pipeline --archive <dir> rebuild --db postgresql://...`.

## Schedule the refresh

`docker compose run --rm -T pipeline refresh` is the nightly run (what it does and when each step is due: `watchdog/README.md`, "The refresh run"). It takes its own lock in the archive, so any number of triggers is safe. The schedule is a systemd timer in WSL (daily 03:00 and 3 minutes after boot, `Persistent=true`) and a Windows logon task that keeps the distro running. One-time setup:

```bash
# in WSL; needs systemd (`[boot] systemd=true` in /etc/wsl.conf) and docker reachable from the user
mkdir -p ~/.config/systemd/user ~/grivei-data
cp deploy/systemd/grivei-refresh.{service,timer} ~/.config/systemd/user/
$EDITOR ~/.config/systemd/user/grivei-refresh.service        # WorkingDirectory = this checkout
printf 'GRIVEI_ARCHIVE_DIR=%s\nGRIVEI_HEALTHCHECK_URL=https://hc-ping.com/<uuid>\n' ~/grivei-data/raw > ~/grivei-data/refresh.env
loginctl enable-linger "$USER"                                # user units run without a login session
systemctl --user daemon-reload && systemctl --user enable --now grivei-refresh.timer
systemctl --user list-timers grivei-refresh.timer             # next run
journalctl --user -u grivei-refresh -n 50                     # the last run's log
```

In Windows (PowerShell), register `deploy/windows/keep-wsl-up.ps1` to run at logon (the `schtasks /Create ... /SC ONLOGON` line is in the file's header; keep its `-ExecutionPolicy Bypass`: with Windows' default `Restricted` policy the script is refused in a hidden window and WSL idles out, so the timer never fires). In healthchecks.io set the check's period to 1 day and its grace to 3 days: the dead-man's switch then alerts when no run has succeeded for 3 days, and the run's `/fail` pings carry the reason.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `GRIVEI_DB_PASSWORD` | `grivei` | Postgres password (the database is not published to the host) |
| `GRIVEI_ARCHIVE_DIR` | `./archive` | host directory mounted as the raw archive |
| `GRIVEI_GEO_DIR` | `./geo` | host directory the pipeline writes the county and UAT TopoJSON to and Caddy serves at `/geo/` (create it first: `mkdir geo`, so it is yours, not root's) |
| `GRIVEI_HEALTHCHECK_URL` | empty | healthchecks.io ping URL for `refresh` (becomes `PIPELINE_HEALTHCHECK_URL` in the pipeline container); empty = no pings |
| `GRIVEI_UID` / `GRIVEI_GID` | `1000` / `1000` | user the pipeline runs as, so archive files stay yours |
| `SEAP_BASE_URL` | `https://e-licitatie.ro` | the SEAP site the API's `/source/seap/<code>` redirect asks (and redirects to); set on the `api` service, only tests change it |
| `SEAP_LINK_PUBLIC_BASE` | empty | prefix of the "Check in SEAP" URL a bulk Record's provenance carries (`<base>/source/seap/<code>`); empty = relative, same origin as the app |

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
