# Which hosted models are cheapest per question for graph tool calling in Romanian and English?

Research for #333 (map #332, ADR 0017). Every figure below was checked on **2026-11-25**. Prices are USD per 1M tokens, standard (non-batch) tier, unless noted. Prices and lineups change monthly, so re-check the URLs before the eval run and again before the Assistant ships.

## Answer in brief

- At a typical question (5 tool calls, caching on), the cheap tool-capable models cost **$0.0015 to $0.007 per question**, which is **$1.50 to $7 per 1,000 questions**. A heavy session (8 tool calls, reasoning on) costs **$0.004 to $0.022** with caching on, and **$0.009 to $0.045** with caching off.
- Price per token is not the same as cost per question. The agent loop resends the system prompt, the tool schemas and every earlier tool result on each call, so input tokens are about 97% of the volume. That makes **cached-input price** and caching support matter more than the headline output price.
- Tool-calling reliability is the bar. The only current, independent, regularly re-run tool-calling benchmark is OpenRouter's τ²-Bench Airline run of 2026-11-20. BFCL V4 was last updated 2026-04-12 and has none of the current cheap models. Neither covers Romanian, and **no public Romanian tool-calling benchmark exists**, so Romanian quality has to come from our own eval set.
- **Shortlist for the eval run:** Claude Haiku 5.5, Gemini 3.5 Flash-Lite, DeepSeek V4.1 Flash (first-party API), GPT-6 Luna, and Ling 3.1 Flash. Reserves: MiMo-V2.6-Flash and GLM 5.3 Flash. Reasons are in the [Shortlist](#shortlist-for-the-eval-run) section.
- **Tier constraint:** a model chosen for the Private view sends Restricted content off the host (ADR 0017, Open 1). Only providers whose terms say they do not train on API data by default (Anthropic, OpenAI, Google paid tier) are candidates for that tier on current evidence. DeepSeek (data stored in the PRC) and single-provider OpenRouter models whose data terms are unstated are **public-tier candidates only**.

## 1. Prices, context and caching

| Model (API id) | Provider | Input | Cached input | Output | Context | Caching | Source |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Claude Haiku 5.5 (`claude-haiku-5-5`) | Anthropic | 0.10 | 0.01 (hit); write 0.125 (5 min) / 0.20 (1 h) | 0.50 | 1M; **prompts over 100k tokens pay 0.50 / 0.05 / 2.50** | explicit or automatic `cache_control` | [1] |
| Claude Haiku 4.5 (reference only) | Anthropic | 1.00 | 0.10 | 5.00 | 200k | same | [1] |
| GPT-6 Luna (`gpt-6-luna`) | OpenAI | 0.10 | 0.01 | 0.50 | 1.05M | automatic | [2], [7] |
| GPT-5.6 Luna (`gpt-5.6-luna`) | OpenAI | 0.20 | 0.02 | 1.20 | 1.05M | automatic | [2] |
| gpt-5-nano | OpenAI | 0.05 | 0.005 | 0.40 | 400k | automatic | [2] |
| gpt-5.4-nano | OpenAI | 0.20 | 0.02 | 1.25 | 400k | automatic | [2] |
| gpt-5-mini | OpenAI | 0.25 | 0.025 | 2.00 | 400k | automatic | [2] |
| Gemini 3.5 Flash-Lite (`gemini-3.5-flash-lite`) | Google | 0.30 | 0.03 | 2.50 | 1M | context caching (storage $1.00/1M tok/h) | [3], [7] |
| Gemini 3.1 Flash-Lite (`gemini-3.1-flash-lite`) | Google | 0.25 | 0.025 | 1.50 | 1M | same | [3] |
| Gemini 2.5 Flash-Lite (`gemini-2.5-flash-lite`) | Google | 0.10 | 0.01 | 0.40 | 1M | same | [3] |
| Gemini 3.8 Flash (`gemini-3.8-flash`) | Google | 0.75, **1.50 from 2027-01-01** | 0.075, then 0.15 | 3.75, then 7.50 | 1M | same | [3] |
| DeepSeek flash (`deepseek-flash` = DeepSeek-V4.1-Flash-1017) | DeepSeek | 0.30 peak / 0.15 off-peak | 0.006 / 0.003 | 1.20 / 0.60 | 1M | automatic (cache-hit price) | [4] |
| DeepSeek V4 Pro (`deepseek-v4-pro`) | DeepSeek | 1.32 / 0.66 | 0.044 / 0.022 | 3.96 / 1.98 | 1M | automatic | [4] |
| Mistral Small 4 (`mistral-small-4-0-26-03`) | Mistral | 0.15 | 0.015 (OpenRouter) | 0.60 | 256k | yes ("up to 90%") | [5], [6], [7] |
| Mistral Large (pricing-page example) | Mistral | 0.50 | 0.05 (OpenRouter, `mistral-large-2512`) | 1.50 | 256k | yes | [6], [7] |
| Mistral Medium 3.5 | Mistral | (deprecated since 06/09/2026) | | | 256k | | [5b] |
| Qwen3.8 Flash (`qwen/qwen3.8-flash`) | OpenRouter (Alibaba) | 0.15 | 0.016 | 0.47 | 1M | yes | [7] |
| Qwen3.7 Flash (`qwen/qwen3.7-flash`) | OpenRouter | 0.03 | 0.006 | 0.13 | 1M | yes | [7] |
| Ling 3.1 Flash (`inclusionai/ling-3.1-flash`) | OpenRouter (Ant Digital only) | 0.075 | 0.015 | 0.225 | 1M | yes | [7], [8] |
| MiMo-V2.6-Flash (`xiaomi/mimo-v2.6-flash`) | OpenRouter | 0.14 | 0.0028 | 0.28 | 1M | yes | [7] |
| GLM 5.3 Flash (`z-ai/glm-5.3-flash`) | OpenRouter | 0.12 | 0.02 | 0.38 | 1M | yes | [7] |
| Muse Glimmer 30B (`meta/muse-glimmer-30b`) | OpenRouter (Meta) | 0.35 | 0.04 | 1.50 | 131k | yes | [7] |
| Llama 4 Maverick | OpenRouter | 0.35 | 0.17 | 1.00 | 524k | yes | [7] |
| Nova Micro (`amazon/nova-micro-v1`) | OpenRouter (Amazon) | 0.035 | none listed | 0.14 | 128k | no | [7] |

Notes:

- **OpenRouter** passes provider prices through with "no markup on inference pricing" but charges **5.5% (min $0.80) when buying credits** [9]. Add 5.5% to every OpenRouter figure. OpenRouter prices are the lowest-priced endpoint at fetch time, and the provider behind that endpoint can change.
- The OpenAI marketing page ([openai.com/api/pricing](https://openai.com/api/pricing/)) no longer lists token prices. The API price table is at [2].
- Google re-routes `gemini-2.5-flash` to `gemini-3.5-flash-lite` and `gemini-2.5-pro` to `gemini-3.8-flash` on **2026-12-01**. `gemini-2.5-flash-lite` "will continue to be served until further notice" but newer models are recommended [3], [3b].
- **Tokenizers differ.** Anthropic says Claude 4.7+ models produce about 30% more tokens for the same text than earlier Claude models [1]. Romanian diacritics also tokenize worse than English on most tokenizers. Measure real token counts per model in the eval rather than trusting the model below to better than ±30%.
- "Llama" now means Meta's older open-weight line. Meta's 2026 models are the Muse family. Muse Glimmer 30B is the cheap one that shows up on the tool-calling board (§2).

## 2. Tool-calling reliability

### τ²-Bench Airline (OpenRouter, independent run, last run 2026-11-20) [10]

OpenRouter runs this itself "continuously against the same provider endpoints that serve OpenRouter traffic". It covers multi-turn tool calls under policy constraints, in English, for one domain. Pass^1, selected rows:

| Model | τ²-Airline | Model | τ²-Airline |
| --- | --- | --- | --- |
| Ling 3.1 Flash | **79.3%** | DeepSeek V4.1 Flash 1017 | 73.3% |
| Gemini 3.5 Flash-Lite | **78.3%** | Claude Haiku 5.5 | 72.8% |
| MiMo-V2.6-Flash | 77.9% | gpt-5-mini | 71.7% |
| Nova Micro 1.0 | 76.7% | Gemini 3.1 Flash-Lite | 71.3% |
| Muse Glimmer 30B | 76.5% | Qwen3.8 Flash | 71.3% |
| GLM 5.3 Flash | 75.6% | Gemini 3.8 Flash | 71.3% |
| DeepSeek V4.1 Flash | 75.1% | GPT-5.6 Luna | 69.7% |
| *(GPT-5.1, top row)* | *80.0%* | GPT-6 Luna | 67.3% |
| *(Claude Sonnet 5.5)* | *78.8%* | Claude Haiku 4.5 | 65.7% |
| | | gpt-5.4-nano | 64.7% |
| | | Gemini 2.5 Flash-Lite | 53.4% |
| | | gpt-5-nano | 48.3% |
| | | **Mistral Small 4** | **46.0%** |
| | | Llama 4 Maverick | 40.7% |

What this tells us:

- The cheap tier is now close to the frontier on this task. The top row (GPT-5.1) scores 80.0%, and several models under $0.30 input are within 2 points of it.
- **Below the bar on current evidence:** gpt-5-nano, Gemini 2.5 Flash-Lite, Mistral Small 4 and Llama 4 Maverick all score under 55%. They are the cheapest per token, but a failed tool loop costs a retry and a wrong answer, so they fail the "reliability is the bar" rule. No τ²-Airline score was found for the current Mistral Large. Mistral is the only EU-headquartered option, so it is worth one spot check if EU processing becomes a requirement.
- Nova Micro scores surprisingly high (76.7%). It is a December 2024 model with a 128k context, no caching and no published Romanian data. Treat it as an outlier to explain, not a candidate.
- Spreads of 1 to 2 points are within noise for a single domain. Treat the board as a filter, not a ranking.

### BFCL V4 (Berkeley) [11]

Last updated **2026-04-12**. Its newest cheap entries are Claude Haiku 4.5 (68.70% overall, rank 6), gpt-5-mini (55.46%), gpt-5-nano (51.45%), Gemini 2.5 Flash-Lite (36.87%) and Mistral-small-2506 (37.15%). None of the shortlisted current models is on it. It agrees with τ² on the weak end: gpt-5-nano, Gemini 2.5 Flash-Lite and small Mistral score low on multi-turn (13.5% to 34.5% "Multi Turn Acc"). It adds nothing on the current cheap generation.

### τ-bench official board [12]

[taubench.com](https://taubench.com) shows only combined τ²-bench top-3 entries (Qwen3.5-397B-A17B 87.9%, Gemini 3.0 Pro 85.4%, Claude Opus 4.5 85.3%) and τ³ boards, with no date. None of them is a cheap model.

## 3. Romanian-language quality

- **No current public benchmark measures Romanian tool calling or Romanian agent behaviour.** The Romanian evaluation work that exists (OpenLLM-Ro [13], GRILE grammar benchmark [14]) dates from 2024–2025 and scores open-weight models, not today's hosted cheap models. Multilingual suites that include Romanian, such as Global-MMLU (42 languages) and MMLU-ProX, have no published per-model Romanian scores for the shortlisted models.
- Anthropic publishes Global-MMLU scores relative to English for Haiku 5.5 (Spanish 98.1%, Italian 97.7%, French 97.7%, Indonesian 97.1%) but **Romanian is not in the table** [15]. As a Romance language, Romanian probably sits near Italian and Spanish, but that is an inference, not a measurement.
- Google, OpenAI, DeepSeek, Qwen and inclusionAI publish no Romanian-specific figures on the pages checked.
- **Consequence:** Romanian has to be a first-class part of the eval set (#332 already says so). Per question, score (a) whether the tool calls are correct when the question is in Romanian, (b) whether the answer is in correct Romanian with diacritics (ș/ț comma-below, not cedilla), and (c) whether Romanian source data (institution names, SEAP fields) is copied verbatim and never translated or "corrected".

## 4. Data terms, which decide the tier

ADR 0017 leaves open "what may be sent to [the provider] in a Private view (Restricted content leaving the host)".

| Provider | Trains on API data by default? | Location / retention | Source |
| --- | --- | --- | --- |
| Anthropic | No: "By default, we will not use your inputs or outputs from our commercial products." | Global by default; US-only at 1.1x | [16], [1] |
| OpenAI | No: API data "is not used to train or improve OpenAI models" unless you opt in | Abuse logs up to 30 days; ZDR on approval only | [17] |
| Google Gemini API | Paid tier: product-improvement use "No". **Free tier: data used to improve products.** | | [3] |
| DeepSeek | Privacy policy lists training as a use and offers an opt-out by email. It says Open Platform downstream-app data is "not covered". Personal data stored "in People's Republic of China". | PRC | [18], [19] |
| OpenRouter | Depends on the endpoint. `provider.zdr: true`, or an account setting, restricts routing to zero-data-retention endpoints, so some models may become unavailable. | | [20] |
| Ant Digital (Ling 3.1 Flash) | Not stated on the model page; "not currently available through EU in-region routing" | | [8] |

Never use the Gemini free tier, even for the eval, because the eval questions are real journalist questions.

## 5. Cost-per-question model

### Assumptions

- **System prompt plus tool schemas: S = 4,000 tokens.** About 1,500 tokens of instructions (domain rules from ADRs 0003/0009/0014, answer and citation format) plus about 2,500 tokens of JSON schemas for the 5 to 6 tools ADR 0017 lists. Provider-injected tool overhead (for example, Anthropic's 286 tokens for Haiku 5.5 [1]) is inside this margin.
- **User question: 50 tokens.** A single first question; follow-up turns add the earlier conversation (see the sensitivity notes).
- **k tool calls, one per model call, run in sequence.** There are k + 1 model calls (k with a tool call, then the final answer). Scenarios: k = 3, 5 (typical) and 8.
- **Tool result: 1,500 tokens each** (about 4–5 KB of compact JSON with Romanian names, "a few KB" in the ticket).
- **Output: 150 tokens per tool-call step** (arguments plus a short plan) and **600 tokens for the final answer** (cited answer plus Leads).
- **Context grows:** call i resends S, the question and all i earlier (step output + tool result) pairs. Total input = (k+1)(S+Q) + 1,650 · k(k+1)/2.
- **Caching on:** the static prefix (system plus tools) is warm from an earlier question, and each call's prefix is the previous call's whole input. The only uncached input is the question plus each new (step output + tool result). Anthropic bills those new tokens as 5-minute cache writes (1.25x). Other providers charge no write fee.
- **Reasoning sensitivity:** +500 reasoning tokens per model call, billed as output. Several cheap models reason by default; set the effort to minimal or none where the API allows it, and measure.
- No batch discount (the Assistant is interactive). OpenRouter's 5.5% credit fee is not included.

Token volumes this gives:

| k | Model calls | Total input | of which cached | Output |
| --- | --- | --- | --- | --- |
| 3 | 4 | 26,100 | 21,100 | 1,050 |
| 5 | 6 | 49,050 | 40,750 | 1,350 |
| 8 | 9 | 95,850 | 82,600 | 1,800 |

The largest single request (k = 8) is about 17k tokens, well below Haiku 5.5's 100k long-prompt threshold.

### Results (USD per question)

| Model | k=3 | **k=5** | k=8 | k=5, no cache | k=5, +reasoning | τ²-Airline |
| --- | --- | --- | --- | --- | --- | --- |
| gpt-5-nano | 0.0008 | **0.0012** | 0.0018 | 0.0030 | 0.0024 | 48.3% ✗ |
| Ling 3.1 Flash (OR) | 0.0009 | **0.0015** | 0.0026 | 0.0040 | 0.0022 | 79.3% |
| MiMo-V2.6-Flash (OR) | 0.0011 | **0.0017** | 0.0026 | 0.0072 | 0.0025 | 77.9% |
| Gemini 2.5 Flash-Lite | 0.0011 | **0.0018** | 0.0029 | 0.0054 | 0.0030 | 53.4% ✗ |
| GPT-6 Luna | 0.0012 | **0.0019** | 0.0031 | 0.0056 | 0.0034 | 67.3% |
| Nova Micro (OR) | 0.0011 | **0.0019** | 0.0036 | 0.0019 | 0.0023 | 76.7% |
| Claude Haiku 5.5 | 0.0014 | **0.0021** | 0.0034 | 0.0056 | 0.0036 | 72.8% |
| DeepSeek flash, off-peak | 0.0014 | **0.0022** | 0.0033 | 0.0082 | 0.0040 | 73.3% |
| GLM 5.3 Flash (OR) | 0.0014 | **0.0023** | 0.0039 | 0.0064 | 0.0035 | 75.6% |
| Qwen3.8 Flash (OR) | 0.0016 | **0.0025** | 0.0042 | 0.0080 | 0.0039 | 71.3% |
| Mistral Small 4 | 0.0017 | **0.0027** | 0.0043 | 0.0082 | 0.0045 | 46.0% ✗ |
| GPT-5.6 Luna | 0.0027 | **0.0041** | 0.0065 | 0.0114 | 0.0077 | 69.7% |
| gpt-5.4-nano | 0.0027 | **0.0042** | 0.0066 | 0.0115 | 0.0079 | 64.7% |
| DeepSeek flash, peak | 0.0029 | **0.0044** | 0.0066 | 0.0163 | 0.0080 | 73.3% |
| Gemini 3.1 Flash-Lite | 0.0034 | **0.0051** | 0.0081 | 0.0143 | 0.0096 | 71.3% |
| gpt-5-mini | 0.0039 | **0.0058** | 0.0090 | 0.0150 | 0.0118 | 71.7% |
| Muse Glimmer 30B (OR) | 0.0042 | **0.0066** | 0.0106 | 0.0192 | 0.0111 | 76.5% |
| Gemini 3.5 Flash-Lite | 0.0048 | **0.0071** | 0.0110 | 0.0181 | 0.0146 | 78.3% |
| Mistral Large (list) | 0.0051 | **0.0082** | 0.0135 | 0.0266 | 0.0127 | n/a |
| Llama 4 Maverick (OR) | 0.0064 | **0.0112** | 0.0205 | 0.0185 | 0.0142 | 40.7% ✗ |
| Gemini 3.8 Flash (2026 price) | 0.0093 | **0.0143** | 0.0229 | 0.0418 | 0.0256 | 71.3% |
| Claude Haiku 4.5 (reference) | 0.0136 | **0.0212** | 0.0338 | 0.0558 | 0.0362 | 65.7% |
| Gemini 3.8 Flash (from 2027-01-01) | 0.0185 | **0.0287** | 0.0458 | 0.0837 | 0.0512 | 71.3% |

✗ = below the reliability bar on current evidence. OR = OpenRouter price; add 5.5% for the credit fee. DeepSeek's τ² score is for the 1017 model that `deepseek-flash` now serves; OpenRouter's unpinned "V4.1 Flash" scored 75.1%.

### What moves the number

- **Caching is worth 2.5x to 4x.** Turning it off roughly triples the cost of every model except Nova Micro, which has no cache. For DeepSeek and MiMo it is 4x, because their cache hits cost 2% of input. The implementation should keep the system prompt and tool schemas byte-identical and first, put nothing volatile (dates, user ids) before them, and on Anthropic set `cache_control`. Check the providers' minimum cacheable prefix lengths in the eval, since a 4k prefix should clear them.
- **Tool-result size dominates growth.** Doubling R to 3,000 tokens roughly doubles cost at k = 8, because every result is resent on each later call. Capping and trimming tool results in the tool layer (page sizes, only the fields the model needs) is the biggest lever we control, bigger than switching between the cheap models.
- **Reasoning output** adds 30% to 100% for the cheap models. Set effort to minimal and test whether reliability holds.
- **Follow-up questions** in the same conversation resend the earlier turns (cached), so turn n costs roughly as much as a k·n-call question. Cap conversation length on the public tier.
- **Retries:** a model that fails a tool call and retries pays for another call with the full context. That is one more reason the reliability bar beats raw price.

### Budget arithmetic for the public tier

At $0.002 per question, a $5/day hard budget (an illustrative number, not a decision) buys about 2,500 questions a day. At Gemini 3.5 Flash-Lite's $0.007 it buys about 700. At the most expensive shortlisted model's k = 8, reasoning-on case ($0.022 with caching), it buys about 225.

## Shortlist for the eval run

Ordered by expected cost per question at k = 5. All five clear 67% on τ²-Airline, and all cost under $0.008 per typical question.

1. **Ling 3.1 Flash (inclusionAI, via OpenRouter): ~$0.0015.** The highest τ²-Airline score among cheap models (79.3%) at the second-lowest price. Risks: a single provider (Ant Digital), no stated data terms, no EU routing, and released 2026-10. **Public tier only.** It is included to test whether the cheapest serious option holds up in Romanian.
2. **GPT-6 Luna (OpenAI): ~$0.0019.** The cheapest first-party model whose terms say it does not train on API data. Its τ² (67.3%) is the weakest on the shortlist, so it is the floor test: if it passes our eval, it is the cheapest **Private-view** candidate.
3. **Claude Haiku 5.5 (Anthropic): ~$0.0021.** About the same price as Luna with a better τ² (72.8%), published multilingual data (Romance languages at 97–98% of English), no training by default, explicit cache control, and a 1.1x US-only option. The main **Private-view** candidate. Watch the 1.25x cache-write charge and the 100k-token price step.
4. **DeepSeek V4.1 Flash (DeepSeek API): ~$0.0022 off-peak, ~$0.0044 peak.** Cheap with a τ² score of 73–75%, and its cache hits are nearly free. Data is stored in the PRC and training is opt-out by email, so it is **public tier only**. The peak window (01–04 and 06–10 UTC on weekdays) overlaps Romanian morning hours (UTC+2), so the realistic cost is a blend of the two.
5. **Gemini 3.5 Flash-Lite (Google, paid tier): ~$0.0071.** The most expensive on the shortlist, but its τ² of 78.3% is the best of any first-party cheap model, and the paid tier does not use data for product improvement. It is the **reliability anchor**: if the cheaper models fail Romanian or multi-hop questions, this is the fallback for either tier at about 3.5x the cost. Note that `gemini-2.5-flash` begins routing to this model on 2026-12-01, so it is Google's chosen successor in this tier.

**Reserves** (swap in if a shortlisted model is pulled or fails on infrastructure): MiMo-V2.6-Flash (~$0.0017, 77.9%) and GLM 5.3 Flash (~$0.0023, 75.6%), both public-tier only for the same data-terms reason as Ling.

**Left out, and why:** gpt-5-nano, Gemini 2.5 Flash-Lite, Mistral Small 4 and Llama 4 Maverick fall below the reliability bar. gpt-5-mini, gpt-5.4-nano, GPT-5.6 Luna and Gemini 3.1 Flash-Lite cost more than a shortlisted model of similar or better τ². Gemini 3.8 Flash doubles in price on 2027-01-01. Claude Haiku 4.5 costs 10x Haiku 5.5 for a lower score. Mistral Large has no current tool-calling score, so revisit it only if EU-only processing becomes a requirement. Nova Micro's score is unexplained, and it has a small context and no cache.

**Suggested eval protocol:** send every model the same tool layer and prompts through one provider-neutral seam. Mix Romanian and English questions. Record per question the pass/fail, the token counts the provider reports (input, cached, output and reasoning), and the actual cost. Then choose per tier by **cost per passed question**, not by the estimates here.

## Sources (all accessed 2026-11-25)

1. Anthropic, Pricing: <https://platform.claude.com/docs/en/about-claude/pricing>
2. OpenAI, API pricing: <https://developers.openai.com/api/docs/pricing>
3. Google, Gemini API pricing (redirected from ai.google.dev): <https://aistudio.google.com/docs/pricing>
   3b. Google, Gemini models: <https://aistudio.google.com/docs/models>
4. DeepSeek, Models & pricing: <https://api-docs.deepseek.com/quick_start/pricing>
5. Mistral, Mistral Small 4 model card: <https://docs.mistral.ai/models/mistral-small-4-0-26-03>
   5b. Mistral, Mistral Medium 3.5 model card: <https://docs.mistral.ai/models/mistral-medium-3-5-26-04>
6. Mistral, Pricing: <https://mistral.ai/pricing>
7. OpenRouter, models API (prices, context, cache-read price, `tools` support): <https://openrouter.ai/api/v1/models>
8. OpenRouter, Ling 3.1 Flash: <https://openrouter.ai/inclusionai/ling-3.1-flash>
9. OpenRouter, FAQ (no inference markup; 5.5% credit fee): <https://openrouter.ai/docs/faq>
10. OpenRouter, τ²-Bench Airline (last run 2026-11-20): <https://openrouter.ai/benchmarks/tau2-bench-airline>
11. Berkeley Function Calling Leaderboard V4 (last updated 2026-04-12): <https://gorilla.cs.berkeley.edu/leaderboard.html>, data <https://gorilla.cs.berkeley.edu/data_overall.csv>
12. τ-bench: <https://taubench.com>
13. OpenLLM-Ro technical report: <https://arxiv.org/abs/2405.07703>
14. GRILE, Romanian grammar benchmark: <https://arxiv.org/html/2508.14279v1>
15. Anthropic, Multilingual support: <https://platform.claude.com/docs/en/build-with-claude/multilingual-support>
16. Anthropic, Is my data used for model training?: <https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training>
17. OpenAI, Your data: <https://developers.openai.com/api/docs/guides/your-data>
18. DeepSeek, Privacy Policy (last update 2026-02-10): <https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html>
19. DeepSeek, Open Platform Terms of Service (effective 2026-04-29): <https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html>
20. OpenRouter, Zero Data Retention: <https://openrouter.ai/docs/guides/privacy/zero-data-retention>

Cost figures were computed from the prices above with the assumptions in §5. Re-run the arithmetic with measured token counts once the eval has them.
