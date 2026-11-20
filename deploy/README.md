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

- **Postgres:** the named volume `pgdata` (on the WSL ext4 disk, under Docker's data root). The graph is derived: losing it costs a rebuild, not data (ADR 0004). It holds natural persons' names in `withheld.natural_person_name` (stored, never served, never a CNP; ADR 0003 as amended 2026-11-12), so the volume, every dump and every backup of it is personal data.
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

`status` shows how far a `rebuild` is (it reads `rebuild-progress.json` in the archive root): `state: running`, `paused`, `finished`, `failed`, `interrupted` or `interrupted (resumable)`; `rebuild` prints one timestamped line per unit. The operator's full-archive run (nohup, log, kill, rerun) is in `watchdog/README.md`, "Operator: rebuild the graph from the archive for real".

`fetch-bulk` only downloads into the archive; `anaf-lookup` asks ANAF about the CUIs in the archive and archives the answers (resumable; operator steps in `watchdog/README.md`); `rebuild` builds the graph (`seap` and the core's entity tables) into a new database beside the live one and switches over after its checks (`--in-place` drops and recreates them in the live database instead); see `watchdog/README.md`, "Rebuild beside the live database". Without Docker, from `watchdog/`: `python -m pipeline --archive <dir> rebuild --db postgresql://...`.

### Pause, resume and stop a rebuild

A `rebuild` beside the live database commits after every Step, Raw archive unit and ONRC snapshot (the build ledger), so it can be paused and resumed. The details are in `watchdog/README.md`, "Resume" and "Pause"; the operator paths with commands are in `docs/release-2-runbook.md`.

- **Pause from the host:** `touch "$GRIVEI_ARCHIVE_DIR/rebuild.stop"` (the archive directory is mounted into the container, so the file reaches it). The build stops at the next committed boundary, deletes the file, and exits **75**. The first SIGTERM (`docker stop <container>`) asks for the same pause, but Compose sets no `stop_grace_period`, so Docker kills the container after 10 seconds: the committed work stays, and a Step in progress is lost. A second SIGTERM aborts the Step in progress and exits 143. `rebuild --pause-after 8h` (also `refresh` and `seed`) pauses by itself at the first boundary after that long.
- **Resume:** run the same command again. It resumes when the pinned inputs (archive units, schema files) and the code are unchanged, or changed only in Steps not yet run; the first log line says `rebuild: resume - ...` or `rebuild: fresh - <reason>`. `--fresh` starts over. `rebuild --in-place --staged` (the major-upgrade build into a fresh database, `watchdog/README.md`) resumes the same way; plain `--in-place` is one transaction and always starts over.
- **Disk:** a paused or killed build keeps its next database, a full extra copy of the graph, until it is resumed or `pipeline cleanup` drops it.
- **Scheduled refresh:** a paused `load` ends the run `paused` (exit 0, not a failure) and pings `<GRIVEI_HEALTHCHECK_URL>/log`: no alert, and the dead-man's switch keeps counting from the last real success. The next timer trigger resumes the build.

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

In Windows (PowerShell), register `deploy/windows/keep-wsl-up.ps1` to run at logon (the `schtasks /Create ... /SC ONLOGON` line is in the file's header; keep its `-ExecutionPolicy Bypass`: with Windows' default `Restricted` policy the script is refused in a hidden window and WSL idles out, so the timer never fires). In healthchecks.io set the check's period to 1 day and its grace to 3 days: the dead-man's switch then alerts when no run has succeeded for 3 days, and the run's `/fail` pings carry the reason. A run whose load was paused on request (stop file, SIGTERM or `--pause-after`) pings `/log` instead, which records an event and changes neither the check's state nor the dead-man's switch; the next timer trigger resumes the build.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `GRIVEI_DB_PASSWORD` | `grivei` | Postgres password (the database is not published to the host) |
| `GRIVEI_ARCHIVE_DIR` | `./archive` | host directory mounted as the raw archive |
| `GRIVEI_GEO_DIR` | `./geo` | host directory the pipeline writes the county and UAT TopoJSON to and Caddy serves at `/geo/` (create it first: `mkdir geo`, so it is yours, not root's) |
| `GRIVEI_HEALTHCHECK_URL` | empty | healthchecks.io ping URL for `refresh` (becomes `PIPELINE_HEALTHCHECK_URL` in the pipeline container); empty = no pings |
| `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or `B2_ACCOUNT_ID`, `B2_ACCOUNT_KEY`) | empty | the encrypted backup repository of refresh step 5 (#82); empty `RESTIC_REPOSITORY` = no backups, logged. Backup, restore, switchover, rollback and the major-upgrade rebuild: `watchdog/README.md`. The database holds natural persons' names (`withheld.natural_person_name`, stored, never served; ADR 0003 as amended 2026-11-12), so its dumps and backups do too: see `watchdog/README.md`, "Backups and restore". `GRIVEI_DB_NEXT_IMAGE` names the new image for the `upgrade` profile |
| `GRIVEI_PERSON_ID_SECRET` | empty | the secret of the keyed hash behind person ids (ADR 0011, #177): at least 16 characters, kept outside the repo (a password manager, the host's env file), the same on every rebuild or the ids change. Empty = a rebuild that holds ONRC's people files fails (there is no default) |
| `GRIVEI_EXPLORER` | empty | on `web` (Caddy): only the exact value `open` serves the explorer at `/explore/` and `/ro/explore/` and shows its link on the landing page; empty or anything else redirects those paths to `/` and `/ro/` and keeps the link hidden. Caddy reads it at start, so change it with `docker compose up -d web` |
| `GRIVEI_RESTRICTED` | empty | on the API: only the exact value `show` reveals Restricted content (person pages, cross-organisation role lists, ADR 0015); empty or anything else hides it, in the resolvers. Set it only on a local host or behind a login, never on the open public host |
| `GRIVEI_UID` / `GRIVEI_GID` | `1000` / `1000` | user the pipeline runs as, so archive files stay yours |
| `SEAP_BASE_URL` | `https://e-licitatie.ro` | the SEAP site the API's `/source/seap/<code>` redirect asks (and redirects to); set on the `api` service, only tests change it |
| `API_CACHE_MAX_MB` | `300` | API result-cache budget in MB; keep it well under the api's 2 GB `mem_limit` |
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
- **Upgrades:** a Postgres/ParadeDB upgrade is a rebuild from the archive into a fresh volume beside the old one, then a switchover (ADR 0004). No in-place `pg_upgrade`.
- **Images are pinned** (`paradedb`, `caddy`, `node`); `python:3.12-slim` floats on the patch level.
