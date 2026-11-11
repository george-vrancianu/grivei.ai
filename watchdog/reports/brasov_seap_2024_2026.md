# Primăria Municipiului Brașov (Brașov City Hall) — public procurement, Jan 2024 – Oct 2026

The first report produced by watchdog, from a single connector (SEAP). All figures come from the public data on
e-licitatie.ro, downloaded on 25 Oct 2026, for the contracting authority **MUNICIPIUL BRASOV (CUI 4384206)**.
The results are *signals* that must be verified in the source documents; they are not accusations.

## What the batch contains

| | Rows | Value (RON) |
|---|---|---|
| Direct purchases listed (all statuses) | 1,667 | — |
| &nbsp;&nbsp;of which completed with „Ofertă acceptată” (offer accepted) | 1,425 | 88.45 million |
| Award notices published in the period | 212 | — |
| Contracts attached to the notices (including subsequent contracts from older notices) | 392 | 3,699 million |
| Distinct companies (winners + DA suppliers) | 523 | |

A caution on interpretation: framework agreements appear at their maximum estimated value, not at what was paid; contracts
with several winners (consortia) are attributed in the report to each member as an equal share (`ron_total_share`).

## 1. Concentration of money

The top 3 suppliers account for **35%** of the total value (with equal shares for consortia), the top 10 for **56%**,
the top 20 for **74%**. Over 90% of the value goes to companies from Brașov (50 companies, 2.26 billion RON),
followed by Bucharest (30 companies, 612 million) and Ilfov (9 companies, 386 million).

| # | Supplier | CUI | Contracts | DA | Total share (million RON) |
|---|---|---|---|---|---|
| 1 | COMPREST | 1095130 | 21 | 1 | 581 |
| 2 | RS ACTIV | 17296459 | 26 | 2 | 545 |
| 3 | RECON | 3623887 | 24 | 6 | 190 |
| 4 | BMC TRUCK & BUS (Ilfov) | 14442959 | 1 | 0 | 187 |
| 5 | FINCODRUM | 24796449 | 11 | 0 | 120 |
| 6 | MIRACONS | 17373748 | 3 | 0 | 113 |
| 7 | EURO STRADA | 6538816 | 2 | 0 | 95 |
| 8 | STRACO HOLDING (Bucharest) | 21711634 | 2 | 0 | 95 |

## 2. A block of companies that win together

The consortium graph (`v_consortia`) shows that RS ACTIV, RECON, FINCODRUM, MIRACONS, EURO STRADA and
STRACO HOLDING appear together in the same consortium on the street-maintenance framework agreement (CAN1145000,
352 million + 220 million RON in 2025). RS ACTIV–RECON appear together in 12 contracts, RS ACTIV–FINCODRUM and
RECON–FINCODRUM in 11. Separately, RS ACTIV + COMPREST jointly won the delegation of waste collection
(CAN1172752, two contracts of 328 million and 306 million RON, July 2026).

The question for the ONRC connector: do these companies share shareholders, directors or registered offices? If so,
the competitive "consortium" is in fact a single economic entity.

## 3. Negotiations without prior publication: 54 notices, 341 million RON

The procedure without competition is legal in limited situations (emergency, only one possible supplier), but here
it is used repeatedly for the same services and the same suppliers:

- **COMPREST** — 6 negotiations, 178 million RON: waste collection and snow clearing (Jan 2024: 23.7 million; Feb 2024: 29.4 million;
  Jan 2026: 35.0 + 32.8 million; Mar 2026: 49.1 million) plus road signage (May 2024, 7.9 million).
- **RS ACTIV** — 10 negotiations, 78 million RON: street maintenance in the northern/southern zone (Jan 2024, May 2024, May 2025, Apr 2026) and
  „punere în siguranță” (making safe) works.
- **MVM FUTURE ENERGY** — 2 negotiations, 42.7 million (electricity 2026).

The pattern (expired delegation contract → extension by negotiation with the existing operator, until
the next tender, which that same operator also wins) is worth tracking over time: it is exactly the kind of thing a
watchdog can document systematically.

## 4. Direct purchases: who the "house suppliers" are

1,425 accepted direct purchases, 414 suppliers, but the volume is concentrated: **WI-NOVATION** (51 DA, 3.65 million),
**DANINA STAR** (50 DA, 3.20 million), **ROMART CONSULTING 2008** (25 DA, 2.70 million), **RECON** (6 DA, 3.62 million),
**INSTALAȚII TRUST** (8 DA, 2.43 million), **RIAL** (13 DA, 2.15 million).

No *accepted* direct purchase exceeds the legal threshold (270,120 RON services / 900,400 RON works).
The overruns found (e.g. DA35777755 „PUZ Centru Civic” (zonal urban plan, Civic Centre) at 256 million RON, DA41074135 veterinary services at
66 million RON) are all in status „Ofertă refuzată” (offer refused) / „Condiții refuzate” (conditions refused) — very likely data-entry
errors; this is why the graph keeps as edges only the purchases that were actually accepted.

**Splitting** signals (same supplier, same CPV, several DAs in the same month, each below the threshold, cumulatively above it):

| Supplier | CPV | Month | DA | Cumulative (RON) |
|---|---|---|---|---|
| TRIPTIC ARCHITECTURE & ENGINEERING | 71322000-1 proiectare (design) | Mar 2024 | 4 × ≤260,000 | 947,843 |
| 2 GMG CONSTRUCT (Cluj) | 79314000-8 | Jun 2026 | 2 | 532,300 |
| AcadROAD | 71241000-9 | Apr 2025 | 2 | 481,000 |
| DANINA STAR | 71322000-1 | Jun 2026 | 2 | 404,500 |
| ROMART CONSULTING 2008 | 79411000-8 | Feb 2025 | 2 | 382,000 |

In the TRIPTIC case the objects are different buildings (PT1, PT2, PT5 — „regenerare clădiri publice” (regeneration of public buildings)), so
splitting by project may be justifiable; to be verified whether there was a single programme that required a
competitive procedure.

## 5. Data quality problems (to be resolved with the ONRC connector)

- **AGROSEMCU** appears with CUI 15501204 and 155201204 (the second is almost certainly a typo in SEAP).
- **HACHI INVEST** appears with two different real CUIs (28697278 and 40100475), both winning through negotiation
  without publication (3.34 million RON each). Two companies with the same name at the same beneficiary = the
  shareholders should be checked at ONRC (a "reincarnated" company?).
- **LA FANTANA** — 35534516 vs 50455254, probably also two entities.
- 384 companies (mostly direct-purchase suppliers) have no county/address in SEAP; these will come from ONRC.

## Recommended next step

Run the ONRC connector on the ~30 CUIs from sections 1–3 (top suppliers + the consortium block +
the repeated negotiations) and the ANI connector on the local councillors and the city hall leadership 2024–2026. Only
then can the graph answer the real question: is there a path of ≤ 3 steps between a decision-maker and a
winner?
