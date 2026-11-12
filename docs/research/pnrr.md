# PNRR beneficiaries and projects: open data, volume and Signals

Research for [#111](https://github.com/george-vrancianu/grivei.ai/issues/111) on the Source-roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108). Researched 2026-11-12. Figures marked **measured** come from files downloaded that day and counted locally; everything else is cited to its URL. Anything I could not verify is marked **unverified**.

## Summary

The PNRR is not a Source we'd have to scrape. Since November 2025 MIPE's public PNRR dashboard ([mfe.gov.ro/pnrr-dashboard](https://mfe.gov.ro/pnrr-dashboard/)) is a static app that loads dated, gzipped JSON snapshots from a public folder with a manifest. Two of the files are complete national tables keyed by CUI:

- **Projects** (`progres_tehnic_proiecte`): 24,891 rows for 21,710 financing commitments, from 13,445 distinct beneficiary CUIs, with contract number, title, amounts, county, locality, status and progress (**measured**).
- **Payments** (`plati_pnrr`): 70,980 payment rows to 7,620 final-recipient CUIs, RON 72.1 bn in total, dated 2020-12 to 2026-10, with recipient county, locality and CAEN (**measured**).

UATs are the largest recipient class: 2,986 distinct UAT CUIs, RON 26.2 bn paid (**measured**). These are the same CUIs SEAP uses for contracting authorities. The data has no contractors or subcontractors except where a ministry implements a measure itself and pays the supplier directly (282 CUIs, RON 2.6 bn). There is no key that links a PNRR project to a SEAP record. Recommendation: **keep**, as an explorable Source with a Money lens and organisations keyed by CUI. Natural persons (about 870 afforestation projects) are excluded under the people gate.

## Sources examined

| Candidate | What it is | Verdict |
|---|---|---|
| MIPE PNRR dashboard data files, `https://mfe.gov.ro/pnrr-dashboard/generator/data/` | Dated JSON snapshots behind the public dashboard, with a manifest at [`contains.json`](https://mfe.gov.ro/pnrr-dashboard/generator/data/contains.json) | **The Source.** Bulk, keyed by CUI, national |
| ORDS REST API, `pnrr.fonduri-ue.ro/ords/pnrr/mfe/<endpoint>` | The upstream the snapshots are generated from: the `links.self` of `top_beneficiari` and `indicatori_total` point there | Probably the live API, but its TLS chain is incomplete and I did not bypass it (**unverified**) |
| MDLPA daily "Plăți PNRR" XLS on data.gov.ro | Daily payment lists from one ministry (MDLPA), CC-BY-4.0, about 2022 to now ([latest dataset](https://data.gov.ro/dataset/plati-planul-national-de-redresare-si-rezilienta-pnrr-2026-prezent)) | Redundant: names only, no CUI, one ministry. Drop |
| Art. 25a "top 100 final recipients" | Regulation (EU) 2021/241 as amended by 2023/435 requires a national portal listing the 100 largest final recipients ([EP briefing](https://www.europarl.europa.eu/RegData/etudes/BRIE/2024/761979/IPOL_BRI(2024)761979_EN.pdf)). Romania's list is the dashboard's `persons` file, 110 rows (**measured**); the first edition was [mfe.gov.ro, 9 Oct 2023](https://mfe.gov.ro/pnrr-top-100-destinatari-finali-pana-la-data-de-9-octombrie-2023/) | A subset of the payments file. Drop |
| EC RRF Scoreboard | Its [disbursements page](https://ec.europa.eu/economy_finance/recovery-and-resilience-scoreboard/disbursements.html?lang=en) has a "100 largest final recipients per country" table with an Export button, in a Qlik app | No file URL behind the export; duplicates the national list. Drop |
| proiecte.pnrr.gov.ro | Beneficiaries' application platform: an Angular app whose API is `/api/accounts/login`, `/api/users/legal_entity`, ... (seen in its `main.*.js`) | Login-gated, not open data. Drop |
| coordonare.pnrr.gov.ro | Redirects to a hosting "forbidden" page (`cdn.stscloud.ro/.../forbidden.html`) | Not reachable. Drop |
| The announced "~17,000 projects" open-data system | Announced by Minister Pîslaru on 22 Sept 2025 ([Forbes.ro](https://www.forbes.ro/mipe-va-publica-in-format-de-date-deschise-toate-cele-17-000-de-proiecte-finantate-prin-pnrr-466591)); the dashboard went live on 20 Nov 2025 with 21,262 projects and more than 4,900 beneficiaries ([MIPE](https://mfe.gov.ro/transparentizare-mipe-a-lansat-tabloul-de-bord-al-pnrr/)) | Delivered as the dashboard above. No separate dataset on data.gov.ro or on [MIPE's open-data page](https://mfe.gov.ro/informatii-de-interes-public/date-deschise/) |
| data.gov.ro "Proiecte contractate" | MIPE's lists of contracted projects for the cohesion programmes (POIM, POR, POCU, POC, POAT) ([dataset](https://data.gov.ro/dataset/proiecte-contractate)) | Not PNRR. A possible separate Source (cohesion funds), out of scope here |

## Checklist

### 1. Access

- **Bulk:** `GET https://mfe.gov.ro/pnrr-dashboard/generator/data/contains.json` returns a manifest (`count`, `generated_at`, and `files[]` with `file`, `endpoint`, `date_yyyymmdd`, `size_bytes`, `is_legacy`). Each snapshot is `<yyyymmdd>-<endpoint>.json.gz` with endpoints `progres_tehnic_proiecte`, `plati_pnrr`, `persons`, `top_beneficiari`, `indicatori_total` and `masuri`. The dashboard builds these URLs in its bundled JS (the constants `PAYMENTS`, `PROJECTS`, `TOP_BENEFICIARIES` in [the dashboard page](https://mfe.gov.ro/pnrr-dashboard/)). Plain HTTPS GET with no auth, verified with curl 2026-11-12. The dashboard also exports the filtered project table to XLSX or CSV in the browser.
- **API (unverified):** the ORDS endpoints `https://pnrr.fonduri-ue.ro/ords/pnrr/mfe/top_beneficiari` and `.../indicatori_total` appear as `links.self` in the snapshot payloads, in the standard ORDS shape (`items`, `hasMore`, `limit`, `offset`). The host serves an incomplete certificate chain, so curl and WebFetch both refuse it. I did not test whether `progres_tehnic_proiecte` or `plati_pnrr` are exposed there.
- **Fragility:** the files are an undocumented by-product of the dashboard, not a published dataset. Paths and field names can change without notice, and the manifest keeps only recent snapshots: 7 dates on 2026-11-12, 19 Aug to 15 Oct 2026. Each snapshot is cumulative, so losing an old one loses nothing.

### 2. Licence and reuse terms

- The dashboard and its files carry **no licence statement** (none found on [the dashboard](https://mfe.gov.ro/pnrr-dashboard/) or on [MIPE's open-data page](https://mfe.gov.ro/informatii-de-interes-public/date-deschise/)). Reuse then falls under Law 179/2022 on open data and the reuse of public-sector information, which transposes Directive (EU) 2019/1024 ([text, ONRC copy](https://www.onrc.ro/documente/legislatie/LEGE%20nr.%20179%20din%209%20iunie%202022.docx)). The legal-posture ticket should confirm this.
- The MDLPA payment XLS on data.gov.ro is **CC-BY-4.0** (the `license_id` from the [data.gov.ro API](https://data.gov.ro/api/3/action/package_search?q=pnrr)).
- Art. 25a obliges publication of the top-100 list ([EP briefing](https://www.europarl.europa.eu/RegData/etudes/BRIE/2024/761979/IPOL_BRI(2024)761979_EN.pdf)), which gives the recipient-level data an explicit public-interest basis.

### 3. Join key

- **CUI**, in both tables (all **measured** on the 2026-10-15 snapshot):
  - Projects: `cui` is present on 24,007 of 24,891 rows. Every value is numeric and none is 13 digits long, so no CNPs appear. Of the 884 rows without a CUI, 871 are natural persons (`PF`, `Persoană fizică`, `P.F.`).
  - Payments: `cui_beneficiar_final` is present on all 70,980 rows, all numeric, none 13 digits long.
- **UAT:** UAT beneficiaries are named (`COMUNA SÂNCRAIU DE MURES`) with their own fiscal CUI. That is the CUI SEAP publishes for the same commune as a contracting authority, so they join through the existing core entity. No SIRUTA code is published. The place of implementation is free text (`judet_implementare`, `localitate_implementare`). It can be placed via ANAF like SEAP's authorities, or through the beneficiary's CUI.
- **Institution:** the managing ministry (`cri`, e.g. `MDLPA`, `MEC`) is a short code plus its name, with no CUI. It can be mapped once by hand (about 20 values).
- **No key to SEAP records:** a project's `nr_contract` is the financing contract with the ministry, not a SEAP notice. SEAP's bulk exports carry `Fonduri comunitare?` / `Fond european` / `Denumire program/proiect` columns, which the Release 1 loader currently ignores (`watchdog/pipeline/bulk/headers.py`). That is free text, and journalists found many PNRR purchases not labelled as such ([Europa Liberă via Economedia, Oct 2024](https://economedia.ro/afacerea-educatia-36-miliarde-de-euro-din-pnrr-cele-sapte-firme-care-au-invatat-sistemul-si-au-castigat-o-cincime-din-banii-cheltuiti-pana-acum.html)).

### 4. People

- **Projects:** about 871 rows have a natural person as beneficiary: full name in `denumire_beneficiar`, no CUI, `tip_beneficiar` `PF`/`Persoană fizică`/`P.F.`. All 854 tagged `PF`/`Persoană fizică` are MMAP's C2 afforestation grants, and some titles name the landowner (**measured**). Another 1,258 rows are `MEDIC FAMILIE` (family doctors' practices) with 6 to 8 digit CUIs. These are organisations in the ADR 0003 sense, but their names are often personal names.
- **Payments:** there is no natural-person field in practice. The Art. 25a top-recipient file has `last name` / `first name` columns, all empty across its 110 rows (**measured**).
- Under the people gate (release-recipe §3), PF rows load as "Persoană fizică" with no name and no entity page. Only about 3.5% of projects are affected.

### 5. Money measure

- **Projects:** `valoare_total` (RON, includes VAT and ineligible costs), `valoare_fe` (RRF share), `valoare_tva`, `valoare_neeligibil` and `valoare_fpn`. Totals across all rows are RON 155.7 bn and RON 108.4 bn of RRF (**measured**). This is a contracted (committed) amount, the analogue of SEAP's awarded value. `progres_financiar` gives the share paid.
- **Payments:** `valoare_plata_fe` (RON) and `valoare_plata_fe_euro`: RON 72.10 bn, EUR 14.27 bn (**measured**). That is close to the `platit_eur` headline in `indicatori_total` (EUR 14.94 bn). This is money actually paid, which SEAP never has. 2,229 rows are negative (recoveries or corrections), so a sum must net them.
- A Money lens works for both. The two measures must never be added together, and the glossary would need a term for "paid" distinct from Awarded value.

### 6. Volume

**Measured**, snapshot of 2026-10-15:

| File | Rows | gz size | JSON size |
|---|---|---|---|
| `progres_tehnic_proiecte` | 24,891 | 3.0 MB | 21.3 MB |
| `plati_pnrr` | 70,980 | 3.4 MB | 47.5 MB |
| `persons` (Art. 25a) | 110 | 4 KB | 42 KB |
| `top_beneficiari`, `indicatori_total`, `masuri` | small | under 11 KB | |

- **Raw archive:** about 6.5 MB per snapshot. Even a weekly snapshot comes to about 340 MB a year. Keeping only changed snapshots, or a monthly one, is enough because each snapshot is cumulative.
- **Postgres:** about 100k rows for projects and payments together. Estimated at 50 to 100 MB with search indexes (**estimate**, not loaded).
- **Totals:** `indicatori_total` gives 21,710 projects, 13,758 beneficiaries with contracts, 7,768 with payments, EUR 20.1 bn allocated, EUR 14.9 bn paid.

### 7. History depth and update cadence

- **History:** projects are contracted from 2021-03 to 2026-08. Payments are dated 2020-12-23 to 2026-10-14, by year: 2022 240, 2023 6,924, 2024 15,844, 2025 27,110, 2026 20,845 (**measured**). Each snapshot carries the full history.
- **Cadence:** manifest dates 2026-08-19, 09-01, 09-04, 09-11, 09-25, 10-11 and 10-15, so roughly weekly to fortnightly. The manifest was generated 2026-10-15 16:30. Payment rows carry `data_raportarii`, which runs monthly from 2023.
- **End date:** the RRF ends in 2026 (the payment-request deadline is 31 Aug 2026 and the last payments are due by 31 Dec 2026, under Regulation 2021/241 art. 18 and 24; **unverified** here). The Source will stop growing in 2027 and is effectively a closed historical dataset after that. Updates after that date are uncertain.

### 8. Data quality

All **measured** on the 2026-10-15 snapshot:

- **Free-text categories:**
  - `tip_beneficiar` has spelling variants for the same class (`PF`/`Persoană fizică`/`P.F.`, `INSTITUTIE PUBLICA`/`Instituție publică`, `instituție ` with a trailing space), and 74 rows have it empty.
  - Locality and county names vary in diacritics and prefix (`București` vs `Sec. 1, Mun. Bucureşti`).
- **Multi-row commitments:** 2,620 commitments (`id_angajament`) have more than one row, which are sub-projects with different titles and amounts. Sum by row, not by distinct id.
- **Sparse fields:** in payments, `cod_diviziune_caen` is missing on 61,087 of 70,980 rows and `cod_submasura` on 55,893. In projects, `progres_financiar` is missing on 12,804 rows.
- **Duplicates:** 2,048 payment rows duplicate another on (CUI, date, amount). These may be genuine split payments, so check before deduplicating.
- **Negative rows:** 2,229 payment rows are negative.
- **Headline drift:** at launch the dashboard showed 21,262 projects and more than 4,900 beneficiaries ([MIPE](https://mfe.gov.ro/transparentizare-mipe-a-lansat-tabloul-de-bord-al-pnrr/)), against 21,710 and 13,758 now. Counts move between snapshots, and so do revocations (`revocat_eur` EUR 468 m).
- **History of publication:** the 2023 top-100 list was first published incomplete, then republished with about 12,000 hidden rows covering about 5,000 entities ([Context.ro, 25 Oct 2023](https://context.ro/transparenta-cu-clestele-guvernul-a-publicat-in-secret-numele-a-5000-de-beneficiari-de-fonduri-europene-din-pnrr/)).
- **Final recipient ≠ supplier:** the Commission's guidance defines a final recipient as "the last entity receiving funds under the RRF that is not a contractor or a subcontractor" ([EP briefing](https://www.europarl.europa.eu/RegData/etudes/BRIE/2024/761979/IPOL_BRI(2024)761979_EN.pdf)). Contractors appear only where a ministry is itself the implementer: 282 payment CUIs (RON 2.62 bn) are not project beneficiaries, for example `SOFTWARE IMAGINATION & VISION S.R.L.` paid by MF for e-customs and `RASIROM RA`. Recipient type in that case is "NOT A PROJECT BENEFICIARY".

### 9. Candidate Signal rules

Candidates only. National firing rates on the SEAP side are **unmeasured**: the local graph was empty during this research, so they belong to a prototype ticket.

1. **PNRR-funded UAT with concentrated EU-funded SEAP awards.** Rule: a UAT with PNRR projects where one supplier wins at least X% of the SEAP awarded value that the UAT flagged as EU-funded in the project window (`data_inceput`..`data_finalizare`). Needs PNRR and SEAP, plus loading SEAP's ignored `Fonduri comunitare?`/`Denumire program` columns. Scale: 2,986 UATs hold 12,098 projects worth RON 48.0 bn (**measured**). A project-to-record join is impossible, so the rule works at UAT and time-window level, with a fuzzy title match as a possible refinement.
2. **PNRR recipient that is also a top SEAP supplier.** Rule: a CUI that both receives PNRR money as a beneficiary (IMM or other company) and wins SEAP awards from contracting authorities that are themselves PNRR beneficiaries. Needs PNRR and SEAP. Population: 7,620 payment CUIs, of which the companies (IMM 4,844 projects, plus SRL and large-company rows) are the relevant subset. The overlap is unmeasured.
3. **Direct payment to a non-beneficiary.** Rule: a payment to a CUI that holds no project, meaning a ministry paid a supplier directly. PNRR alone: 282 CUIs, RON 2.62 bn (**measured**). That is not a Signal by itself, but it is the one place PNRR names contractors, and it cross-checks against SEAP awards from the same ministry.
4. **Beneficiary registered shortly before contracting** (needs ONRC): a company whose registration date falls within N months before `data_angajament`. The C9 digitalisation scheme (4,787 projects) is the obvious population, and EPPO is investigating a newly founded firm in it ([Economedia](https://economedia.ro/update-parchetul-european-ancheteaza-monopolul-digitalizarii-prin-pnrr-surse-o-firma-abia-infiintata-a-luat-49-de-contracte-de-10-milioane-de-euro-in-mai-putin-de-doi-ani-in-85-din-cazuri-nu-a-av.html)). Firing rate unmeasured.

### 10. Who already uses it

- **Journalists, SEAP side:** Europa Liberă, with data from IT expert Radu Ciocan, mined SEAP for PNRR-funded education purchases. They found about 19,000 direct purchases worth RON 530 m won by 3,640 firms, with a handful of firms (Edu Apps and others) taking a large share. They noted that SEAP's titles often omit the PNRR source ([Economedia republication](https://economedia.ro/afacerea-educatia-36-miliarde-de-euro-din-pnrr-cele-sapte-firme-care-au-invatat-sistemul-si-au-castigat-o-cincime-din-banii-cheltuiti-pana-acum.html)). The same outlet profiled the 10 consultancy firms that took about a third of PNRR consultancy money ([Europa Liberă](https://romania.europalibera.org/amp/consultanta-contracte-pnrr-top-10-firme/32412851.html)).
- **Context.ro:** exposed the hidden-rows top-100 file in 2023 ([Context.ro](https://context.ro/transparenta-cu-clestele-guvernul-a-publicat-in-secret-numele-a-5000-de-beneficiari-de-fonduri-europene-din-pnrr/)).
- **European Parliament:** a 2024 briefing analysed the national top-100 lists and found that public bodies which pass funds on dominate them ([EP briefing](https://www.europarl.europa.eu/RegData/etudes/BRIE/2024/761979/IPOL_BRI(2024)761979_EN.pdf)).
- **Commercial sites:** firme360.ro republishes the per-call C9 contract lists by CUI ([firme360.ro/pnrr](https://firme360.ro/pnrr)).
- **Not found:** no Expert Forum or OpenTender work on the dashboard files (search, **unverified** absence). I found no evidence that anyone uses the dashboard JSON as a bulk source.

### 11. Recommendation

**Keep, as an explorable Source** (a Release of its own, not a Reference source):

- It is national, bulk, free, keyed by CUI on every organisation row, and small (about 100k rows, about 6.5 MB per snapshot).
- It brings a measure SEAP lacks, money **paid**, and joins on the CUIs SEAP already has, UATs especially.
- Both cross-Source Signal candidates in the ticket are feasible at UAT and CUI level, though not at project-to-record level.
- It brings no new Reference source. ANAF placement and the CUI identity rules apply unchanged, and ADR 0003's pattern covers it. PF afforestation rows are shown as "Persoană fizică" only.

Risks to carry into the Release ticket:

1. The files are an undocumented dashboard by-product. The Connector should archive every manifest-listed snapshot and alert on schema drift. Asking MIPE for a documented feed, or for the ORDS API with a valid certificate, would settle this.
2. There is no licence statement; the legal-posture ticket should cover it.
3. The Source closes in 2026–27, so its value is a fixed historical layer, not a live feed.
4. "Paid" needs a glossary term and a methodology section distinct from Awarded value.
