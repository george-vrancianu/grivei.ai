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

The watchdog test dependencies (`pytest`, `xlwt`) are in `watchdog/requirements-dev.txt`. A venv missing them was not installed from that file. A fresh worktree with all of this set up: `scripts/worktree.sh <name>` (below).

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

## Worktrees

`scripts/worktree.sh <name> [base]` creates `.claude/worktrees/<name>` on a new branch `<name>` (base defaults to `origin/main`), copies the `.env` / `.env.local` files of the main checkout, runs `npm ci` under `explorer/` and builds `watchdog/.venv` from `requirements-dev.txt`. `scripts/worktree.sh --remove <name>` deletes the worktree and its branch. Run it from the main checkout or any worktree. `scripts/worktree.test.sh` tests it (minutes; not in CI).

## Gotchas

- Subagents' `Write` of report files into `/tmp/pp-<spec>-notes/` was refused in two runs ("Subagents should return findings as text"), although the orchestration workflow asks for those files. When that happens, the report goes in the hand-back text.
