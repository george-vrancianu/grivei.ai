# End-of-run steps

Only the top level runs these, in the main checkout, after all spec orchestrators have handed back.

1. `git fetch`. Fast-forward pull only if the checkout is on a clean `main`; leave the user's branch as is otherwise.
2. Install dependencies if they changed (the codebase map names the install command).
3. If the merged specs changed the database schema, say so in the report: the user runs the rebuild (codebase map, "Schema is applied at rebuild"). Don't run it.
4. Restart the dev servers this level started earlier, by PID, so it stops only its own processes (never `pkill -f`: it can kill your own shell). If something else holds the port, report it instead of stopping it. Start and verify commands: the codebase map, "Running the app".
5. Tunnel: if the codebase map names one, make sure it is running and the app's allowed origin matches its URL; otherwise say there is none.
6. Verify the app, the health route and, when there is a tunnel, the tunnel and CORS.
7. Present to the user: summary; memory peak with its time (`bash .claude/skills/orchestrate-specs/mem-watch.sh peak`); health status (how easily the agents worked, conflicts and why, every context window over 150K and why); what needs a human; the proposed follow-up tickets for the user's review.
8. After the last spec's step 7 (queue empty, nothing running): if `start` printed "started", run `bash .claude/skills/orchestrate-specs/mem-watch.sh stop`; if it printed "reusing", leave that watcher running (you didn't start it).
