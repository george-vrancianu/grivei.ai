# Primăria Municipiului Brașov — achiziții publice, ian. 2024 – oct. 2026

Primul raport produs de watchdog, pe un singur conector (SEAP). Toate cifrele sunt din datele publice
e-licitatie.ro, descărcate pe 25.10.2026, pentru autoritatea contractantă **MUNICIPIUL BRASOV (CUI 4384206)**.
Rezultatele sunt *semnale* care trebuie verificate în documentele-sursă; nu sunt acuzații.

## Ce conține lotul

| | Rânduri | Valoare (RON) |
|---|---|---|
| Achiziții directe listate (toate stările) | 1 667 | — |
| &nbsp;&nbsp;din care finalizate cu „Ofertă acceptată” | 1 425 | 88,45 mil. |
| Anunțuri de atribuire publicate în interval | 212 | — |
| Contracte atașate anunțurilor (inclusiv contracte subsecvente din anunțuri vechi) | 392 | 3 699 mil. |
| Firme distincte (câștigători + furnizori DA) | 523 | |

Atenție la interpretare: acordurile-cadru apar cu valoarea maximă estimată, nu cu ce s-a plătit; contractele
cu mai mulți câștigători (asocieri) sunt atribuite în raport fiecărui membru la cotă egală (`ron_total_share`).

## 1. Concentrarea banilor

Primii 3 furnizori adună **35 %** din valoarea totală (cu cota egală pe asocieri), primii 10 — **56 %**,
primii 20 — **74 %**. Peste 90 % din valoare merge la firme din Brașov (50 de firme, 2,26 mld. RON),
urmate de București (30 de firme, 612 mil.) și Ilfov (9 firme, 386 mil.).

| # | Furnizor | CUI | Contracte | DA | Total cotă (mil. RON) |
|---|---|---|---|---|---|
| 1 | COMPREST | 1095130 | 21 | 1 | 581 |
| 2 | RS ACTIV | 17296459 | 26 | 2 | 545 |
| 3 | RECON | 3623887 | 24 | 6 | 190 |
| 4 | BMC TRUCK & BUS (Ilfov) | 14442959 | 1 | 0 | 187 |
| 5 | FINCODRUM | 24796449 | 11 | 0 | 120 |
| 6 | MIRACONS | 17373748 | 3 | 0 | 113 |
| 7 | EURO STRADA | 6538816 | 2 | 0 | 95 |
| 8 | STRACO HOLDING (București) | 21711634 | 2 | 0 | 95 |

## 2. Un bloc de firme care câștigă împreună

Graful de asocieri (`v_consortia`) arată că RS ACTIV, RECON, FINCODRUM, MIRACONS, EURO STRADA și
STRACO HOLDING apar împreună în aceeași asociere pe acordul-cadru de întreținere străzi (CAN1145000,
352 mil. + 220 mil. RON în 2025). RS ACTIV–RECON apar împreună în 12 contracte, RS ACTIV–FINCODRUM și
RECON–FINCODRUM în 11. Separat, RS ACTIV + COMPREST au luat împreună delegarea salubrizării
(CAN1172752, două contracte de 328 mil. și 306 mil. RON, iulie 2026).

Întrebarea pentru conectorul ONRC: au aceste firme asociați, administratori sau sedii comune? Dacă da,
„asocierea” competitivă e de fapt o singură entitate economică.

## 3. Negocieri fără publicare prealabilă: 54 de anunțuri, 341 mil. RON

Procedura fără competiție e legală în situații limitate (urgență, un singur furnizor posibil), dar aici
e folosită repetat pentru aceleași servicii și aceiași furnizori:

- **COMPREST** — 6 negocieri, 178 mil. RON: salubrizare și deszăpezire (ian. 2024: 23,7 mil.; feb. 2024: 29,4 mil.;
  ian. 2026: 35,0 + 32,8 mil.; mar. 2026: 49,1 mil.) plus semnalizare rutieră (mai 2024, 7,9 mil.).
