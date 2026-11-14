#!/usr/bin/env bash
# Test for mem-watch.sh. Uses its own temp paths, never the default log/PID.
# Run: timeout -s KILL 60 bash mem-watch.test.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
DIR="$(mktemp -d /tmp/mem-watch-test.XXXXXX)"
export MEM_WATCH_LOG="$DIR/mem.log" MEM_WATCH_PID="$DIR/mem.pid" MEM_WATCH_INTERVAL=1
STARTED=""
fails=0

cleanup() {
  [ -n "$STARTED" ] && kill -0 "$STARTED" 2>/dev/null && kill "$STARTED" 2>/dev/null
  rm -rf "$DIR"
}
trap cleanup EXIT

check() { # description, command...
  local d="$1"; shift
  if "$@"; then echo "ok   $d"; else echo "FAIL $d"; fails=$((fails + 1)); fi
}
children_of() { pgrep -P "$1" 2>/dev/null; }

out1="$(bash "$HERE/mem-watch.sh" start)"
check "pid file exists" test -s "$MEM_WATCH_PID"
STARTED="$(cat "$MEM_WATCH_PID" 2>/dev/null)"
check "watcher is alive" kill -0 "$STARTED"

out2="$(bash "$HERE/mem-watch.sh" start)"
check "second start reuses watcher" bash -c "[[ '$out2' == *reusing* ]] && [ \"\$(cat '$MEM_WATCH_PID')\" = '$STARTED' ]"

sleep 3
check "log has samples" bash -c "[ \$(wc -l < '$MEM_WATCH_LOG') -ge 2 ]"
peak="$(bash "$HERE/mem-watch.sh" peak)"
check "peak prints MB and time" bash -c "[[ '$peak' =~ [0-9]+\ MB ]] && [[ '$peak' =~ [0-9]{4}-[0-9]{2}-[0-9]{2} ]]"
echo "peak: $peak"

kids="$(children_of "$STARTED")"
bash "$HERE/mem-watch.sh" stop >/dev/null
check "pid file removed" test ! -e "$MEM_WATCH_PID"
check "watcher gone" bash -c "! kill -0 $STARTED 2>/dev/null"
check "children gone" bash -c "for p in $kids; do ! kill -0 \$p 2>/dev/null || exit 1; done"
STARTED=""

# stale PID file: start must replace it
echo 999999 > "$MEM_WATCH_PID"
bash "$HERE/mem-watch.sh" start >/dev/null
STARTED="$(cat "$MEM_WATCH_PID")"
check "stale pid replaced" bash -c "[ '$STARTED' != 999999 ] && kill -0 $STARTED"
bash "$HERE/mem-watch.sh" stop >/dev/null
check "stop after stale" bash -c "! kill -0 $STARTED 2>/dev/null"
STARTED=""

[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
