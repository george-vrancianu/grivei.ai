#!/usr/bin/env bash
# Memory watcher: samples `free -m` "used" into one log file.
# Usage: mem-watch.sh start|stop|peak
# start resets the log unless it reuses a live watcher; stop deletes the log (read peak first).
# Env: MEM_WATCH_INTERVAL (seconds, default 60), MEM_WATCH_LOG, MEM_WATCH_PID.
set -u
INTERVAL="${MEM_WATCH_INTERVAL:-60}"
LOG="${MEM_WATCH_LOG:-/tmp/mem-watch.log}"
PIDFILE="${MEM_WATCH_PID:-/tmp/mem-watch.pid}"

live_pid() { # prints the PID when the PID file points at a live process
  local p
  p="$(cat "$PIDFILE" 2>/dev/null)" || return 1
  [[ "$p" =~ ^[0-9]+$ ]] && kill -0 "$p" 2>/dev/null && tr "\0" " " <"/proc/$p/cmdline" 2>/dev/null | grep -q "mem-watch.sh _loop" && echo "$p"
}

loop() {
  local sleep_pid=""
  trap '[ -n "$sleep_pid" ] && kill "$sleep_pid" 2>/dev/null; exit 0' TERM INT
  while :; do
    echo "$(date '+%Y-%m-%d %H:%M:%S') $(free -m | awk '/^Mem:/ {print $3}')" >>"$LOG"
    sleep "$INTERVAL" &
    sleep_pid=$!
    wait "$sleep_pid"
    sleep_pid=""
  done
}

case "${1:-}" in
  start)
    if p="$(live_pid)"; then echo "mem-watch already running (pid $p), reusing it"; exit 0; fi
    rm -f "$PIDFILE"
    : >"$LOG"
    nohup bash "$0" _loop >/dev/null 2>&1 &
    echo $! >"$PIDFILE"
    echo "mem-watch started (pid $!), log $LOG"
    ;;
  _loop) loop ;;
  stop)
    if p="$(live_pid)"; then
      kill "$p" 2>/dev/null
      for _ in $(seq 50); do kill -0 "$p" 2>/dev/null || break; sleep 0.1; done
      kill -0 "$p" 2>/dev/null && { echo "mem-watch (pid $p) did not exit" >&2; exit 1; }
      echo "mem-watch stopped (pid $p)"
    else
      echo "mem-watch not running"
    fi
    rm -f "$PIDFILE" "$LOG"
    ;;
  peak)
    [ -s "$LOG" ] || { echo "no samples in $LOG" >&2; exit 1; }
    sort -k3,3nr "$LOG" | head -1 | awk '{print $3 " MB at " $1 " " $2}'
    ;;
  *) echo "usage: mem-watch.sh start|stop|peak" >&2; exit 2 ;;
esac
