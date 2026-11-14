---
name: orchestrate-specs-pipeline
description: Run the top-level session over a long thread - keep a pipeline of specs moving with orchestrate-specs, and handle intake, the user's checkout, dev server and tunnel, reports, follow-ups and retro.
disable-model-invocation: true
---

This session is the top level the user talks to. It starts each spec with [orchestrate-specs](../orchestrate-specs/SKILL.md) and handles everything around the specs. Everything per-spec (roles, briefs, [hard rules](../orchestrate-specs/HARD-RULES.md), [spec orchestrator](../orchestrate-specs/SPEC-ORCHESTRATOR.md), [ticket orchestrator](../orchestrate-specs/TICKET-ORCHESTRATOR.md), repo docs, gotchas) lives there. `gh` commands: [issue-tracker.md](../../../docs/agents/issue-tracker.md).

## Intake

- **"Add #N to the pipeline"**: read the issue, list its sub-issues (`gh api repos/<owner>/<repo>/issues/<n>/sub_issues --jq '.[].number'`) and each child's `## Blocked by` lines, and confirm it carries `ready-for-agent`. A single ticket that is not a spec runs as a one-ticket spec.
- **"What new issues in the last X hours can be implemented?"**: list only parent issues (not children) labelled `ready-for-agent`. For each give whether its blockers, including other specs, are closed, and which children belong to it.
- **Before starting a spec**: compare it with the running specs for shared files or modules. Start in parallel only when conflict is light and `free -g` leaves memory well under 30 GB: about 2 to 3 spec orchestrators at once ([SPEC-ORCHESTRATOR](../orchestrate-specs/SPEC-ORCHESTRATOR.md) caps each at 2 ticket orchestrators).
- **Unsettled blocker**: ask the user before starting. Once the user says the blocker "is settled", start the spec.

## While specs run

- With the first spec, start the memory watcher as in orchestrate-specs step 1 (one watcher for the whole run, stopped by END-OF-RUN step 8 after the last spec).
- Start each spec orchestrator in the background with the brief from [orchestrate-specs](../orchestrate-specs/SKILL.md). While quiet mode is on, add the [quiet-mode block](#quiet-mode) to it.
- **Cross-spec dependency**: when a blocking spec merges, SendMessage the waiting spec orchestrator. Agents never poll.
- A subagent report that reaches this level by mistake: relay it to the orchestrator it belongs to.
- An interim "waiting on its own background work" notification is not a result. Say the spec is still running and predict no outcome.
- Answer progress questions from completion messages only. Agents' transcript files stay unread.

## Quiet mode

For when the user works on the machine. Off until the user says "I'm working"; the user ends it with "I'm done". Answer each switch with one line saying the mode and that the orchestrators were told.

The limits live in this one block, named `QUIET-MODE-LIMITS`. Paste it verbatim into each spec orchestrator's brief. The block carries its own hand-on and relay rules, so it reaches every level unretyped.

```
QUIET-MODE-LIMITS (on until you are told "quiet mode off")
- Paste this block verbatim into every brief you write for an orchestrator while it is on. SendMessage each running orchestrator you started (your own children, which the hard rules allow) when the mode changes (off: "quiet mode off, normal limits").
- These limits replace the caps in your own brief (ticket orchestrators, ~18 GB wait).
- One spec orchestrator in the pipeline, and one ticket orchestrator per spec (so one in all). Running agents above that finish; start nothing new until the count is under the limit.
- No spawn while the watcher's latest sample is above 16 GB (16384 MB). The latest sample is the last line of `/tmp/mem-watch.log` (`date time MB`, `free -m` "used"); wait and re-check. Read it only: the top level owns the watcher, never start or stop it. `mem-watch.sh peak` is the run-wide maximum, for reports only.
- One test suite at a time.
```

- **Switching**: SendMessage every running spec orchestrator with the new mode (on: the block; off: "quiet mode off, normal limits"). Specs started later get the block in their brief while the mode is on.
- **Over the limit while agents run**: the spawn check does not bound running agents. Tell the user when the latest sample is above 16 GB.

## The user's checkout

The user keeps working in the main checkout. Only this level runs commands there. Run [END-OF-RUN.md](../orchestrate-specs/END-OF-RUN.md) steps 1 to 3 after each spec merges, without waiting for the whole pipeline. Plus:

- The user's branch and work stay as they are: no switching, no stashing.
- Untracked files there (handoff zips, stashes, notes) are the user's: ask before deleting or overwriting any.

## Dev server and tunnel

[END-OF-RUN.md](../orchestrate-specs/END-OF-RUN.md) steps 4 to 6, plus:

- Commands, ports, health route, restart and stop: [codebase map](../../../docs/agents/codebase-map.md), "Running the app". Anything this level starts by hand: `nohup`, output to `/tmp/pp-<name>.log`, note the PID or Compose project, and stop only that; `pkill -f`/`pgrep -f` patterns can match this agent's own shell.
- Who owns a running runtime, and what to start, restart or leave: END-OF-RUN step 4. A port already in use: find the holder and tell the user unless this level started it.
- Tunnel: reuse one another session started; a tunnel pointing at another port belongs to something else. If the codebase map names no tunnel, say so rather than inventing one. Tell the user the URL whenever it changes.

## Reporting when a spec finishes

[END-OF-RUN.md](../orchestrate-specs/END-OF-RUN.md) step 7, per spec, built from the spec orchestrator's hand-back, plus:

- Summary fields: PR, merge commit, CI, what was built, schema changes (a rebuild for the user to run), env vars, dependencies.
- Health fields: review rounds and real bugs caught, memory peak (`mem-watch.sh peak`), process slips.
- Proposed follow-ups are shown and never posted without the user's approval; add them to the running list below.

Done when each item is answered, even if only "none".

## Follow-ups

Keep one running list across all specs. When the user asks to post, show it grouped and numbered, then create the approved items. Every issue says its items came from earlier reviews and must be re-checked on main.

- **Bugs** (a Member sees wrong data or behaviour, or an outside rule is broken): verify against current main where cheap, one issue each, labels `bug` + `ready-for-agent`, or `bug` + `needs-triage` when a decision is needed. Merge duplicates. Behaviour an ADR records as intended is a product decision, not a bug.
- **Tech debt** (refactors, duplication, tests, performance, hardening, docs): a handful of issues grouped by area, each with a checklist, labels `tech-debt` + `ready-for-agent` (+ `documentation` for docs).
- **Everything else** (product decisions, features, admin/data, human device checks): one Backlog issue with a checklist, label `needs-triage`.
- Labels: check with `gh label list`; create a missing one only when the user asked for labels.

## Retro

Only when the user asks. Collect the problems that repeat across the run reports, propose fixes with a recommendation, and run the chosen ones through the pipeline as a spec with tickets.
