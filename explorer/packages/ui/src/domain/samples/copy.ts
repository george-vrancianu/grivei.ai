// Sample copy for stories and tests, in both languages. The real strings come from the bilingual copy
// catalogue (#42), which satisfies the same `copy` prop types; nothing here is imported by app code.
import type { Locale } from "../../theme/index.ts";
import type { BadgeCopy } from "../atoms/BadgeChip/index.ts";
import type { EntityLinkCopy } from "../atoms/EntityLink/index.ts";
import type { DataThroughDateCopy } from "../atoms/DataThroughDate/index.ts";
import type { PartyNameCopy } from "../atoms/PartyName/index.ts";
import type { BaseMapCopy } from "../organisms/BaseMap/index.ts";
import type { EntityHeaderCopy } from "../organisms/EntityHeader/index.ts";
import type { EntityPageLayoutCopy } from "../templates/EntityPageLayout/index.ts";
import type { MainScreenLayoutCopy } from "../templates/MainScreenLayout/index.ts";
import type { TotalFigureCopy } from "../molecules/TotalFigure/index.ts";
import type { EntityResultRowCopy } from "../molecules/EntityResultRow/index.ts";
import type { GoToCardCopy } from "../molecules/GoToCard/index.ts";
import type { RecordResultRowCopy } from "../molecules/RecordResultRow/index.ts";
import type { ResultTabsCopy } from "../organisms/ResultTabs/index.ts";
import type { FullResultsCopy } from "../organisms/FullResults/index.ts";
import type { FilterChipsCopy } from "../molecules/FilterChips/index.ts";
import type { SearchBarCopy } from "../molecules/SearchBar/index.ts";
import type { FacetPanelCopy, RecordsTabCopy } from "../organisms/RecordsTab/index.ts";
import type { MoneyLensMapCopy } from "../organisms/MoneyLensMap/index.ts";
import type { CoverageLensMapCopy } from "../organisms/CoverageLensMap/index.ts";
import type { FlowLensMapCopy } from "../organisms/FlowLensMap/index.ts";
import type { EntityOverviewCopy } from "../organisms/EntityOverview/index.ts";
import type { RelationshipsTabCopy } from "../organisms/RelationshipsTab/index.ts";
import type { RecordDetailCopy } from "../organisms/RecordDetail/index.ts";
import type { ZoomedCountyMapCopy } from "../organisms/ZoomedCountyMap/index.ts";

