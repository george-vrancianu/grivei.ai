# Assistant web search: which option fits Outside sources?

Research for [Which web search option fits Outside sources: cost, quality and privacy?](https://github.com/george-vrancianu/grivei.ai/issues/335), part of the Assistant map ([#332](https://github.com/george-vrancianu/grivei.ai/issues/332)) and ADR 0017.
Researched 2026-11-25. Every price below was read on that date from the URL given next to it; prices move, so recheck before locking.

**Question.** The Assistant may search the web only when the user asks, anchored to entities already in the conversation. Results are **Outside sources**: cited by URL, shown apart from graph facts, never joined to a graph entity by name. Private view first. Cheap is the first criterion. Which search option fits, and what does it add to the cost of a question?

`GLOSSARY.md` on `main` has no **Outside source** entry yet; this note uses the definition in the map (#332, "Web search").

## Answer in brief

- **Recommendation: Brave Search API (Search plan), called as our own tool, with page text fetched by our own backend.** It costs **$5 per 1,000 searches** with **$5 of free credit every month** (about 1,000 searches, roughly 500 web-searched questions), so the Private view will most likely pay **$0 for search**. It is an independent index, not a Google scraper; it is not tied to the model provider, so it sits behind the provider-neutral seam; its terms leave Search Query Data with the customer and forbid nothing we need except **storing** results (§3).
- **Per-question cost it adds:** about **$0.01 in search fees** (2 searches) once the free credit is spent, plus the tokens the results put in front of the model: roughly **10k extra input tokens** (2 snippet lists of ~2k tokens and 2 pages capped at ~3k tokens), re-read over 2–3 model calls, so **~20–30k input tokens**. At $0.10 per million input tokens that is ~$0.003; at $1 per million ~$0.03. **Total: about $0.01–0.04 per web-searched question**, dominated by tokens unless the model is very cheap. Questions without web search cost nothing extra.
- **Two conditions travel with the recommendation:**
  1. **Don't store Brave's Search Results.** Brave's terms forbid storing or building a database of results beyond transient storage (custom plan needed). The Private view keeps conversations, so the stored form of an Outside source is **URL + the page text and title we fetched ourselves + retrieved-at**, never Brave's snippets. Get a legal read before relying on this.
  2. **Romanian quality is untested.** Brave supports `search_lang=ro` but **not `country=RO`** (Romania is missing from its country enum; use `ALL`). Before locking, run the Romanian eval questions that need the web through Brave and one Google-backed option (Serper) on their free tiers and compare.
- **Model-built-in search is not cheaper and ties search to one provider.** Anthropic and OpenAI charge $10 per 1,000 searches plus tokens; Gemini charges $14 per 1,000 after 5,000 free per month, which would also cover the Private view, but Google's grounding terms forbid mixing other content into Grounded Results and showing them to anyone but the user who asked, which clashes with answers that mix graph facts and Outside sources and with conversation export. Revisit only if the chosen model is Gemini and those terms are read as compatible.
- **Out:** Google Custom Search JSON API (closed to new customers, ends 2027-01-01), Bing Search APIs (retired 2025-08-11; the replacement only works inside Azure agents and hides raw results), SerpApi (from $25/month, no zero-retention below its 1M Cloud plan), Firecrawl as a search engine (fine as a fetcher, not needed).

## 1. What the feature needs from a search option

From the map (#332) and ADR 0017:

| Need | Why it matters |
|---|---|
| Cheap per question | First criterion of the map |
| Works with any model | One provider-neutral seam; the model per tier is still open (ADR 0017, Open 1) |
| Returns URLs we can cite, and a way to get page text | The citation check runs in code; an Outside source is cited by URL |
| Results can be stored with the conversation | Private view keeps conversations for export and eval cases |
| Results can be shown apart from graph facts | Outside sources are shown apart, never joined by name |
| Queries don't feed a vendor's training or get passed on | Queries name entities, sometimes people (ADR 0009) |
| Romanian results | Romanian questions are part of the eval |
| Restrict by language, country, domain | Anchor results to Romanian sources; block junk domains |

## 2. Comparison

Prices are list prices on 2026-11-25. "Fetch" means whether the call returns full page text or only snippets.

| Option | Price per query | Free tier | Full text | Country / language / domain | Query retention and training | Storing and display terms |
|---|---|---|---|---|---|---|
| **Brave Search API** (Search) | $5 / 1k [B1] | $5 credit / month [B1] | Snippets + up to 5 `extra_snippets` [B2] | `country` enum of 37 countries **without RO** (`ALL` allowed); `search_lang` includes `ro`; Goggles for re-ranking; `site:` in query [B3] | Search Query Data is the customer's; Brave may use it only to serve the API [B4 §9]; ZDR named only on Enterprise [B1] | No storing or caching beyond transient use without a custom plan; no training on results; attribution optional [B4 §3, §4(d)] |
| **Tavily** | 1 credit basic, 2 advanced; $0.008/credit pay-as-you-go, $0.005–0.0075 on plans [T1] | 1,000 credits / month [T1] | Yes, `include_raw_content` in the same call [T2] | `country=romania` boost; `include_domains` (300) / `exclude_domains` (150) [T2] | Kept "as necessary to provide and improve"; may share queries with third-party indexes "e.g., Google" [T3]; perpetual licence over Customer Input and may train on it [T4 §6.5, §9.2] | Output use limited to "internal business purposes" [T4 §2]; no explicit storage ban |
| **Exa** | $7 / 1k `auto`, $4 / 1k `lite` (10 results) [E1] | $10 credit / month [E1] | Yes, `contents.text`, +$1 / 1k pages [E1, E2] | `userLocation` country; `includeDomains` / `excludeDomains`; **no language parameter** [E2] | Privacy policy: query data used to improve and train, but the policy defers to the business agreement for API customers; ZDR only on Growth plan [E1, E3] | Terms PDF not read (could not extract) |
| **Serper** (Google results) | $1 / 1k at $50 for 50k; $0.30–0.75 on bigger packs; credits expire after 6 months [S1] | 2,500 queries once [S1] | Snippets | Google `gl` / `hl` (not verified on docs) | Privacy policy silent on API queries [S2] | Resells scraped Google results; Google sued SerpApi over this in Dec 2025 [G6], so this class carries legal risk |
| **SerpApi** | $25 / month for 1,000 ($0.025) up to $0.0055 at 500k [S3] | 250 / month [S3] | Snippets | Google parameters | ZeroTrace (no storage) only on Cloud plans from 1M searches [S3] | Same scraping risk [G6] |
| **Google Custom Search JSON API** | $5 / 1k, 100 / day free [G1] | | Snippets | | | **Closed to new customers; ends 2027-01-01** [G1] |
| **Bing Search APIs** | | | | | | **Retired 2025-08-11** [M1]. Successor "Grounding with Bing Search" is $14 / 1k [M2], works only inside Azure AI agents, does not return raw results, and requires showing the Bing query URL [M3] |
| **Gemini grounding with Google Search** (Gemini API) | Gemini 3+: $14 / 1k search queries, billed per query the model runs; Gemini 2.5: $35 / 1k prompts [G2] | 5,000 queries / month (Gemini 3+) [G2] | No; grounded answer + links | No domain or country parameter in the Gemini API docs [G3] | Paid tier not used to improve products; prompts and output stored 30 days [G4] | Must show Search Suggestions; show Grounded Results only to the user who asked; **no modifying or interspersing other content**; text may be stored up to 2 years [G4] |
| **Vertex AI grounding with Google Search** | Same: $14 / 1k queries after 5,000 free / month [G5] | 5,000 / month [G5] | No | `exclude_domains` [G7] | Cloud terms | Search Suggestions must be shown unchanged [G7], but Vertex lets customers skip them "at standard pricing" under 1M prompts / day [G5] |
| **OpenAI web search tool** | $10 / 1k calls + search content tokens at model rates ($25 / 1k for preview on non-reasoning models) [O1] | None | No (`open_page` action on reasoning models) [O2] | `allowed_domains` / `blocked_domains` (100); `user_location.country` [O2] | Responses API 30-day abuse logs; live web search not HIPAA-eligible [O3] | Must show inline citations as prominent clickable links [O2] |
| **Anthropic web search tool** | $10 / 1k searches + results billed as input tokens, in this and later turns [A1] | None | No; results come back as `encrypted_content`, only `cited_text` (≤150 chars) is readable [A1] | `allowed_domains` / `blocked_domains`; `user_location.country`; `max_uses` [A1] | ZDR-eligible (basic search, not dynamic filtering) [A1] | Citations must be shown when outputs go to end users [A1] |

**Page fetchers** (needed with snippet-only search):

| Option | Price | Notes |
|---|---|---|
| Our own fetch (HTTP + readability extraction) | Free | We hold the exact text we cite; no third party sees which page a journalist opened beyond the site itself |
| **Jina Reader** (`r.jina.ai`) | Token-billed; 10M free tokens per new key; 20 RPM without key [J1] | "Do Not Cache or Track" option; "never use your API requests … to train" [J1]. Good fallback for JS-heavy pages |
| **Firecrawl** | 1 credit per page; 1,000 free credits / month; $19 / month for 5,000 [F1] | ZDR only on Enterprise [F1] |
| Anthropic web fetch tool | No fee beyond tokens; can fetch only URLs already in the conversation [A2] | Ties fetching to Anthropic |

## 3. Discussion

**Built-in search ties search to the model provider.** With Gemini, OpenAI or Anthropic search, switching the model (per tier, or after an eval) also switches the search engine, its terms and its result format. The map wants one provider-neutral seam and a cheapest-model-that-passes rule, so search that only works with one provider either constrains the model choice or has to be rebuilt when it changes. Built-in search also hides the raw results (Anthropic returns encrypted content; Bing grounding returns none; Gemini returns a grounded answer), so our citation check can verify the URL but not the text a claim rests on. A standalone search tool plus our own fetch gives us the text, which the citation check and the "shown apart" rule both need.

**Cost.** For the volume a Private view is likely to see (tens to a few hundred web-searched questions a month), Brave's monthly $5 credit, Tavily's 1,000 credits, Exa's $10 credit and Gemini's 5,000 free queries all cover it, so the free tier, not the list price, decides. Brave and Gemini have the most headroom per month; Serper is the cheapest at volume ($1 / 1k) but needs $50 up front with credits that expire in 6 months. Beyond the free tier, Brave's $0.005 per search is below every built-in option ($0.010–0.014).

**Privacy.** Queries name entities, sometimes people. Brave's terms leave Search Query Data with the customer and limit Brave's use to serving the API [B4 §9]. Tavily takes a perpetual licence over inputs, may train on them and may pass queries to Google [T3, T4]. Exa's consumer policy trains on query data; its API terms defer to the business agreement [E3]. Serper's policy says nothing about API queries [S2]. Model-built-in search sends the query to the same provider that already sees the conversation, so it adds no new party, which is its one privacy advantage.

**Storing and display.** The Private view keeps conversations. Brave forbids storing its Search Results without a custom plan [B4 §3(b)(i)]; Google allows storing grounded text for up to 2 years but forbids interspersing other content and showing it to anyone but the requester [G4]. The design that satisfies the strictest terms is the same one the map already wants: the model sees snippets transiently to choose pages; what is kept and shown as an Outside source is the URL, our own fetched title and excerpt, and the retrieval time. The search vendor's snippets are never stored. This needs a legal read before launch, as the line between a "Search Result" and a URL the user then opened is not spelled out in Brave's terms.

**Romanian quality.** No primary source benchmarks Romanian results for any of these, and a live check on Brave's public site was rate-limited (HTTP 429), so quality is **untested**. What the docs show: Brave filters by `search_lang=ro` but has no Romania country market; Tavily can boost `country=romania`; Exa has neither a language nor (verified) Romania-specific support; Google-backed options (Serper, Gemini/Vertex grounding) inherit Google's Romanian coverage. The proposed check: take the Romanian eval questions that need the web, run each through Brave (`search_lang=ro`, `country=ALL`) and Serper (`gl=ro`, `hl=ro`), and count how often a relevant Romanian page is in the top 5. Both free tiers cover this. If Brave clearly loses, Tavily (`country=romania`, full text in one call) is the runner-up, with its weaker privacy terms accepted knowingly.

**Restriction.** Every standalone option lets us add `site:` or domain lists; Brave also supports Goggles for re-ranking toward Romanian news and official domains. A useful default for anchored searches is to block known aggregators of SEAP data that would echo our own Records back as "outside" sources.

## 4. Recommendation for the Private view

1. A `web_search` tool in our tool layer that calls **Brave Search API** (`search_lang=ro` or `en` per question, `country=ALL`, `count` 10, `extra_snippets` on), offered to the model only after the user asks for a web search, with the query built from entities already in the conversation.
2. A `fetch_page` tool in our backend (plain HTTP plus readability extraction, capped at ~3k tokens per page), with Jina Reader as a fallback for pages that need JavaScript.
3. Outside sources stored as URL + our fetched title and excerpt + retrieved-at; Brave snippets kept only for the request.
4. Search spend in the same cost log as tokens; a hard monthly cap a little above the free credit.
5. Before locking: the Romanian spot check above, and a legal read of Brave §3(b)(i) against conversation storage.

Expected added cost per web-searched question: **~$0.01 search (often $0 within the free credit) + ~20–30k input tokens**, about **$0.01–0.04** in total depending on the model's input price.

## Sources

All accessed 2026-11-25.

- [B1] Brave Search API plans and pricing: https://brave.com/search/api/
- [B2] Brave Web Search query parameters: https://api-dashboard.search.brave.com/app/documentation/web-search/query
- [B3] Brave Web Search API reference (country, `search_lang` enums): https://api-dashboard.search.brave.com/api-reference/web/search/get
- [B4] Brave Search API Terms of Service: https://api-dashboard.search.brave.com/terms-of-service
- [T1] Tavily API credits and plans: https://docs.tavily.com/documentation/api-credits
- [T2] Tavily Search endpoint reference: https://docs.tavily.com/documentation/api-reference/endpoint/search
- [T3] Tavily privacy policy: https://www.tavily.com/privacy
- [T4] Tavily terms of service: https://www.tavily.com/terms
- [E1] Exa pricing: https://exa.ai/pricing
- [E2] Exa search reference: https://exa.ai/docs/reference/search
- [E3] Exa privacy policy: https://exa.ai/privacy-policy
- [S1] Serper pricing: https://serper.dev/
- [S2] Serper privacy policy: https://serper.dev/privacy
- [S3] SerpApi pricing: https://serpapi.com/pricing
- [G1] Google Custom Search JSON API overview: https://developers.google.com/custom-search/v1/overview
- [G2] Gemini API pricing: https://aistudio.google.com/docs/pricing
- [G3] Gemini API grounding with Google Search: https://aistudio.google.com/docs/google-search
- [G4] Gemini API additional terms, "Grounding with Google Search": https://aistudio.google.com/docs/terms
- [G5] Vertex AI generative AI pricing (grounding): https://cloud.google.com/vertex-ai/generative-ai/pricing
- [G6] Google, "Why we're taking legal action against SerpApi's unlawful scraping": https://blog.google/technology/safety-security/serpapi-lawsuit/
- [G7] Vertex AI grounding with Google Search: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/grounding/grounding-with-google-search
- [M1] Microsoft, Bing Search APIs retiring on August 11, 2025: https://learn.microsoft.com/en-us/lifecycle/announcements/bing-search-api-retirement
- [M2] Grounding with Bing pricing: https://www.microsoft.com/en-us/bing/apis/grounding-pricing
- [M3] Grounding with Bing Search in Foundry Agent Service: https://learn.microsoft.com/en-us/azure/ai-foundry/agents/how-to/tools/bing-grounding
- [O1] OpenAI API pricing (tools): https://developers.openai.com/api/docs/pricing
- [O2] OpenAI web search guide: https://developers.openai.com/api/docs/guides/tools-web-search
- [O3] OpenAI "Your data": https://developers.openai.com/api/docs/guides/your-data
- [A1] Anthropic web search tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- [A2] Anthropic web fetch tool: https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool
- [J1] Jina Reader: https://jina.ai/reader/
- [F1] Firecrawl pricing: https://www.firecrawl.dev/pricing

## Not verified

- Romanian result quality for every option (see §3).
- Exa's API terms of service (PDF could not be extracted) and Serper's request parameters.
- Brave's API query retention period: the terms point to a privacy notice that does not cover the API. Brave's pricing page markets "architectural ZDR" but lists ZDR as an Enterprise feature [B1].
- Brave's free credit: the page headline says "up to $20" a month, the plan cards say $5; this note uses $5.
- Token figures in the per-question estimate are assumptions (snippet list ~2k tokens, page capped at ~3k), not measurements.
