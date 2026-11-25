# What the shortlisted model providers do with the data we send them

Research for [#334](https://github.com/george-vrancianu/grivei.ai/issues/334) on the map [#332](https://github.com/george-vrancianu/grivei.ai/issues/332), answering ADR 0017's open question 1. Gathered 2026-11-25. Every source below was read on that date unless a different date is given.

**This is not legal advice.** It collects the providers' own terms so the owner can decide. Points marked **(owner's judgement)** are legal calls, and they belong with the lawyer review that ADR 0015 places before Restricted content is published. Points marked **(unverified)** were not checked against a primary source.

Method: each provider's own terms, data-usage pages, DPA and residency docs, read on the provider's site. No secondary write-ups were used for facts. Where a provider's pages disagree with each other, both are cited.

## What gets sent

ADR 0017: the model receives the user's question, the tool definitions, and every tool result (graph data). On the public tier the tools return no Restricted content, but the results still hold **public-tier names** (ONRC administrators and associates, natural-person SEAP suppliers, parliamentarians, fund recipients inside their Publication window). That is personal data under GDPR on both tiers. In a Private view the results may also hold Restricted content: person links across Sources, court parties, names past their Publication window, and Investigations. Either way Grivei.ai is the controller and the provider would be a processor (GDPR art. 28). Sending the data to the provider is a disclosure to a recipient, and if the provider is outside the EEA it is also a transfer under Chapter V.

## Short answer

- **Never send any of our data to a free tier that trains on it.**
  - Gemini's unpaid tier lets Google use content "to provide, improve, and develop" its products, with human review. Google's terms say not to send it personal information.
  - Mistral's free mode trains by default.
  - Mistral's Labs and Preview models train on all plans, and their opt-out does not apply.
  - OpenRouter's free models may route to providers that train on prompts.
- **DeepSeek's first-party API is out.** Data is stored in the PRC and the terms are governed by PRC law. It offers no DPA, the API terms make the developer the controller, and its policy names no transfer mechanism. Italy's Garante ordered a definitive limitation of its processing of Italian users' data on 30 January 2025. DeepSeek's *open-weight* models hosted by a US or EU provider are a different case and are judged on that host's terms.
- **The paid APIs of Google (Vertex AI and paid Gemini API), OpenAI, Anthropic and Mistral all:**
  - contractually do not train on API data;
  - offer a DPA with SCCs;
  - keep prompts for a while for abuse monitoring: 30 days at OpenAI, Anthropic and Mistral, 55 days on the Gemini API, and on Vertex only when a classifier flags a request (up to 90 days).
- **Zero data retention (ZDR) costs nothing extra anywhere it is published, but at the big providers it needs approval.**
  - OpenAI, Anthropic and Mistral grant it on request, and Mistral needs a stated reason.
  - On Vertex, customers under a Cloud Master Agreement are exempt from abuse logging.
  - The Gemini Developer API has no guaranteed ZDR; Google points to Vertex for that.
  - It is self-serve or the default at Groq, Together and Fireworks. On OpenRouter it is a routing flag.
- **EU residency is available from:**
  - Vertex AI's `eu` multi-region endpoint (Gemini, Claude and Mistral models);
  - OpenAI's European region (eligibility through sales, 10% uplift on models released from 5 March 2026);
  - Mistral, which hosts in the EEA by default;
  - OpenRouter's `eu.openrouter.ai` (Business or Enterprise plan).

  It is *not* available from Anthropic's first-party API (inference `us` or `global`, workspace storage `us` only), nor from the Gemini Developer API or Groq (data in US GCP buckets).
- **Best fit for Restricted content from a Private view, cheapest first:**
  1. **Mistral La Plateforme** on pay-as-you-go: EU company, EEA hosting, DPA, training opt-out switched off and ZDR requested. Labs and Preview models must be avoided.
  2. **Vertex AI on the `eu` endpoint**, for a Gemini (or Claude or Mistral) model, under the Cloud DPA.
  3. **OpenAI with EU residency plus ZDR or Modified Abuse Monitoring**, both through sales.

  Anthropic's first-party API and the US-only hosts are lawful only as transfers under SCCs, with no EU processing. **(owner's judgement)** Whether SCCs alone are enough for Restricted person-level data is the owner's call (see §4).
