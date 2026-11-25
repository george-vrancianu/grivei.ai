/* eslint-disable @typescript-eslint/no-explicit-any -- throwaway eval harness (#339): untyped OpenRouter and tool JSON */
import { makeStore, Ledger, runTool, type Tier } from "./tools.ts";
const tier = (process.argv[2] ?? "public") as Tier;
const { pool, store } = makeStore(tier);
const dt = Object.fromEntries([...(await store.dataThrough()), ...(await store.onrcDataThrough())].map((d) => [d.kind, d.date]));
const ctx = { store, pool, tier, ledger: new Ledger(), dataThrough: dt };
const calls: [string, any][] = JSON.parse(process.argv[3]);
for (const [n, a] of calls) { const out = await runTool(ctx, n, a); console.log(`== ${n} ${JSON.stringify(a)} (${out.length} chars)\n${out.slice(0, Number(process.env.CUT ?? 1500))}`); }
await pool.end();
