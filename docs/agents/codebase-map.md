# Codebase map

An agent's starting map of what the files don't say. Vocabulary is in `GLOSSARY.md`, decisions in `docs/adr/`; the frontend's rules are in `explorer/CLAUDE.md`.

## Workspaces

Two trees, two toolchains. The explorer is the TypeScript app; the watchdog is the Python pipeline that builds the database the explorer reads.

- `explorer/` is an npm workspace (`explorer/package.json`, Node 24, one `package-lock.json`). Packages under `explorer/packages/`:
  - `contract`: the GraphQL schema and operations, plus generated files and mock fixtures. Run `npm run codegen` after editing the schema or an operation.
  - `api`: the GraphQL server over Postgres (persisted queries only).
  - `ui`: the UI library, the only code that imports MUI.
  - `app`: the React app, built against the contract fixtures.
- `watchdog/`: Python. Pipeline package in `watchdog/pipeline/`, connectors in `watchdog/connectors/`, tests in `watchdog/tests/`. `watchdog/README.md` covers operation.
- `site/` (landing page, `site/CLAUDE.md`), `deploy/` and `compose.yaml` (Compose project).

## Check commands

CI is `.github/workflows/explorer.yml`; run the same commands locally. Read the workflow for the current list, since it is the source of truth.

- `check` job, under `explorer/`: `npm ci`, `npm run check` (lint, each package's `check`, then `test:tooling`), `npm run storybook:build`. A single package: `npm run check --workspace @grivei/<package>`.
- `seam1` job: `pip install -r watchdog/requirements-dev.txt`, then `pytest -q` under `watchdog/`, then the seam 1 vitest files under `explorer/packages/api` (command in the workflow).
- `compose` job: `docker compose --profile pipeline config -q` and `build`.

The watchdog test dependencies (`pytest`, `xlwt`) are in `watchdog/requirements-dev.txt`. A venv missing them was not installed from that file. Install commands: `npm ci` under `explorer/`; for the watchdog a venv at `watchdog/.venv` (Python 3.12, as CI) with `pip install -r watchdog/requirements-dev.txt`. A fresh worktree with all of this set up: `scripts/worktree.sh <name>` (below).

## Schema is applied at rebuild

There are no migration files. The DDL is `watchdog/pipeline/sql/*_schema.sql`, applied by `pipeline rebuild` (`watchdog/pipeline/rebuild.py`), which derives the whole database from the raw archive. A schema change is an edit to those files, and the existing database picks it up at the next rebuild. The explorer's API reads the result; its GraphQL schema is separate, in `explorer/packages/contract/schema/`.

## Seam 1

The main test seam: miniature raw archive, then `pipeline rebuild`, then the app's persisted queries through the API. It lives in `explorer/packages/api/test/seam1.test.ts` (header comment explains it), with `noWithheld`, `restricted` and `restrictedSignals` tests beside it.

- It starts one throwaway ParadeDB container, so it needs Docker, and the pipeline's Python (`PIPELINE_PYTHON`, default `watchdog/.venv/bin/python`) with psycopg.
- Without those it skips itself, printing why. `SEAM1_REQUIRED=1` turns the skip into a failure; CI's `seam1` job sets it. The `check` job has no pipeline Python, so seam 1 skips there by design.
- The pipeline's own pytest (seam 2, HTTP stubbed) runs in the same CI job.

## Test guards (watchdog)

`watchdog/tests/conftest.py` puts two guards on every test: outbound network blocked at the socket level (loopback passes; opt out with `@pytest.mark.network`), and a per-test deadline (`PIPELINE_TEST_TIMEOUT`, default 600 s) that dumps tracebacks and kills the process. It also scrubs operator environment variables (`PIPELINE_*`, `PG*`, `DATABASE_URL` and others): set what a test needs with `monkeypatch`. `watchdog/README.md` has the full list. For an outer cap, wrap the run in `timeout -s KILL <seconds>`.

## Lint tools

- Explorer: eslint, `npm run lint` under `explorer/` (config `explorer/eslint.config.js`). It enforces that only `packages/ui` imports MUI; `explorer/tooling/lint-boundary.test.ts` tests that rule. Type checking is `tsc --noEmit` per package.
- Watchdog: no Python linter is configured.

## Running the app

There is no dev server for the app: the explorer has no `dev` or `start:dev` script and the app has no vite dev server. For UI work Storybook dev runs on 6006 (`npm run storybook` under `explorer/`). The runtime is the Compose project (`compose.yaml`, runbook `deploy/README.md`).

- Start: `docker compose up -d --build` from the repo root starts `db`, `api` and `web` (Caddy). The `pipeline` service is a one-shot behind a profile: `docker compose run --rm pipeline rebuild`.
- Ports: only `web` is published, as `127.0.0.1:8080` (Caddy: landing page `/` and `/ro/`, app `/explore/` and `/ro/explore/`, `/graphql`, `/source/*`, `/geo/*`). The API listens on 4000 and the database on 5432, both on the Compose network only.
- Health: the API answers `GET /healthz` (`explorer/packages/api/src/server.ts`) on 4000, reachable from inside the network; Compose uses it as the `api` healthcheck, so `docker compose ps` shows `healthy`. Caddy does not route it. From the host, check `http://localhost:8080/explore/` for 200.
- Same origin: Caddy serves app and API on one origin, so there is no CORS setting and no `CLIENT_ORIGIN`-style variable. The API reads `DATABASE_URL` (required), `PORT`, `API_CACHE_MAX_MB`, `SEAP_BASE_URL`, `SEAP_LINK_PUBLIC_BASE`, `GRIVEI_RESTRICTED` (list in `explorer/packages/api/src/main.ts`).
- Restart and stop: re-running `docker compose up -d --build` recreates only the services whose image or config changed. Stop with `docker compose stop` (or `down`; never `down -v`, it deletes the database volume). A running `grivei` Compose project (`docker compose ps`) belongs to the user, who may have started it: this includes a project that was up before the run.
- Tunnel: the repo defines none.

## Worktrees

`scripts/worktree.sh` creates and removes ready-to-work worktrees under `.claude/worktrees/`; its header comment is the usage. `scripts/worktree.test.sh` tests it (minutes; not in CI).
