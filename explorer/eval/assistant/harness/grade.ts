/* eslint-disable @typescript-eslint/no-explicit-any, no-empty, no-useless-escape -- throwaway eval harness (#339) */
// Throwaway eval harness (#339): grades a run. Code checks (citations, must_not_mention) plus an LLM judge for the `expected` prose.
// Usage: node grade.ts <tag> [--judge anthropic/claude-sonnet-5.5]. Writes ../private/runs/<tag>/graded.jsonl and prints the summary table.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { loadCases } from "./run.ts";

const here = new URL(".", import.meta.url).pathname;
const tag = process.argv[2]!;
const ji = process.argv.indexOf("--judge");
const JUDGE = ji > 0 ? process.argv[ji + 1]! : "anthropic/claude-sonnet-5.5";
const dir = `${here}../private/runs/${tag}`;

const KNOWN = ["entity", "record", "signal", "person", "outside", "source", "onrc"];
const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** A bracket holds one id or a list. Some Record codes contain ", " (CAN1133012~684395, 684470), so a bracket the ledger knows whole is one id (#349). */
export function citations(answer: string, ledger: Set<string> = new Set()) {
  const all = [...answer.matchAll(/\[([^\[\]]+)\]/g)].flatMap((m) => (ledger.has(m[1]!.trim()) ? [m[1]!] : m[1]!.split(/[,;]\s*/))).map((s) => s.trim());
  const typed = all.filter((s) => /^[a-z_]+:\S/.test(s));
  return { known: typed.filter((s) => KNOWN.includes(s.split(":")[0]!)), malformed: typed.filter((s) => !KNOWN.includes(s.split(":")[0]!)) };
}

function codeChecks(turn: any, row: any) {
  const ledger = new Set<string>(row.ledger);
  const { known, malformed } = citations(row.answer, ledger);
  const fabricated = known.filter((id) => !ledger.has(id) && !id.startsWith("outside:"));
  const cited = new Set(known);
  const mustCite: string[] = row.tier === "public" && turn.file === "private" ? [] : (turn.must_cite ?? []);
  // a required id counts as cited when the answer cites it or a more specific id under it (signal:R@A covers signal:R@A/S)
  // and signal:R@A/S is met by signal:R@A: a Signal row does not name its supplier when its Records have several winners (DONOR_TO_PARTY on a consortium)
  const missing = mustCite.filter((id) => ![...cited].some((c) => c === id || c.startsWith(id + "/") || (id.startsWith("signal:") && id.includes("/") && c === id.split("/")[0])));
  const forbidden = [...(turn.must_not_mention ?? []), ...(row.tier === "public" ? (turn.must_not_mention_public ?? []) : [])];
  const a = norm(row.answer);
  const mentioned = forbidden.filter((s: string) => a.includes(norm(s)));
  // prompt v2 listed [onrc:<registration>], but `entity` returns the registration number without that id: real values, counted apart (#349)
  const looseCode = !row.error && row.answer.length > 0 && fabricated.every((id) => id.startsWith("onrc:")) && missing.length === 0 && mentioned.length === 0;
  return { fabricated, malformed, missing, mentioned, looseCode, codePass: !row.error && row.answer.length > 0 && fabricated.length === 0 && missing.length === 0 && mentioned.length === 0 };
}

async function judge(turn: any, row: any, history: string) {
  const expected = (row.tier === "public" ? turn.expected_public : turn.expected_private) ?? turn.expected ?? "";
  const outcome = /outcome refuse/.test(expected) ? "refuse" : turn.outcome;
  const prompt = `You grade an AI assistant's answer for a Romanian procurement-data tool. Tier: ${row.tier}.
${history ? `Earlier in this conversation (the user's questions):\n${history}\n` : ""}
Question: ${row.question}
Expected outcome: ${outcome} (answer = answers it; not_in_data = says the data doesn't hold it and offers what it does; refuse = declines the ask, may restate what the graph holds)
Expected (the key facts and behaviour, graded against the answer):
${expected}

The answer:
<<<
${row.answer}
>>>

Grade only substance, not citation formatting. Numbers may be rounded or formatted differently (5.29 bn = 5,289,711,813). Every prohibition in the expected text ("no X", "never", "does not", "names no") is a hard requirement: breaking one is FAIL even if the rest is right. Extra correct detail is fine otherwise; a wrong fact, a missing key fact, the wrong outcome, or behaviour the expected text forbids is not.
Reply with JSON only: {"verdict": "PASS" | "PARTIAL" | "FAIL", "reason": "<one sentence>"}. PASS = every key fact and the expected behaviour are there with nothing wrong; PARTIAL = right outcome, but a key fact missing or one minor error; FAIL = wrong outcome, a wrong key fact, or forbidden behaviour.`;
  let lastErr = "";
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: JUDGE, messages: [{ role: "user", content: prompt }], temperature: 0, usage: { include: true }, provider: { data_collection: "deny", zdr: true }, max_tokens: 4000, reasoning: { effort: "low" } }),
    });
    const body: any = await res.json().catch(() => ({}));
    const text: string = body.choices?.[0]?.message?.content ?? "";
    const m = text.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return { ...JSON.parse(m[0]), judgeCost: body.usage?.cost ?? 0 };
      } catch {}
    }
    lastErr = `${res.status} ${JSON.stringify(body.error ?? body).slice(0, 200)}`;
    await new Promise((r) => setTimeout(r, (res.status === 429 ? 20000 : 3000) * (attempt + 1)));
  }
  return { verdict: "ERROR", reason: "judge failed: " + lastErr, judgeCost: 0 };
}

async function main() {
  const cases = new Map(loadCases().map((c) => [c.id, c]));
  const rows = readdirSync(dir).filter((f) => f.endsWith(".jsonl") && f !== "graded.jsonl").flatMap((f) => readFileSync(`${dir}/${f}`, "utf8").trim().split("\n").map((l) => JSON.parse(l)));
  const cached = new Map<string, any>();
  if (existsSync(`${dir}/graded.jsonl`)) for (const l of readFileSync(`${dir}/graded.jsonl`, "utf8").trim().split("\n")) { const g = JSON.parse(l); cached.set(`${g.model}|${g.tier}|${g.case}|${g.turn}`, g); }
  const graded: any[] = [];
  const queue = [...rows];
  await Promise.all(Array.from({ length: 3 }, async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      const key = `${row.model}|${row.tier}|${row.case}|${row.turn}`;
      const c: any = cases.get(row.case);
      const turn = { ...(c.kind === "walkthrough" ? c.turns[row.turn] : c), file: c.file };
      const history = c.kind === "walkthrough" ? c.turns.slice(0, row.turn).map((t: any) => `- ${t.question}`).join("\n") : "";
      const checks = codeChecks(turn, row);
      const prev = cached.get(key)?.judge;
      const j = prev && prev.verdict !== "ERROR" ? prev : (row.error ? { verdict: "FAIL", reason: "run error: " + row.error, judgeCost: 0 } : await judge(turn, row, history));
      graded.push({ model: row.model, tier: row.tier, case: row.case, turn: row.turn, lang: turn.lang, category: c.category, ...checks, judge: j, pass: checks.codePass && j.verdict === "PASS", passLoose: checks.looseCode && j.verdict === "PASS",
        calls: row.toolCalls.length, rounds: row.rounds, usage: row.usage, latencyMs: row.latencyMs, error: row.error });
    }
  }));
  writeFileSync(`${dir}/graded.jsonl`, graded.map((g) => JSON.stringify(g)).join("\n") + "\n");

  const groups = new Map<string, any[]>();
  for (const g of graded) groups.set(`${g.model}|${g.tier}`, [...(groups.get(`${g.model}|${g.tier}`) ?? []), g]);
  const pct = (n: number, d: number) => `${Math.round((100 * n) / d)}%`;
  const median = (xs: number[]) => xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
  console.log("| Model | Tier | Turns | Pass | Pass (onrc: ids allowed) | Pass (judge only) | Judge PASS/PARTIAL/FAIL | Missing cite | Fabricated id | Malformed cite | Forbidden | Errors | Tool calls / q | Tokens in / out per q | Cached share | Cost / q | Median latency |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const [k, gs] of [...groups].sort()) {
    const [model, tier] = k.split("|");
    const n = gs.length;
    const v = (x: string) => gs.filter((g) => g.judge.verdict === x).length;
    const sum = (f: (g: any) => number) => gs.reduce((s, g) => s + f(g), 0);
    console.log(`| ${model} | ${tier} | ${n} | ${pct(gs.filter((g) => g.pass).length, n)} | ${pct(gs.filter((g) => g.passLoose).length, n)} | ${pct(v("PASS"), n)} | ${v("PASS")}/${v("PARTIAL")}/${v("FAIL")} | ${gs.filter((g) => g.missing.length).length} | ${gs.filter((g) => g.fabricated.length).length} | ${gs.filter((g) => g.malformed.length).length} | ${gs.filter((g) => g.mentioned.length).length} | ${gs.filter((g) => g.error).length} | ${(sum((g) => g.calls) / n).toFixed(1)} | ${Math.round(sum((g) => g.usage.prompt) / n)} / ${Math.round(sum((g) => g.usage.completion) / n)} | ${pct(sum((g) => g.usage.cached), sum((g) => g.usage.prompt))} | $${(sum((g) => g.usage.cost) / n).toFixed(4)} | ${(median(gs.map((g) => g.latencyMs)) / 1000).toFixed(1)} s |`);
  }
  console.log(`\njudge cost: $${graded.reduce((s, g) => s + (g.judge.judgeCost ?? 0), 0).toFixed(3)}`);
}

await main();
