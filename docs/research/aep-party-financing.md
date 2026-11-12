# AEP party and campaign financing: access, volume and Signals

Research for [#115](https://github.com/george-vrancianu/grivei.ai/issues/115), part of the Source roadmap map [#108](https://github.com/george-vrancianu/grivei.ai/issues/108).
Researched 2026-11-12.

**Question.** What party and campaign financing data does AEP (Autoritatea Electorală Permanentă) publish: donor and lender lists, campaign spending, suppliers paid by campaigns? In what formats (Monitorul Oficial, PDFs, any open data under OGP commitment RO0056), with what history and volume? The answers follow the map's 11-point Source checklist, with firm donors (CUI-keyed) kept apart from individual donors.

No individual's personal data is recorded here. Firm names are left out too: the overlap figures in §9 are counts only.

## Answer in brief

- **AEP publishes no machine-readable open data on political finance.** Its data.gov.ro organisation holds 24 datasets: election results and AEP's own budget, but no party or campaign finance ([data.gov.ro API](https://data.gov.ro/api/3/action/package_search?fq=organization:autoritatea-electorala-permanenta&rows=200)). OGP commitment RO0056 (2018–2020) promised open data and did not deliver it. The 2025–2027 plan carries the topic forward as Commitment 4, with an online reporting application that is not yet live.
- **Primary channels:**
  - parties' annual donor, lender and membership-fee lists in **Monitorul Oficial Partea I** (PDF, one act per party, every April);
  - **finantarepartide.ro** (AEP), with annual reports (RVC), financial statements, subsidy reports and campaign spreadsheets (`.xlsx`). The formats are mixed, mostly scanned PDF.
- **Automated access is blocked.** Both roaep.ro and finantarepartide.ro, including direct `wp-content/uploads/*.xlsx` file URLs, answered every request in this research with a Google reCAPTCHA challenge page, not the content (tested 2026-11-12). monitoruloficial.ro's e-Monitor also embeds reCAPTCHA. A Connector would have to scrape behind a CAPTCHA, which we should not do. The alternatives are a data-sharing request to AEP or Expert Forum's compiled database.
- **The usable structured copy is Expert Forum's BaniPartide database** ([db.banipartide.ro](https://db.banipartide.ro/), Datasette, **CC BY 4.0**, a full SQLite download of ~47 MB). It covers 2006 onward and was hand-built from the sources above. It is a secondary source and says so itself: "nu trebuie privită ca o sursă oficială" ([metodologie](https://www.banipartide.ro/metodologie.html)).
- **Firm donors are the only CUI-keyed subjects, and they are few.** BaniPartide has 3,611 firm donor and lender rows over 2006–2024 (2,171 distinct CUIs), all with a CUI. Since 2017 there are about 5–110 rows a year. Law 334/2006 art. 13 requires the CUI in the published lists. **Firms cannot fund campaigns at all**: only individuals donate or lend to candidates (art. 28(8)). So "campaign donors" are always people.
- **Individual donors dominate.** There are 30,791 rows of individual donors over the MO threshold, and 353,473 rows from the RVCs (mostly membership fees). These are name-only and fall under the people gate.
- **Suppliers with a CUI do exist, but in narrow slices:**
  - suppliers paid from state subsidies, 2020–2021 only (2,389 rows, 3 parties);
  - campaign suppliers, which AEP's campaign spreadsheets name and Expert Forum cites. Their CUI presence is unverified because the files are behind the CAPTCHA.
- **Signals: the firm-donor × SEAP join fires, but it is small.** Measured against our SEAP Raw archive (2021–2026 contracts, award notices and DA notifications; direct purchases not included):
  - **39 of 117** distinct firm donor/lender CUIs from 2020 onward are also SEAP suppliers (33%), and 35 of them won an award in or after the year they gave;
  - for 2024 alone it is 25 of 83;
  - **99 of 176** subsidy-paid suppliers (2020–2021) are SEAP suppliers (56%).

  The rule "donor to the party that controls the awarding authority" needs election results by UAT as a further Source, and was not measured.
- **Recommendation: keep as a small Reference-style Source for firm donors and lenders, not a Release of its own; drop the individual side until the people gate lifts.** See §11.

## 1. Access

| Channel | What | Format | Machine access | URL |
|---|---|---|---|---|
| Monitorul Oficial Partea I | Each party's annual lists, due 30 April: members whose fees exceed 10 SMB, donors (persons and firms) over 10 SMB, lenders over 100 SMB, confidential-donation totals (Law 334/2006 art. 5(4), 13). Also AEP's campaign reports (art. 47(3)) and its annual control report | PDF of the gazette issue; one act per party, scattered over the April issues | e-Monitor is free to read for Partea I since 2021 ([economedia](https://economedia.ro/?p=4031)), but the page embeds reCAPTCHA (seen in a fetch on 2026-11-12). No bulk or API | https://monitoruloficial.ro/e-monitor/ |
| finantarepartide.ro (AEP) | RVC annual reports, financial statements, subsidy-use reports (monthly since 2021), campaign contribution and expense spreadsheets published during campaigns, campaign finance guides | "From pdf (predominant) to doc or xls" ([EFOR to OGP IRM](https://www.opengovpartnership.org/wp-content/uploads/2021/08/Romania_Transitional-Results_Report_2018-2020_Comments-Received.pdf)); "most often scanned pdf of doubtful quality" ([EFOR 2026, p. 23](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf)); campaign files are `.xlsx`, e.g. `wp-content/uploads/2025/05/Contributii-si-cheltuieli-electorale-alegeri-prezidentiale-16.05.2025-Turul-II.xlsx` ([EFOR PB-214, fn. 1](https://expertforum.ro/wp-content/uploads/2025/05/PB-214_campanie_tur2.pdf)) | **reCAPTCHA challenge** for every request, including direct file URLs (tested 2026-11-12) | https://finantarepartide.ro/ |
| roaep.ro/finantare | AEP's finance pages, control reports | HTML/PDF | **reCAPTCHA challenge** (tested 2026-11-12) | https://www.roaep.ro/finantare/ |
| data.gov.ro, org `autoritatea-electorala-permanenta` | 24 datasets: election results (2009–2020), referenda, AEP's own budget. **No party or campaign finance** | CSV/XLS | CKAN API, open | https://data.gov.ro/organization/autoritatea-electorala-permanenta |
| BaniPartide (Expert Forum) | 18 visible tables compiled from all of the above, 2006–2024/25 | Datasette: JSON/CSV per query, full SQLite (~47 MB) | Open, no CAPTCHA; `?sql=` and `_shape=array` work | https://db.banipartide.ro/banipartide |

**OGP RO0056.** "Transparency in the funding of political parties" is commitment 9 of Romania's 2018–2020 plan. Its text reads: "Publishing in an open format the information provided by political parties on their sources of financing and expenditures, as provisioned by law". Its milestones were reporting standards, mandatory open-format reporting and open-data publication ([IRM Design Report 2018–2020, pp. 37–38](https://www.opengovpartnership.org/wp-content/uploads/2020/05/Romania_Design_Report_2018-2020_EN.pdf); [commitment page](https://www.opengovpartnership.org/members/romania/commitments/RO0056/), which returned 403 to our fetch).

- Outcome per Expert Forum's comment on the results report: "the main characteristics of open data had not been implemented". Law 202/2020 "does not include any comments on use of open data" ([comments](https://www.opengovpartnership.org/wp-content/uploads/2021/08/Romania_Transitional-Results_Report_2018-2020_Comments-Received.pdf)).
- The 2025–2027 plan's **Commitment 4** (AEP and Expert Forum) plans "an online application for political actors to report their political funding information". In January 2026 AEP announced it was drafting political-finance legislation ([IRM Action Plan Review 2025–2027](https://www.opengovpartnership.org/wp-content/uploads/2026/05/Romania_Action-Plan-Review_2025–2027_EN.pdf)). If that application ships, this dossier's access answer changes. **Status after May 2026 not verified.**

## 2. Licence and reuse

- **AEP and Monitorul Oficial:** no licence is stated on the pages we could reach. The underlying documents are legally mandated public disclosures. Romanian open-data law (Law 179/2022) would apply only if AEP published them as datasets, which it does not. **Unverified:** we could not read finantarepartide.ro's terms page past the CAPTCHA.
- **BaniPartide:** the Datasette metadata declares "CC Attribution 4.0 License" ([metadata.json](https://db.banipartide.ro/-/metadata.json)). The site's front page states no licence ([banipartide.ro](https://www.banipartide.ro/)). Its methodology asks users to treat Monitorul Oficial and AEP as the official sources ([metodologie](https://www.banipartide.ro/metodologie.html)).
- **Personal data:** the lists name private individuals, and HG 10/2016 lets parties publish a "rezumată" RVC with personal data removed ([EFOR 2026, p. 24](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf)). Republishing the individual donors is a GDPR question for the entity-linking/legal-posture decision, not this dossier.

## 3. Join key

| Subject | Key in the data | Into the graph |
|---|---|---|
| **Firm donor / lender** (persoană juridică) | **CUI**. By law the published list gives a firm's name, seat, nationality, **unique registration code**, amount, type and date (Law 334/2006 art. 13, [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocumentAfis/169064)). Parties must also keep the firm's CUI on file (HG 10/2016 art. 11(2), [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocumentAfis/175292)) | Direct, through ANAF-confirmed CUI (ADR 0003). In BaniPartide, 3,611 of 3,611 rows have a CUI. 3,420 (95%) pass the CUI check digit; 191 rows fail, from typos or truncation |
| **Individual donor / lender / member** | Name only (plus citizenship, amount, date). The CNP is collected by the party but not published. BaniPartide's `CNP` column is empty in all 30,791 rows | Person name only: **people gate** |
| **Party** | The party itself has a CUI (parties are legal persons; BaniPartide's `Legenda partide` carries it) | A new entity type (party), or an organisation entity by CUI |
| **Subsidy supplier** (paid from state subsidy) | Supplier name + **CUI** (BaniPartide `Contracte subventii`, 2020–2021) | CUI |
| **Campaign supplier** | Named in AEP's campaign spreadsheets and in the post-election RVC ("lista furnizorilor", HG 10/2016 art. 54). **Whether a CUI is given is unverified** (CAPTCHA) | CUI if present, else name-only |
| **Place** | Party branch county (`Filiala`, `Judet`) in some tables; candidate constituency in campaign contributions | County, not SIRUTA/UAT |

## 4. People

Yes, and they are most of the rows.

- **Individual donors** over 10 SMB, published by name in MO (art. 13): name, citizenship, amount, type, date.
- **Members** paying fees over 10 SMB (art. 5(4)).
- **Individual lenders** over 100 SMB, with repayment terms.
- **Candidates**: their own contributions to campaigns, and the donations and loans they receive from individuals (BaniPartide `Contributii campanie`, 49,697 rows, with name, function, constituency and amounts).
- The full RVC donor and member lines, where a party publishes the full RVC rather than the summary one. BaniPartide `Donatori rapoarte de venituri și cheltuieli` has 353,473 rows for 2017 and 2019–2023, of which ~300k are membership fees.
- Firms' **legal representatives** (`Reprezentant societate` column in the firm-donor table).

All of this is gated on the entity-linking policy ([release-recipe §3](../release-recipe.md)). Linking a person donor to a company's administrators (ONRC) is the person-to-person linkage the gate exists for.

## 5. Money measure

Yes, in RON on every row: donation, loan, membership fee, campaign contribution, subsidy, and expense by category. For the lens, the natural measures are:

- **received by party** per year, split into donations, loans, fees and subsidy;
- **given by firm** (a Money-lens measure on the firm's entity page, not a map measure).

Caveats:

- Loans can be converted into donations, and are reimbursed from the state budget for parties over 3% ([EFOR 2026, p. 5](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf)).
- Campaign "contributions" by candidates double-count party transfers.
- Placement is by party branch county at best, so map placement is weak.

## 6. Volume

Primary publication volume:

- 2025: 270 registered parties, of which **68 published** the mandatory MO lists ([EFOR 2026, p. 4](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf)). That is roughly 68 MO acts a year, each a few pages.
- Private income is small next to the subsidies: donations over 10 SMB came to 6.6 M RON from individuals and **0.69 M RON from firms**, against 112 M RON in loans and 232 M RON in subsidies ([EFOR 2026, pp. 4–5, 13–14](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf)).

BaniPartide row counts (visible tables, [db.banipartide.ro](https://db.banipartide.ro/banipartide), queried 2026-11-12):

| Table | Rows | Years | CUI? |
|---|---|---|---|
| Donatori persoane juridice (firm donors and lenders, MO lists) | 3,611 (3,565 donations, 46 loans) | 2006–2024 | yes, all rows; 2,171 distinct |
| Donatori persoane fizice (individual donors, MO lists) | 30,791 | 2006–2024 | n/a (CNP column empty) |
| Donatori rapoarte de venituri și cheltuieli (RVC lines) | 353,473 | 2017, 2019–2023 | no |
| Contributii campanie | 49,697 | campaigns 2008– | no |
| Contracte subventii (subsidy-paid suppliers) | 2,389 | 2020–2021 | yes (but 447 rows blank, mostly 2021) |
| Cheltuieli subventii / Subvenții | 8,950 / 1,200 | monthly | n/a |
| Venituri și cheltuieli campanie / Cheltuieli campanie | 436 / 940 | 2016–2025 elections | n/a |
| Venituri anuale partide de la MF (party balance sheets) | 968 | | party CUI |

Firm donor rows per year: hundreds in 2007–2012 (peak 1,102 in 2008), then 5–58 a year in 2013–2023, and **113 in 2024** (83 distinct CUIs, 47.8 M RON including loans). Expert Forum likewise reports that loans and donations from firms "came back" in 2024 ([RFE/RL](https://romania.europalibera.org/amp/raport-expert-forum-cum-s-au-finantat-partidele-in-2024/33525590.html)).

**Storage estimate:**

- Postgres: firm-side tables are under 10k rows, which is negligible. All BaniPartide tables together are ~460k visible rows, well under 1 GB with indexes.
- Raw archive: the SQLite snapshot is ~47 MB. Archiving the primary MO and AEP PDFs, if we ever could, would add an estimated few hundred MB a year. **Unverified**, because file listings are behind the CAPTCHA.

## 7. History and cadence

- **Annual lists:** due by 30 April of the following year (art. 5(4), 13), in Monitorul Oficial. They exist from 2006 under Law 334/2006, republished in 2015 and last consolidated 13.02.2021 per [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocumentAfis/169064).
- **RVC and financial statements:** filed by 30 April. AEP publishes them within 5 days of receipt (art. 49).
- **Campaign reports:** filed within 15 days of the election, published by AEP in MO within 60 days (art. 47).
- **Interim campaign spreadsheets:** AEP publishes these at its discretion during campaigns. No law requires them ([EFOR 2026, p. 6](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf); [OGP comments](https://www.opengovpartnership.org/wp-content/uploads/2021/08/Romania_Transitional-Results_Report_2018-2020_Comments-Received.pdf)).
- **Subsidy-use reports:** monthly since January 2021, as scanned PDFs with category totals only (same source).
- **AEP control report:** published yearly in MO. The 2025 one is report no. 7693/2026 in MO 421 of 19 May 2026: 257 control missions, 4.6 M RON in fines, ~6.1 M RON confiscated, 446 M RON in campaign expenses reimbursed ([juridice.ro](https://www.juridice.ro/830280/raport-aep-privind-controlul-finantarii-partidelor-si-campaniilor-electorale-in-2025.html)).
- **BaniPartide cadence:** the Datasette description says "2006–2022". Tables reach 2024, and the 2025 report uses 2025 data on the site. Updates are irregular, after each April and each campaign.
- **Refresh:** a refresh fits a yearly step (May) plus one per election. There is no daily or quarterly feed.

## 8. Data quality

- **Inconsistent publication.** Some parties publish all donors in MO, some only those over 10 SMB, and some mix campaign contributions in as donations ([EFOR 2026, p. 25](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf)). In 2026 only PNL and PUSL published the full RVC; others published a short summary (p. 24).
- **Missing filers.** 202 of 270 parties did not publish the mandatory lists in 2025 (p. 4).
- **Format.** Mostly scanned PDFs. BaniPartide was built partly by hand because some documents were of "calitatea precară", and it warns of errors from inconsistent tables, legal changes and number separators ([metodologie](https://www.banipartide.ro/metodologie.html)).
- **Seen in BaniPartide:** label variants (`Cotizație`, `COTIZAȚIE`, `Cotizație `, `cotizație`, ` Cotizație`); party labels that mix parties, alliances and independent candidates (`PSD+PC`, `USL`, a candidate's name); 447 of 2,389 subsidy-supplier rows without a CUI. The firm table's `Data donației` and `Suma` are stored as text.
- **High threshold.** Only donations over 10 SMB are named. In 2025 that is about 40,500 RON, "almost 8,000 euro" (p. 24), so most money below it is invisible.
- **Source of funds hidden in campaigns.** During campaigns competitors declare income with no detail on its real source, and AEP itself sees donors only at the final report (p. 6).
- **Loans.** Loans of up to 3 years, convertible to donations. Firms set up shortly before lending, or with negligible revenue, appear in the 2025 data (p. 5).

## 9. Candidate Signal rules

Candidates only: no methodology wording. Overlap was measured on 2026-11-12 with these inputs:

- BaniPartide's CUIs, checked with our own `classify_tax_id` (check digit);
- the SEAP bulk files in our Raw archive (contracts, award notices without prior notice, DA notifications, direct purchases; awarded 2021–2026).

The SEAP side has **109,350 distinct supplier CUIs** (union of contracts 22,449; DA notifications 96,650; award notices 5,874). Direct purchases (the `da` files, 2.9 GB) were left out, so every count below is a **lower bound**.

| Firm set (BaniPartide) | Distinct valid CUIs | Also a SEAP supplier 2021–26 | With a SEAP award in or after the giving year |
|---|---|---|---|
| Firm donors and lenders, all years (2006–2024) | 2,045 | 569 (28%) | 565 |
| … from 2016 | 178 | 62 (35%) | 58 |
| … from 2020 | 117 | 39 (33%) | 35 |
| … 2024 only | 83 | 25 (30%) | 21 |
| Firm lenders only, all years | 30 | 3 | |
| Subsidy-paid suppliers 2020–2021 | 176 (985 of 2,389 rows had no valid CUI) | 99 (56%) | 99 |

From 2020, the counts per party (distinct firm CUIs, of which SEAP suppliers) are PNL 45/20, PSD 40/10, UDMR 19/8 and AUR 3/0. The other parties have fewer than 8 each.

The candidate rules:

1. **Firm donor or lender is a SEAP supplier.** A firm on a party's MO donor/lender list wins public contracts in the same or a later year.
   - Needs: this Source (firm side only) plus SEAP. Both are CUI-keyed, so the join is exact.
   - Rough rate: ~35 firms over 2020–2024, about 7–25 a year nationally. 2024 was a high year.
   - Caveat: a base rate is needed first. Donor firms skew large, and large firms win public contracts anyway, so this measures exposure, not proximity.
2. **Donor to the controlling party.** As rule 1, but the awarding authority's mayor or council-president belongs to the party that received the money.
   - Needs: this Source, SEAP, **local election results** (mayors and councils by UAT, from AEP/BEC; data.gov.ro has the 2020 locals, [dataset](https://data.gov.ro/dataset/alegeri-pentru-autoritatile-administratiei-publice-locale-2020)), and SIRUTA placement of authorities.
   - Rate: not measured. It is a subset of rule 1's 35, so at most a few dozen a year.
3. **Subsidy supplier is a SEAP supplier.** A firm paid by a party out of state subsidy also wins public contracts.
   - Needs: subsidy-contract data (BaniPartide `Contracte subventii`, only 2020–2021 and 3 parties) plus SEAP.
   - Rate: 99 firms. Mostly media, advertising and utilities, which are natural SEAP suppliers too, so the rule is noisy.
4. **Campaign supplier is a SEAP supplier.** A firm paid by a campaign (expenses reimbursed by the state for parties over 3%) also wins public contracts.
   - Needs: AEP campaign spreadsheets or campaign RVCs. These are behind the CAPTCHA, and the supplier CUI is unverified.
   - Rate: not measured. EFOR's 2024 and 2025 briefs list dozens of named campaign contractors per election ([PB-188](https://expertforum.ro/wp-content/uploads/2024/11/PB188_campanie_raportI.pdf), [PB-214](https://expertforum.ro/wp-content/uploads/2025/05/PB-214_campanie_tur2.pdf)).
5. **Administrator donates as a person.** A SEAP supplier's administrator or shareholder (ONRC) donates to a party in their own name.
   - Needs: ONRC officers, individual donors, and name matching.
   - **Blocked by the people gate.** It is the person-to-person link the entity-linking policy must decide.

Ruled out: firm donors to campaigns. Campaign contributions may come only from individuals (art. 28(8)).

## 10. Who already uses it

- **Expert Forum (EFOR)** runs BaniPartide and publishes an annual party-finance report and per-campaign briefs. The 2025 report examines "several dozen" donor and lender names and profiles each party's financiers ([EFOR 2026](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf)). Its findings:
  - PSD's financiers link to firms in construction, real estate, energy, health and sanitation, "contracte publice";
  - some lending firms were set up shortly before the loan or have negligible assets.

  The 2024 campaign brief names campaign suppliers owned by party members or past party lenders. It notes that because spending is reimbursed, "campaign financing becomes a form of support for party firms" ([PB-188, p. 16](https://expertforum.ro/wp-content/uploads/2024/11/PB188_campanie_raportI.pdf)). EFOR has also said that subsidies flow to suppliers close to parties outside procurement law, since parties are not contracting authorities ([EFOR 2026, p. 22](https://expertforum.ro/wp-content/uploads/2026/05/Finantarea_partidelor_2025EFOR.pdf)).
- **Journalists** use the MO lists and AEP data:
  - G4Media on PNL's 2024 financing ([g4media](https://www.g4media.ro/finantarile-pnl-pe-anul-electoral-2024-cea-mai-mare-donatie-de-247-milioane-de-lei-de-la-un-liberal-anonim-din-vrancea-care-a-imprumutat-banii-la-fel-ca-la-precedentele-alegeri-cele-mai-multe-f.html));
  - Spotmedia on large financiers ([spotmedia](https://spotmedia.ro/stiri/politica/marii-finantatori-ai-partidelor-psd-campion-la-imprumuturi-usr-si-pnl-la-donatii-statul-a-platit-peste-1-miliard-de-lei-pe-rambursari));
  - RFE/RL on EFOR's 2024 report ([europalibera](https://romania.europalibera.org/amp/raport-expert-forum-cum-s-au-finantat-partidele-in-2024/33525590.html));
  - Ziare.com on presidential campaign spending ([ziare](https://ziare.com/alegeri-prezidentiale-2024/aep-lista-finantare-partide-campanie-1911335)).
- **OGP IRM and OSCE/ODIHR** cite the inconsistent, non-itemised reporting ([IRM 2025–2027 review](https://www.opengovpartnership.org/wp-content/uploads/2026/05/Romania_Action-Plan-Review_2025–2027_EN.pdf)).
- I found no published systematic match of donor CUIs against SEAP winners. EFOR's work is case-by-case.

## 11. Recommendation

**Keep, narrowly: the firm side as a small Source with no Release of its own; drop the individual side for now.**

- **Keep the firm donors and lenders.** Their CUI joins exactly into the graph, as the law requires, with 95% valid check digits. They feed the most-asked cross-Source question (donor → contracts), and rule 1 fires at a measurable, explainable rate. The volume is tiny, about 100 rows a year at most, so the right shape is probably:
  - a Records section on the firm's entity page (`Donations to parties`);
  - the Signal rules, attached to the later Release, as the recipe says for cross-Source rules.

  A full Release (search surface, lenses) is not justified by about 100 rows a year.
- **Keep the subsidy and campaign suppliers on the list, conditionally.** They are worth adding only if AEP's campaign spreadsheets turn out to carry supplier CUIs, and only once access is solved.
- **Drop for now:** individual donors, members, lenders and candidates. That is ~430k name-only person rows, gated on the entity-linking policy, with a GDPR posture to decide. Rule 5 waits with them.
- **Access is the blocker, not the data.**
  - AEP's own channels are behind reCAPTCHA and publish mostly scanned PDFs.
  - BaniPartide is CC BY 4.0, structured and downloadable, but secondary, hand-built and irregularly updated.
  - A Connector should seed from BaniPartide's SQLite (attributed, re-checked against MO for any record we show) and ask AEP or Expert Forum for a data-sharing route.
  - Revisit if AEP's OGP 2025–2027 reporting application ships with open output.
- **Reference sources it drags in:**
  - election results by UAT (AEP), needed for rule 2;
  - ONRC, only once the gate lifts.
- **Party as an entity.** Parties have CUIs, so they could join as organisations without a new entity type. Whether a party gets a role on the entity page is a design question for the Release that takes this on.
