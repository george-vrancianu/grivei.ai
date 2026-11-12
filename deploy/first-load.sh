#!/usr/bin/env bash
# The first national load in one detached chain (docs/release-1-runbook.md steps 5 and 6): crawl, then seed.
# The crawl runs first because it only writes the archive and takes no lock: the seed's one full load then includes the
# crawled days, and no second rebuild is needed to pick them up. The crawl must never run beside a seed or a refresh.
#
# Run from anywhere, detached:  setsid nohup deploy/first-load.sh >> ~/grivei-data/seed.log 2>&1 &
# Extra compose files (a local memory cap, for example) go in COMPOSE_FILE, e.g. COMPOSE_FILE=compose.yaml:$HOME/grivei-data/override.yaml
# Pass `--backfill` to add the 2021-22 backfill crawl (step 8) as the seed's last step.
# Each step logs one `FIRST-LOAD <step> exit=N` line; the chain stops at the first failure. Rerunning resumes: the crawl skips
# complete days, the seed resumes at its failed step.
set -u
cd "$(dirname "$0")/.."
DC="docker compose --profile pipeline"
ts() { date '+%F %T'; }
echo "$(ts) FIRST-LOAD start"
$DC run --rm -T --no-deps pipeline crawl; rc=$?
echo "$(ts) FIRST-LOAD crawl exit=$rc"; [ $rc -eq 0 ] || exit $rc
$DC run --rm -T pipeline seed "$@"; rc=$?
echo "$(ts) FIRST-LOAD seed exit=$rc"
exit $rc
