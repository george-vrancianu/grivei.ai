/* eslint-disable @typescript-eslint/no-explicit-any -- throwaway eval harness (#339): untyped OpenRouter and tool JSON */
// Throwaway eval harness (#339): runs models over the evaluation set, both tiers. Raw transcripts go to ../private/runs/ (gitignored:
// Private-view transcripts hold Restricted content). Usage: node run.ts [--models a,b] [--tiers public,private] [--cases id1,id2] [--tag name]
import { readFileSync, mkdirSync, appendFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { parse } from "yaml";
import { makeStore, Ledger, type Tier } from "./tools.ts";
import { runTurn, systemPrompt, type ModelConfig } from "./agent.ts";

const here = new URL(".", import.meta.url).pathname;
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

export const MODELS: Record<string, { config: ModelConfig; tiers: Tier[] }> = {
  "ling-3.1-flash": { config: { id: "inclusionai/ling-3.1-flash" }, tiers: ["public"] },
  "deepseek-v4.1-flash": { config: { id: "deepseek/deepseek-v4.1-flash" }, tiers: ["public"] },
  "gpt-6-luna": { config: { id: "openai/gpt-6-luna" }, tiers: ["public", "private"] },
  "claude-haiku-5.5": { config: { id: "anthropic/claude-haiku-5.5" }, tiers: ["public", "private"] },
  "gemini-3.5-flash-lite": { config: { id: "google/gemini-3.5-flash-lite" }, tiers: ["public", "private"] },
};

/** Private-view requests go only to providers that neither train on nor retain the data (#334). Public ones only refuse training. */
const providerFor = (tier: Tier) => (tier === "private" ? { data_collection: "deny", zdr: true } : { data_collection: "deny" });

interface Turn {
  lang: string;
  question: string;
  tier?: string;
  [k: string]: unknown;
}
interface Case {
  id: string;
  kind: string;
  tier: string;
  turns?: Turn[];
  question?: string;
  file: "public" | "private";
  [k: string]: unknown;
}

export function loadCases(): Case[] {
  const read = (f: string, file: Case["file"]) => (existsSync(f) ? (parse(readFileSync(f, "utf8")).cases as Case[]).map((c) => ({ ...c, file })) : []);
  return [...read(`${here}../cases.yaml`, "public"), ...read(`${here}../private/cases.yaml`, "private")];
}

const turnsOf = (c: Case): Turn[] => (c.kind === "walkthrough" ? c.turns! : [c as unknown as Turn]);
const r0 = (rows: any[]) => rows[0];
const runsOn = (c: Case, tier: Tier) => c.tier === "both" || c.tier === tier;

async function pool<T>(items: T[], n: number, f: (t: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: n }, async () => { for (let t = queue.shift(); t; t = queue.shift()) await f(t); }));
}

async function main() {
  const tag = arg("tag") ?? new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const models = (arg("models") ?? Object.keys(MODELS).join(",")).split(",");
  const tiers = (arg("tiers") ?? "public,private").split(",") as Tier[];
  const only = arg("cases")?.split(",");
  const cases = loadCases().filter((c) => !only || only.includes(c.id));
  const outDir = `${here}../private/runs/${tag}`;
  mkdirSync(outDir, { recursive: true });
  // resume: keep only conversations that finished without an error; rerun the rest
  const done = new Set<string>();
  for (const f of readdirSync(outDir).filter((f) => f.endsWith(".jsonl") && f !== "graded.jsonl")) {
    const rows = readFileSync(`${outDir}/${f}`, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const bad = new Set(rows.filter((r) => r.error).map((r) => r.case));
    const kept = rows.filter((r) => !bad.has(r.case));
    const byCase = new Map<string, number>();
    for (const r of kept) byCase.set(r.case, (byCase.get(r.case) ?? 0) + 1);
    const complete = new Set([...byCase].filter(([id, n]) => { const c = cases.find((x) => x.id === id); return c && n >= turnsOf(c).filter((t) => !t.tier || t.tier === "both" || t.tier === r0(rows).tier).length; }).map(([id]) => id));
    writeFileSync(`${outDir}/${f}`, kept.filter((r) => complete.has(r.case)).map((r) => JSON.stringify(r)).join("\n") + (complete.size ? "\n" : ""));
    for (const id of complete) done.add(`${rows[0].model}|${rows[0].tier}|${id}`);
  }

  for (const tier of tiers) {
    const { pool: db, store } = makeStore(tier);
    const dataThrough = Object.fromEntries([...(await store.dataThrough()), ...(await store.onrcDataThrough())].map((d) => [d.kind, d.date]));
    const jobs: { model: string; c: Case }[] = [];
    for (const m of models) if (MODELS[m]!.tiers.includes(tier)) for (const c of cases) if (runsOn(c, tier) && !done.has(`${m}|${tier}|${c.id}`)) jobs.push({ model: m, c });
    console.log(`${tier}: ${jobs.length} conversations`);
    const busy = new Map<string, number>();
    const perModel = Number(arg("per-model") ?? 2);
    const acquire = async (m: string) => { while ((busy.get(m) ?? 0) >= perModel) await new Promise((r) => setTimeout(r, 500)); busy.set(m, (busy.get(m) ?? 0) + 1); };
    jobs.sort((a, b) => cases.indexOf(a.c) - cases.indexOf(b.c));
    await pool(jobs, Number(arg("concurrency") ?? 4), async ({ model, c }) => {
      await acquire(model);
      try {
      const cfg = { ...MODELS[model]!.config, provider: providerFor(tier) };
      const ctx = { store, pool: db, tier, ledger: new Ledger(), dataThrough };
      const messages: any[] = [{ role: "system", content: systemPrompt(tier) }];
      const turns = turnsOf(c);
      for (let i = 0; i < turns.length; i++) {
        const t = turns[i]!;
        if (t.tier && t.tier !== "both" && t.tier !== tier) continue;
        const r = await runTurn(cfg, ctx, messages, t.question);
        const row = { model, tier, case: c.id, file: c.file, turn: i, question: t.question, ...r, ledger: [...ctx.ledger.ids] };
        appendFileSync(`${outDir}/${model}.${tier}.jsonl`, JSON.stringify(row) + "\n");
        console.log(`${model} ${tier} ${c.id}#${i} rounds=${r.rounds} calls=${r.toolCalls.length} $${r.usage.cost.toFixed(5)} ${r.latencyMs}ms${r.error ? " ERROR " + r.error : ""}`);
        if (r.error) break;
      }
      } finally { busy.set(model, busy.get(model)! - 1); }
    });
    await db.end();
  }
  console.log(`runs in ${outDir}`);
}

// a Postgres restart surfaces as an error event on a long-lived client (the cache's listener): log it, keep running; affected turns fail and resume reruns them
process.on("uncaughtException", (e) => console.error("uncaught:", e.message));
if (import.meta.url === `file://${process.argv[1]}`) await main();
