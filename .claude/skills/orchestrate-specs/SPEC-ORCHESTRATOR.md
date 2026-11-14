# Spec orchestrator brief

You are an opus spec orchestrator for spec #<spec>. You manage agents and git bookkeeping; you never write code. Copy the hard rules verbatim into every brief you write.

<<HARD-RULES.md block, verbatim>>

## Setup

1. Read the spec and its tickets. Children link via `## Parent #N`; ticket blockers sit under `## Blocked by`. Use `docs/agents/issue-tracker.md` if present for `gh` commands. The spec's own rules override this workflow.
2. Save bodies to `/tmp/pp-<spec>-notes/` (`<issue>.md` per issue: the spec and each ticket under its own number). The first ticket's explorer maps (`<ticket>-map-<area>.md`) serve as the spec-level notes; later tickets read earlier maps instead of whole files (the exploration step in `TICKET-ORCHESTRATOR.md` sends explorers to them).
3. Create the integration worktree and branch from origin/main (`scripts/worktree.sh integration-<spec>` if present). Only the merger touches it.

## Running tickets

- Dependency order; at most 2 ticket orchestrators at once, and only if they won't heavily conflict.
- Before each spawn run `free -g`; wait while "used" is above ~18 GB (WSL crashes at 30 GB).
- Per ticket, spawn an opus orchestrator with [TICKET-ORCHESTRATOR.md](TICKET-ORCHESTRATOR.md), its own worktree and branch from the integration branch.
- After each ticket, spawn a sonnet merger (one at a time) that merges the ticket branch into the integration branch, then runs the CI checks of `.github/workflows/explorer.yml` in the integration worktree, one step after another, keeping test output quiet per `TICKET-ORCHESTRATOR.md`, "## Quiet test output" (point the merger and any fixer brief at it), with these `timeout -s KILL` limits (seconds):
  1. Under `explorer/`: `npm ci` (600), then `PIPELINE_PYTHON=false npm run check` (1500), so Seam 1 and the restricted tests skip, as in CI's `check` job. Vitest uses the package scripts' cap (4 workers, one workspace at a time).
  2. Under `watchdog/`: a venv at `.venv`, `pip install -r requirements-dev.txt` into it (600), then `pytest -q` (900). CI uses Python 3.12; use it if installed, else the newest available and say which in the hand-back.
  Done when both steps pass, or the report file in `/tmp/pp-<spec>-notes/` names every failing test (with the full output) and the hand-back gives the failure count and that path. A failing check blocks further merges and spawns: send it to a sonnet fixer on the ticket's branch and worktree, which first runs `git fetch` and merges the integration tip so cross-ticket breaks reproduce; then a merger merges again and re-runs the failed step. Seam 1, the Storybook build and the compose build wait for the final PR's CI.
- Short hand-backs: ticket orchestrators write their full report to `/tmp/pp-<spec>-notes/report-<ticket>.md` and send you at most 3 lines. Mergers, reviewers and fixers hand back at most 3 lines too (result, commit, path of any report file) and put details in `/tmp/pp-<spec>-notes/`. Say this in every brief you write. Don't read a report file until you need it.

## Final PR

1. Push the integration branch and open the PR. Body per the `pr` skill, closing the spec and its tickets.
2. Fix loop: opus reviewer (`code-review`, base origin/main), sonnet fixer, repeat until the reviewer is satisfied. Use a fresh sonnet fixer when the previous one is above ~150K context.
3. `git fetch` and merge origin/main. If there were conflicts, an opus reviewer checks the resolution.
4. Wait for CI to pass. A normal run takes 8 to 14 minutes. If a run is still queued after 10 minutes, or unfinished 30 minutes after it was created, stop waiting and put it in your hand-back (run URL, status, minutes waited) so the user can decide, via your parent.
5. `gh pr merge --merge`.
6. Close tickets with a comment pointing at the PR. A ticket that can't be done stays open with a stated reason.
7. Remove worktrees and branches (`scripts/worktree.sh --remove <name>` if present).

## Hand-back

Hand back per the hand-back hard rule; this section lists what the hand-back contains. Build it from the report files in `/tmp/pp-<spec>-notes/`, read once at the end. PR, merge commit and CI result; schema changes; new env vars and dependencies; rounds and bugs per ticket; deviations; conflicts (where and why); every agent over 150K and why; memory peak (read it with `bash .claude/skills/orchestrate-specs/mem-watch.sh peak`; the top level owns the watcher, and the figure is the run-wide peak so far); what needs a human; proposed follow-up tickets (listed, not posted). Done when each item is answered, even if only "none".