- **RS ACTIV** — 10 negocieri, 78 mil. RON: întreținere străzi zona nordică/sudică (ian. 2024, mai 2024, mai 2025, apr. 2026) și
  lucrări de „punere în siguranță”.
- **MVM FUTURE ENERGY** — 2 negocieri, 42,7 mil. (energie electrică 2026).

Tiparul (contract de delegare expirat → prelungire prin negociere cu operatorul existent, până la
următoarea licitație, câștigată tot de el) merită urmărit în timp: e exact genul de lucru pe care un
watchdog îl poate documenta sistematic.

## 4. Achiziții directe: cine sunt „furnizorii de casă”

1 425 de achiziții directe acceptate, 414 furnizori, dar volumul e concentrat: **WI-NOVATION** (51 DA, 3,65 mil.),
**DANINA STAR** (50 DA, 3,20 mil.), **ROMART CONSULTING 2008** (25 DA, 2,70 mil.), **RECON** (6 DA, 3,62 mil.),
**INSTALAȚII TRUST** (8 DA, 2,43 mil.), **RIAL** (13 DA, 2,15 mil.).

Nicio achiziție directă *acceptată* nu depășește pragul legal (270 120 RON servicii / 900 400 RON lucrări).
Depășirile găsite (ex. DA35777755 „PUZ Centru Civic” la 256 mil. RON, DA41074135 servicii veterinare la
66 mil. RON) sunt toate în stare „Ofertă refuzată” / „Condiții refuzate” — foarte probabil erori de
introducere; de aceea graful reține ca muchii doar achizițiile efectiv acceptate.

Semnale de **divizare** (același furnizor, același CPV, mai multe DA în aceeași lună, fiecare sub prag, cumulat peste):

| Furnizor | CPV | Luna | DA | Cumulat (RON) |
|---|---|---|---|---|
| TRIPTIC ARCHITECTURE & ENGINEERING | 71322000-1 proiectare | mar. 2024 | 4 × ≤260 000 | 947 843 |
| 2 GMG CONSTRUCT (Cluj) | 79314000-8 | iun. 2026 | 2 | 532 300 |
| AcadROAD | 71241000-9 | apr. 2025 | 2 | 481 000 |
| DANINA STAR | 71322000-1 | iun. 2026 | 2 | 404 500 |
| ROMART CONSULTING 2008 | 79411000-8 | feb. 2025 | 2 | 382 000 |

În cazul TRIPTIC obiectele sunt clădiri diferite (PT1, PT2, PT5 — „regenerare clădiri publice”), deci
divizarea pe obiectiv poate fi justificabilă; de verificat dacă a existat un program unitar care impunea o
procedură competitivă.

## 5. Probleme de calitate a datelor (de rezolvat cu conectorul ONRC)

- **AGROSEMCU** apare cu CUI 15501204 și 155201204 (al doilea e aproape sigur o greșeală de tastare în SEAP).
- **HACHI INVEST** apare cu două CUI-uri reale diferite (28697278 și 40100475), ambele câștigând prin negociere
  fără publicare (3,34 mil. RON fiecare). Două firme cu același nume la același beneficiar = de verificat
  asociații la ONRC (firmă „reîncarnată”?).
- **LA FANTANA** — 35534516 vs 50455254, probabil tot două entități.
- 384 de firme (majoritatea furnizori de achiziții directe) nu au județ/adresă în SEAP; vin din ONRC.

## Următorul pas recomandat

Rulează conectorul ONRC pe cele ~30 de CUI-uri din secțiunile 1–3 (top furnizori + blocul de asocieri +
negocierile repetate) și conectorul ANI pe consilierii locali și conducerea primăriei 2024–2026. Abia
atunci graful poate răspunde la întrebarea reală: există un drum de ≤ 3 pași între un decident și un
câștigător?
