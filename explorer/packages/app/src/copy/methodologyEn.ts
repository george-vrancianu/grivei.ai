import { withAmounts, type MethodologyPageCopy } from "@grivei/ui";

/** The methodology page, "About the numbers". Facts come from the counting rule, the Signal rules and the identity and placement rules as built. */
export const methodologyEn: MethodologyPageCopy = {
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
  },
  signals: {
    heading: "Signal rules",
    paragraphs: [
      "A Signal is a set of Records matched by a published rule, worth verifying in the source documents. It is never a conclusion or an accusation: each rule describes a pattern, and a pattern can have an ordinary explanation. Signals are counted, never scored or ranked.",
      "A Signal is dated by its latest Record. Each Signal links to a filter of the Records tab that reproduces it, and to the Record in SEAP. A value the counting rule leaves out of sums never triggers a Signal and never counts inside one. There are four rules; for each, the window is the period of Records the rule looks at, and the national base rate is the share of contracting authorities that had at least one Signal of that rule in the base-rate year, out of those that had Records the rule looks at that year. Both are recomputed every time the data is loaded.",
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
  },
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
