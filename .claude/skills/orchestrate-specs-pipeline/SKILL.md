---
name: orchestrate-specs-pipeline
description: Run the top-level session over a long thread - keep a pipeline of specs moving with orchestrate-specs, and handle intake, the user's checkout, dev server and tunnel, reports, follow-ups and retro.
disable-model-invocation: true
---

This session is the top level the user talks to. It starts each spec with [orchestrate-specs](../orchestrate-specs/SKILL.md) and handles everything around the specs. Everything per-spec (roles, briefs, [hard rules](../orchestrate-specs/HARD-RULES.md), [spec orchestrator](../orchestrate-specs/SPEC-ORCHESTRATOR.md), [ticket orchestrator](../orchestrate-specs/TICKET-ORCHESTRATOR.md), repo docs, gotchas) lives there. `gh` commands: [issue-tracker.md](../../../docs/agents/issue-tracker.md).

## Intake

- **"Add #N to the pipeline"**: read the issue, list its children (the "Children of a spec" command) and each child's `## Blocked by` lines, and confirm it carries `ready-for-agent`. A single ticket that is not a spec runs as a one-ticket spec.
- **"What new issues in the last X hours can be implemented?"**: list only parent issues (not children) labelled `ready-for-agent`. For each give whether its blockers, including other specs, are closed, and which children belong to it.
- **Before starting a spec**: compare it with the running specs for shared files or modules. Start in parallel only when conflict is light and `free -g` leaves memory well under 30 GB: about 2 to 3 spec orchestrators at once ([SPEC-ORCHESTRATOR](../orchestrate-specs/SPEC-ORCHESTRATOR.md) caps each at 2 ticket orchestrators).
- **Unsettled blocker**: ask the user before starting. Once the user says the blocker "is settled", start the spec.

## While specs run

- Start each spec orchestrator in the background with the brief from [orchestrate-specs](../orchestrate-specs/SKILL.md).
- **Cross-spec dependency**: when a blocking spec merges, SendMessage the waiting spec orchestrator. Agents never poll.
- A subagent report that reaches this level by mistake: relay it to the orchestrator it belongs to.
- An interim "waiting on its own background work" notification is not a result. Say the spec is still running and predict no outcome.
- Answer progress questions from completion messages only. Agents' transcript files stay unread.

## The user's checkout

The user keeps working in the main checkout. Only this level runs commands there. Run [END-OF-RUN.md](../orchestrate-specs/END-OF-RUN.md) steps 1 to 3 after each spec merges, without waiting for the whole pipeline. Plus:

- The user's branch and work stay as they are: no switching, no stashing.
- Untracked files there (handoff zips, stashes, notes) are the user's: ask before deleting or overwriting any.

## Dev server and tunnel

[END-OF-RUN.md](../orchestrate-specs/END-OF-RUN.md) steps 4 to 6, plus:

- API: `nohup npm run start:dev --workspace @pocket-pantry/api > /tmp/pp-api.log`. Web: `nohup npm run dev --workspace @pocket-pantry/web > /tmp/pp-web.log`. Stop them by PID; `pkill -f`/`pgrep -f` patterns can match this agent's own shell.
- An orphan `apps/api/dist/main` holding port 3000 shows up as EADDRINUSE: stop it by PID.
- Tunnel log: `/tmp/cloudflared.log`. Another session may have started the tunnel: reuse it. Down: start a new one, and set `CLIENT_ORIGIN` in `.env` to the new URL **before** starting the API. A `cloudflared` pointing at another port belongs to something else: leave it.
- Verify web 200 on 5173 and `/api/health` 200 on 3000 both directly and through the tunnel, and that the `access-control-allow-origin` header equals the tunnel URL. Tell the user the URL whenever it changes.

## Reporting when a spec finishes

[END-OF-RUN.md](../orchestrate-specs/END-OF-RUN.md) step 7, per spec, built from the spec orchestrator's hand-back, plus:

- Summary fields: PR, merge commit, CI, what was built, migrations, env vars, dependencies.
- Health fields: review rounds and real bugs caught, memory peak, process slips.
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
