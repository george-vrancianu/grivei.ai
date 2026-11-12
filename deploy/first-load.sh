#!/usr/bin/env bash
# The first national load in one detached chain (docs/release-1-runbook.md steps 5 and 6): crawl, the three lookups, then seed.
# The crawl runs first because it only writes the archive and takes no lock: the lookups then see the crawled days, and the
# seed's one full load includes them, so no second rebuild is needed. The lookups (anaf-lookup, authority-scope, seap-entities,
# in that order: seap-entities needs archived ANAF answers) read the archive and archive every answer, so the load already has
# identities, the national flag and the placement fallback. None of these steps takes the lock: never run this beside a seed or a refresh.
#
# Run from anywhere, detached:  setsid nohup deploy/first-load.sh >> ~/grivei-data/seed.log 2>&1 &
# Extra compose files (a local memory cap, for example) go in COMPOSE_FILE, e.g. COMPOSE_FILE=compose.yaml:$HOME/grivei-data/override.yaml
# Pass `--backfill` to add the 2021-22 backfill crawl (step 8) as the seed's last step.
# Each step logs one `FIRST-LOAD <step> exit=N` line; the chain stops at the first failure. Rerunning resumes: the crawl skips
# complete days, the lookups skip archived answers, the seed resumes at its failed step.
set -u
cd "$(dirname "$0")/.."
DC="docker compose --profile pipeline"
ts() { date '+%F %T'; }
step() {
  local name=$1; shift
  "$@"; local rc=$?
  echo "$(ts) FIRST-LOAD $name exit=$rc"
  [ $rc -eq 0 ] || exit $rc
}
echo "$(ts) FIRST-LOAD start"
step crawl $DC run --rm -T --no-deps pipeline crawl
step anaf-lookup $DC run --rm -T pipeline anaf-lookup
step authority-scope $DC run --rm -T pipeline authority-scope
step seap-entities $DC run --rm -T pipeline seap-entities
step seed $DC run --rm -T pipeline seed "$@"
