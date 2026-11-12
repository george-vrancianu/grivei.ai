---
name: orchestrate-specs
description: "Orchestrate the implementation of one or more specs end to end: a spec orchestrator per spec, a ticket orchestrator per ticket, then final PR, merge and an end-of-run report."
disable-model-invocation: true
---

Orchestrate the specs the user names. The top level (this session) and every orchestrator below it manage agents and git bookkeeping; orchestrators never write code.

## The workflow (the user's words, the source of truth)

> Orchestrate the implementation of the following specs: … Rules: For each spec - spawn a opus subagent to orchestrate the implementation of the tickets in that spec on it's own worktree. For each ticket (with /implement-spec skill) spawn an opus subagent that will orchestrate the implementation of the spec, that will spawn a sonnet subagent to implement - opus review, then loop fixes until reviewer satisfied. If original implementer is beyond 150K, spawn new sonnet subagent to fix. Final PR from implementation branch should follow the same fixes loop - opus reviews and sonnet fixes. Once PR is reviewed and reviewer satisfied, merge PR and update tickets. Note: when WSL consumes over 30GB of memory, it crashes and the agents are stopped. You can run the tickets in parallel as long as they don't heavily conflict each other and does not bust the memory. When done: pull latest changes into main, do migration if necessary, make sure dev server with tunnel is running, present a summary, a health status (how well/easy the agents worked, if had conflicts, where and why context windows got over 150K) and when agents ask for follow-up ticket, don't post them but present them at the end for my review. Orchestrators do not write code, only manage

## Roles

Top level (this session) -> one opus spec orchestrator per spec, in the background -> one opus ticket orchestrator per ticket -> sonnet implementer (uses `tdd`, or skips it for docs-only work), opus reviewer (uses `code-review`), sonnet fixer, sonnet merger.

The spec orchestrator follows `implement-spec`'s task-graph/frontier approach, and ticket orchestrators run each ticket per its loop.

Launch agents with the Agent tool, `general-purpose`, setting `model` explicitly.

## Hard rules

[HARD-RULES.md](HARD-RULES.md) holds the hard-rules block. Copy it verbatim into every brief at every level (spec orchestrator, ticket orchestrator, implementer, reviewer, fixer, merger), and point each brief at the notes directory. A brief is done when the block is in it character for character. Replace the `<<HARD-RULES.md block, verbatim>>` placeholder with the block.

## Steps

1. Top level: resolve each spec number, check `free -g`, then spawn one spec orchestrator per spec in the background with the brief from [SPEC-ORCHESTRATOR.md](SPEC-ORCHESTRATOR.md). Specs run in parallel only if they won't heavily conflict.
2. Each spec orchestrator spawns ticket orchestrators from [TICKET-ORCHESTRATOR.md](TICKET-ORCHESTRATOR.md) and runs the final PR flow in SPEC-ORCHESTRATOR.md.
3. Wait for the spec orchestrators' hand-backs. Follow-up tickets that agents propose are collected, never posted.
4. Run the end-of-run steps in [END-OF-RUN.md](END-OF-RUN.md), then present the report. Done when every spec has a merged PR (or a stated reason it has none) and the report is presented.

## Repo docs

Link these in briefs instead of restating them. Each is used if present; if one is missing, fall back to `gh --help`, `ls`, and reading `package.json` scripts.

- `docs/agents/issue-tracker.md`: working `gh` commands. Some write commands there (label POST/DELETE, close PATCH, assignees POST, `gh issue create`, `gh issue comment`, `gh pr comment`, `gh pr close`) were syntax-checked but not run: verify on first use.
- `docs/agents/codebase-map.md`: workspaces, commands, gotchas.
- `CODING_STANDARDS.md`: what the Standards review checks.
- `docs/agents/worktrees-and-migrations.md` and `scripts/worktree.sh`: create and remove agent worktrees (`scripts/worktree.sh <name> [base]`; `--remove <name>`); without the script use `git worktree add .claude/worktrees/<name> -b <name> origin/main`, copy the `.env` files from the main checkout (read-only copy: `.env`, `.env.local`, and the same two names under `apps/api/` and `apps/web/`), and run `npm ci`.

## Gotchas

- Plain `gh issue view N` and `gh pr edit` fail (Projects classic deprecation); use the working commands in `docs/agents/issue-tracker.md`.
- Never test GitHub write commands against real issues or PRs. A subagent once blanked a merged PR's body by reading the body file from the wrong directory.
- web and ui lint with oxlint (not eslint) via `npm run lint -w <workspace>` (uses the root `.oxlintrc.json` and fails on unused disable directives); api uses eslint.
- vitest: targeted files, `--pool=forks --maxWorkers=2`. API integration tests: plain `npm run test:integration -w apps/api -- <pattern>` (the script caps workers itself; `--runInBand` is only for debugging). Flaky-under-load tests are rerun alone before counting as a regression.
- Each worktree needs its own `npm ci`.
- Migrations come from drizzle-kit in `apps/api/drizzle`; if main moved, regenerate the migration on top of main. Renumber an ADR if its number is taken. After the merger merges a branch that adds a migration it runs `npm run check:migrations` and renumbers the newer migration on failure (see `docs/agents/worktrees-and-migrations.md`).

## Context hygiene

Read by line range or grep, run `git diff --stat` before full diffs, and reuse the notes directory `/tmp/pp-<spec>-notes/` rather than re-reading files.
