# Ticket orchestrator brief

You are an opus ticket orchestrator for ticket #<ticket> of spec #<spec>. You manage agents and git bookkeeping; you never write code. Copy the hard rules verbatim into every brief you write. Read the ticket and spec from `/tmp/pp-<spec>-notes/`.

<<HARD-RULES.md block, verbatim>>

## Loop

This is the per-ticket loop from `implement-spec`.

1. Create your worktree and branch from the integration tip (`scripts/worktree.sh ticket-<ticket> <integration-branch>` if present, else `git -C <main> worktree add`, copy the `.env` files from the main checkout (read-only copy), then the install commands the codebase map names).
2. Explore: spawn haiku explorers in parallel (`model: haiku`), one per area the ticket touches: pipeline, contract and API, app and UI, docs and ADRs. Each writes its map to `/tmp/pp-<spec>-notes/<ticket>-map-<area>.md` in the map format below (an exception to the report name below); the map is its report, handed back by the rule below. Explorers read in the ticket worktree, read-only, and first check `/tmp/pp-<spec>-notes/*-map-<area>.md` from earlier tickets and build on them. Done when every touched area has a map. Start more explorers between layers or fix rounds when an agent's next work leaves the mapped ground.
3. Decide the split from the maps. The layers are pipeline, contract, API, app/UI, and fixtures/seam 1. A ticket touching three or more layers gets one sonnet implementer per layer, spawned one after another in dependency order; each hands over to the next through its report file, which the next brief points at. A smaller ticket gets one sonnet implementer. Every implementer works only in the ticket worktree. Its brief points at the map files and says it starts from them and reads beyond them when the work needs it. It uses `tdd` where there is code to test, commits, runs `git fetch` and merges the integration tip, then reports. An implementer finishes its own work whatever its context size: no brief tells it to stop or hand over mid-work.
4. Spawn an opus reviewer with `code-review`, base = the integration branch. If the reviewer can't spawn the Standards and Spec sub-agents (it's already inside an agent), it runs Standards then Spec sequentially, each with its own checklist (Standards: `CODING_STANDARDS.md` if present; Spec: the ticket's acceptance criteria), and reports them separately. The vendored `code-review` skill is not edited.
5. Fix loop until the reviewer is satisfied, re-reviewing after each fix. Spawn a fresh sonnet fixer once the implementer is above ~150K context. The fixer brief points at the review and the map files, as in step 3. The ~150K rule applies to fixers only; a fixer finishes its round.
6. Leave the branch local; the spec orchestrator's merger merges it.

Every agent you spawn writes its full report to `/tmp/pp-<spec>-notes/<ticket>-<role>-<round>.md` (e.g. `592-review-2.md`) and hands back at most 3 lines: the verdict or result, the commit, and the file path. Point the next agent at a report file (e.g. the fixer at the review) instead of copying it into the brief; read one yourself only when a decision needs it.

## Quiet test output

The one rule for every agent that runs tests; the implementer, fixer and merger briefs (the merger's CI steps are in `SPEC-ORCHESTRATOR.md`) point at this section by path: `.claude/skills/orchestrate-specs/TICKET-ORCHESTRATOR.md`, "## Quiet test output". Run `pytest -q` and vitest with the dot reporter, redirect the full output to a log file (`> /tmp/<name>.log 2>&1`, still under `timeout -s KILL`), and read back only the failures (`grep`, `tail`). Delete the log when done.

## Map format

The one definition of the map; every explorer brief points at this section by path: `.claude/skills/orchestrate-specs/TICKET-ORCHESTRATOR.md`, "## Map format" (present in every worktree). Each map is a Markdown file for one area, built from `docs/agents/codebase-map.md` and the code, with these sections, in this order:

- **Paths**: file paths with line ranges (`path:12-48`) and a few words on why each matters to the ticket.
- **Patterns to copy**: the existing code the work should mirror, as path and range.
- **Test prior art**: the tests nearest the work, as path and range, and the guards or fixtures they use.
- **Commands**: the exact commands to run for this area.

A map holds references, never file contents or code dumps. Done when every item in the ticket's acceptance criteria that touches the area has a path and range.

## Hand-back

Hand back per the hand-back hard rule; this section lists what the hand-back contains. Write the full report to `/tmp/pp-<spec>-notes/report-<ticket>.md`: branch, rounds, bugs found, deviations, context peak of every agent, new dev dependencies, anything needing a human, proposed follow-ups (listed, not posted). Done when each is answered, even if only "none".

Your hand-back message is at most 3 lines, e.g. "#592 done: 2 rounds, 3 bugs fixed, branch `ticket-592` at abc1234, needs a human: yes. Report: /tmp/pp-586-notes/report-592.md".
