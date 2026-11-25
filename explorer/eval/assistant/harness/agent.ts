/* eslint-disable @typescript-eslint/no-explicit-any -- throwaway eval harness (#339): untyped OpenRouter and tool JSON */
// Throwaway eval harness (#339): a minimal hand-rolled tool loop over OpenRouter's OpenAI-compatible endpoint (per #336). NOT production code.
import { runTool, toolsFor, type ToolContext, type Tier } from "./tools.ts";

export const MAX_TOOL_ROUNDS = 10;

export function systemPrompt(tier: Tier) {
  return `You are the Assistant of grivei.ai, which helps journalists read Romanian public procurement data (SEAP) and linked public registers.

Rules:
- Answer only from what your tools return in this conversation. Never use outside knowledge for facts about entities, money, people or parties.
- Cite every fact with the id the tool gave, in square brackets, right after the claim: [entity:4305857], [record:CAN123~4], [signal:RULE@authority/supplier], [person:...], [outside:<url>]. Never invent or alter an id. A claim you cannot cite, don't make.
- SEAP money is awarded value: what contracts were awarded at, not what was spent or paid. Name the measure and the Source. Never add money from different Sources together. Suspect values are shown but never counted.
- Identity is the CUI, never the name: two entities with the same name stay separate; never join records, firms or people by name.
- Signals are rule-based flags worth verifying in the source documents, with lawful explanations. Never call them wrongdoing, never score or rank entities, never call anyone corrupt.
- You never open or write an Investigation; you may point out a Lead (something worth verifying), worded as such.
- Never name or infer relatives, beneficial owners, or a CNP. Natural-person suppliers have no totals.
- Say what the data does not hold (payments, beneficial owners, events after a Source's Data-through date) instead of guessing. State Data-through dates and coverage gaps when they matter.
- ${tier === "public" ? "This is the public tier: links joining people across firms (a person's roles in other organisations) are not available here; if asked, say so without hinting at whether any exist. Web search is not available on this tier." : "This is a Private view: you may use the person tool for a person id returned by entity. Web search only when the user explicitly asks, anchored to an entity already in the conversation; results are Outside sources cited by URL, shown apart from graph facts, never joined to an entity by name."}
- Answer in the user's language (Romanian or English), concisely. Keep data values (names, titles) as published.`;
}

export interface Usage {
  prompt: number;
  completion: number;
  cached: number;
  cost: number;
}

export interface TurnResult {
  answer: string;
  toolCalls: { name: string; args: unknown; chars: number }[];
  rounds: number;
  usage: Usage;
  latencyMs: number;
  error?: string;
  providers: string[];
}

export interface ModelConfig {
  id: string;
  /** OpenRouter provider routing, e.g. { data_collection: "deny", zdr: true } */
  provider?: Record<string, unknown>;
  reasoning?: Record<string, unknown>;
}

/** Anthropic caches only at explicit breakpoints: mark the system prompt and the newest message (OpenRouter passes cache_control through). */
function withCacheBreakpoint(messages: any[]) {
  const mark = (m: any) => (typeof m.content === "string" && m.content ? { ...m, content: [{ type: "text", text: m.content, cache_control: { type: "ephemeral" } }] } : m);
  return messages.map((m, i) => (i === 0 || i === messages.length - 1 ? mark(m) : m));
}

async function chat(model: ModelConfig, messages: unknown[], tools: unknown[]) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "X-Title": "grivei-eval" },
      body: JSON.stringify({ model: model.id, messages: model.id.startsWith("anthropic/") ? withCacheBreakpoint(messages) : messages, tools, temperature: 0, usage: { include: true }, provider: model.provider, reasoning: model.reasoning, max_tokens: 4000 }),
    });
    const body: any = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }));
    if (res.ok && !body.error) return body;
    if (attempt >= 8 || (res.status < 500 && res.status !== 429)) throw new Error(`${res.status} ${body.error?.message ?? JSON.stringify(body).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, (res.status === 429 ? 15000 : 3000) * (attempt + 1)));
  }
}

/** Runs one user turn to a final answer; `messages` is the conversation so far and is extended in place. */
export async function runTurn(model: ModelConfig, ctx: ToolContext, messages: any[], question: string): Promise<TurnResult> {
  const tools = toolsFor(ctx.tier);
  messages.push({ role: "user", content: question });
  const usage: Usage = { prompt: 0, completion: 0, cached: 0, cost: 0 };
  const toolCalls: TurnResult["toolCalls"] = [];
  const providers = new Set<string>();
  const t0 = Date.now();
  let rounds = 0;
  try {
    for (;;) {
      const forceAnswer = rounds >= MAX_TOOL_ROUNDS;
      const body = await chat(model, messages, forceAnswer ? [] : tools);
      if (body.provider) providers.add(body.provider);
      const u = body.usage ?? {};
      usage.prompt += u.prompt_tokens ?? 0;
      usage.completion += u.completion_tokens ?? 0;
      usage.cached += u.prompt_tokens_details?.cached_tokens ?? 0;
      usage.cost += u.cost ?? 0;
      const msg = body.choices?.[0]?.message;
      if (!msg) throw new Error(`no message: ${JSON.stringify(body).slice(0, 300)}`);
      const calls = msg.tool_calls ?? [];
      if (!calls.length || forceAnswer) {
        const answer = msg.content ?? "";
        messages.push({ role: "assistant", content: answer });
        return { answer, toolCalls, rounds, usage, latencyMs: Date.now() - t0, providers: [...providers] };
      }
      messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });
      rounds++;
      for (const c of calls) {
        let args: unknown = {};
        try {
          args = JSON.parse(c.function.arguments || "{}");
        } catch {
          args = {};
        }
        const out = await runTool(ctx, c.function.name, args);
        toolCalls.push({ name: c.function.name, args, chars: out.length });
        messages.push({ role: "tool", tool_call_id: c.id, content: out });
      }
    }
  } catch (e) {
    return { answer: "", toolCalls, rounds, usage, latencyMs: Date.now() - t0, error: (e as Error).message, providers: [...providers] };
  }
}