- **The public tier's privacy notice** must name the Assistant's model provider as a recipient and say what is sent to it. It must also say where the data is processed and under which transfer mechanism, how long the provider keeps it, that it is not used for training, and that Grivei.ai keeps only aggregate counts. Draft points are in §5.

## Summary table

"Abuse retention" is the default time the provider keeps prompts and outputs on its paid API. "DPA" means an art. 28 processor agreement the customer can get.

| Provider (offer) | Trains on API data? | Abuse retention (default) | ZDR: how, cost | EU processing | Entity / law; transfer | DPA |
|---|---|---|---|---|---|---|
| Google Gemini API, **unpaid** | **Yes**, with human review (but see the EEA clause, §1.1) | not stated | no | no | Google; — | no ("do not submit … personal information") |
| Google Gemini API, **paid** | No | 55 days | no guaranteed ZDR; Google says use Vertex | no regional pinning documented | Google; processor terms | yes ("Data Processing Addendum for Products Where Google is a Data Processor") |
| Google **Vertex AI** | No, without permission | only flagged prompts, ≤90 days, kept in the chosen region; Cloud Master Agreement customers exempt | caching off, no logging, CMA exemption; no listed price | **yes**: `eu` multi-region (Gemini, Claude, Mistral models) | Google Cloud; SCCs or an "Alternative Transfer Solution" | yes (Cloud DPA) |
| **OpenAI** API | No (since 1 Mar 2023), unless you opt in | 30 days; Responses `store` also 30 days | ZDR or Modified Abuse Monitoring, "subject to prior approval"; no listed price | **yes**: Europe region, through sales, +10% on newer models | OpenAI Ireland Ltd for EEA; SCCs | yes (incorporated) |
| **Anthropic** API | No | 30 days; flagged content up to 2 years | Legacy ZDR through sales; "Covered Models" (Fable, Mythos) need 30-day retention | **no**: inference `us`/`global`, storage `us` | Anthropic Ireland Ltd for EEA; SCCs Modules 2/3 | yes (incorporated) |
| **Mistral** La Plateforme, free mode | **Yes, by default** (opt-out exists) | 30 rolling days | ZDR needs pay-as-you-go | yes (EEA by default) | Mistral AI, Paris; French law | yes (as processor) |
| **Mistral** pay-as-you-go | Opt-out switch ("full control"); Labs/Preview models always train | 30 rolling days | on request with "legitimate reasons"; no listed price | **yes** (EEA by default; some features may leave the EU) | as above | yes |
| **DeepSeek** first-party API | Policy allows "train and improve" (opt-out right); terms silent on API | "as long as necessary" | no | **no**: stored in PRC | Hangzhou DeepSeek; PRC law, Hangzhou courts; no named transfer mechanism | **no** |
| **OpenRouter** (router) | Not by OpenRouter (1% discount opt-in); upstream per endpoint, filterable | OpenRouter keeps metadata only; upstreams vary (ZDR / Safety Retention / retain-and-train) | `provider.zdr: true` or account-wide; no listed price | **yes**: `eu.openrouter.ai`, Business/Enterprise plan | OpenRouter, Inc. (NY law); SCCs | enterprise only found |
| **Groq** | No | none by default; reliability/abuse logs ≤30 days, opt-out | self-serve ZDR toggle | **no** (US GCP buckets) | US | yes (published DPA) |
| **Together AI** | No (training off by default) | none for new orgs (ZDR default since the 2026 incident) | self-serve, default | not found **(unverified)** | US | not checked |
| **Fireworks AI** | No | none for open models (in-memory only); Responses `store` 30 days | default for open models | not found **(unverified)** | US | not checked |

