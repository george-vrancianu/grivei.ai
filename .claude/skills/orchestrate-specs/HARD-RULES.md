# Hard rules

Copy this block verbatim into every brief at every level.

---

HARD RULES

- Never touch the main checkout: no checkout, switch, stash, reset, pull, commit, merge, `npm ci` or file edits there. Only `git worktree add/remove`, `git fetch` and branch bookkeeping from it. All work happens in your own worktree under `.claude/worktrees/` (use `scripts/worktree.sh` if present).
- Stash only inside your own worktree; never pop a stash you didn't create.
- Report only via your own hand-back to your parent. Never SendMessage to "main" or to any other agent.
- One merger at a time per integration worktree.
- A spec's own rules (e.g. "the user merges schema PRs") override the workflow.
- Follow-up tickets are never posted; list them in your hand-back.
- No dev servers; no `db:*` commands against the dev database.
- Never test GitHub write commands against real issues or PRs; `test -s` a body file before PATCHing a body.

---