const recordDetail: Record<Locale, Omit<RecordDetailCopy, "recordRow">> = {
  en: {
    heading: {
      kinds: { DA: "Direct purchase (DA)", DAN: "Direct purchase award notification (DAN)", CONTRACT: "Contract", AWARD_NOTICE: "Award notice" },
      facets: { code: "Code", date: "Date", kind: "Kind", procedure: "Procedure", contractType: "Contract type", cpv: "CPV" },
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
    badges: { heading: "Badges and what they mean" },
    signals: {
      heading: "Signals this Record belongs to",
      rules: { OVER_CAP: "Over cap", SPLITTING: "Splitting", FRAMEWORK_OVERRUN: "Framework overrun", NO_PUBLICATION: "No publication" },
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
  },
  ro: {
    heading: {
      kinds: { DA: "Achiziție directă (DA)", DAN: "Notificare de atribuire a cumpărării directe (DAN)", CONTRACT: "Contract", AWARD_NOTICE: "Anunț de atribuire" },
      facets: { code: "Cod", date: "Data", kind: "Fel înregistrare", procedure: "Procedură", contractType: "Tip contract", cpv: "CPV" },
    },
    value: {
      published: "Valoare publicată",
      counted: "Valoare luată în calcul",
      noValue: "Nicio valoare în SEAP",
      notCounted: {
        suspect: "Nu se ia în calcul: valoarea publicată încalcă o regulă de calcul",
        frameworkCeiling: "Nu se ia în calcul: plafonul unui acord-cadru nu este bani atribuiți; se iau în calcul contractele subsecvente",
        noValue: "Nu e nimic de luat în calcul: SEAP nu publică nicio valoare",
        other: "Nu se ia în calcul",
      },
    },
    parties: {
      authority: "Autoritate contractantă",
      winners: "Câștigători",
      share: (amount) => `parte egală ${amount}`,
      convention: "Partea egală a fiecărui membru este o convenție de calcul, nu o cifră publicată de SEAP. Valoarea de mai sus este valoarea întreagă a contractului.",
    },
    suspect: {
      heading: "Regula valorii suspecte",
      rules: {
        DIRECT_PURCHASE_10X_CAP: (t) => `Valoarea publicată este de cel puțin zece ori plafonul în vigoare pentru o achiziție directă de această dată și de acest tip${t ? ` (${t})` : ""}.`,
        CONTRACT_100X_ESTIMATE: (t) => `Valoarea publicată este de cel puțin 1 miliard RON și de cel puțin o sută de ori valoarea estimată din e-licitatie${t ? ` (${t})` : ""}.`,
        CONTRACT_OVER_50BN: () => "Valoarea publicată depășește 50 de miliarde RON, iar e-licitatie nu indică o valoare estimată.",
      },
      leftOut: "Valoarea este afișată așa cum a fost publicată și este lăsată în afara totalurilor.",
      methodology: "Cum se calculează valorile",
    },
    framework: {
      heading: "Acord-cadru",
      line: (ceiling, reported, percent) => `Plafon ${ceiling}; contracte subsecvente raportate până acum ${reported} (${percent})`,
      lineBlankCeiling: (reported) => `Plafon nepublicat; contracte subsecvente raportate până acum ${reported}`,
      agreement: "Atribuit în baza acordului-cadru",
      subsequentHeading: "Contracte subsecvente",
    },
    badges: { heading: "Insigne și semnificația lor" },
    signals: {
      heading: "Semnalele din care face parte această înregistrare",
      rules: { OVER_CAP: "Peste plafon", SPLITTING: "Fracționare", FRAMEWORK_OVERRUN: "Depășirea acordului-cadru", NO_PUBLICATION: "Fără publicare" },
      date: (when) => `din ${when}`,
      records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
    },
    provenance: {
      heading: "Proveniență",
      source: "Sursă",
      via: "Fișier sau anunț",
      kind: "Cum l-am obținut",
      kinds: { BULK: "Fișier public în masă", CRAWL: "Citit de pe site-ul Sursei", API: "Citit din API-ul Sursei" },
      fetchedAt: "Preluat la",
      checkIn: (source) => `Verifică în ${source}`,
      noPublicPage: (source) => `${source} nu are încă o pagină publică stabilă pentru această înregistrare.`,
    },
  },
};

const badges: Record<Locale, BadgeCopy> = {
  en: {
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
  },
  ro: {
    FRAMEWORK_CEILING: { label: "Plafon acord-cadru", explanation: "Valoarea maximă convenită într-un acord-cadru, nu bani atribuiți. Nu se adună niciodată la totaluri." },
    SUBSEQUENT_CONTRACT: { label: "Contract subsecvent", explanation: "Atribuit în baza unui acord-cadru. Se numără aici; plafonul acordului-cadru nu." },
    CONSORTIUM_SHARE: { label: "Parte din asociere", explanation: "Mai mulți furnizori au câștigat împreună. Cifrele unui furnizor numără o parte egală din valoarea contractului; o înregistrare arată valoarea integrală." },
    SUSPECT_VALUE: { label: "Valoare suspectă", explanation: "Valoarea publicată încalcă o regulă de calcul (de exemplu, de mult peste estimare). Este afișată și căutabilă, dar exclusă din totaluri." },
    NO_VALUE: { label: "Fără valoare", explanation: "SEAP nu publică nicio valoare pentru această înregistrare. Se numără, dar nu adaugă nimic la totaluri." },
    CUI_MISMATCH: { label: "CUI neconcordant", explanation: "CUI-ul publicat aici nu corespunde celui confirmat de ANAF pentru această denumire." },
    NAME_DIFFERS_FROM_ANAF: { label: "Denumire diferită de ANAF", explanation: "Denumirea publicată pe această înregistrare diferă de cea înregistrată la ANAF." },
    IDENTITY_CURATED: { label: "Identitate verificată manual", explanation: "O persoană a verificat și corectat cine este această parte; potrivirea nu a fost automată." },
    CRAWLED_PROVISIONAL: { label: "Provizoriu", explanation: "Citită din SEAP în trimestrul curent, în așteptarea datelor oficiale în masă; se poate modifica." },
    CRAWL_ONLY: { label: "Absent din datele în masă", explanation: "Găsită în SEAP, dar nepotrivită niciodată în datele oficiale în masă." },
  },
};

const entityLink: Record<Locale, EntityLinkCopy> = {
  en: {
    nameOnly: { label: "name only", explanation: "Identified by its published name alone (no CUI). Figures may mix up namesakes." },
    identityCurated: { label: "curated", explanation: "A person reviewed and fixed this entity's identity." },
  },
  ro: {
    nameOnly: { label: "doar denumire", explanation: "Identificat doar după denumirea publicată (fără CUI). Cifrele pot amesteca entități omonime." },
    identityCurated: { label: "verificat manual", explanation: "O persoană a verificat și corectat identitatea acestei entități." },
  },
};

const entityHeader: Record<Locale, EntityHeaderCopy> = {
  en: {
    identity: {
      cui: "CUI",
      foreignVatId: "Foreign VAT ID",
      nameOnly: { label: "Identified by name only", explanation: "No CUI that ANAF knows for this supplier, so it is identified by its foreign VAT id or its published name. Figures may mix up namesakes." },
      identityCurated: { label: "Identity curated", explanation: "A person reviewed and fixed this entity's identity." },
    },
    anafStatus: { label: "ANAF status", inactive: (status) => `ANAF lists this entity as ${status}, not active.` },
    placement: {
      label: "Location",
      national: "National",
      unplaced: { label: "Unplaced", explanation: "Neither ANAF nor SEAP places this entity in a county." },
      placedBy: (source) => `placed by ${source}`,
    },
    source: { from: (source, fetched) => `Name and status from ${source}, fetched ${fetched}` },
    roles: { label: "View as", authority: "As authority", supplier: "As supplier" },
  },
  ro: {
    identity: {
      cui: "CUI",
      foreignVatId: "Cod TVA străin",
      nameOnly: { label: "Identificat doar după denumire", explanation: "Pentru acest furnizor nu există un CUI cunoscut de ANAF, deci este identificat după codul TVA străin sau după denumirea publicată. Cifrele pot amesteca entități omonime." },
      identityCurated: { label: "Identitate verificată manual", explanation: "O persoană a verificat și corectat identitatea acestei entități." },
    },
    anafStatus: { label: "Stare ANAF", inactive: (status) => `ANAF indică această entitate ca ${status}, nu activă.` },
    placement: {
      label: "Locație",
      national: "Național",
      unplaced: { label: "Neplasată", explanation: "Nici ANAF, nici SEAP nu plasează această entitate într-un județ." },
      placedBy: (source) => `plasată de ${source}`,
    },
    source: { from: (source, fetched) => `Denumire și stare de la ${source}, preluate la ${fetched}` },
    roles: { label: "Vezi ca", authority: "Ca autoritate", supplier: "Ca furnizor" },
  },
};

const entityPageLayout: Record<Locale, EntityPageLayoutCopy> = {
  en: { label: "Sections of this page", tabs: { overview: "Overview", records: "Records", relationships: "Relationships" } },
  ro: { label: "Secțiunile paginii", tabs: { overview: "Prezentare generală", records: "Înregistrări", relationships: "Relații" } },
};

const mainScreenLayout: Record<Locale, MainScreenLayoutCopy> = {
  en: {
    lens: { label: "Map lens", money: "Money", coverage: "Coverage" },
    regions: { search: "Search", map: "Map", results: "Results" },
  },
  ro: {
    lens: { label: "Lentila hărții", money: "Bani", coverage: "Acoperire" },
    regions: { search: "Căutare", map: "Harta", results: "Rezultate" },
  },
};

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);

/** Romanian count noun: "1 înregistrare", "5 înregistrări", "20 de înregistrări" (the "de" rule for 0 and 20+, except 1 to 19 mod 100). */
const roCount = (n: number, f: string, one: string, many: string) =>
  n === 1 ? `${f} ${one}` : n === 0 || (n % 100 >= 1 && n % 100 <= 19) ? `${f} ${many}` : `${f} de ${many}`;

const entityRow = (locale: Locale): EntityResultRowCopy =>
  locale === "ro"
    ? {
        matched: "potrivit",
        records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
        national: "național",
        noCounty: "județ necunoscut",
        entityLink: entityLink.ro,
      }
    : {
        matched: "matched",
        records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
        national: "national",
        noCounty: "county unknown",
        entityLink: entityLink.en,
      };

const recordRow = (locale: Locale): RecordResultRowCopy =>
  locale === "ro"
    ? {
        noValue: "fără valoare",
        consortium: {
          label: "asociere",
          explanation: "Se afișează valoarea integrală a contractului. Fiecare membru al asocierii are o parte egală, după convenție, nu o sumă publicată.",
        },
        authority: "Autoritate",
        winners: "Câștigători",
        matchedIn: (field) => `Potrivit în ${field}`,
        fields: {
          TITLE: "titlu", AUTHORITY: "autoritate", SUPPLIER: "furnizor", CPV_CODE: "cod CPV", CPV_DESCRIPTION: "descriere CPV",
          PUBLIC_CODE: "cod public", CUI: "CUI",
        },
        badges: badges.ro,
        party: { naturalPerson: "Persoană fizică", entityLink: entityLink.ro },
      }
    : {
        noValue: "no value",
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
        badges: badges.en,
        party: { naturalPerson: "Persoană fizică", entityLink: entityLink.en },
      };

const goTo = (locale: Locale): GoToCardCopy =>
  locale === "ro"
    ? { heading: "Mergi la pagină", open: "Deschide pagina", cui: "CUI", nameOnly: "identificat doar după denumire" }
    : { heading: "Go to page", open: "Open the page", cui: "CUI", nameOnly: "identified by name only" };

const resultTabs = (locale: Locale): ResultTabsCopy =>
  locale === "ro"
    ? {
        label: "Rezultate",
        tabs: { authorities: "Autorități", suppliers: "Furnizori", records: "Înregistrări" },
        empty: { authorities: "Nicio autoritate.", suppliers: "Niciun furnizor.", records: "Nicio înregistrare." },
        showAll: (_n, f) => `Arată toate cele ${f}`,
        goTo: goTo(locale),
        entityRow: entityRow(locale),
        recordRow: recordRow(locale),
      }
    : {
        label: "Results",
        tabs: { authorities: "Authorities", suppliers: "Suppliers", records: "Records" },
        empty: { authorities: "No authorities.", suppliers: "No suppliers.", records: "No Records." },
        showAll: (_n, f) => `Show all ${f}`,
        goTo: goTo(locale),
        entityRow: entityRow(locale),
        recordRow: recordRow(locale),
      };

const fullResults = (locale: Locale): FullResultsCopy =>
  locale === "ro"
    ? {
        heading: { authorities: "Autorități", suppliers: "Furnizori", records: "Înregistrări" },
        showing: (from, to, total) => `Se afișează ${from}–${to} din ${total}`,
        empty: { authorities: "Nicio autoritate.", suppliers: "Niciun furnizor.", records: "Nicio înregistrare." },
        outOfRange: (pages, formatted) => `Această pagină este după ultima: ${pages === 1 ? "există doar 1 pagină" : `sunt doar ${formatted}${pages % 100 >= 1 && pages % 100 <= 19 ? "" : " de"} pagini`}.`,
        noRowsHere: "Nu sunt rezultate pe această pagină: numărul de mai sus este estimat.",
        firstPage: "Mergi la pagina 1",
        back: "Înapoi la rezultate",
        pagination: { label: "Paginile rezultatelor", previous: "Anterioara", next: "Următoarea", page: (n) => `Pagina ${n}` },
        entityRow: entityRow(locale),
        recordRow: recordRow(locale),
      }
    : {
        heading: { authorities: "Authorities", suppliers: "Suppliers", records: "Records" },
        showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
        empty: { authorities: "No authorities.", suppliers: "No suppliers.", records: "No Records." },
        outOfRange: (pages, formatted) => `This page is past the end: there ${pages === 1 ? "is only 1 page" : `are only ${formatted} pages`}.`,
        noRowsHere: "There are no results on this page: the count above is an estimate.",
        firstPage: "Go to page 1",
        back: "Back to results",
        pagination: { label: "Result pages", previous: "Previous", next: "Next", page: (n) => `Page ${n}` },
        entityRow: entityRow(locale),
        recordRow: recordRow(locale),
      };

const filterChips = (locale: Locale): FilterChipsCopy => {
  const BADGES = badges[locale];
  return locale === "ro"
    ? {
      label: "Filtre",
      year: { group: "Anul atribuirii", from: "Din anul", to: "Până în anul", any: "Oricare" },
      channel: { group: "Canal", options: { DIRECT_PURCHASE: "Achiziție directă", CONTRACT: "Contract" } },
      valueBucket: {
        group: "Valoare",
        options: {
          UP_TO_10K: "Până la 10.000 RON",
          UP_TO_135K: "10.000–135.060 RON",
          UP_TO_270K: "135.060–270.120 RON",
          UP_TO_900K: "270.120–900.400 RON",
          UP_TO_9M: "900.400–9.004.000 RON",
          UP_TO_1B: "9.004.000 RON–1 mld. RON",
          OVER_1B: "Peste 1 mld. RON",
        },
      },
      signals: { group: "Semnale", has: "Are Semnale", without: "Fără Semnale" },
      procedure: { group: "Procedură", empty: "Nu există proceduri de ales." },
      badges: { group: "Insigne ale înregistrărilor", badges: BADGES },
      active: {
        group: "Filtre active",
        none: "Niciun filtru activ.",
        from: (when) => `Din ${when}`,
        to: (when) => `Până în ${when}`,
        remove: (chip) => `Elimină ${chip}`,
        clearAll: "Șterge tot",
      },
    }
    : {
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
      badges: { group: "Record badges", badges: BADGES },
      active: {
        group: "Active filters",
        none: "No filters on.",
        from: (when) => `From ${when}`,
        to: (when) => `Until ${when}`,
        remove: (chip) => `Remove ${chip}`,
        clearAll: "Clear all",
      },
    };
};

const recordsFacets = (locale: Locale): FacetPanelCopy =>
  locale === "ro"
    ? {
        label: "Filtre pe fațete",
        groups: {
          signal: "Semnal", channel: "Canal", procedure: "Procedură", year: "Anul atribuirii",
          counterpartyOfAuthority: "Furnizor", counterpartyOfSupplier: "Autoritate contractantă", badge: "Insigne",
        },
        option: (label, count) => `${label} (${count})`,
        counterpartyKey: (key) => `Contraparte ${key}`,
        signals: { OVER_CAP: "Peste plafon", SPLITTING: "Fracționare", FRAMEWORK_OVERRUN: "Depășirea acordului-cadru", NO_PUBLICATION: "Fără publicare" },
        channels: { DIRECT_PURCHASE: "Achiziție directă", CONTRACT: "Contract" },
        badges: badges.ro,
      }
    : {
        label: "Filter by facet",
        groups: {
          signal: "Signal", channel: "Channel", procedure: "Procedure", year: "Award year",
          counterpartyOfAuthority: "Supplier", counterpartyOfSupplier: "Contracting authority", badge: "Badges",
        },
        option: (label, count) => `${label} (${count})`,
        counterpartyKey: (key) => `Counterparty ${key}`,
        signals: { OVER_CAP: "Over cap", SPLITTING: "Splitting", FRAMEWORK_OVERRUN: "Framework overrun", NO_PUBLICATION: "No publication" },
        channels: { DIRECT_PURCHASE: "Direct purchase", CONTRACT: "Contract" },
        badges: badges.en,
      };

const recordsTab = (locale: Locale): RecordsTabCopy => ({
  heading: locale === "ro" ? "Înregistrări" : "Records",
  facets: recordsFacets(locale),
  empty: locale === "ro" ? { text: "Nicio înregistrare nu se potrivește cu aceste filtre.", clear: "Șterge filtrele" } : { text: "No Records match these filters.", clear: "Clear filters" },
  total: sampleCopy.total(locale),
  recordRow: recordRow(locale),
  pagination: fullResults(locale).pagination,
});

const relationshipsTab = (locale: Locale): RelationshipsTabCopy => {
  const base = { entityLink: entityLink[locale], recordRow: recordRow(locale), pagination: fullResults(locale).pagination };
  return locale === "ro"
    ? {
        ...base,
        heading: "Relații",
        recordCount: (_n, formatted) => `${formatted} înregistrări`,
        channels: { contract: "contracte", directPurchase: "achiziții directe" },
        graph: {
          label: "Graful principalelor contrapărți",
          naturalPerson: "Persoană fizică",
          node: (p) =>
            `${p.name}, ${p.amount}, ${p.records}; ${p.contract} prin contracte, ${p.directPurchase} prin achiziții directe` +
            `${p.wonTogether ? "; câștigat împreună" : ""}${p.hasSignals ? "; are Semnale" : ""}${p.selected ? "; ales" : ""}`,
          more: (_n, formatted) => `încă ${formatted} contrapărți`,
          empty: "Nicio contraparte pentru filtrele alese.",
          consortiumNote:
            "Sumele unui consorțiu sunt împărțite în mod egal între membri, prin convenție; valoarea întreagă a înregistrării apare pe pagina ei.",
        },
        legend: {
          title: "Legendă", centre: "Entitatea acestei pagini", size: "Aria cercului: banii cu contrapartea", contract: "Linie albastră: mai ales contracte",
          directPurchase: "Linie verde: mai ales achiziții directe", wonTogether: "Linie întreruptă: au câștigat împreună", signals: "Inel portocaliu: are Semnale",
        },
        timeline: {
          heading: "Pe luni", label: "Banii pe luni", overall: "Toate contrapărțile", picked: (name) => name, empty: "Nicio lună în filtrele alese.",
          table: { caption: "Banii pe luni", month: "Luna", amount: "Total", picked: (name) => name },
        },
        panel: {
          label: "Înregistrările contrapărții alese", hint: "Alege o contraparte din graf ca să vezi toate înregistrările cu ea.", heading: "Înregistrări cu",
          total: (amount, records) => `${amount} în ${records}`, close: "Închide", loading: "Se încarcă înregistrările", empty: "Nicio înregistrare cu această contraparte.",
        },
      }
    : {
        ...base,
        heading: "Relationships",
        recordCount: (n, formatted) => `${formatted} ${n === 1 ? "Record" : "Records"}`,
        channels: { contract: "contracts", directPurchase: "direct purchases" },
        graph: {
          label: "Graph of the top counterparties",
          naturalPerson: "Persoană fizică",
          node: (p) =>
            `${p.name}, ${p.amount}, ${p.records}; ${p.contract} via contracts, ${p.directPurchase} via direct purchases` +
            `${p.wonTogether ? "; won together" : ""}${p.hasSignals ? "; has Signals" : ""}${p.selected ? "; picked" : ""}`,
          more: (n, formatted) => `${formatted} more ${n === 1 ? "counterparty" : "counterparties"}`,
          empty: "No counterparties for the chosen filters.",
          consortiumNote:
            "A consortium's money is split equally among its members, by convention; a Record's full value is on its own page.",
        },
        legend: {
          title: "Legend", centre: "The entity of this page", size: "Circle area: money with the counterparty", contract: "Blue line: mostly contracts",
          directPurchase: "Green line: mostly direct purchases", wonTogether: "Dashed line: won together", signals: "Orange ring: has Signals",
        },
        timeline: {
          heading: "By month", label: "Money by month", overall: "All counterparties", picked: (name) => name, empty: "No months for the chosen filters.",
          table: { caption: "Money by month", month: "Month", amount: "Total", picked: (name) => name },
        },
        panel: {
          label: "Records with the picked counterparty", hint: "Pick a counterparty in the graph to list every Record with it.", heading: "Records with",
          total: (amount, records) => `${amount} across ${records}`, close: "Close", loading: "Loading Records", empty: "No Records with this counterparty.",
        },
      };
};

const searchBar: Record<Locale, SearchBarCopy> = {
  en: { label: "Search", placeholder: "Search in Romanian, e.g. deszăpezire", clear: "Clear search", loading: "Searching", minLengthHint: "Type at least 2 characters to search." },
  ro: { label: "Căutare", placeholder: "Caută în română, de ex. deszăpezire", clear: "Șterge căutarea", loading: "Se caută", minLengthHint: "Scrie cel puțin 2 caractere pentru a căuta." },
};

const entityOverview = (locale: Locale): EntityOverviewCopy => {
  const party: PartyNameCopy = { naturalPerson: "Persoană fizică", entityLink: entityLink[locale] };
  return locale === "ro"
    ? {
        headline: {
          label: "Cifre principale", total: "Total atribuit", counterparties: "Contraparți", topShare: (p) => `Cea mai mare deține ${p} din total`,
          directPurchase: "Pondere prin achiziție directă", signals: "Semnale", totalFigure: sampleCopy.total(locale),
        },
        signals: { heading: (_n, f) => `Semnale (${f})`, empty: "Niciun semnal pentru această entitate." },
        counterparties: {
          heading: "Contraparți", records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"), more: (_n, f) => `și încă ${f}`,
          empty: "Nicio contraparte în această selecție.", party,
        },
        procedures: { heading: "Tipuri de procedură", records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"), empty: "Nicio procedură în această selecție." },
        consortia: {
          heading: "Asocieri", convention: "Partea egală a fiecărui membru este o convenție de calcul, nu o cifră publicată de SEAP.",
          share: (amount) => `parte egală ${amount}`, records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"), party,
        },
        frameworks: {
          heading: "Acorduri-cadru",
          line: (n, f, ceilings, reported) => `${roCount(n, f, "acord-cadru", "acorduri-cadru")}, plafoane ${ceilings}, contracte subsecvente raportate ${reported}`,
          none: "Niciun acord-cadru.", note: "Plafoanele nu sunt bani atribuiți și nu intră în total.",
        },
        largest: {
          heading: "Cele mai mari înregistrări", note: "Doar înregistrările numărate: valorile suspecte și plafoanele acordurilor-cadru nu apar aici.",
          empty: "Nicio înregistrare numărată în această selecție.", recordRow: recordRow(locale),
        },
        aliases: {
          heading: "Apare în SEAP ca", intro: "Fiecare denumire sub care SEAP a publicat această entitate.",
          records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"), range: (a, b) => `prima oară ${a}, ultima oară ${b}`, singleDay: (d) => `doar la ${d}`, badges: badges.ro,
        },
      }
    : {
        headline: {
          label: "Headline numbers", total: "Total awarded", counterparties: "Counterparties", topShare: (p) => `The largest holds ${p} of the total`,
          directPurchase: "Share via direct purchase", signals: "Signals", totalFigure: sampleCopy.total(locale),
        },
        signals: { heading: (_n, f) => `Signals (${f})`, empty: "No Signals for this entity." },
        counterparties: {
          heading: "Counterparties", records: (n, f) => `${f} ${plural(n, "Record", "Records")}`, more: (_n, f) => `and ${f} more`,
          empty: "No counterparties in this selection.", party,
        },
        procedures: { heading: "Procedure types", records: (n, f) => `${f} ${plural(n, "Record", "Records")}`, empty: "No procedures in this selection." },
        consortia: {
          heading: "Consortia", convention: "Each member's equal share is a counting convention, not a figure SEAP publishes.",
          share: (amount) => `equal share ${amount}`, records: (n, f) => `${f} ${plural(n, "Record", "Records")}`, party,
        },
        frameworks: {
          heading: "Framework agreements",
          line: (n, f, ceilings, reported) => `${f} ${plural(n, "framework agreement", "framework agreements")}, ceilings ${ceilings}, reported subsequent contracts ${reported}`,
          none: "No framework agreements.", note: "Ceilings are not money awarded and are not in the total.",
        },
        largest: {
          heading: "Largest Records", note: "Counted Records only: suspect values and framework ceilings are not listed here.",
          empty: "No counted Records in this selection.", recordRow: recordRow(locale),
        },
        aliases: {
          heading: "Appears in SEAP as", intro: "Every name SEAP has published this entity under.",
          records: (n, f) => `${f} ${plural(n, "Record", "Records")}`, range: (a, b) => `first seen ${a}, last ${b}`, singleDay: (d) => `seen on ${d} only`, badges: badges.en,
        },
      };
};

export const sampleCopy = {
  entityOverview,
  searchBar: (locale: Locale): SearchBarCopy => searchBar[locale],
  recordsFacets,
  recordsTab,
  relationshipsTab,
  entityRow,
  recordRow,
  goTo,
  resultTabs,
  fullResults,
  filterChips,
  badges: (locale: Locale): BadgeCopy => badges[locale],
  entityLink: (locale: Locale): EntityLinkCopy => entityLink[locale],
  party: (locale: Locale): PartyNameCopy => ({ naturalPerson: "Persoană fizică", entityLink: entityLink[locale] }),
  dataThrough: (locale: Locale): DataThroughDateCopy => ({ through: locale === "ro" ? "date până la" : "data through" }),
  entityHeader: (locale: Locale): EntityHeaderCopy => entityHeader[locale],
  recordDetail: (locale: Locale): RecordDetailCopy => ({ ...recordDetail[locale], recordRow: recordRow(locale) }),
  entityPageLayout: (locale: Locale): EntityPageLayoutCopy => entityPageLayout[locale],
  mainScreenLayout: (locale: Locale): MainScreenLayoutCopy => mainScreenLayout[locale],
  baseMap: (locale: Locale): BaseMapCopy =>
    locale === "ro"
      ? {
          mapLabel: "Harta județelor",
          legendTitle: "Valoare contractată",
          noData: "Fără date",
          areaLabel: (name, value) => `${name}: ${value}`,
          atMost: (value) => `până la ${value}`,
        }
      : {
          mapLabel: "Map of counties",
          legendTitle: "Contracted value",
          noData: "No data",
          areaLabel: (name, value) => `${name}: ${value}`,
          atMost: (value) => `up to ${value}`,
        },
  moneyLensMap: (locale: Locale): MoneyLensMapCopy => {
    const map = sampleCopy.baseMap(locale);
    return locale === "ro"
      ? {
          map: { ...map, legendTitle: "Valoare atribuită" },
          side: { label: "Arată județele după", authority: "Autorități", supplier: "Furnizori" },
          tiles: {
            heading: "În afara hărții",
            national: "Național",
            unplaced: "Autorități neplasate",
            unknownSupplierCounty: "Județ necunoscut al furnizorului",
            unplacedAuthorities: (n, f) => roCount(n, f, "autoritate fără județ", "autorități fără județ"),
            records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
            suspectLeftOut: (n, f) => roCount(n, f, "valoare suspectă exclusă", "valori suspecte excluse"),
          },
        }
      : {
          map: { ...map, legendTitle: "Awarded value" },
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
        };
  },
  coverageLensMap: (locale: Locale): CoverageLensMapCopy => {
    const map = sampleCopy.baseMap(locale);
    const tiles = sampleCopy.moneyLensMap(locale).tiles;
    const { heading, national, unplaced, unplacedAuthorities, records, suspectLeftOut } = tiles;
    return locale === "ro"
      ? {
          map: { ...map, mapLabel: "Harta acoperirii pe județe", legendTitle: "Acoperire" },
          status: {
            HARVESTED: "Colectat",
            HARVESTED_WITH_KNOWN_GAPS: "Colectat, cu lacune cunoscute",
            PARTIAL: "Parțial",
            NOT_HARVESTED: "Necolectat",
          },
          noStatus: "Fără stare de acoperire",
          marks: {
            title: "Un semn pentru fiecare Sursă",
            harvested: (source) => `${source}: culoarea arată starea județului`,
            notHarvested: (source) => `${source}: necolectată`,
            plannedLegend: (sources) => `Necolectate încă: ${sources}`,
          },
          tooltip: {
            summary: (p) => {
              const entities = `${p.withRecordsText} din ${roCount(p.publicEntities, p.publicEntitiesText, "entitate publică", "entități publice")} ${p.withRecords === 1 ? "are" : "au"} înregistrări ${p.source} începând cu ${p.since}`;
              const k = p.otherAuthorities;
              const others = roCount(k, p.otherAuthoritiesText, "altă autoritate contractantă", "alte autorități contractante");
              return k > 0 ? `${entities}, plus ${others}` : entities;
            },
            boughtNothingNote: "O entitate fără înregistrări poate pur și simplu să nu fi cumpărat nimic.",
          },
          tiles: { heading, national, unplaced, unplacedAuthorities, records, suspectLeftOut },
        }
      : {
          map: { ...map, mapLabel: "Coverage map by county", legendTitle: "Coverage" },
          status: {
            HARVESTED: "Harvested",
            HARVESTED_WITH_KNOWN_GAPS: "Harvested, with known gaps",
            PARTIAL: "Partial",
            NOT_HARVESTED: "Not harvested",
          },
          noStatus: "No coverage status",
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
          tiles: { heading, national, unplaced, unplacedAuthorities, records, suspectLeftOut },
        };
  },
  flowLensMap: (locale: Locale): FlowLensMapCopy => {
    const map = sampleCopy.baseMap(locale);
    const { tiles } = sampleCopy.moneyLensMap(locale);
    return locale === "ro"
      ? {
          map: { ...map, mapLabel: "Harta fluxului de bani pe județe", legendTitle: "Flux", noData: "Fără bani" },
          tiles,
          legend: {
            title: "Flux",
            bubbleSize: "Aria cercului: banii din județ",
            arcWidth: "Grosimea arcului: banii dintre cele două județe",
            arrow: { supplier: "Săgeată: banii intră în județul furnizorului", authority: "Săgeată: banii pleacă din județul autorității" },
            homeCounty: "Județul entității",
            otherCounty: "Alte județe cu bani",
          },
          caption: {
            direction: {
              supplier: (home) => `De unde vin banii furnizorului: autorități din toată țara, către ${home}.`,
              authority: (home) => `Încotro merg banii autorității: furnizori din toată țara, din ${home}.`,
            },
            localOnly: {
              supplier: (home) => `Toți banii plasați într-un județ vin din ${home}: un singur cerc, fără arce.`,
              authority: (home) => `Toți banii plasați într-un județ merg către furnizori din ${home}: un singur cerc, fără arce.`,
            },
            noHome: {
              supplier: "Județul furnizorului nu este cunoscut: doar cercuri, fără arce.",
              authority: "Județul autorității nu este cunoscut: doar cercuri, fără arce.",
            },
            offMap: "Banii care nu aparțin unui județ sunt în casetele de lângă hartă.",
          },
          tooltip: {
            homeCounty: "Județul entității",
            direction: { supplier: (home) => `Banii intră în ${home}`, authority: (home) => `Banii pleacă din ${home}` },
          },
          empty: "Niciun flux de bani pentru filtrul curent.",
        }
      : {
          map: { ...map, mapLabel: "Map of the money flow by county", legendTitle: "Flow", noData: "No money" },
          tiles,
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
        };
  },
  zoomedCountyMap: (locale: Locale): ZoomedCountyMapCopy => {
    const map = sampleCopy.baseMap(locale);
    return locale === "ro"
      ? {
          map: { ...map, mapLabel: "Harta UAT-urilor județului", legendTitle: "Valoare atribuită", noData: "Nicio autoritate nu a cumpărat" },
          figures: {
            records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
            suspectLeftOut: (n, f) => roCount(n, f, "valoare suspectă exclusă", "valori suspecte excluse"),
          },
          authorities: (n, f) => roCount(n, f, "autoritate", "autorități"),
          circleKey: "Mărimea cercului: numărul de autorități",
          unknownUat: "Județ cunoscut, UAT necunoscut",
        }
      : {
          map: { ...map, mapLabel: "Map of the county's UATs", legendTitle: "Awarded value", noData: "No authority bought anything" },
          figures: {
            records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
            suspectLeftOut: (n, f) => `${f} ${plural(n, "suspect value left out", "suspect values left out")}`,
          },
          authorities: (n, f) => `${f} ${plural(n, "authority", "authorities")}`,
          circleKey: "Circle size: number of authorities",
          unknownUat: "County known, UAT unknown",
        };
  },
  total: (locale: Locale): TotalFigureCopy =>
    locale === "ro"
      ? {
          records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
          suspectLeftOut: (n, f) => roCount(n, f, "valoare suspectă exclusă", "valori suspecte excluse"),
          noValue: (n, f) => `${f} ${plural(n, "înregistrare fără valoare", "înregistrări fără valoare")}`,
          frameworkCeilings: (amount) => `Plafoane de acorduri-cadru nenumărate: ${amount}`,
          methodology: "Cum se calculează acest total",
        }
      : {
          records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
          suspectLeftOut: (n, f) => `${f} ${plural(n, "suspect value left out", "suspect values left out")}`,
          noValue: (n, f) => `${f} ${plural(n, "Record with no value", "Records with no value")}`,
          frameworkCeilings: (amount) => `Framework ceilings not counted: ${amount}`,
          methodology: "How this total is counted",
        },
};

/** The workbench's current language as a `Locale`, for components that format with it. */
export const localeOf = (global: unknown): Locale => (global === "ro" ? "ro" : "en");
