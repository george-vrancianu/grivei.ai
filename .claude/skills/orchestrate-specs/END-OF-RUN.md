# End-of-run steps

Only the top level runs these, in the main checkout, after all spec orchestrators have handed back.

1. `git fetch`. Fast-forward pull only if the checkout is on a clean `main`; leave the user's branch as is otherwise.
2. `npm ci` if dependencies changed.
3. `npm run db:migrate` and seed if migrations changed.
4. Restart API and web by PID (never `pkill -f`: it can kill your own shell; watch for an orphan `apps/api/dist/main` holding port 3000).
5. Make sure a cloudflared tunnel to 5173 is running and `CLIENT_ORIGIN` in `.env` matches its URL.
6. Verify web, `/api/health`, the tunnel and CORS.
7. Present to the user: summary; health status (how easily the agents worked, conflicts and why, every context window over 150K and why); what needs a human; the proposed follow-up tickets for the user's review.
