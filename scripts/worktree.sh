#!/usr/bin/env bash
# Create or remove a ready-to-work git worktree under <main checkout>/.claude/worktrees/.
#   scripts/worktree.sh <name> [base]     new branch <name> from base (default origin/main), with .env copies,
#                                         `npm ci` under explorer/ and watchdog/.venv installed from requirements-dev.txt
#   scripts/worktree.sh --remove <name>   delete the worktree and the branch it has checked out;
#                                         exits non-zero when no worktree matches or a step fails
# Works from the main checkout or from any worktree. Never writes to the main checkout's files.
# Env: WORKTREE_ENV_SOURCE (directory to copy .env files from; default the main checkout; used by the test),
#      WORKTREE_PYTHON (interpreter for the venv; default 3.12 as in CI). Uses uv when installed, else `python -m venv`.
set -euo pipefail

die() { echo "worktree.sh: $*" >&2; exit 1; }

COMMON="$(git rev-parse --path-format=absolute --git-common-dir)" || die "not inside a git repository"
MAIN="$(cd "$COMMON/.." && pwd)"
ROOT="$MAIN/.claude/worktrees"

valid_name() { [[ "$1" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]]; }

if [ "${1:-}" = "--remove" ]; then
  NAME="${2:-}"
  [ -n "$NAME" ] && valid_name "$NAME" || die "usage: worktree.sh --remove <name>"
  WT="$ROOT/$NAME"
  # the branch is the one this worktree has checked out, never a same-named branch elsewhere
  BRANCH="$(git -C "$MAIN" worktree list --porcelain | awk -v wt="$WT" '
    $1 == "worktree" { cur = substr($0, 10) }
    $1 == "branch" && cur == wt { sub("^refs/heads/", "", $2); print $2 }')"
  git -C "$MAIN" worktree list --porcelain | grep -qxF "worktree $WT" || die "no worktree at $WT; nothing removed"
  git -C "$MAIN" worktree remove -f -f "$WT" || die "could not remove the worktree at $WT"
  echo "removed worktree $WT"
  if [ -n "$BRANCH" ]; then
    git -C "$MAIN" branch -D "$BRANCH" >/dev/null || die "worktree removed, but could not delete branch $BRANCH"
    echo "removed branch $BRANCH"
  else
    echo "the worktree had no branch checked out (detached); no branch removed"
  fi
  exit 0
fi

NAME="${1:-}"
BASE="${2:-origin/main}"
[ -n "$NAME" ] && valid_name "$NAME" || die "usage: worktree.sh <name> [base] | --remove <name>"
WT="$ROOT/$NAME"
[ ! -e "$WT" ] || die "$WT already exists"
git -C "$MAIN" rev-parse --verify -q "refs/heads/$NAME" >/dev/null && die "branch $NAME already exists"

mkdir -p "$ROOT"
git -C "$MAIN" worktree add -b "$NAME" "$WT" "$BASE"

# from here on a failure leaves a half-made worktree: say how to clean it
trap '[ $? -eq 0 ] || echo "worktree.sh: failed; clean up with: scripts/worktree.sh --remove $NAME" >&2' EXIT

# .env / .env.local files that exist in the source checkout (read-only), same relative path
SRC="${WORKTREE_ENV_SOURCE:-$MAIN}"
while IFS= read -r f; do
  rel="${f#"$SRC"/}"
  mkdir -p "$WT/$(dirname "$rel")"
  cp -p "$f" "$WT/$rel"
  echo "copied $rel"
done < <(find "$SRC" \( -name node_modules -o -name .git -o -name .claude -o -name .venv \) -prune -o \
  -type f \( -name .env -o -name .env.local \) -print)

(cd "$WT/explorer" && npm ci)

# CI runs Python 3.12; prefer uv (no python3-venv package needed), else the stdlib venv
if command -v uv >/dev/null; then
  uv venv -q --python "${WORKTREE_PYTHON:-3.12}" "$WT/watchdog/.venv"
  uv pip install -q --python "$WT/watchdog/.venv/bin/python" -r "$WT/watchdog/requirements-dev.txt"
else
  PY="${WORKTREE_PYTHON:-}"
  if [ -z "$PY" ]; then
    if command -v python3.12 >/dev/null; then PY=python3.12; else PY=python3; fi
  fi
  "$PY" -m venv "$WT/watchdog/.venv"
  "$WT/watchdog/.venv/bin/pip" install -q -r "$WT/watchdog/requirements-dev.txt"
fi

echo "ready: $WT (branch $NAME from $BASE)"
