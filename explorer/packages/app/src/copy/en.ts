import type { Copy } from "./types.ts";
import { ruleLabels } from "./ruleLabels.ts";
import { methodologyEn } from "./methodologyEn.ts";

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);

/** ONRC's N_VERSIUNE_CAEN: version 0 is the 1998 classification, 1 is 2003, 2 is 2008, 3 is 2025. */
const CAEN_YEARS = [1998, 2003, 2008, 2025];

const entityLink: Copy["entityLink"] = {
  nameOnly: { label: "name only", explanation: "Identified by its published name alone (no CUI). Figures may mix up namesakes." },
  identityCurated: { label: "curated", explanation: "A person reviewed and fixed this entity's identity." },
};

const badges: Copy["badges"] = {
  FRAMEWORK_CEILING: { label: "Framework ceiling", explanation: "The agreed maximum of a framework agreement, not money awarded. Never added to a total." },
  SUBSEQUENT_CONTRACT: { label: "Subsequent contract", explanation: "Awarded under a framework agreement. Counted here; the framework's ceiling is not." },
  CONSORTIUM_SHARE: { label: "Consortium share", explanation: "Several suppliers won together. A supplier's own figures count an equal share of the contract value; a Record shows the full value." },
  SUSPECT_VALUE: { label: "Suspect value", explanation: "The published value breaks a counting rule (for example, far above its estimate). Shown and searchable, but left out of totals." },
  NO_VALUE: { label: "No value", explanation: "SEAP publishes no value for this Record. It is counted, and adds nothing to totals." },
  CUI_MISMATCH: { label: "CUI mismatch", explanation: "The CUI published here does not match the one ANAF confirms for this name." },
  NAME_DIFFERS_FROM_ANAF: { label: "Name differs from ANAF", explanation: "The name published on this Record differs from the registered name at ANAF." },
  IDENTITY_CURATED: { label: "Identity curated", explanation: "A person reviewed and fixed who this party is; the match was not automatic." },
  CRAWLED_PROVISIONAL: { label: "Provisional", explanation: "Read from SEAP this quarter and still awaiting the official bulk data; it may change." },
  CRAWL_ONLY: { label: "Not in bulk data", explanation: "Found on SEAP but never matched in the official bulk data." },
};

/** The Signal card, its compact badge and the wording of each rule: label, sentence with the numbers filled in, lawful explanations. The rule labels everywhere else (facets, Record page) come from here. */
const signalCard: Copy["signalCard"] = {
  rules: {
    OVER_CAP: {
      label: "Over cap",
      sentence: (n) => `One direct purchase was awarded for ${n.value}, ${n.multiple} times the direct-purchase cap of ${n.cap}.`,
      lawful: "Possible lawful explanations: a call-off under a framework agreement, an exception in the law, or a data-entry error in the value or the type of the Record.",
    },
    SPLITTING: {
      label: "Splitting",
      sentence: (n) => `${n.purchases} direct purchases in CPV group ${n.cpvGroup} between ${n.from} and ${n.to} add up to ${n.sum}, above the single-purchase cap of ${n.cap}.`,
      lawful: "Possible lawful explanations: separate needs, separate budget lines, or unrelated items that share a CPV group.",
    },
    FRAMEWORK_OVERRUN: {
      label: "Framework overrun",
      sentence: (n) => `Subsequent contracts reported under one framework agreement add up to ${n.subsequent}, against a ceiling of ${n.ceiling}: ${n.ratio} of it.`,
      lawful: "Possible lawful explanations: indexation of prices, or modifications the law allows.",
    },
    NO_PUBLICATION: {
      label: "No publication",
      sentence: (n) => `Awarded by the procedure "${n.procedure}", which has no prior publication of a notice.`,
      lawful: "Possible lawful explanations: an emergency, a single possible supplier, or another legal ground.",
    },
  },
  compact: { text: (label, when) => `${label}, ${when}` },
  date: (when) => `Latest Record: ${when}`,
  records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
  parties: {
    authority: "Contracting authority",
    suppliers: "Suppliers",
    moreSuppliers: (_n, f) => `and ${f} more`,
    entityLink,
  },
  links: {
    reproduce: (n, f) => (n === 1 ? "See the Record" : `See the ${f} Records`),
    seap: { check: "Check in SEAP", checkEach: "Check each Record in SEAP" },
    methodology: "How this Signal is detected",
  },
};

