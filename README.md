# Grivei.ai

Public procurement as an explorable network.

Grivei.ai is a public-money watchdog. It takes large public databases and uses agents to connect the dots: contracts, firms and officials in one Postgres graph, with every link tied to its source document.

## Status

Building, not public yet. [grivei.ai](https://grivei.ai/) shows a "coming soon" page; the explorer runs locally and stays hidden on the public site until it goes live.

- **Release 1, SEAP (public procurement):** built. The national graph holds 13.94M records from 2021 onwards (1,098 bn RON), refreshed by a nightly pipeline. The operator acceptance (real rebuild, latency gate, a week unattended) is still open: [`docs/release-1-runbook.md`](docs/release-1-runbook.md).
- **Release 2, ONRC (trade register):** code merged. Companies and their administrators, with annual financial statements, AEP election results, BaniPartide company donations, AMEPIP state-owned companies and the MF taxpayer list as Reference sources. The national rebuild is running; acceptance follows [`docs/release-2-runbook.md`](docs/release-2-runbook.md).
- **Explorer:** search per Source, the Money and Coverage lenses, Signals, and pages for organisations, records and people, in English and Romanian.
- **Next:** PNRR, state aid (RegAS), EU cohesion funds, Curtea de Conturi reports and court cases between organisations. Order and rules: [`docs/source-roadmap.md`](docs/source-roadmap.md).

Person-level data follows ADRs 0008–0016: only people tied to public money are named, restricted content stays off on the public site, and going live needs a privacy notice. Results are Signals to verify in the source documents, not conclusions.

## What's here

- [`watchdog/`](watchdog/): the data side. Connectors, the raw archive and the `python -m pipeline` verbs (fetch, rebuild, refresh, status), the Postgres schema, Signal rules and the first reports. See [`watchdog/README.md`](watchdog/README.md).
- [`explorer/`](explorer/): the TypeScript explorer. `packages/api` (GraphQL, persisted queries only), `packages/app` (React), `packages/ui` (the UI library wrapping MUI) and `packages/contract` (the shared schema types). Read [`explorer/CLAUDE.md`](explorer/CLAUDE.md) before writing frontend code.
- [`site/`](site/): the landing page, static HTML in English and Romanian (`/ro/`). See [`site/README.md`](site/README.md).
- [`deploy/`](deploy/) and [`compose.yaml`](compose.yaml): the runtime. ParadeDB Postgres, the API, Caddy and the one-shot pipeline, in Docker Compose inside WSL2. See [`deploy/README.md`](deploy/README.md).
- [`docs/`](docs/): decisions in [`docs/adr/`](docs/adr/), the [release recipe](docs/release-recipe.md), the [source roadmap](docs/source-roadmap.md), the release runbooks, design handoffs and research notes.
- [`GLOSSARY.md`](GLOSSARY.md): the project's vocabulary (Source, Release, Signal, Reference source and the rest).

## Run it locally

```bash
docker compose up -d --build                # db, api, web on http://localhost:8080
docker compose run --rm pipeline rebuild    # fill the database from the raw archive
```

Then open http://localhost:8080/explore/. Fetching the raw data, environment variables and backups are in [`deploy/README.md`](deploy/README.md).

## More

- Issues and roadmap tickets: [GitHub Issues](https://github.com/george-vrancianu/grivei.ai/issues)
- [Work in progress on my portfolio](https://george.vrancianu.eu/work-in-progress/)
- Built by [George Vrancianu](https://github.com/george-vrancianu)
