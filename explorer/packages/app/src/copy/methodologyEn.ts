import { withAmounts, type MethodologyPageCopy } from "@grivei/ui";

/** The methodology page, "About the numbers". Facts come from the counting rule, the Signal rules and the identity and placement rules as built. */
export const methodologyEn: MethodologyPageCopy = {
  eyebrow: "about the numbers",
  title: "About the numbers",
  intro:
    "Every Record and every amount in the explorer comes from SEAP, Romania's public procurement system, and is counted by one rule everywhere: totals, the map, rankings, the Flow lens and Signals. This page says what that rule is. The figures in the Signal sections are recomputed every time the data is loaded.",
  contents: "On this page",
  sections: {
    awardedValue: {
      heading: "Awarded value",
      paragraphs: [
        "The only money measure the explorer adds up is the awarded value: the value a Record was awarded at, in RON, as SEAP publishes it. It is not what was paid, and later contract modifications are not included.",
        "A contracting authority's total counts each Record once, however many lots or winners it has. A supplier's total counts the supplier's share (see Consortium shares).",
        "The source value is never edited. Where we leave a value out of a sum, the Record stays shown and says why.",
      ],
    },
    frameworkCeilings: {
      heading: "Framework ceilings",
      paragraphs: [
        "A framework agreement (\"Cu acord cadru\") sets a ceiling: the most that can be awarded under it. The ceiling is shown on its Record but never added to a total, because the contracts awarded under it are counted instead.",
        "A contract awarded under a framework (\"Cu acord cadru subsecvent\") is a subsequent contract and is counted. It shows the framework it belongs to: the one that shares its award notice number, with the ceiling and how much of it the subsequent contracts reported so far use. A subsequent contract whose framework is not in the data still counts and shows no ceiling. A contract \"Fără acord cadru\" is counted as usual.",
        "Several framework contracts under one award notice form one agreement, and its ceiling is their sum. Records read from SEAP's site (this quarter's and the 2021–22 backfill) do not say whether they sit under a framework, so they are counted as ordinary contracts. A framework with no value published has no ceiling to compare with.",
      ],
    },
    consortiumShares: {
      heading: "Consortium shares",
      paragraphs: [
        "When several suppliers win an award together, the Record shows the full value and every member. The contracting authority's side counts the award once, in full.",
        "On a supplier's own page each member is given an equal share of the value. That is a convention for supplier-side totals, not a fact from the source: SEAP does not publish how a consortium divides the money. When the value does not divide evenly, the remaining bani go one each to the first members in the published order, so the shares always add up to the value.",
      ],
    },
    suspectValues: {
      heading: "Suspect values",
      paragraphs: [
        "Some published values are very likely data-entry errors. A published rule flags them; a flagged Record stays shown, searchable and badged \"Suspect value\", and its value is left out of every sum and of every Signal. Every total says how many Records it left out and links to them. The source value is never corrected.",
        "Two rules flag a value:",
      ],
      items: [
        withAmounts((a, b, c, d) => `A direct purchase (DA or DAN) at ten times the statutory cap for its date and type, or more. The caps (Law 98/2016, without VAT) are ${a} for goods and services and ${b} for works until 9 September 2022, and ${c} and ${d} from 10 September 2022. The award date decides which applies. Works are told by the contract type or CPV division 45; CPV division 70 (rents) is never flagged. Values are compared as published, with no VAT adjustment.`, ["13506000", "45020000", "27012000", "90040000"]),
        withAmounts((a, b) => `A contract or award notice of ${a} or more is checked against its estimated value, looked up on e-licitatie: at a hundred times the estimate or more it is flagged, and above ${b} with no estimate it is flagged too. One whose estimate has not been looked up yet is counted.`, ["100000000000", "5000000000000"]),
      ],
    },
    blankValues: {
      heading: "Blank values",
      paragraphs: [
        "When SEAP publishes no value for a Record, or a value of zero, the Record says \"No value in SEAP\". It is counted as a Record and adds nothing to a sum. A blank is not a suspect value, and it is not read as zero spending.",
      ],
    },
    contractModifications: {
      heading: "Contract modifications",
      paragraphs: [
        "Later changes to a contract (extra work, a longer term, a new price) are not loaded. The awarded value is the value of the award as published, so what was finally paid can differ from it. The exception is described in the next section.",
      ],
    },
    backfilledValues: {
      heading: "Values of backfilled 2021–22 Records",
      paragraphs: [
        "Direct purchases, contracts and award notices from 2021 onwards come from SEAP's published bulk files. Those files leave out the 2021 and 2022 contracts awarded by negotiation without prior publication, and a few other procedures; the explorer reads those from e-licitatie itself, in a one-off crawl, together with the few later notices missing from the bulk files.",
        "That crawl returns the current value of a notice, so a notice modified since its award shows its modified value. The values of these backfilled Records are \"as of crawl\", not strictly the value at award, and each carries its crawl date in its provenance. They are counted in totals like any other Record, and badged \"Not in bulk data\".",
        "Records read from SEAP this quarter, before the bulk files exist, are badged \"Provisional\" and may change when the official data arrives.",
      ],
    },
    supplierIdentity: {
      heading: "Supplier identity",
      paragraphs: [
        "A supplier is one CUI that ANAF knows. A CUI counts only if it passes the Romanian check digit and ANAF finds it; the supplier's name is ANAF's, and every spelling SEAP used is kept as an alias. Aliases never merge two suppliers. Branches, group companies and merged companies are separate entities, with their ANAF status badged.",
        "A supplier with no CUI that ANAF knows (mostly foreign firms and consortia) is identified by its foreign VAT id, or else by its published name, and its page says so. An individual who wins a Record is shown only as \"Persoană fizică\": never named, never given a page. The Record still counts on the authority's side.",
        "Two badges mark data that disagrees with itself. \"CUI mismatch\": the supplier's CUI equals the authority's own, which cannot be right, so the supplier is treated as unresolved. \"Name differs from ANAF\": the name SEAP published is unlike the one ANAF holds for that CUI; the Record stays attached by CUI.",
        "A few identities are corrected by hand, for example the biggest contracts published with no CUI and obvious wrong CUIs. These corrections live in one file kept in the project's repository, every entry is reviewed and carries a written reason, and none of them ever splits a joint venture into its members. A Record or entity that a correction touches says \"Identity curated\".",
      ],
    },
    placement: {
      heading: "Placement",
      paragraphs: [
        "Each contracting authority and each supplier is placed in a county (ISO 3166-2:RO codes, Bucharest as B) and, where it can be told, in a UAT, using the SIRUTA code. The address in ANAF's VAT register decides. For an authority ANAF does not place, SEAP's own entity page is the fallback. The entity page says which source placed it.",
        "A national authority (a ministry, a national agency, a national company) is not placed inside Bucharest: it sits beside the map. Which authorities are national comes from SEAP's buyer type on award notices and from a reviewed list in the repository with a reason per entry. An authority that no source places in a county sits in its own tile, with its Records and their value. Foreign suppliers stay off the map, in their own bucket on the supplier side.",
      ],
    },
    coverageStatuses: {
      heading: "Coverage statuses",
      paragraphs: [
        "The Coverage lens colours each county, for each Source, as harvested, harvested with known gaps, partial, or not harvested. It tells whether the harvest is complete enough to trust the Money lens there; it is never a measure of how much an authority buys. Grey means not harvested, never no spending.",
        "A known gap is a period and Record kind for which a Source's Records are missing or possibly incomplete, either flagged by a published rule or entered by hand with a written reason.",
      ],
    },
    publicEnterprises: {
      heading: "Public enterprises (AMEPIP)",
      paragraphs: [
        "An organisation's page says \"public enterprise (AMEPIP)\" when its CUI appears in the indicator tables AMEPIP publishes as open data: the companies under Emergency Ordinance 109/2011 on the corporate governance of public enterprises. AMEPIP is the Agency for the Monitoring and Evaluation of the Performance of Public Enterprises. The match is by CUI alone, never by name, and the page shows the row of the table it rests on, with the financial years it appears for.",
        "AMEPIP has no list of CUIs of its own: the explorer reads the CUIs from the newest financial and governance indicators release AMEPIP publishes on data.gov.ro, under the licence CC-BY-4.0. A release holds several financial years, and a company is marked when it appears in any of them. So a company that was privatised, merged or dropped from monitoring in an earlier year of that release is still marked, which is why the page shows the years it appears for. AMEPIP publishes a release once or twice a year, so a company that became a public enterprise since may not be marked yet. Not being marked says only that the CUI is not in the release we hold, not that the company is private. Its name, registration number and ONRC status are shown as AMEPIP writes them.",
        "What the list leaves out: it holds only the companies AMEPIP monitors under that Ordinance and that appear in its indicator tables. A company owned by the state or by a local authority but outside the Ordinance, or one for which AMEPIP published no indicators, is not on it. The explorer reads only the CUI, name, registration number, status and years as AMEPIP writes them, and nothing about the owner, the share held or the board. AMEPIP publishes on no schedule, so the list can be out of date; the release date is shown below.",
      ],
    },
    partyAndLeadership: {
      heading: "Party and leadership (AEP)",
      paragraphs: [
        "An authority's page can show a Leadership list, and a Record can show a Party, for the town halls, Bucharest sectors, Bucharest's city hall and county councils. The explorer reads who won from the vote counts in the Permanent Electoral Authority's (AEP) final minutes of the 2020 and 2024 local elections, the October 2020 repeat round in three communes, and the December 2025 partial elections. The Party of a mandate is the list its leader ran on, exactly as registered at that election. An independent runs on no list, so \"Independent\" is shown and is never a party; an alliance keeps its registered name, with its member parties recorded where we know them; and there are no party families (ALDE is never counted as PNL). A leader may have switched party since the election: no source records switches, so the page never claims a current party, and leaders are never linked to a person page.",
        "A mandate runs from the oath to the successor's oath. AEP publishes no oath dates per commune, so we assume the oath 30 days after the election (and, for 2024, after 27 September 2024, when the 2020 mandates ended). What falls between two mandates is shown as a gap and is never given to the nearest leader: the handover window of autumn 2024, an interim leader after a vacancy (the mandate we hold is cut on the vacancy date where we know it, and otherwise, as an assumption, 90 days before the partial election, which is only the earliest a vacancy normally is), and a mandate without results (an authority with no winner in the minutes, or a tie). We do not hold the partial elections of May 2025 or of 2021 to 2023, and we know the vacancy date for only a few authorities: for any other vacancy the previous leader's mandate stays open and its Party can still be shown for Records after the vacancy, so a Party near a change of leader is not a certainty. The December 2025 results are partial counts from a one-off file (Code for Romania's backup of AEP's site), never refreshed automatically; the date it runs through is stated below.",
        "A Record's Party is the Party of the mandate in force on its award date at its authority. A subordinate body inherits it when its principal credit holder, in the Ministry of Finance's list of public entities, is exactly one town hall, sector, city hall or county council, and every held monthly snapshot of the list that names the body says the same: the page then states \"via the authority, principal credit holder, MF list snapshot, funding relation, current tie\". A school (dual-funded, with a ministry among its principals), a municipal company, an intercommunity development association (ADI), a body whose tie a held snapshot contradicts, and central government have no Party. A supplier never has a Party.",
        "The Party filter on search keeps the Records whose Party is the list you pick, exactly as registered. An alliance matches under its own name and never through one of its member parties, and \"Independent\" is never offered as a party. Records of subordinate bodies that inherit a Party are included; there is no direct-only view. The Total under the filter says what it covers: the matched Records and their value, split into directly led authorities and subordinate bodies, what the filter leaves out (other lists, independent leaders, and Records with no Party at all) and the share of the set's value that no Party is attributed to. Read it as the awards of authorities led by one list, never as all public money.",
        "A Party is the list at the election, never later. For a subordinate body it also rests on a tie that is today's: the Ministry of Finance's list of public entities is a monthly snapshot, and the explorer holds only a few of them, because it fetches the newest one each time. The tie read from them is applied to all of the body's Records in the mandate windows we hold, whenever they were awarded, so a body that had another principal in 2020 or 2021 shows today's authority's Party for those awards. A tie on which two held snapshots disagree is dropped, but with a single snapshot held a change of principal cannot be seen. This is why such a Party is labelled as derived, counted apart from the directly led authorities in the Party Total, and said to be a funding relation and a current tie.",
      ],
    },
    financialStatements: {
      heading: "Financial statements (MF)",
      paragraphs: [
        "A supplier's page shows its annual financial statements by year: turnover, profit or loss, debts, equity and the average number of employees. They come from the bulk files the Ministry of Finance (MF) publishes on data.gov.ro under the licence CC-BY-4.0, one set of files per fiscal year, from fiscal year 2021. The explorer reads the companies' files: long and short balance sheets, the abbreviated format and IFRS reporters. Banks, insurers, funds and non-profits file other forms and are not shown. Every row names MF and the file its figures were read from. Amounts are in RON as filed, and profit or loss is net profit minus net loss.",
        "MF publishes a year's files the following June and re-publishes them a year later with corrections. Each row says which release it comes from: a year MF has re-published shows the revised figures, and the newest year is a first release that may still be revised. A cell MF leaves blank is shown as \"not reported\", never as zero: a blank average number of employees is not a firm of no employees. A company that did not file for a year has no row for it.",
        "Beside the figures the page shows the awards of the same calendar year and their share of that year's turnover. It is context, never a Signal, and it is never added to awarded value: a company's statements and its awards are unlike measures and stay apart. The awards are the supplier's awarded value, counted by the same rule as every other total, by the year of the award date. A contract's whole value counts in the year it was awarded, however many years it runs, so the share can exceed 100% and is not a share of the company's revenue. A blank or zero turnover gives no share.",
        "Three limits go with the figures. First, a blank is common: in the files measured for this release, about a quarter of the rows (24%) report no turnover, and blank employee counts occur too; both show as \"not reported\", and with no turnover there is no share of turnover. Second, the figures are as the companies filed them and MF published them, and the explorer does not check or correct them: a typing slip or a negative turnover is shown as published. Third, a first release is revised at most once: MF re-publishes a year's files a year later, and the revised row replaces the first release only for the companies the revised file holds, so another company's year stays a first release, labelled as such. The Signal rules that read these figures say how they treat a blank and the newest year.",
      ],
    },
    firmDonations: {
      heading: "Firm donations (BaniPartide)",
      paragraphs: [
        "An organisation's page lists the donations and loans that companies made to parties, when the company's CUI appears in BaniPartide's table of firm donors. BaniPartide is a platform of Expert Forum, published under the licence CC Attribution 4.0. It compiles the table from the parties' annual publications in Monitorul Oficial and on the pages of the Permanent Electoral Authority (AEP). BaniPartide gives no report reference per row, so every line cites BaniPartide and, through its methodology, those publications. The match is by CUI alone, never by name. The party is shown exactly as BaniPartide publishes it: it is not matched to a Party, and a firm donation is never a Party.",
        "The explorer loads the table once from an archived copy and only checks from time to time whether BaniPartide has published a newer one, so recent donations may be missing: the page states the newest year the table covers. A row is filed under a year. A date is shown only where BaniPartide's published cell holds a single date; otherwise the cell is shown as published. Only companies are loaded. Individual donors are never loaded, shown or counted here, and a sole trader (PFA, II or IF) is not shown as a donor.",
        "On a supplier's page, \"this supplier is also a firm donor\" is context, never a Signal: a company that wins public contracts and gives to a party is not by that fact doing anything wrong. A donation is a different measure from awarded value, so its amount is never added to it, and donations are never summed together.",
        "BaniPartide is a secondary source: a table that Expert Forum compiles from the parties' own annual publications, not those publications. A typing slip or a missing row in it carries over, and the explorer neither corrects nor completes it. A row with no valid CUI (an individual entered among the firms, \"n/a\", or an empty id, as in some loans) is dropped, so a company's donation that BaniPartide records without a CUI is not listed. The explorer holds one archived copy, up to the year stated below: donations of later years are not there until a newer table is loaded. The donor's name and the company representative's name are never loaded.",
      ],
    },
    onrcRegister: {
      heading: "ONRC registrations (trade register)",
      paragraphs: [
        "ONRC, the National Trade Register Office, publishes the commercial register as open data on data.gov.ro, a whole snapshot of the register at a date. The explorer holds one snapshot for every month since March 2026, the month birth dates first appear in the files, and the last snapshot of each quarter back to 2021. A registration is the ONRC Record: search and the map count registrations, never money. ONRC has no money measure, so its counts are never ranked against SEAP's. The data-through date is the newest snapshot's date, and a month with no snapshot held is a known gap on the Coverage page. A registration with no registration number is left out.",
        "The registration facts shown (registration date, legal form, seat, authorised CAEN codes) are read from the newest snapshot only. The snapshots before mid-2025 are in an older layout with no registration date and no CAEN codes: they serve only to date statuses and names. A company that ONRC lists with no registration date is never in a Signal rule that needs one. A CUI that is blank, zero or fails the check digit joins the registration to no organisation.",
        "ONRC's statuses (struck off, insolvency, reorganisation and the others) are undated: a snapshot lists the statuses a company has, not when they began. The explorer dates a status by comparing snapshots: \"first seen in the snapshot of a date\" is the first held snapshot that shows it, and \"at least since\" when that is the earliest snapshot held. The change itself may be older, by up to the time between two snapshots, and by more when a month's snapshot is missing. A date here is never the date the status began. The strike-off date used by a Signal comes from ANAF, not from ONRC.",
        "ONRC lists the CAEN codes a company is authorised for and does not say which is its main one, so the explorer shows no main activity. A rule that asks whether a company may do some kind of work asks whether any of its authorised codes is of that kind, and an authorisation is not a record of what the company does. The files carry no SIRUTA code either: the seat is a county and a written address. An organisation's UAT comes from ANAF's address when ANAF has the CUI; otherwise the registration is placed at county level, and with no county it sits in the unplaced tile.",
        "A registration joins an organisation by CUI alone. A CUI that ANAF does not know but ONRC lists becomes a page of its own, badged \"CUI in ONRC only\". ONRC's names are kept as aliases and never replace the name at the top of the page, which is ANAF's. Branches and successors stay separate.",
        "ONRC's files list administrators and legal representatives with a name and a birth date, and no CNP. Birth dates appear only in the snapshots since March 2026. Only the people of an organisation tied to public money, a SEAP supplier or authority, are named: an organisation that exists only in ONRC has its page and facts but its people are not shown. A holder is shown with name, role and birth year, citing the snapshot. People who share a name are never merged: two role rows are one person only when name and full birth date match, a holder with no birth date is listed on that page only and linked to no one, and a same name and date with birthplaces in different counties is a possible match, held for review and never shown. The holders of a sole trader's registration (PFA, II or IF) are not shown, and no beneficial owner, relative or CNP is ever shown.",
      ],
    },
  },
  signals: {
    heading: "Signal rules",
    paragraphs: [
      "A Signal is a set of Records matched by a published rule, worth verifying in the source documents. It is never a conclusion or an accusation: each rule describes a pattern, and a pattern can have an ordinary explanation. Signals are counted, never scored or ranked.",
      "A Signal is dated by its latest Record. Each Signal links to a filter of the Records tab that reproduces it, and to the Record in SEAP. A value the counting rule leaves out of sums never triggers a Signal and never counts inside one. There are ten rules; for each, the window is the period of Records the rule looks at, and the national base rate is the share of contracting authorities that had at least one Signal of that rule in the base-rate year, out of those that had Records the rule looks at that year. Both are recomputed every time the data is loaded.",
    ],
  },
  rules: {
    OVER_CAP: {
      heading: "Over cap",
      paragraphs: ["Over cap: a direct purchase above the statutory cap for its date and type, and below ten times it."],
      items: [
        withAmounts((a, b, c, d) => `Direct purchases only (DA and DAN). The cap is the one in force on the award date, for the type of purchase: ${a} for goods and services and ${b} for works until 9 September 2022, then ${c} and ${d} (Law 98/2016, without VAT). Works are told by the contract type or CPV division 45.`, ["13506000", "45020000", "27012000", "90040000"]),
        "Strictly above the cap: a value exactly at the cap is within it. At ten times the cap or more, the counting rule handles the value instead and no Signal arises.",
        "CPV division 70 (rents) is exempt, and a Record with no value has nothing to compare.",
        "One Signal for each authority and award day; if several purchases qualify that day, the Signal shows the largest.",
      ],
      lawful: "Possible lawful explanations: a call-off under a framework agreement, an exception in the law, or a data-entry error in the value or the type of the Record.",
    },
    SPLITTING: {
      heading: "Splitting",
      paragraphs: ["Splitting: two or more direct purchases that each stay at or under the cap but together go over it, which may mean one purchase cut into pieces."],
      items: [
        "The same contracting authority, the same supplier and the same CPV group (the first three digits of the CPV code).",
        "Award dates within 30 days of each other: the first and the last purchase are at most 30 calendar days apart, counting both days.",
        "Each purchase at or under the cap for its own date and type, and the sum above the cap in force on the date of the last purchase.",
        "Windows that share a day merge into one Signal, from the first purchase to the last. Windows that do not overlap are separate Signals.",
        "Left out: CPV division 70, Records with no value, individuals, and consortium Records.",
      ],
      lawful: "Possible lawful explanations: separate needs, separate budget lines, or unrelated items that share a CPV group.",
    },
    FRAMEWORK_OVERRUN: {
      heading: "Framework overrun",
      paragraphs: ["Framework overrun: the subsequent contracts reported under a framework agreement add up to more than 110% of its ceiling."],
      items: [
        "The framework is an award notice: its ceiling is the sum of the values of its framework-ceiling Records (a value the counting rule leaves out is not summed, neither in the ceiling nor in the subsequent sum), and its subsequent contracts are the ones under the same notice number, whichever authority signed them.",
        "Only frameworks awarded from 1 January 2021 (the date of the earliest of its ceiling Records), with a ceiling that is not blank.",
        "Strictly above 110%: exactly 110% is no Signal.",
        "The Signal belongs to the authority that concluded the framework and is dated by its latest Record. It lists that authority's ceiling Records and its subsequent contracts up to the one that first took the running sum above 110%; contracts reported after that are not listed. Its figures describe the framework as reported up to the data-through date, so the Records listed can add up to less than the subsequent total shown.",
      ],
      lawful: "Possible lawful explanations: indexation of prices, or modifications the law allows.",
    },
    NO_PUBLICATION: {
      heading: "No publication",
      paragraphs: ["No publication: a contract awarded by negotiation without prior publication (\"Negociere fără publicare prealabilă\"), whatever its value."],
      items: [
        "Contracts and award notices only, by the procedure as SEAP publishes it. A direct purchase has no procedure. Other procedures without a prior call, such as \"Norme proprii\", are not part of this rule.",
        "Read from the bulk files from 2023, from the current quarter's crawl, and from the 2021–22 backfill once it is loaded; the window shows where the data starts.",
        "One Signal for each authority and award day.",
      ],
      lawful: "Possible lawful explanations: an emergency, a single possible supplier, or another legal ground.",
    },
    YOUNG_FIRM: {
      heading: "Young firm",
      paragraphs: ["Young firm: a supplier whose first Record comes within 90 days of its registration, or that wins a large Record within 180 days of it."],
      items: [
        "Registration date: the date ONRC records for the supplier's registration, from ONRC's newest snapshot. A supplier ONRC lists without a registration date (the older snapshot layout has none) is never in this rule, and the rule is not shown at all while no registration date is loaded. The date is the company's own: one that re-registered can look younger than its business is.",
        "First contract: the supplier's Records on the earliest day it has a Record in the explorer (several Records that day, from different authorities or a contract and its award notice, all count). They count when that day is on or after the registration and at most 90 days after it. Records on later days within those 90 days are context only and are never a Signal on their own.",
        withAmounts((a) => `Large Record: any Record with a counted value of at least ${a} (exactly that counts), dated at most 180 days after the registration, whether or not it is the supplier's first. A blank, left-out or ceiling value counts as nothing.`, ["100000000"]),
        "Days are calendar days from the registration day to the Record's award date; day 90 and day 180 are in. A Record dated before the registration never counts. A consortium Record counts when any of its members meets the rule.",
        "Window and firing rate: the window starts with the first Record loaded, and the firing rate below is recomputed at every load, over a calendar year like the other rules.",
      ],
      lawful: "Possible lawful explanations: a company set up for one contract, or an established business that took a new registration after a restructuring or a change of legal form.",
    },
    NO_CONSTRUCTION_CAEN: {
      heading: "Works without a construction CAEN",
      paragraphs: ["Works without a construction CAEN: a works Record of a large value won by a firm with no construction CAEN code among its authorised codes."],
      items: [
        withAmounts((a) => `Works are told as in the counting rule: the contract type Lucrări, or CPV division 45. The Record's counted value is at least ${a} (exactly that counts); a blank, left-out or ceiling value never triggers.`, ["100000000"]),
        "The authorised codes are the ones in ONRC's newest snapshot. Construction is divisions 41, 42 and 43 of CAEN Rev.2 (2008) and of Rev.3 (2025), told by each code's own revision; for the older CAEN 1998 and 2003 codes it is division 45.",
        "Unknown is never a Signal: a winner without an entity, without an ONRC registration or without codes on record (the older snapshot layout has none) does not trigger. A consortium triggers only when none of its members has a construction code.",
        "A register lets a firm hold codes it does not use and work under codes it does not hold. Window and firing rate: the window starts with the first Record loaded, and the firing rate below is recomputed at every load.",
      ],
      lawful: "Possible lawful explanations: a subcontractor or consortium partner does the building, the register is out of date, or the firm works under a code it did not list.",
    },
    AFTER_STRIKE_OFF: {
      heading: "After strike-off",
      paragraphs: ["After strike-off: a Record dated after the day ANAF shows the supplier struck off."],
      items: [
        "The strike-off is the date in ANAF's answer for the supplier's CUI (\"RADIERE din data ...\"), as of the day that answer was last fetched. ONRC's own struck-off status is undated and is not used here. An answer that says struck off without a date never triggers.",
        "The Record's award date must be after the strike-off day: a Record on the day itself is not. Any Record counts, whatever its value, a blank one included.",
        "A company struck off and later re-registered, or whose strike-off was reversed, shows the state ANAF last gave. A merger or a successor is another entity and is not linked.",
        "Window and firing rate: the window starts with the first Record loaded, and the firing rate below is recomputed at every load.",
      ],
      lawful: "Possible lawful explanations: a delay between the award and its publication, a successor company that took over under another number, or a strike-off ANAF later reversed.",
    },
    INSOLVENCY: {
      heading: "Insolvency",
      paragraphs: ["Insolvency: the supplier is now in insolvency or reorganisation and has Records in the last six months."],
      items: [
        "Status: the status codes ONRC shows for the supplier in its newest snapshot, read by the name ONRC publishes for each: insolvency, judicial reorganisation or bankruptcy. A name that says the procedure is closed (\"closing of proceedings\", \"exit from insolvency\") does not count. Other statuses (dissolution, liquidation, suspension, struck off) are not part of this rule.",
        "The status is undated. ONRC's open data lists the statuses a company has in each snapshot, not when they began, so the explorer can only say which snapshot a status was first seen in (and \"at least since\" when that is the earliest snapshot held). The proceedings may be older than that snapshot, or younger than the Record: a Signal says \"in insolvency now and won recently\", never \"won while in insolvency\".",
        "\"Now\" is the date of ONRC's newest snapshot, and \"the last six months\" are the six calendar months up to and including it. A Record dated after that snapshot is outside what the status says. Any Record counts, whatever its value.",
        "Firing rate: unlike the other rules, the rate below is measured over the six months to ONRC's newest snapshot (the slice of time this rule can see), as the share of authorities with a Record in those months that have a Signal in them. The year shown with the rate is the year of that snapshot. It is recomputed at every load.",
      ],
      lawful: "Possible lawful explanations: the Record was awarded before the proceedings began, or the proceedings let the business go on under a reorganisation plan.",
    },
    FEW_EMPLOYEES: {
      heading: "At most one employee",
      paragraphs: ["At most one employee: a supplier awarded a large sum in one year that reported at most one average employee for that fiscal year."],
      items: [
        withAmounts((a) => `Awards: the supplier's awarded value for the calendar year of the Records' award dates, counted by the same rule as every other total (a consortium member has an equal share; a blank, left-out or ceiling value adds nothing), at least ${a} (exactly that counts). The Signal lists that supplier's counted Records of the year.`, ["500000000"]),
        "Employees: the average number of employees the supplier reported to the Ministry of Finance for the same fiscal year, from the statement the explorer holds (the revised release where there is one). A reported 0 or 1 counts. A blank is \"not reported\" and never triggers; with no statement for the year there is no Signal, so an award year newer than the newest fiscal year held cannot trigger.",
        "The count is a yearly average: a firm can keep it low by subcontracting or by employing through another company, and a statement can carry a mistaken figure.",
        "Window and firing rate: the firing rate below is measured in the newest fiscal year held, the newest year this rule can see, and recomputed at every load.",
      ],
      lawful: "Possible lawful explanations: the work is subcontracted or done by staff employed through another company, or a yearly average understates a seasonal workforce.",
    },
    NO_FINANCIAL_STATEMENT: {
      heading: "No financial statement",
      paragraphs: ["No financial statement: an SRL or an SA awarded a large sum in one year with no financial statement for that fiscal year or the year before."],
      items: [
        "Legal form: the supplier's legal form as ONRC lists it, an SRL or an SA. Sole traders, public institutions and other forms never trigger, and neither does a supplier ONRC does not list (its legal form is unknown).",
        withAmounts((a) => `Awards: counted as for the employees rule, at least ${a} (exactly that counts) in the calendar year of the Records' award dates.`, ["100000000"]),
        "No statement: the explorer holds no statement of that CUI for the award year nor for the year before, in any release; either one keeps the supplier out.",
        "The newest fiscal year is left out until its revised release. The Ministry of Finance publishes a year's statements the following June and corrects and completes them a year later, so a statement missing from a first release may only be missing from it. An award year is not evaluated while the newest fiscal year held has no revised release and the award year is that one or later; nor is it evaluated unless the year before it is one the explorer holds statements for (the first fiscal year held is 2021, so the first award year is 2022).",
        "A company registered shortly before the award year may have no statement yet, and a statement can be filed under another CUI after a merger. Window and firing rate: the firing rate below is measured in the newest award year the rule evaluates, and recomputed at every load.",
      ],
      lawful: "Possible lawful explanations: the company filed late or under another CUI, was registered shortly before, or the Ministry of Finance's files are incomplete.",
    },
  },
  referenceDataThrough: (date) => `Data through ${date}`,
  referenceFiscalYearThrough: (year) => `Data through fiscal year ${year}`,
  referenceYearThrough: (year) => `Data through ${year}`,
  baseRate: {
    windowLabel: "Time window",
    range: (from, to) => `${from} to ${to}`,
    openStart: (to) => `From the first Record loaded to ${to}`,
    rateLabel: "How often it fires nationally",
    rate: (percent, year) => `${percent} of contracting authorities had at least one in ${year}.`,
    none: (year) => `No contracting authority had one in ${year}.`,
    dataThrough: (date) => `Data through ${date}`,
    loading: "Loading the window and the national figure…",
    error: "The window and the national figure could not be loaded. The rule above still applies.",
    missing: "There is no national figure for this rule yet.",
  },
};