export const en: Copy = {
  brand: "Grivei.ai",
  nav: { label: "Main", explore: "Explore", search: "Search", coverage: "Coverage", methodology: "About the numbers" },
  footer: {
    provenance: "source: SEAP, via data.gov.ro quarterly exports and the e-licitatie.ro crawl · every Record links to its source document",
    signals: "Signals are counted, never scored",
  },
  language: { groupLabel: "Language", current: "EN", switchTo: "RO", switchLabel: "Romanian version of this page" },
  status: { loading: "Loading…", failed: "The data could not be loaded." },
  main: { title: "Explore public spending", total: "Total awarded", mapUnavailable: "The map could not be loaded." },
  sourceEyebrow: { search: "search", scope: "national", period: "2021 onward" },
  searchBar: { label: "Search", placeholder: "Search in Romanian, e.g. deszăpezire", hint: "The data is in Romanian. Try deszăpezire, a company name, a CUI with or without RO, or a CPV prefix such as 45. Diacritics, case and legal forms (SRL, SA) are ignored.", clear: "Clear search", loading: "Searching", minLengthHint: "Type at least 2 characters to search." },
  results: {
    label: "Results",
    tabs: { authorities: "Authorities", suppliers: "Suppliers", records: "Records" },
    empty: { authorities: "No authorities match.", suppliers: "No suppliers match.", records: "No Records match." },
    emptyLink: "Check what has been harvested",
    showAll: (_n, formatted) => `Show all ${formatted}`,
    goTo: { heading: "Go to page", open: "Open the page", cui: "CUI", nameOnly: "identified by name only" },
    entityRow: {
      matched: "matched",
      cui: "CUI",
      records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
      national: "national",
      noCounty: "county unknown",
      entityLink,
      signals: { label: (n, f) => `${f} ${plural(n, "Signal", "Signals")}`, forEntity: (name) => `, ${name}` },
    },
    recordRow: {
      noValue: "no value",
      valueCaption: { awarded: "awarded value", ceiling: "ceiling, not summed" },
      channel: { DIRECT_PURCHASE: "Direct purchase", CONTRACT: "Contract" },
      consortium: {
        label: "consortium",
        explanation: "The full contract value is shown. Each member's share is an equal-share convention, not a published figure.",
      },
      authority: "Authority",
      winners: "Winners",
      matchedIn: (field) => `Matched in ${field}`,
      fields: {
        TITLE: "title", AUTHORITY: "authority", SUPPLIER: "supplier", CPV_CODE: "CPV code", CPV_DESCRIPTION: "CPV description",
        PUBLIC_CODE: "public code", CUI: "CUI",
      },
      badges,
      party: { naturalPerson: "Persoană fizică", entityLink },
      areaShare: (amount) => `Consortium share in the selection: ${amount}`,
    },
  },
  fullResults: {
    showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    outOfRange: (pages, formatted) => `This page is past the end: there ${pages === 1 ? "is only 1 page" : `are only ${formatted} pages`}.`,
    noRowsHere: "There are no results on this page: the count above is an estimate.",
    firstPage: "Go to page 1",
    back: "Back to results",
    cite: { label: "Cite this view", copyLink: { label: "Copy link", copied: "Link copied", failed: "Could not copy the link" } },
    order: { label: "order", options: { VALUE_DESC: "value, high to low", DATE_DESC: "date, newest first", DATE_ASC: "date, oldest first" } },
    pagination: { label: "Result pages", previous: "Previous", next: "Next", page: (n) => `Page ${n}` },
  },
  mainScreenLayout: {
    lens: { label: "Map lens", money: "Money", coverage: "Coverage" },
    regions: { search: "Search", map: "Map", results: "Results" },
  },
  moneyLensMap: {
    map: { mapLabel: "Map of counties", legendTitle: "Awarded value", noData: "No data", areaLabel: (name, value) => `${name}: ${value}`, atMost: (value) => `up to ${value}` },
    side: { label: "Show counties by", authority: "Authorities", supplier: "Suppliers" },
    tiles: {
      heading: "Off the map",
      national: "National",
      unplaced: "Unplaced authorities",
      unknownSupplierCounty: "Unknown supplier county",
      unplacedAuthorities: (n, f) => `${f} ${plural(n, "authority without a county", "authorities without a county")}`,
      records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
      suspectLeftOut: (n, f) => `${f} ${plural(n, "suspect value left out", "suspect values left out")}`,
    },
  },
  coverageLensMap: {
    map: { mapLabel: "Coverage map by county", legendTitle: "Coverage", noData: "No data", areaLabel: (name, value) => `${name}: ${value}`, atMost: (value) => `up to ${value}` },
    status: {
      HARVESTED: "Harvested",
      HARVESTED_WITH_KNOWN_GAPS: "Harvested, with known gaps",
      PARTIAL: "Partial",
      NOT_HARVESTED: "Not harvested",
    },
    noStatus: "No coverage status",
    nationalCaption: (source) => `${source} is harvested nationally; gaps apply to every county`,
    marks: {
      title: "One mark per Source",
      harvested: (source) => `${source}: coloured by the county's status`,
      notHarvested: (source) => `${source}: not harvested`,
      plannedLegend: (sources) => `Not harvested yet: ${sources}`,
    },
    tooltip: {
      summary: (p) => {
        const entities = `${p.withRecordsText} of ${p.publicEntitiesText} public ${plural(p.publicEntities, "entity", "entities")} ${p.withRecords === 1 ? "has" : "have"} ${p.source} records since ${p.since}`;
        const k = p.otherAuthorities;
        return k > 0 ? `${entities}, plus ${p.otherAuthoritiesText} other contracting ${plural(k, "authority", "authorities")}` : entities;
      },
      boughtNothingNote: "An entity without records may simply have bought nothing.",
    },
    tiles: {
      heading: "Off the map",
      national: "National",
      unplaced: "Unplaced authorities",
      unplacedAuthorities: (n, f) => `${f} ${plural(n, "authority without a county", "authorities without a county")}`,
      records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
      suspectLeftOut: (n, f) => `${f} ${plural(n, "suspect value left out", "suspect values left out")}`,
    },
  },
  zoomedCounty: {
    map: {
      map: { mapLabel: "Map of the county's UATs", legendTitle: "Awarded value", noData: "No authority bought anything", areaLabel: (name, value) => `${name}: ${value}`, atMost: (value) => `up to ${value}` },
      figures: {
        records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
        suspectLeftOut: (n, f) => `${f} ${plural(n, "suspect value left out", "suspect values left out")}`,
      },
      authorities: (n, f) => `${f} ${plural(n, "authority", "authorities")}`,
      circleKey: "Circle size: number of authorities",
      unknownUat: "County known, UAT unknown",
    },
    back: "Back to Romania",
    title: (name, sectors) => (sectors ? `${name}: sectors` : `${name}: UATs`),
    selectedUat: (name) => `Results for ${name}`,
    clearUat: "Show the whole county",
  },
  filterChips: {
    label: "Filters",
    year: { group: "Award year", from: "From year", to: "To year", any: "Any" },
    channel: { group: "Channel", options: { DIRECT_PURCHASE: "Direct purchase", CONTRACT: "Contract" } },
    valueBucket: {
      group: "Value",
      options: {
        UP_TO_10K: "Up to 10,000 RON",
        UP_TO_135K: "10,000–135,060 RON",
        UP_TO_270K: "135,060–270,120 RON",
        UP_TO_900K: "270,120–900,400 RON",
        UP_TO_9M: "900,400–9,004,000 RON",
        UP_TO_1B: "9,004,000 RON–1 bn RON",
        OVER_1B: "Over 1 bn RON",
      },
    },
    signals: { group: "Signals", has: "Has Signals", without: "Without Signals" },
    procedure: { group: "Procedure", empty: "No procedures to choose from." },
    badges: { group: "Record badges", badges: badges },
    active: {
      group: "Active filters",
      none: "No filters on.",
      from: (when) => `From ${when}`,
      to: (when) => `Until ${when}`,
      remove: (chip) => `Remove ${chip}`,
      clearAll: "Clear all",
    },
  },
  pages: {
    notFound: { title: "Page not found", back: "Back to the main screen" },
    search: { title: "Search" },
  },
  badges,
  entityLink,
  party: { naturalPerson: "Persoană fizică", entityLink },
  dataThrough: { through: "data through" },
  total: {
    records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
    suspectLeftOut: (n, f) => `${f} ${plural(n, "suspect value left out", "suspect values left out")}`,
    noValue: (n, f) => `${f} ${plural(n, "Record with no value", "Records with no value")}`,
    frameworkCeilings: (amount) => `Framework ceilings not counted: ${amount}`,
    methodology: "How this total is counted",
  },
  recordPage: {
    notFound: { title: "Record not found", body: (code) => `No Record is published under the code ${code}.` },
    heading: {
      kinds: { DA: "Direct purchase (DA)", DAN: "Direct purchase award notification (DAN)", CONTRACT: "Contract", AWARD_NOTICE: "Award notice" },
      facets: { code: "Code", date: "Date", kind: "Kind", procedure: "Procedure", contractType: "Contract type", cpv: "CPV" },
      panel: "The Record",
    },
    value: {
      published: "Value as published",
      counted: "Counted value",
      noValue: "No value in SEAP",
      notCounted: {
        suspect: "Not counted: the published value breaks a counting rule",
        frameworkCeiling: "Not counted: a framework ceiling is not money awarded; its subsequent contracts are counted instead",
        noValue: "Nothing to count: SEAP publishes no value",
        other: "Not counted",
      },
    },
    parties: {
      authority: "Contracting authority",
      winners: "Winners",
      consortiumOf: (_n, formatted) => `consortium of ${formatted}`,
      share: (amount) => `equal share ${amount}`,
      convention: "Each member's equal share is a counting convention, not a figure SEAP publishes. The value above is the full value of the contract.",
    },
    suspect: {
      heading: "Suspect value rule",
      rules: {
        DIRECT_PURCHASE_10X_CAP: (t) => `The published value is at least ten times the cap in force for a direct purchase of this date and type${t ? ` (${t})` : ""}.`,
        CONTRACT_100X_ESTIMATE: (t) => `The published value is 1 bn RON or more, and at least a hundred times the estimated value in e-licitatie${t ? ` (${t})` : ""}.`,
        CONTRACT_OVER_50BN: () => "The published value is above 50 bn RON and e-licitatie gives no estimated value.",
      },
      leftOut: "The value is shown as published and left out of totals.",
      methodology: "How values are counted",
    },
    framework: {
      heading: "Framework agreement",
      line: (ceiling, reported, percent) => `Ceiling ${ceiling}; subsequent contracts reported so far ${reported} (${percent})`,
      lineBlankCeiling: (reported) => `Ceiling not published; subsequent contracts reported so far ${reported}`,
      agreement: "Awarded under the framework agreement",
      subsequentHeading: "Subsequent contracts",
    },
    cite: { label: "Address of this Record", copyLink: { label: "Copy link", copied: "Link copied", failed: "Could not copy the link" } },
    badges: { heading: "Badges and what they mean" },
    signals: {
      heading: "Signals this Record belongs to",
      rules: ruleLabels(signalCard.rules),
      date: (when) => `dated ${when}`,
      records: (n, f) => `${f} ${n === 1 ? "Record" : "Records"}`,
    },
    provenance: {
      heading: "Provenance",
      source: "Source",
      via: "File or notice",
      kind: "How we got it",
      kinds: { BULK: "Published bulk file", CRAWL: "Read from the Source's own site", API: "Read from the Source's API" },
      fetchedAt: "Fetched",
      checkIn: (source) => `Check in ${source}`,
      noPublicPage: (source) => `${source} has no stable public page for this Record yet.`,
    },
    party: {
      heading: "Party",
      note: "The list of the mandate in force on the award date, as registered at the election. The leader may have switched party since.",
      via: (authority, snapshot) => `Through ${authority}, principal credit holder, MF list snapshot ${snapshot}; funding relation, current tie.`,
      mandateBasis: {
        independent: "Independent (not a party)",
        alliance: (members) => `alliance; member parties: ${members.join(", ")}`,
        basis: {
          finalMinutes: (election) => `AEP final minutes, election of ${election}`,
          repeatRound: (election) => `AEP repeat round of ${election}`,
          partialMinutes: (election, through) => `AEP partial election of ${election}; partial counts from a one-off file (Code for Romania's backup), data through ${through}`,
        },
      },
    },
  },
  entityPage: {
    layout: { label: "Sections of this page", cite: { label: "Address of this view", copyLink: { label: "Copy link", copied: "Link copied", failed: "Could not copy the link" } }, tabs: { overview: "Overview", records: "Records", relationships: "Relationships" } },
    header: {
      identity: {
        cui: "CUI",
        foreignVatId: "Foreign VAT ID",
        nameOnly: { label: "Identified by name only", explanation: "No CUI that ANAF knows for this supplier, so it is identified by its foreign VAT id or its published name. Figures may mix up namesakes." },
        identityCurated: { label: "Identity curated", explanation: "A person reviewed and fixed this entity's identity." },
        onrcOnly: { label: "CUI in ONRC only", explanation: "ANAF does not know this CUI. ONRC, the trade register, lists it, so this page shows ONRC's name and facts." },
      },
      anafStatus: { label: "ANAF status", inactive: (status) => `ANAF lists this entity as ${status}, not active.` },
      placement: {
        label: "Location",
        national: "National",
        unplaced: { label: "Unplaced", explanation: "Neither ANAF nor SEAP places this entity in a county." },
        placedBy: (source) => `placed by ${source}`,
      },
      source: { from: (source, fetched) => `Name and status from ${source}, fetched ${fetched}` },
      roles: {
        label: "Roles of this entity",
        authority: "buys · contracting authority",
        supplier: "sells · supplier",
        none: { AUTHORITY: "buys · no Records as authority", SUPPLIER: "sells · no Records as supplier" },
      },
      seapNames: {
        label: "Appears in SEAP as",
        records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
        range: (first, last) => `${first} to ${last}`,
        more: (_n, f) => `and ${f} more`,
      },
    },
    onrc: {
      heading: "ONRC registration",
      registrationNumber: "Registration number",
      registrationDate: "Registered",
      registrationDateUnknown: "not in the snapshot we read",
      legalForm: "Legal form",
      seat: "Registered seat",
      seatUnknown: "no seat published",
      statuses: {
        heading: "Status",
        none: "ONRC lists no status.",
        unnamed: (code) => `status code ${code}`,
        firstSeen: (snapshot) => `first seen in the snapshot of ${snapshot}`,
        sinceAtLeast: (snapshot) => `since at least the snapshot of ${snapshot}`,
        caveat: "ONRC publishes statuses without dates. A date here is the first snapshot we hold that shows the status, found by comparing snapshots; the change itself may be older.",
      },
      caen: { heading: "Authorised CAEN codes", none: "ONRC lists no authorised CAEN code.", version: (v) => (v === null ? "" : `CAEN ${CAEN_YEARS[v] ?? v}`) },
      aliases: {
        heading: "ONRC names",
        none: "ONRC lists no name.",
        current: "legal name today",
        range: (first, last) => (first === last ? `seen in the snapshot of ${first}` : `seen in the snapshots of ${first} to ${last}`),
        rangeSinceAtLeast: (first, last) => (first === last ? `seen in the snapshot of ${first}, at least` : `seen since at least ${first}, last on ${last}`),
        note: "These are ONRC's spellings, kept as aliases. They never change the name at the top of the page.",
      },
      source: (snapshot) => `Source: ONRC, snapshot of ${snapshot}`,
      onrcOnly: "This organisation is in ONRC only: no purchase in SEAP names it. No person of it is shown.",
    },
    notFound: { title: "Entity not found", body: "No authority or supplier is published under this key." },
    relationships: {
      lens: { label: "Show", options: { graph: "Graph", flow: "Money flow" } },
      tab: {
        heading: "Relationships",
        recordCount: (n, formatted) => `${formatted} ${n === 1 ? "Record" : "Records"}`,
        graph: {
          heading: "Top counterparties · pick one to list its Records",
          label: "Graph of the top counterparties",
          naturalPerson: "Persoană fizică",
          unknown: "Unidentified counterparty",
          node: (p) =>
            `${p.name}, ${p.amount}, ${p.records}; ${p.contract} via contracts, ${p.directPurchase} via direct purchases` +
            `${p.wonTogether ? "; won together" : ""}${p.hasSignals ? "; has Signals" : ""}${p.selected ? "; picked" : ""}`,
          more: (n, formatted) => `${formatted} more ${n === 1 ? "counterparty" : "counterparties"}`,
          empty: "No counterparties for the chosen filters.",
          consortiumNote:
            "A consortium's money is split equally among its members, by convention; a Record's full value is on its own page.",
        },
        legend: {
          title: "Legend", edgeColour: "An edge's colour is the channel holding the most RON with that counterparty.", centre: "The entity of this page", size: "Circle area: money with the counterparty", contract: "Amber line: contracts",
          directPurchase: "Blue line: direct purchases", wonTogether: "Dashed line: won together", signals: "Amber ring: has Signals",
        },
        timeline: {
          heading: "By month", label: "Money by month", overall: "All counterparties", picked: (name) => name ?? "Picked counterparty", empty: "No months for the chosen filters.",
          table: { caption: "Money by month", month: "Month", amount: "Total", picked: (name) => name ?? "Picked counterparty" },
        },
        panel: {
          label: "Records with the picked counterparty", eyebrow: "Picked counterparty", hint: "Pick a counterparty in the graph to list every Record with it.", heading: "Records with",
          total: (amount, records) => `${amount} across ${records}`, close: "Close", loading: "Loading Records", empty: "No Records with this counterparty.",
        },
      },
      flow: {
        map: { mapLabel: "Map of the money flow by county", legendTitle: "Flow", noData: "No money" },
        legend: {
          title: "Flow",
          bubbleSize: "Bubble area: money in the county",
          arcWidth: "Arc width: money between the two counties",
          arrow: { supplier: "Arrow: money flows in to the supplier's county", authority: "Arrow: money flows out of the authority's county" },
          homeCounty: "The entity's county",
          otherCounty: "Other counties with money",
        },
        caption: {
          direction: {
            supplier: (home) => `Where this supplier's money comes from: authorities across Romania, flowing in to ${home}.`,
            authority: (home) => `Where this authority's money goes: suppliers across Romania, flowing out of ${home}.`,
          },
          localOnly: {
            supplier: (home) => `All of the money placed in a county comes from ${home}: a single bubble and no arcs.`,
            authority: (home) => `All of the money placed in a county goes to suppliers in ${home}: a single bubble and no arcs.`,
          },
          noHome: {
            supplier: "This supplier's county is not known: bubbles only, no arcs.",
            authority: "This authority's county is not known: bubbles only, no arcs.",
          },
          offMap: "Money that no county holds is on the tiles beside the map.",
        },
        tooltip: {
          homeCounty: "The entity's county",
          direction: { supplier: (home) => `Money flows in to ${home}`, authority: (home) => `Money flows out of ${home}` },
        },
        empty: "No money flow for the current filter.",
      },
    },
    overview: {
      headline: {
        label: "Headline numbers", total: "Total awarded", counterparties: "Counterparties", topShare: (p) => `The largest holds ${p} of the total`,
        directPurchase: "Share via direct purchase", signals: "Signals",
      },
      signals: { heading: (_n, f) => `Signals (${f})`, empty: "No Signals for this entity." },
      counterparties: { heading: "Counterparties", records: (n, f) => `${f} ${plural(n, "Record", "Records")}`, more: (_n, f) => `and ${f} more`, empty: "No counterparties in this selection." },
      procedures: { heading: "Procedure types", records: (n, f) => `${f} ${plural(n, "Record", "Records")}`, empty: "No procedures in this selection." },
      consortia: {
        heading: "Consortia", convention: "Each member's equal share is a counting convention, not a figure SEAP publishes.",
        share: (amount) => `equal share ${amount}`, records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
      },
      frameworks: {
        heading: "Framework agreements",
        line: (n, f, ceilings, reported) => `${f} ${plural(n, "framework agreement", "framework agreements")}, ceilings ${ceilings}, reported subsequent contracts ${reported}`,
        none: "No framework agreements.", note: "Ceilings are not money awarded and are not in the total.",
      },
      largest: { heading: "Largest Records", note: "Counted Records only: suspect values and framework ceilings are not listed here.", empty: "No counted Records in this selection." },
      aliases: {
        heading: "Appears in SEAP as", intro: "Every name SEAP has published this entity under.",
        records: (n, f) => `${f} ${plural(n, "Record", "Records")}`, range: (a, b) => `first seen ${a}, last ${b}`, singleDay: (d) => `seen on ${d} only`,
      },
    },
    signalPages: { label: "Signal pages", previous: "Previous", next: "Next", page: (n) => `Page ${n}` },
    signalOrder: { label: "Order Signals", options: { DATE_DESC: "by date", VALUE_DESC: "by RON" } },
    publicEnterprise: {
      heading: "Public enterprise (AMEPIP)",
      basis: (cui, published) => `CUI ${cui} appears in AMEPIP's indicator tables of public enterprises under OUG 109/2011, published ${published}, for the financial years shown below. The match is by CUI.`,
      listedAs: "Listed as", registrationNumber: "Registration number", status: "ONRC status (as AMEPIP writes it)",
      years: (first, last) => (first === last ? `Financial year ${first}` : `Financial years ${first}–${last}`),
      fetched: (fetched, license) => `Fetched ${fetched} from data.gov.ro${license ? `, licence ${license}` : ""}`,
      link: "AMEPIP's indicator tables on data.gov.ro",
    },
    leadership: {
      heading: "Leadership list",
      caveat: "Each list is the one the leader was elected on, as registered at that election. A leader may have switched party since: this is not current party membership. Leaders are never linked to a person page.",
      inForce: "in force",
      period: (from, to) => `${from} – ${to}`,
      gapHeading: "Gaps (no Mandate, never guessed)",
      gaps: {
        HANDOVER_WINDOW: "Handover window: the previous mandates ended on 27 September 2024 and the new oaths followed (AEP publishes no per-UAT oath dates)",
        INTERIM: "Interim leader after a vacancy, until the partial election winner's oath",
        NO_RESULTS: "Mandate without results: AEP's minutes give no winner for this authority",
      },
      via: (authority, snapshot) => `Shown through ${authority}, principal credit holder, MF list snapshot ${snapshot}; funding relation, current tie.`,
      mandateBasis: {
        independent: "Independent (not a party)",
        alliance: (members) => `alliance; member parties: ${members.join(", ")}`,
        basis: {
          finalMinutes: (election) => `AEP final minutes, election of ${election}`,
          repeatRound: (election) => `AEP repeat round of ${election}`,
          partialMinutes: (election, through) => `AEP partial election of ${election}; partial counts from a one-off file (Code for Romania's backup), data through ${through}`,
        },
      },
    },
    financials: {
      heading: "Financial statements",
      intro: "Annual statements the company filed, as the Ministry of Finance (MF) publishes them on data.gov.ro, in RON. A blank cell in MF's file reads \"not reported\", never zero.",
      caption: "Annual financial statements by fiscal year, with the awards of the same year",
      columns: { year: "Fiscal year", turnover: "Turnover", profitOrLoss: "Profit or loss", debts: "Debts", equity: "Equity", employees: "Average employees", awarded: "Awarded that year", share: "Awards as a share of turnover", source: "Source" },
      row: {
        notReported: "not reported",
        revision: { firstRelease: "first release", revised: "revised", firstReleaseMayBeRevised: "first release, may be revised" },
        source: (file) => `MF, ${file}`,
        published: (published) => `Published ${published}`,
      },
      mayBeRevisedNote: "The newest year is a first release: MF re-publishes each year's statements a year later, with corrections, so read it with care.",
      contextNote: "Awards as a share of turnover is context, not a Signal, and is never added to awarded value. A contract's whole value counts in the year it was awarded, so a share can exceed 100% and is no share of revenue.",
    },
    recordsNoRole: { authority: "This entity has no Records as a contracting authority.", supplier: "This entity has no Records as a supplier." },
    recordsTab: {
      heading: "Records",
      table: { label: "Records of this entity", columns: { record: "Record", title: "Title", value: "Value" } },
      facets: {
        label: "Filter by facet",
        groups: {
          signal: "Signal", channel: "Channel", procedure: "Procedure", year: "Award year",
          counterpartyOfAuthority: "Supplier", counterpartyOfSupplier: "Contracting authority", badge: "Badges",
        },
        option: (label, count) => `${label} (${count})`,
        counterpartyKey: (key) => `Counterparty ${key}`,
        signals: ruleLabels(signalCard.rules),
      },
      empty: { text: "No Records match these filters.", clear: "Clear filters" },
      onlyMatching: { query: (q) => `only Records matching “${q}”`, filters: "only Records matching the search's filters" },
    },
  },
  signalCard,
  methodology: methodologyEn,
  /** The Coverage page (`/explore/coverage`) and the compact grid on the Coverage lens. */
  coverage: {
    eyebrow: "coverage",
    title: "Coverage",
    intro: "What the explorer holds of SEAP, quarter by quarter and record kind by record kind. Every gap, or doubt about a gap, is shown here with the reason or the rule behind it.",
    grid: {
      label: "Coverage by quarter and record kind",
      kindHeader: "Record kind",
      quarterName: (quarter) => `Q${quarter.slice(6)} ${quarter.slice(0, 4)}`,
      kinds: { DA: "Direct purchases", DAN: "Direct purchase award notifications", CONTRACT: "Contracts", AWARD_NOTICE: "Award notices" },
      states: {
        LOADED: "Loaded",
        KNOWN_GAP: "Known gap",
        POSSIBLY_INCOMPLETE: "Possibly incomplete",
        NOT_IN_SOURCE: "Not visible in the source",
        CRAWLED_PROVISIONAL: "Crawled, provisional",
        NOT_YET_LOADED: "Not yet loaded",
      },
      rules: {
        HAND_ENTERED: "Entered by hand in the gap file, with a written reason",
        COUNT_BELOW_NEIGHBOURS: "Fewer than 60% of the median row count of the surrounding quarters",
        NO_PRIOR_CALL_BEFORE_BACKFILL: "Contracts awarded without a prior call are in no bulk file; they stay not visible in the source until the e-licitatie backfill has run",
        AWAITING_BULK_FILE: "Awaiting bulk file: the quarter's bulk file is not published yet",
      },
      notYetLoaded: "Awaiting a bulk file for this quarter and record kind",
      noCell: "no information",
      records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
      crawlOnly: (n, f) => `${f} of them not in bulk data`,
      dataThrough: (date) => `data through ${date}`,
      inRange: "inside the date range",
      windowNote: "quarters follow the publication date · highlighted: the award date chip",
      legend: { title: "Cell states", range: "Inside the date range" },
      seePage: "See the Coverage page",
    },
    gridHeading: "Quarter by record kind",
    dataThrough: {
      heading: "Data through",
      intro: "How far each record kind reaches. The current quarter comes from the daily crawl, ahead of the bulk files.",
      none: "No data-through date yet.",
      copy: { through: "data through" },
    },
    crawlOnly: {
      heading: "Records not in bulk data",
      intro: "Records found by the crawl that the bulk file of their quarter does not contain. They are kept, and counted in the quarter's cell.",
      line: (kind, quarter, n, f) => `${kind}, ${quarter}: ${f} ${plural(n, "Record", "Records")} not in bulk data`,
    },
    knownGaps: {
      heading: "Known gaps",
      intro: "Every cell that is a known gap, possibly incomplete or not visible in the source, with its reason or its rule.",
      empty: "No known gaps in the data shown.",
      columns: { quarter: "Quarter", kind: "Record kind", state: "State", reason: "Reason or rule", records: "Records" },
    },
    rules: {
      heading: "How gaps are decided",
      intro: "The rules are fixed and published. Nothing is hidden: a quarter that looks wrong is flagged by a rule or entered by hand with its reason.",
      names: {
        HAND_ENTERED: "Known gap",
        COUNT_BELOW_NEIGHBOURS: "Possibly incomplete",
        NO_PRIOR_CALL_BEFORE_BACKFILL: "Not visible in the source",
        AWAITING_BULK_FILE: "Awaiting bulk file",
      },
      statesHeading: "What each state means",
      states: {
        LOADED: "The quarter's bulk file for this record kind is loaded. Once the e-licitatie backfill has run, the 2021-22 award notices are covered via e-licitatie and show as loaded too.",
        KNOWN_GAP: "A gap entered by hand, with a written reason.",
        POSSIBLY_INCOMPLETE: "A bulk file is loaded, but its row count is unusually low next to its neighbours.",
        NOT_IN_SOURCE: "The source does not show these Records at all, so far.",
        CRAWLED_PROVISIONAL: "No bulk file yet; what the crawl found is shown and may change when the bulk file lands.",
        NOT_YET_LOADED: "The bulk file for this quarter and record kind is not in the data yet.",
      },
      methodology: "How the numbers are counted",
    },
    perCounty: {
      heading: "per county: N of M",
      body: (source, since) => `On the map, each county reads “N of M public entities have ${source} records since ${since}, plus K other contracting authorities”. M comes from the Ministry of Finance list of public entities. An entity without records may simply have bought nothing, so the count is never shown as a percentage.`,
      lensLink: "open the Coverage lens on the map →",
    },
    snapshot: {
      heading: "Public entities list",
      line: (date) => `Ministry of Finance list of public entities: snapshot of ${date}`,
      notLoaded: "The Ministry of Finance list of public entities is not loaded yet.",
    },
    empty: "No quarter of SEAP is loaded yet.",
    loading: "Loading coverage…",
    error: "Coverage could not be loaded. Try again in a moment.",
  },
};
