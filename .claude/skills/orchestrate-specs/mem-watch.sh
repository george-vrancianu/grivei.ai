#!/usr/bin/env bash
# Memory watcher: samples `free -m` "used" into one log file.
# Usage: mem-watch.sh start|stop|peak
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
  local sp=""
  trap '[ -n "$sp" ] && kill "$sp" 2>/dev/null; exit 0' TERM INT
  while :; do
    echo "$(date '+%Y-%m-%d %H:%M:%S') $(free -m | awk '/^Mem:/ {print $3}')" >>"$LOG"
    sleep "$INTERVAL" &
    sp=$!
    wait "$sp"
  done
}

case "${1:-}" in
  start)
    if p="$(live_pid)"; then echo "mem-watch already running (pid $p), reusing it"; exit 0; fi
    rm -f "$PIDFILE"
    : >>"$LOG"
    nohup bash "$0" _loop >/dev/null 2>&1 &
    echo $! >"$PIDFILE"
    echo "mem-watch started (pid $!), log $LOG"
    ;;
  _loop) loop ;;
  stop)
    if p="$(live_pid)"; then
      kill "$p" 2>/dev/null
      while kill -0 "$p" 2>/dev/null; do sleep 0.1; done
      echo "mem-watch stopped (pid $p)"
    else
      echo "mem-watch not running"
    fi
    rm -f "$PIDFILE"
    ;;
  peak)
    [ -s "$LOG" ] || { echo "no samples in $LOG" >&2; exit 1; }
    sort -k3,3nr "$LOG" | head -1 | awk '{print $3 " MB at " $1 " " $2}'
    ;;
  *) echo "usage: mem-watch.sh start|stop|peak" >&2; exit 2 ;;
esac
