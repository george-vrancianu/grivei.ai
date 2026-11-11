# Primăria Municipiului Timișoara (Timișoara City Hall) — public procurement (notices Jan 2024 – Oct 2026)

Public data from e-licitatie.ro, downloaded on 26 Oct 2026, authority **MUNICIPIUL TIMISOARA (CUI 14756536)**.
The same connector and the same queries as for Brașov; the figures are signals to be verified in the source documents.

## What the batch contains

| | Rows | Value (RON) |
|---|---|---|
| Direct purchases completed with „Ofertă acceptată” (offer accepted) | 267 | 15.0 million |
| Award notices published in the period | 168 | — |
| Contracts attached (including contracts from older framework agreements, 2017–2023) | 234 | 2,913 million |
| Distinct companies | 258 | |

Three contracts have no value in SEAP. Framework agreements appear at their ceiling, not at the payments. Contracts with several
winners are split as equal shares in the ranking.

## A profile very different from Brașov

Timișoara makes almost no use of direct purchases on the city hall's own account (267 DA, 15 million RON, compared with 1,425 / 88 million
in Brașov): the money goes through large tenders, many with European funding (trams, district heating, urban regeneration).
Negotiations without publication are few (9 notices, 46 million RON, compared with 54 / 341 million in Brașov).
The concentration comes from a few huge contracts, not from a recurring supplier: the top 3 account for 40% (Bozankaya 22.8%,
PORR 9.7%, SYLC 7.2%), but the top 20 only 47%.

| # | Supplier | CUI | County | Contracts | Share (million RON) |
|---|---|---|---|---|---|
| 1 | Bozankaya Rayli Sistemler A.Ş. (Turkey) | — | — | 4 | 667 |
| 2 | PORR CONSTRUCT | 16601724 | Bucharest | 4 | 284 |
| 3 | SYLC CON TRANS | 16356935 | Arad | 4 | 211 |
| 4 | ENERGOMONTAJ | 1555468 | Bucharest | 2 | 108 |
| 5 | ROGERA PREST COM | 27098220 | Timiș | 16 | 104 |
| 6 | BARIERRA SYSTEM | 32257003 | Timiș | 9 | 98 |
| 7 | KARSAN (Turkey) | — | — | 1 | 86 |
| 9 | ROGERA | 15197220 | Timiș | 10 | 69 |

## The "green spaces" block: ROGERA / ROGERA PREST COM / BARIERRA / GOSPODĂRIREA COMUNALĂ ARAD / GREEN CITY ANDLIV

Five companies that jointly win the maintenance of parks and green spaces: ROGERA + ROGERA PREST COM appear in
a consortium in 10 contracts, BARIERRA + GREEN CITY ANDLIV in 4, and the framework agreement from Jan 2026 (CAN1161284,
129 million RON) is won by four of them together. ROGERA PREST COM (2 negotiations, 19.8 million) and BARIERRA
(1 negotiation, 15.8 million) also receive, through **negotiation without publication**, exactly the same service, „întreținere și amenajare
a spațiilor verzi” (maintenance and landscaping of green spaces), i.e. the extension between two framework agreements with the existing operators. ROGERA and ROGERA PREST COM
have almost identical names and are headquartered in Chișoda; the question for ONRC is whether they have the same shareholders, in which case
the competitive "consortium" is a single entity.

## Other signals

- **District heating, CAN1165435 (Apr 2026, 211.5 million)**: a consortium of five companies (IPCT INSTALAȚII, Mecatron,
  CONSTRUCȚII ERBAȘU, ENERGOMONTAJ, CONEST); the addenda are worth following.
- **Urban regeneration of Piața …, CAN1163448 (Feb 2026, 110 million)**: Electroechipament Industrial + PORR.
- **Design through negotiation without publication**: STUDIO ARCA (6.9 million) and an individual architecture practice (2.9 million).
- Direct purchases: ETA2U (19 DA, 1.5 million, IT), MAUVA (4 DA, 0.96 million). No below-threshold splitting signal.
- 18 companies appear at both city halls (Brașov and Timișoara), almost all national suppliers (Orange, Dedeman,
  certSIGN, CTCE); nothing suspicious in itself, but the shared graph already links them.

## Diagrams

- Interactive viewer: `viewer/timisoara.html` (artifact "Watchdog Timișoara").
- Archify case diagram: `diagrams/timisoara-bloc.architecture.json` (the green spaces block + the big builders).
