# Source roadmap

Which **Sources** come after SEAP, in what order, what each one is, and the rules person-level data follows. Vocabulary follows `GLOSSARY.md`. Charted in [Map: remaining Sources, their Signals and person-level data](https://github.com/george-vrancianu/grivei.ai/issues/108). Each Source below links its research ticket, where the full dossier sits on a `research/<name>` branch. Each Release follows `docs/release-recipe.md` and gets its own map, so this document stops at the order and the decisions that bind every Release.

Figures are from research in October–November 2026. Firing rates are measured on the local national SEAP graph: 13.94M records and 1,098 bn RON counted from 2021-01-01 to 2026-11-12 ([Measure candidate Signal firing rates](https://github.com/george-vrancianu/grivei.ai/issues/127)).

## 1. Release order

Decided in [Decide which Sources to keep and the Release order](https://github.com/george-vrancianu/grivei.ai/issues/125).

| Release | Source | Brings in (Reference sources) | Money measure (ADR 0014) |
|---|---|---|---|
| **2** | **ONRC** (organisations and administrators) | Annual financial statements; AEP 2020/2024 final minutes (mayors, CJ presidents); BaniPartide firm donations; AMEPIP public-enterprise CUIs; MF taxpayer list (organisation names outside ONRC) | none (organisation facts) |
| then | PNRR | | amounts contracted and paid |
| then | State aid (RegAS) | | aid granted |
| then | EU cohesion funds | | contracted value, payments to beneficiaries |
| then | Curtea de Conturi | | prejudicii (auditor estimates, a lens of their own) |
| then | portal.just.ro (org-vs-org only) | | count lens |

- **After Release 2 the order is a priority, not a queue.** Release 2 builds the one-time "First reuse" layer. Once that exists, the later Releases' maps can run in parallel.
- **No bundle:** putting everything into Release 2 was rejected. A Release is one Source, and a bundle would wait on its slowest Source.
- **Money (ADR 0014):** each Source keeps its own measure. The Money lens shows one Source at a time, and measures are never summed across Sources.
- **SEAP prerequisite before PNRR:** load SEAP's EU-funded columns (`Fonduri comunitare?`, `Denumire program/ proiect`), which our loader drops today. This is SEAP work outside any Release. The PNRR Signal rule and EU funds' contractor rule need it.

### Archive ahead now (fetch only, no graph load)

- PNRR snapshots: the Source ends in 2026–27.
- AEP 2020/2024 minutes: the official copy already redirects.
- A narrow portal.just.ro slice (procurement and insolvency cases, organisation parties): its history is a rolling window.
- MF's Lista entităților publice, monthly: Party for subordinate bodies uses the snapshot in force (ADR 0012, amended).

### Kept, not scheduled

- **Budget execution (MF):** a Reference source for authorities, with no Connector until a Release needs it.
- **cdep.ro deputies and senat.ro senators:** they come back when a Release wants Party roles.
- **Appointment acts.**

### Dropped

Monitorul Oficial, OpenTender, ANI declarations, the BPI insolvency bulletin, the MJ NGO register, AEP individual donors, and local councillors and institution heads. The reasons are under §4.

## 2. Person-level data

The people gate is lifted (ADR 0008): person-level Sources are planned and built like any other. What can be shown, and to whom, is fixed by these decisions.

| Topic | Rule | ADR |
|---|---|---|
| Legal basis | Legitimate interest, with Law 190/2018 art. 7 as a second layer. Only people tied to public money are named: register roles in organisations, officials in role, direct recipients. No inferred kinship. | [0009](adr/0009-legal-posture-for-person-level-data.md) |
| Public tier and Restricted | Public tier: people as one official source publishes them, in a public-money role (ONRC administrators and legal representatives, SEAP natural-person suppliers on their Record, parliamentarians and their party roles). Everything else person-level, and all cross-Source person links, are Restricted: hidden by `GRIVEI_RESTRICTED` and shown only in a Private view. Go-live needs a privacy notice with a correction contact. | [0015](adr/0015-go-live-needs-only-a-privacy-notice-restricted-data-sits-behind-a-toggle.md) |
| Person identity | Same person only on normalised name + full birth date from an official publication (ONRC, cdep.ro, senat.ro's page source), a unique name inside a CUI, or a documented override merge. Possible matches are never public. Only the birth year is shown. | [0011](adr/0011-person-identity-is-name-plus-birth-date.md) |
| Organisations without a CUI | Attached only on a key unique in ONRC, the MF taxpayer list or SEAP's spellings of confirmed CUIs; otherwise an Unattached name. Measured 0.13–0.32% wrong against a 0.5% bar. About 200 links per Source are hand-checked before they are served. | [0013](adr/0013-organisation-names-attach-only-through-a-confirmed-match.md) |
| Names over time | Public-tier names are shown while their source keeps them public, then become Restricted (kept, not purged). Fund names sit in a name sidecar with a window end (EU 2021–27 and PNRR: 2 years; SEAP and 2014–20 PFA/II: no end). SEAP's archive loses CNPs. | [0016](adr/0016-public-tier-names-follow-their-source-publication-window.md) |
| Party | The list an elected leader ran on, per mandate. It is attached to town halls, sectors, Bucharest and county councils, and to their single-principal subordinate bodies through MF's principal credit holder. It never applies to suppliers, central government, schools, municipal companies or ADIs. | [0012](adr/0012-party-attaches-to-authorities-through-mandates.md) |
| Never named, Private view included | Relatives as such, beneficial owners, individual party donors, private individuals in court cases, SEAP contact persons. No CNP is ever stored or shown. | 0003, 0009, 0015 |

**Measured basis for the person key** ([Measure name-matching false-link rates](https://github.com/george-vrancianu/grivei.ai/issues/123)):
- name + birth date gives at most 0.46% wrong merges among Named persons, with a model estimate of about 0.02%;
- name alone is wrong on 77% of links, and name + county on 25–34%;
- PFA/II holders have no birth date in ONRC, so they are never linked.

**Officials** ([Officials in role](https://github.com/george-vrancianu/grivei.ai/issues/129), [Party beyond town halls](https://github.com/george-vrancianu/grivei.ai/issues/153)):
- No Source of local or appointed officials gives a birth date, so mayors and CJ presidents are named on their authority's Leadership list and never linked. Rules of the form "official administers their own supplier" are out.
- Deputies (cdep.ro) and senators (senat.ro, 44 of 134 match ONRC) link by the person key, as Restricted cross-Source links.
- SOE board members link through ONRC and AMEPIP's CUIs.

**Public-information requests** ([Decide which public-information requests to send](https://github.com/george-vrancianu/grivei.ai/issues/154)): none are sent now. Four are parked to their Release maps:
- Curtea de Conturi: SPID findings, bulk access and an allowlist, a precondition for its Connector;
- RegAS and MJ: reuse requests, to be sent before those Go-lives;
- AEP: mayors' birth dates, for private matching only, sent after a DPIA.

Law 179/2022 makes PNRR, RegAS and portal.just.ro reusable by default ([Reuse terms](https://github.com/george-vrancianu/grivei.ai/issues/150)).

## 3. Cross-Source Signal rules

Candidates only: each Release's map writes the methodology wording. Rules that join through people are Restricted (ADR 0015).

| Rule | Sources | Fires for (suppliers, share of value) | Lands in |
|---|---|---|---|
| Contract within 90 days of registration / record ≥ 1M RON within 180 days | ONRC | 82 / 51, 0.01% / 0.03% | R2 |
| Works ≥ 1M RON to a firm with no construction CAEN | ONRC | 615, 2.83% | R2 |
| Record after ANAF strike-off | ONRC | 822, 0.01% | R2 |
| In insolvency or reorganisation, records in the last 6 months (status undated) | ONRC | 335, 0.10% | R2 |
| Awards ≥ 5M RON in a year with ≤ 1 employee | Financial statements | 278, 1.06% | R2 |
| SRL/SA, awards ≥ 1M RON, no statement for that year or the year before | Financial statements | 212, 1.20% | R2 |
| Firm donor to the authority's Party within a year of the award | BaniPartide, AEP minutes | 24, 0.08% | R2 |
| SOE board member holds a role in a supplier | ONRC, AMEPIP | 25 private-supplier hits | R2, Restricted |
| Direct PNRR payee with no project wins from the paying ministry | PNRR | 60, 0.05% | PNRR |
| Public body receiving aid wins SEAP as a supplier | State aid | 51, 0.07% | State aid |
| Supplier with a Party role in the authority's Party | cdep.ro / senat.ro, ONRC | not measured | unscheduled, Restricted |

- **Entity-page context, not Signals** (too broad):
  - awards above 100% of turnover: 14,446 firms, 38% of value;
  - firm donors as suppliers: 7.5%;
  - PNRR recipients as suppliers: 9.3%;
  - aid beneficiaries as suppliers: 39.5%;
  - any record within 90 days of registration: 4,224 firms.
- **Dropped as near zero:**
  - PNRR or POCU beneficiary founded shortly before its grant;
  - aid and SEAP from the same authority.
- **SEAP-only rules** (single bidding, advertisement and decision periods, tax havens, from OpenTender) are out of scope here.

## 4. Source dossiers

Each dossier answers the same checklist: access, licence, join key, people, money, volume, history and cadence, quality, Signals, prior users, recommendation.

### At a glance

| Source | Role | Access and licence | Join key | People | Money | Volume |
|---|---|---|---|---|---|---|
| ONRC open data | Release 2 | data.gov.ro CSV, CC BY 4.0, ~monthly | CUI | ~3.1M administrators, name + birth date and place | none | 4.23M registrations, ~1.6 GB per snapshot |
| Annual financial statements | Reference (suppliers) | data.gov.ro yearly, CC BY 4.0 from 2019 | CUI | none | turnover, profit (context) | FY2025: 918k rows, 88 MB |
| AEP final minutes 2020/2024 | Reference (Party) | AEP JSON, archived | SIRUTA / county | mayors, CJ presidents by name | none | 3,186 mayors, 42 CJ presidents per election |
| BaniPartide (firm donors) | Reference | Expert Forum, CC BY 4.0 | CUI | none on the firm side | donations (context) | 3,611 firm rows 2006–2024 |
| AMEPIP | Reference (SOEs) | public list | CUI | via ONRC | none | public-enterprise CUIs |
| MF taxpayer list | Reference (names) | data.gov.ro yearly, CC BY 4.0 | CUI | none | none | 184k NGO-named legal persons |
| PNRR | explorable | MIPE gz JSON, weekly; reusable under Law 179/2022 | CUI | ~870 named afforestation recipients | contracted, paid | 24.9k projects, 71k payments, ~6.5 MB |
| State aid (RegAS) | explorable | undocumented JSON API, no licence (Law 179/2022) | CUI | none | aid granted | ~83k rows, 25.2k CUIs, 131 bn RON |
| EU cohesion funds | explorable | data.gov.ro XLSX (2014–20), archive (2007–13), per-authority lists (2021–27) | name (CUI only in POCU) | natural-person beneficiaries, 2-year window | contracted, paid | ~17.8k ops (2014–20), 151k contracts (2007–13) |
| Curtea de Conturi | explorable (document Source) | PDFs behind Cloudflare, from 2023 | institution CUI in text | redacted | prejudicii (own lens) | ~1.3k entities/yr, 5–10 GB |
| portal.just.ro | explorable (org-vs-org) | free SOAP, reusable under Law 179/2022 | free-text party names | parties named (never shown for individuals) | none (count lens) | ~3.7M cases/yr, ~345 procurement/month |
| Budget execution (MF) | Reference (authorities), unscheduled | CAPTCHA portal, static files listed via Transparenta.eu | CUI | none | cash payments (context) | ~25 GB raw (yearly cuts) |
| cdep.ro / senat.ro | unscheduled | HTML | person key | parliamentarians, birth dates | none | one Chamber and one Senate per legislature (134 senators) |
| Monitorul Oficial | dropped | paid after 10 days, no bulk | none | yes | none | n/a |
| OpenTender | dropped | CC BY-NC-SA 4.0 | CUI | contact persons | tender values | 448k tenders to Dec 2024 |
| ANI declarations | dropped | publication struck down (CCR 297/2025) | none | entirely | n/a | ~12M PDFs |
| BPI insolvency bulletin | dropped | paid single-user subscription | CUI | PFA/II and individual CNPs | free text only | 356k acts/yr |
| MJ NGO register | dropped | data.gov.ro, silent since 07.2026 | none | none | none | 153k rows |

### ONRC open data: Release 2

[ONRC open data: access, people fields, volume and Signals](https://github.com/george-vrancianu/grivei.ai/issues/109)

- **Access:** free bulk CSVs on data.gov.ro, CC BY 4.0, about monthly (quarterly before 2025, back to 2013), no API. Shareholders, capital, history and beneficial owners are paid or closed.
- **Join:** CUI.
- **People:** since March 2026, about 3.1M administrators named with full birth date and place, no CNP. No shareholders. PFA/II names are people's names, with no birth date.
- **Volume:** 4.23M registrations (about 2.2M struck off), 19.8M authorised-CAEN rows, 3.7M representatives. About 1.6 GB CSV (0.42 GB gzipped) per snapshot.
- **Quality:**
  - statuses are undated, so dates come only from diffing snapshots;
  - there is no main-CAEN flag and no SIRUTA;
  - 22.3k registrations are in insolvency, bankruptcy or reorganisation, which replaces BPI.
- **Signals:** see §3.
- **Recommendation:** Release 2. Its name + birth date is the person key (ADR 0011).

### Annual financial statements: Reference source for suppliers

[Annual financial statements per CUI](https://github.com/george-vrancianu/grivei.ai/issues/113)

- **Access:** MF yearly bulk on data.gov.ro, FY2008–2025, CC BY 4.0 from 2019 (OGL-ROU before). Also per CUI through ANAF's `bilant` web service.
- **Content:** one row per CUI with 20 indicators: turnover, profit, debts, equity, average employees.
- **Revisions:** the previous year is re-published once with late filers (about +7%).
- **Quality:** employees are blank in 37% of rows (unknown, not zero), and 24% have no turnover. FY2025 is a first release, so "no statement" counts for 2025–26 are overstated.
- **People:** none.
- **Recommendation:** a Reference source, joined in Release 2.

### AEP final minutes, BaniPartide and AMEPIP: Reference sources in Release 2

- **AEP 2020/2024 final minutes** ([Party of elected leaders over time](https://github.com/george-vrancianu/grivei.ai/issues/131)):
  - the same JSON for both elections, by SIRUTA and county;
  - they give the list each mayor and CJ president ran on;
  - mandates run from oath to the successor's oath;
  - 454 of 2,448 re-elected mayors changed party family between 2020 and 2024, and no switch is recorded. So Party is the list at election only (ADR 0012).
- **BaniPartide** ([AEP party and campaign financing](https://github.com/george-vrancianu/grivei.ai/issues/115)):
  - AEP itself publishes no open data and sits behind reCAPTCHA;
  - Expert Forum's CC BY 4.0 copy has 3,611 CUI-keyed firm donations and loans (2006–2024);
  - 39 of 117 firm donors since 2020 are SEAP suppliers;
  - the ~430k individual donors are dropped (never named, ADR 0009).
- **AMEPIP** ([Officials in role](https://github.com/george-vrancianu/grivei.ai/issues/129)): the public-enterprise CUIs, so SOE boards can be read from ONRC.

### MF taxpayer list: Reference source for organisation names

[Decide whether MF's taxpayer list attaches NGO names to a CUI](https://github.com/george-vrancianu/grivei.ai/issues/157)

- **Access:** MF's "Date de identificare plătitori", CC BY 4.0, yearly.
- **Content:** 184k NGO-named legal persons with a CUI.
- **Use:** it is the third name list under ADR 0013, for organisations outside ONRC. It uses the same keys, all routes must agree, and struck-off NGOs stay unattached.
- **Measured:** 0.30% wrong on SEAP's NGO suppliers. It attaches 236 of the 319 SMIS names left unattached.

### PNRR: explorable, first after Release 2

[PNRR beneficiaries and projects](https://github.com/george-vrancianu/grivei.ai/issues/111)

- **Access:** public, dated gz JSON snapshots behind MIPE's dashboard. About 6.5 MB, weekly to fortnightly, no auth.
- **Licence:** undocumented, with no licence statement; reusable by default under Law 179/2022.
- **Content:**
  - 24.9k projects, 13.4k CUIs, 155.7 bn RON contracted;
  - 71k payments to 7.6k CUIs, 72.1 bn RON paid.
  - 2,986 UATs join SEAP authorities directly. There is no key from a project to a SEAP record.
- **People:** about 870 afforestation recipients are named, without a CUI. They follow ADR 0016's 2-year window.
- **Risk:** the Source ends in 2026–27, so it is archived now.
- **Signal:** a direct payee with no project wins from the paying ministry (60 suppliers).

### State aid (RegAS): explorable

[State aid register](https://github.com/george-vrancianu/grivei.ai/issues/120)

- **Access:** RegAS's public, undocumented JSON API. No bulk, no licence, and a broken TLS chain. TAM is empty for Romania.
- **Volume:** about 83k distinct rows after removing ~52k server-side duplicates. Unsorted paging loses rows.
- **Content:** 25.2k CUIs, 131 bn RON, 2016–now.
- **Placement:** NUTS 2 only, so it needs ANAF seats. The granting authority is name-only (MF on 84%).
- **People:** none.
- **Signal:** a public body receiving aid wins SEAP as a supplier (51).
- **Open before its Release:** the duplicates, the TLS chain, RegAS 2 (around 2027), and a reuse request to the Competition Council.

### EU cohesion funds: explorable

[EU cohesion funds (SMIS/MySMIS)](https://github.com/george-vrancianu/grivei.ai/issues/110)

- **Access, by programme period:**
  - 2014–20: quarterly per-programme XLSX on data.gov.ro, about 17.8k operations, published about 10 months late;
  - 2007–13: a frozen archive with 151k in-project contracts, which carry contractor CUIs;
  - 2021–27: per-authority art. 49 lists, some as PDF.
- **Join:** beneficiaries by name, except POCU's free-text CUIs. They attach under ADR 0013, and the MF taxpayer list covers NGOs.
- **Money:** contracted value and payments, never added to Awarded value.
- **People:**
  - natural-person beneficiaries follow ADR 0016: a 2-year window for 2021–27, no end for 2014–20 PFA/II;
  - 2007–13 legal representatives are stripped at load ([EU-fund natural-person beneficiaries](https://github.com/george-vrancianu/grivei.ai/issues/152)).
- **Open before its Release:** the 2021–27 lists, and name matching beyond POCU.

### Curtea de Conturi: explorable document Source

[Curtea de Conturi audit reports](https://github.com/george-vrancianu/grivei.ai/issues/117)

- **Access:** PDFs only, behind a Cloudflare challenge. Per-report from 2023. County annexes give opinion, prejudicii and abateri per entity.
- **Join:** the institution CUI, read from the text.
- **People:** redacted to "XXX", so findings can't be linked to suppliers.
- **Money:** prejudicii are summable estimates with a lens of their own (ADR 0014). Abateri are never summed.
- **Signal:** 58% of audited entities had procurement findings, so the rule needs procurement prejudicii to be selective. The SEAP half is unsized.
- **Precondition:** a request for SPID access or bulk access before the Connector.

### portal.just.ro: explorable, organisation-vs-organisation only

[portal.just.ro court cases](https://github.com/george-vrancianu/grivei.ai/issues/116)

- **Access:** a free, keyless SOAP service capped at 1,000 results per call, so harvesting is sliced by court and hour. The High Court is not covered.
- **History:** a rolling window, so a narrow slice is archived now.
- **Join:** parties are free-text names with no id (one body had 525 spellings in a month). They attach only under ADR 0013.
- **People:** natural-person parties are never named.
- **Money:** none, so it gets a count lens.
- **Volume:** about 345 procurement cases a month.
- **Open before its Release:**
  - the party-name match rate;
  - company names that embed a person's name;
  - the MJ reuse request.

### Budget execution (MF): Reference source, unscheduled

[Budget execution per institution](https://github.com/george-vrancianu/grivei.ai/issues/112)

- **Content:** monthly year-to-date execution per authority CUI since 2016, as XML or XLSX.
- **Access:** a CAPTCHA portal with no bulk download. The file list comes from Transparenta.eu's API (15.3k entities).
- **Volume:** about 25 GB raw for yearly cuts.
- **Gaps:** no counterparties, and SOE data is aggregate only.
- **Signals:** unsized.

### Dropped

- **Monitorul Oficial** ([ticket](https://github.com/george-vrancianu/grivei.ai/issues/118)): company acts are free for 10 days only, then paid, with no bulk access. Legislation is on legislatie.just.ro. We cite MO issues only.
- **OpenTender** ([ticket](https://github.com/george-vrancianu/grivei.ai/issues/119)): CC BY-NC-SA, weaker than our SEAP load, and it stops in December 2024. Its indicators are SEAP-only Signal ideas.
- **ANI declarations** ([ticket](https://github.com/george-vrancianu/grivei.ai/issues/114)):
  - CCR 297/2025 struck down online publication, and Law 180/2026 publishes only value-band summaries;
  - the Source is about 12M PDFs and scans with no CUI;
  - revisit when the new declarations' format is known.
- **BPI insolvency bulletin** ([ticket](https://github.com/george-vrancianu/grivei.ai/issues/126)): a paid single-user subscription with no licence, and sole traders carry CNPs. Insolvency status comes from ONRC. A one-off paid extract (about 0.60 lei per debtor) is the fallback.
- **MJ NGO register** ([ticket](https://github.com/george-vrancianu/grivei.ai/issues/151)): no CUI, no people, and silent since July 2026. The MF taxpayer list covers NGOs instead.
- **AEP individual donors:** never named (ADR 0009).

## 5. Out of scope here

- The Release 2 spec and its implementation tickets: the next effort, which starts from §1 and `docs/release-recipe.md`.
- New Signal rules on SEAP alone (single bidding, advertisement and decision periods, tax havens).
- Loading SEAP's EU-funded columns: SEAP work, listed in §1 as a prerequisite before PNRR.