## 1. Provider by provider

### 1.1 Google: Gemini API (AI Studio) and Vertex AI

**Gemini API terms** ([aistudio.google.com/docs/terms](https://aistudio.google.com/docs/terms), "Effective March 23, 2026"; `ai.google.dev/gemini-api/terms` redirects there):

- Unpaid Services: Google uses submitted content and responses "to provide, improve, and develop" its products. "Human reviewers may read, annotate, and process your API input and output", after the data is disconnected "from your Google Account, API key, and Cloud project". The terms also say: "Do not submit sensitive, confidential, or personal information to the Unpaid Services."
- Paid Services: "Google doesn't use your prompts … or responses to improve our products." Google "logs prompts and responses for a limited period of time" solely to detect Prohibited Use Policy violations. Prompts and responses are processed under the "Data Processing Addendum for Products Where Google is a Data Processor".
- EEA, Switzerland and UK: "You may use only Paid Services when making API Clients available to users in the European Economic Area, Switzerland, or the United Kingdom." Also, for those regions, the Paid Services data terms "apply to all Services, including Google AI Studio and unpaid quota in the Gemini API … even though they are offered free of charge". **(owner's judgement)** So the training clause may not bite for an EEA developer even on unpaid quota. But the Assistant would serve EEA users, so Paid Services are required anyway, and the unpaid tier is moot.

**Abuse monitoring** ([aistudio.google.com/docs/usage-policies](https://aistudio.google.com/docs/usage-policies)): "Google retains the following data for fifty-five (55) days": prompts, context and outputs, kept to detect Prohibited Use Policy violations. Authorised employees may review flagged data. It is "not used to train or fine-tune any AI/ML models besides those used specifically for policy enforcement".

**Developer logs** ([aistudio.google.com/docs/logs-policy](https://aistudio.google.com/docs/logs-policy)): logging is available only to billing-enabled projects. It is "on by default for Interactions API calls" and for Generate Content in newer projects, with "a default maximum period of 55 days". These logs are separate from abuse logs, and they must be switched off.

**ZDR on the Gemini API** ([aistudio.google.com/docs/zdr.md.txt](https://aistudio.google.com/docs/zdr.md.txt)): "If your workload requires guaranteed zero data retention or enterprise data processing agreements, use Vertex AI." To get as close as possible, the page says to:
- set `store=false` on the Interactions API (the default is true);
- avoid explicit context caching;
- avoid Grounding with Google Search or Maps, which keep data 30 days with no opt-out;
- delete uploaded files.

Implicit in-memory caching (24h TTL) "does not violate zero data retention". **Residency:** no official regional pinning for the Developer API was found. Only forum posts say there is none (indicative, not authoritative).

**Vertex AI ZDR** ([docs.cloud.google.com/…/vertex-ai-zero-data-retention](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/vertex-ai-zero-data-retention)):
- "Google won't use your data to train or fine-tune any AI/ML models without your prior permission or instruction."
- In-memory and durable caching are on by default and keep data up to 24h. Caching can be turned off per project (`disableCache: true`).
- Grounding with Google Search keeps derived queries up to 3 days, and that cannot be disabled.

**Vertex abuse monitoring** ([docs.cloud.google.com/…/abuse-monitoring](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/abuse-monitoring)):
- Prompts are logged only when classifiers flag activity, "stored securely for up to 90 days", "in the same region or multi-region selected by the customer".
- For Google's "Frontier" models (Gemini 4 Carbon family), prompts and responses may be logged for up to 30 days.
- Only customers under the Google Cloud Platform Terms of Service are subject to this. "Customers with a Google Cloud Master Agreement are exempt from prompt logging for this abuse monitoring by default."

**Vertex residency** ([docs.cloud.google.com/…/data-residency](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/data-residency)):
- The `eu` multi-region endpoint "strictly covers data residency within EU member states".
- The `global` endpoint "may be processed in any Google Cloud location around the world".
- Most Gemini models (e.g. 3.5 Flash, 2.5 Pro and Flash), most Claude models and most Mistral models are listed for `eu`. None of the listed open models are.

**Cloud DPA** ([cloud.google.com/terms/data-processing-addendum](https://cloud.google.com/terms/data-processing-addendum), no date shown): restricted transfers use the SCCs or an "Alternative Transfer Solution" (a recognised framework). The subprocessor list is at [cloud.google.com/terms/subprocessors](https://cloud.google.com/terms/subprocessors).

Note from OpenRouter's ZDR page ([openrouter.ai/docs/features/zdr](https://openrouter.ai/docs/features/zdr)): "Starting October 18, 2026, Google requires Safety Retention for Google models served through Vertex". This applies to Google models reached *through OpenRouter*, not to a direct Vertex contract.

### 1.2 OpenAI

**Data controls** ([developers.openai.com/api/docs/guides/your-data](https://developers.openai.com/api/docs/guides/your-data)):
- "As of March 1, 2023, data sent to the OpenAI API is not used to train or improve OpenAI models" unless you opt in.
- Abuse-monitoring logs are kept "for up to 30 days".
- The Responses API has a "30 day Application State retention period" by default.
- ZDR and Modified Abuse Monitoring are "subject to prior approval by OpenAI and acceptance of additional requirements", requested through sales. No price is listed.
- These endpoints are not ZDR-eligible: Files, Assistants, Threads, Vector Stores, Conversations, Batches and fine-tuning.

**Data residency** ([developers.openai.com/api/docs/guides/data-residency](https://developers.openai.com/api/docs/guides/data-residency)):
- The Europe region covers the EEA and Switzerland, at `eu.api.openai.com`. Inference runs in-region for most endpoints.
- "Eligible organizations" turn it on per project; to become eligible, "Contact sales".
- "Data residency endpoints are charged a 10% uplift for models released on or after March 5, 2026."
- "Data residency does not apply to system data."
- The page does not say whether ZDR is required.

**DPA** ([openai.com/policies/data-processing-addendum](https://openai.com/policies/data-processing-addendum/), effective 1 January 2026):
- EEA and Swiss customers contract with OpenAI Ireland Ltd.
- Transfers rely on SCCs or adequacy.
- The DPA is incorporated into the services agreement.
- Subprocessors are listed at [platform.openai.com/subprocessors](https://platform.openai.com/subprocessors).

### 1.3 Anthropic

**Commercial Terms** ([anthropic.com/legal/commercial-terms](https://www.anthropic.com/legal/commercial-terms), version effective 17 June 2025):
- "Anthropic may not train models on Customer Content from Services."
- EEA customers contract with Anthropic Ireland, Limited.
- The DPA is incorporated by reference.

**DPA** ([anthropic.com/legal/data-processing-addendum](https://www.anthropic.com/legal/data-processing-addendum), effective 24 February 2025):
- Anthropic is the customer's processor.
- Transfers use SCCs Module Two and/or Three.
- Data is deleted within 30 days of termination.
- Subprocessors are listed at [anthropic.com/subprocessors](https://www.anthropic.com/subprocessors).

**Retention** ([privacy.claude.com, commercial retention](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data), updated 1 July 2026):
- API inputs and outputs are deleted "within 30 days of receipt or generation".
- For Usage Policy violations, "we retain inputs and outputs for up to 2 years", and classifier scores for up to 7 years.

The [API and data retention](https://platform.claude.com/docs/en/manage-claude/api-and-data-retention) docs page reads differently. It says "Conversation content … is not retained by default; the exception is Covered Models, which require 30-day retention". The two Anthropic pages disagree, and the contract decides. **(unverified which governs)**

The same docs page also says:
- Legacy ZDR comes through sales, enabled per organisation. No price is listed.
- Covered Models (the Fable and Mythos families) "require 30-day data retention" and are excluded from Legacy ZDR.
- Even under ZDR, flagged content may be kept up to 2 years.
- Batch (29 days), the Files API and code execution are not ZDR-eligible.

**Residency** ([platform.claude.com/…/data-residency](https://platform.claude.com/docs/en/manage-claude/data-residency)):
- `inference_geo` takes only `"global"` (the default) or `"us"`; `"us"` costs 1.1x.
- "Currently, `"us"` is the only available workspace geo."
- There is no EU option on the first-party API.
- Claude on Vertex AI's `eu` endpoint (Google-managed, with Google as processor) is the route to EU processing for Claude models (§1.1).

### 1.4 Mistral AI

**Commercial Terms** ([legal.mistral.ai/terms/commercial-terms-of-service](https://legal.mistral.ai/terms/commercial-terms-of-service/), effective 25 September 2026):
- "Mistral AI will not use Customer Data or Outputs to train its artificial intelligence models except" in three cases:
  - a customer opted in on an opt-out-by-default product;
  - a customer has "not opted-out of training on a Mistral AI Product set to opt-in by default";
  - Labs or Preview Models are used.
- Mistral is a processor under its DPA.
- The contracting entity is a French company registered in Paris. French law and the Paris courts govern outside the Americas and APAC.

**Training defaults** ([help.mistral.ai, "Do you use my user data…"](https://help.mistral.ai/en/articles/347617-do-you-use-my-user-data-to-train-your-artificial-intelligence-models), page dated only "Updated this week"):
- Studio free mode: "we may use your data (input and output) to train our artificial intelligence models".
- Pay-as-you-go: "Customers retain full control over this processing and have the right to opt out at any time."
- Labs and Public Preview: "your data may be used for training, and cannot be excluded via the opt-out controls."
- The opt-out is a Privacy toggle in the Admin panel, and the API toggle is separate from the Vibe one ([help.mistral.ai, opt-out](https://help.mistral.ai/en/articles/455207-can-i-opt-out-of-my-input-or-output-data-being-used-for-training)).
- **(unverified)** whether pay-as-you-go API is opted in by default. Treat it as opted in and switch it off.

**Retention:** the privacy policy, as quoted in Mistral's own search snippet, keeps Input and Output "for thirty (30) rolling days to monitor abuse (unless zero data retention is activated)". The policy page would not render in full for this research **(partly unverified)**.

**ZDR** ([help.mistral.ai, ZDR](https://help.mistral.ai/en/articles/347612-can-i-activate-zero-data-retention-zdr)):
- "available only with pay-as-you-go";
- granted on request, where you must "provide sufficient detail of your legitimate reasons";
- approved at Mistral's discretion, with no cost stated.

**Residency** ([help.mistral.ai, storage](https://help.mistral.ai/en/articles/347629-where-do-you-store-my-data-or-my-organization-s-data)):
- "your data is hosted in the European Economic Area (EEA)" by default.
- A US endpoint exists only if you choose it.
- Depending on the feature, "your data can be temporarily transferred outside of the European Union". The subprocessors are in the Trust Center.

### 1.5 DeepSeek (first-party API)

**Open Platform Terms** ([cdn.deepseek.com, Open Platform ToS](https://cdn.deepseek.com/policies/en-US/deepseek-open-platform-terms-of-service.html), effective 29 April 2026):
- There is no DPA, and DeepSeek does not describe itself as a processor. For end-user data in an app built on the API, the developer is "the controller".
- The terms are governed by "the laws of the People's Republic of China in the mainland", with disputes before the court at the operator's Hangzhou seat.
- No retention period is stated.

**Privacy Policy** ([cdn.deepseek.com, privacy policy](https://cdn.deepseek.com/policies/en-US/deepseek-privacy-policy.html), updated 10 February 2026):
- "we directly collect, process and store your Personal Data in People's Republic of China".
- On transfers it says only "appropriate safeguards", with no mechanism named.
- Inputs may be used to "train and improve our technology", subject to an opt-out right.
- Its EU representative is Prighter.

**Garante:** the [Garante's measure of 30 January 2025](https://www.garanteprivacy.it/home/docweb/-/docweb-display/docweb/10098477) ordered, with immediate effect, a definitive limitation of Hangzhou and Beijing DeepSeek's processing of Italian users' data. It found that GDPR applies under art. 3(2)(a), that the legal basis is unclear, and that data is stored in China without adequate safeguards. Later developments in that inquiry were not checked.

DeepSeek's open-weight models (V3/R1 and successors) are served by US hosts such as Together and Fireworks under those hosts' terms. Data sent there does not go to DeepSeek.

### 1.6 OpenRouter

OpenRouter is a router: each request goes to an upstream provider, so two sets of terms apply, OpenRouter's and the upstream's.

**OpenRouter's own handling** ([openrouter.ai/docs/guides/privacy/data-collection](https://openrouter.ai/docs/guides/privacy/data-collection)):
- "OpenRouter does not store your prompts or responses" by default.
- It does store per-request metadata (tokens, latency, model, cost).
- Prompt logging and product-improvement use are both "Off by default". The latter earns a 1% discount if switched on.
- Opt-in logs are kept at least 3 months ([input-output logging](https://openrouter.ai/docs/guides/features/input-output-logging)).

**Upstream routing** ([privacy and logging](https://openrouter.ai/docs/features/privacy-and-logging), [ZDR](https://openrouter.ai/docs/features/zdr)):
- Each endpoint is classed as ZDR, Safety Retention or retain/train.
- Account settings can refuse providers that "may train on your data", with "separate settings for paid and free models".
- `provider.zdr: true` per request, or ZDR account-wide, restricts routing to ZDR endpoints.
- Where OpenRouter can't establish a policy, it "assume[s] that the endpoint both retains and trains on data".
- In-memory prompt caching is allowed under ZDR.
- Self-serve accounts allow Safety Retention unless changed. Enterprise accounts are ZDR-only.
- From 27 October 2026, OpenRouter "will screen all inference requests, including ZDR traffic, for child sexual abuse material (CSAM) in flight".

**EU region:** `https://eu.openrouter.ai` keeps prompts and completions "processed within that region", on Business and Enterprise plans only.

**Privacy policy** ([openrouter.ai/privacy](https://openrouter.ai/privacy), updated 31 August 2026):
- The operator is OpenRouter, Inc., under New York law.
- Data goes "to our servers in the US".
- Transfers rely on SCCs (art. 46).
- A DPA is mentioned only for those who "have a Data Processing Agreement with us". A DPA schedule exists in the [Enterprise Access Agreement](https://openrouter.ai/terms-of-service-enterprise). **(unverified)** whether self-serve customers can sign one.

### 1.7 Cheap open-weight hosts (Qwen, Llama, DeepSeek weights)

**Groq** ([console.groq.com/docs/your-data](https://console.groq.com/docs/your-data)):
- "By default, Groq does not retain customer data for inference requests."
- Reliability and abuse logs are kept up to 30 days, with an opt-out.
- "All customers may enable Zero Data Retention (ZDR) in Data Controls settings."
- "All customer data is retained in Google Cloud Platform (GCP) buckets located in the United States."
- A [customer DPA](https://console.groq.com/docs/legal/customer-data-processing-addendum) is published but was not read in full.

**Together AI** ([docs.together.ai/docs/zero-data-retention](https://docs.together.ai/docs/zero-data-retention)):
- New organisations start with ZDR on, and training is off by default.
- Together disclosed [prompt leakage for requests in June and July 2026](https://www.together.ai/blog/security-event-prompt-leakage-for-requests-in-june-and-july-of-2026) and made ZDR the default afterwards.
- No EU region was found.

**Fireworks AI** ([docs.fireworks.ai, data handling](https://docs.fireworks.ai/guides/security_compliance/data_handling)):
- For open models, prompts and generations exist "only in volatile memory for the duration of the request". Only metadata is logged.
- Exceptions: the Batch API, and the Responses API with `store=True` (the default), which keeps data 30 days.
- No EU region was found.

## 2. Free tiers that train: none is usable

| Offer | What happens to inputs |
|---|---|
| Gemini API unpaid | improve and develop products, human review; "Do not submit … personal information". EEA clause aside, the terms require Paid Services for EEA users. |
| Mistral Studio free mode | used for training by default, with an opt-out |
| Mistral Labs / Preview models (any plan) | used for training; the opt-out does not apply |
| DeepSeek (any) | "train and improve", opt-out right; PRC storage |
| OpenRouter free models | may route to providers that train, unless the free-model setting refuses them |

For either tier, the Assistant must be configured so none of these can be reached. With OpenRouter, that means the account-wide "no training" setting for both paid *and* free models, plus ZDR.

## 3. Default retention and the cost of ZDR

| Provider | Default abuse retention | ZDR eligibility | Published price for ZDR |
|---|---|---|---|
| Gemini API (paid) | 55 days, plus developer logs up to 55 days if on | none guaranteed; use Vertex | — |
| Vertex AI | flagged prompts only, ≤90 days, in region; Cloud Master Agreement exempt | caching off and no logging; CMA for no abuse logging | none listed |
| OpenAI | 30 days | approval through sales | none listed (EU residency +10% on newer models) |
| Anthropic | 30 days (or none per the docs page); flagged ≤2 years | through sales; not for Covered Models | none listed (US-only inference +10%) |
| Mistral | 30 rolling days | pay-as-you-go, request with reasons | none listed |
| OpenRouter | upstream-dependent; OpenRouter keeps metadata | self-serve routing flag | none listed (EU region needs Business plan; price not checked) |
| Groq | none by default; logs ≤30 days, opt-out | self-serve | none |
| Together | none for new orgs | default | none |
| Fireworks | none for open models | default | none |

"No listed price" means the provider's page shows none, not that sales won't ask for a minimum spend **(unverified)**.

## 4. Which could lawfully receive Restricted content from a Private view

What follows lays out the conditions the facts point to. Each "can" is **(owner's judgement)**, for the lawyer review in ADR 0015.

**Conditions that follow from GDPR and our ADRs:**

1. **A processor contract (art. 28).** The provider must act on our instructions and must not reuse the data, which rules out training. DeepSeek offers none and is excluded. Every free tier that trains is excluded.
2. **A lawful transfer if processing leaves the EEA (Chapter V).** US providers rely on SCCs in their DPAs. Whether they also hold Data Privacy Framework certification was not checked **(unverified)**. The DPF adequacy decision (Commission Implementing Decision (EU) 2023/1795) was upheld by the General Court on 3 September 2025 (T-553/23 *Latombe*). An appeal, C-703/25 P, lodged 31 October 2025 ([OJ C/2025/6610](https://eur-lex.europa.eu/eli/C/2025/6610/oj/eng)), is pending, so that ground could fall as Privacy Shield did. SCCs need a transfer impact assessment. EU-region processing avoids that question for inference, though not for "system data" or the provider's own support access.
3. **Retention at the provider fits ADR 0016's erasure model.** An erasure request is met by deleting a sidecar entry. Copies in a provider's abuse logs live 30–90 days, and flagged content up to 2 years at Anthropic. ZDR shrinks this to nothing, except flagged or legally held content. Whether a provider keeping data for its *own* abuse monitoring makes it a controller for that purpose, and what then has to be disclosed, is a legal question **(owner's judgement)**.
4. **Minimisation (art. 5(1)(c)).** Only the tool results a question needs are sent. ADR 0017's tool layer already filters by visibility. One possible mitigation, not decided: tool results could carry ADR 0016-style tokens in place of Restricted names, with names put back in our UI after the answer. The model would reason about "person P-3f9a" and never see the name. It would cost some answer quality, and the eval would show how much.
5. **Transparency (arts. 13/14).** The Restricted people are not our users, so the art. 14 notice must list the model provider as a recipient (art. 14(1)(e)) and state the third-country transfer and its safeguard (art. 14(1)(f)).
6. **Security (art. 32).** Restricted content leaving the host is a new exposure, and the Together incident shows serverless prompt leaks happen. The DPIA that ADR 0009/0015 requires before Restricted content goes public should cover the Assistant flow in any case.

**Applying them, best fit first:**

| Candidate | Fits 1–3 | Terms to set |
|---|---|---|
| **Mistral pay-as-you-go** (EU company, EEA hosting) | yes, with no transfer for standard inference | turn the API training toggle off; request ZDR; never use Labs or Preview models; check the Trust Center for features that leave the EU |
| **Vertex AI, `eu` endpoint** (Gemini; also Claude or Mistral via Vertex) | yes | Cloud DPA; `eu` endpoint, never `global`; caching off; no Grounding with Search; ideally a Cloud Master Agreement for no abuse logging; otherwise flagged prompts ≤90 days in the EU |
| **OpenAI, EU residency** | yes, with an SCCs backstop for system data | needs sales approval; ZDR or Modified Abuse Monitoring; `store=false`; no Files, Assistants or Batch |
| **OpenRouter, `eu.openrouter.ai`, ZDR-only, no training** | likely, with two layers of processor (OpenRouter plus the upstream) | Business plan; DPA availability to be confirmed; account-wide ZDR and no-training for paid and free models |
| **Anthropic first-party** | yes on contract terms, but US/global processing under SCCs | ZDR through sales; avoid Covered Models; `inference_geo` cannot keep data in the EU |
| **Gemini Developer API (paid)** | DPA yes; no residency, 55-day logs, no ZDR | not recommended for Restricted content; Google itself points to Vertex |
| **Groq / Together / Fireworks** | contract terms fine and ZDR by default, but US processing under SCCs | DPA to be checked for Together and Fireworks |
| **DeepSeek first-party** | **no** | excluded |

## 5. What the public tier's privacy notice would need to say

On the public tier, the tools return no Restricted content (ADR 0017). The provider still receives (a) the visitor's question, which may hold anything the visitor types, and (b) public-tier names in tool results. Grivei.ai keeps only aggregate counts and cost (#332). A draft list, **(owner's judgement)** on wording:

- That the Assistant uses [provider], acting as Grivei.ai's processor, to generate answers.
- What is sent: the question, and data from the Grivei.ai graph that the tools return, which can include names of people published by official sources in a role tied to public money.
- Where it is processed, for example "in the EU (Vertex AI `eu` region)" or "in the United States, under the European Commission's Standard Contractual Clauses". The safeguard named must be the one in the actual DPA.
- How long the provider keeps it. Either "not stored after the answer (zero data retention), except content flagged for abuse" or "up to N days for abuse monitoring", using the provider's own N.
- That the provider does not use it to train models, citing its contract.
- That Grivei.ai does not store the conversation, only counts and costs.
- A warning not to type personal data about themselves or others into the question.
- That web search, if it reaches the public tier, sends the search query to [search provider] (separate terms; out of scope here).
- The art. 14 points for the people *named in tool results*: the provider as a recipient, the transfer safeguard, and the same correction contact as the explorer (ADR 0015).

## Open points for the owner

1. Whether SCCs alone (no EU processing) are acceptable for Restricted content, or EU-processing providers only (§4, condition 2).
2. Whether a provider's own abuse-monitoring retention is acceptable for Restricted content, or ZDR (or a Cloud Master Agreement) is required (§4, condition 3).
3. Whether to tokenise Restricted names before they reach the model (§4, condition 4). The eval should measure the quality cost.
4. Whether the Private view can use the same provider as the public tier, or must use a stricter one.
5. Confirm with each shortlisted provider: DPF certification; whether OpenRouter self-serve and Business plans get a DPA; the actual cost and minimum spend of ZDR and EU residency; and, for Anthropic, which of the two retention pages governs.
