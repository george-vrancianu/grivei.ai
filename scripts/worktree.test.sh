#!/usr/bin/env bash
# Test for worktree.sh: creates a throwaway worktree, checks it, removes it, checks nothing is left.
# Takes minutes (npm ci + pip install). Not run in CI.
# Run: timeout -s KILL 900 bash scripts/worktree.test.sh
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
MAIN="$(cd "$(git -C "$HERE" rev-parse --path-format=absolute --git-common-dir)/.." && pwd)"
NAME="wt-test-$$-$RANDOM"
LONE="wt-test-lone-$$-$RANDOM"   # a branch with no worktree
FAST="wt-test-fast-$$-$RANDOM"   # a worktree made with plain git, no npm/venv
FASTWT="$MAIN/.claude/worktrees/$FAST"
WT="$MAIN/.claude/worktrees/$NAME"
SRC="$(mktemp -d /tmp/worktree-test-src.XXXXXX)"   # fake env source: the main checkout is never written to
export WORKTREE_ENV_SOURCE="$SRC"
status_before="$(git -C "$MAIN" status --short)"
fails=0

cleanup() {
  bash "$HERE/worktree.sh" --remove "$NAME" >/dev/null 2>&1
  git -C "$MAIN" worktree remove --force "$WT" >/dev/null 2>&1
  rm -rf "$WT"
  git -C "$MAIN" worktree prune
  git -C "$MAIN" branch -D "$NAME" >/dev/null 2>&1
  git -C "$MAIN" worktree remove -f -f "$FASTWT" >/dev/null 2>&1
  rm -rf "$FASTWT"
  git -C "$MAIN" worktree prune
  git -C "$MAIN" branch -D "$LONE" "$FAST" >/dev/null 2>&1
  rm -rf "$SRC"
}
trap cleanup EXIT

check() { # description, command...
  local d="$1"; shift
  if "$@"; then echo "ok   $d"; else echo "FAIL $d"; fails=$((fails + 1)); fi
}

mkdir -p "$SRC/explorer/packages/api"
echo "A=1" > "$SRC/.env"
echo "B=2" > "$SRC/explorer/.env.local"
echo "C=3" > "$SRC/explorer/packages/api/.env"
echo "ignored" > "$SRC/explorer/.env.example"

# --remove touches only the branch its worktree has checked out
git -C "$MAIN" branch "$LONE" main
bash "$HERE/worktree.sh" --remove "$LONE" >/dev/null 2>&1
check "remove with no worktree exits non-zero" test $? -ne 0
check "remove with no worktree keeps the same-named branch" git -C "$MAIN" show-ref --verify -q "refs/heads/$LONE"

git -C "$MAIN" worktree add -q -b "$FAST" "$FASTWT" main
git -C "$MAIN" worktree lock "$FASTWT"
bash "$HERE/worktree.sh" --remove "$FAST" >/dev/null 2>&1
check "remove of a locked worktree exits 0" test $? -eq 0
check "locked worktree gone" test ! -e "$FASTWT"
check "its branch gone" bash -c "! git -C '$MAIN' show-ref --verify -q 'refs/heads/$FAST'"
check "unrelated branch still intact" git -C "$MAIN" show-ref --verify -q "refs/heads/$LONE"

bash "$HERE/worktree.sh" "$NAME" main
check "create exits 0" test $? -eq 0
check "worktree directory exists" test -d "$WT"
check "branch exists" git -C "$MAIN" show-ref --verify -q "refs/heads/$NAME"
check "root .env copied" test "$(cat "$WT/.env" 2>/dev/null)" = "A=1"
check "nested .env.local copied" test "$(cat "$WT/explorer/.env.local" 2>/dev/null)" = "B=2"
check "package .env copied" test "$(cat "$WT/explorer/packages/api/.env" 2>/dev/null)" = "C=3"
check ".env.example not copied" test ! -e "$WT/explorer/.env.example"
check "npm ci installed node_modules" test -d "$WT/explorer/node_modules"
check "watchdog venv has pytest" test -x "$WT/watchdog/.venv/bin/pytest"
check "venv has xlwt" "$WT/watchdog/.venv/bin/python" -c "import xlwt"

bash "$HERE/worktree.sh" "$NAME" main >/dev/null 2>&1
check "creating an existing name fails" test $? -ne 0

bash "$HERE/worktree.sh" --remove "$NAME"
check "remove exits 0" test $? -eq 0
check "worktree directory gone" test ! -e "$WT"
check "branch gone" bash -c "! git -C '$MAIN' show-ref --verify -q 'refs/heads/$NAME'"
check "worktree list has no entry" bash -c "! git -C '$MAIN' worktree list | grep -q '$NAME'"
check "main checkout status unchanged" test "$(git -C "$MAIN" status --short)" = "$status_before"

[ "$fails" -eq 0 ] && echo "all passed" || { echo "$fails failed"; exit 1; }
