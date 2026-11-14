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
import type { SourceEyebrowCopy } from "../molecules/SourceEyebrow/index.ts";
import type { GoToCardCopy } from "../molecules/GoToCard/index.ts";
import type { RecordResultRowCopy } from "../molecules/RecordResultRow/index.ts";
import type { CiteLineCopy } from "../molecules/CiteLine/index.ts";
import type { CopyLinkButtonCopy } from "../molecules/CopyLinkButton/index.ts";
import type { OrderSelectCopy } from "../molecules/OrderSelect/index.ts";
import type { ResultTabsCopy } from "../organisms/ResultTabs/index.ts";
import type { FullResultsCopy } from "../organisms/FullResults/index.ts";
import type { FilterChipsCopy } from "../molecules/FilterChips/index.ts";
import type { SearchBarCopy } from "../molecules/SearchBar/index.ts";
import type { FacetPanelCopy, RecordsTabCopy } from "../organisms/RecordsTab/index.ts";
import type { MoneyLensMapCopy } from "../organisms/MoneyLensMap/index.ts";
import type { CoverageGridCopy } from "../organisms/CoverageGrid/index.ts";
import type { CoveragePageLayoutCopy } from "../templates/CoveragePageLayout/index.ts";
import type { CoverageLensMapCopy } from "../organisms/CoverageLensMap/index.ts";
import type { FlowLensMapCopy } from "../organisms/FlowLensMap/index.ts";
import type { EntityOverviewCopy } from "../organisms/EntityOverview/index.ts";
import type { OnrcSectionCopy } from "../organisms/OnrcSection/index.ts";
import type { PeopleSectionCopy } from "../organisms/PeopleSection/index.ts";
import type { PersonDetailCopy } from "../organisms/PersonDetail/index.ts";
import type { RelationshipsTabCopy } from "../organisms/RelationshipsTab/index.ts";
import { partyCopy } from "./leadership.ts";
import type { RecordDetailCopy } from "../organisms/RecordDetail/index.ts";
import type { SignalCardCopy } from "../organisms/SignalCard/index.ts";
import type { SignalBadgeCopy } from "../molecules/SignalBadge/index.ts";
import type { SignalCountChipCopy } from "../molecules/SignalCountChip/index.ts";
import type { SignalOrderToggleCopy } from "../molecules/SignalOrderToggle/index.ts";
import type { ZoomedCountyMapCopy } from "../organisms/ZoomedCountyMap/index.ts";

const copyLink: Record<Locale, CopyLinkButtonCopy> = {
  en: { label: "Copy link", copied: "Link copied", failed: "Could not copy the link" },
  ro: { label: "Copiază linkul", copied: "Link copiat", failed: "Linkul nu a putut fi copiat" },
};
const citeThisView = (locale: Locale): CiteLineCopy => ({ label: locale === "ro" ? "Citează această vizualizare" : "Cite this view", copyLink: copyLink[locale] });
const citeThisRecord = (locale: Locale): CiteLineCopy => ({ label: locale === "ro" ? "Adresa acestei înregistrări" : "Address of this Record", copyLink: copyLink[locale] });
const orderSelect = (locale: Locale): OrderSelectCopy =>
  locale === "ro"
    ? { label: "ordine", options: { VALUE_DESC: "valoare, de la cea mai mare", DATE_DESC: "dată, cele mai noi întâi", DATE_ASC: "dată, cele mai vechi întâi" } }
    : { label: "order", options: { VALUE_DESC: "value, high to low", DATE_DESC: "date, newest first", DATE_ASC: "date, oldest first" } };

const recordDetail: Record<Locale, Omit<RecordDetailCopy, "recordRow" | "cite">> = {
  en: {
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
    party: partyCopy.en,
  },
  ro: {
    heading: {
      kinds: { DA: "Achiziție directă (DA)", DAN: "Notificare de atribuire a cumpărării directe (DAN)", CONTRACT: "Contract", AWARD_NOTICE: "Anunț de atribuire" },
      facets: { code: "Cod", date: "Data", kind: "Fel înregistrare", procedure: "Procedură", contractType: "Tip contract", cpv: "CPV" },
      panel: "Înregistrarea",
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
      consortiumOf: (n, formatted) => `consorțiu de ${roCount(n, formatted, "membru", "membri")}`,
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
    party: partyCopy.ro,
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
  ro: {
    identity: {
      cui: "CUI",
      foreignVatId: "Cod TVA străin",
      nameOnly: { label: "Identificat doar după denumire", explanation: "Pentru acest furnizor nu există un CUI cunoscut de ANAF, deci este identificat după codul TVA străin sau după denumirea publicată. Cifrele pot amesteca entități omonime." },
      identityCurated: { label: "Identitate verificată manual", explanation: "O persoană a verificat și corectat identitatea acestei entități." },
      onrcOnly: { label: "CUI doar în ONRC", explanation: "ANAF nu cunoaște acest CUI. ONRC, registrul comerțului, îl listează, deci această pagină arată numele și datele din ONRC." },
    },
    anafStatus: { label: "Stare ANAF", inactive: (status) => `ANAF indică această entitate ca ${status}, nu activă.` },
    placement: {
      label: "Locație",
      national: "Național",
      unplaced: { label: "Neplasată", explanation: "Nici ANAF, nici SEAP nu plasează această entitate într-un județ." },
      placedBy: (source) => `plasată de ${source}`,
    },
    source: { from: (source, fetched) => `Denumire și stare de la ${source}, preluate la ${fetched}` },
    roles: {
      label: "Rolurile entității",
      authority: "cumpără · autoritate contractantă",
      supplier: "vinde · furnizor",
      none: { AUTHORITY: "cumpără · nicio înregistrare ca autoritate", SUPPLIER: "vinde · nicio înregistrare ca furnizor" },
    },
    seapNames: {
      label: "Apare în SEAP ca",
      records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
      range: (first, last) => `${first} până la ${last}`,
      more: (_n, f) => `și încă ${f}`,
    },
  },
};

const entityPageLayout: Record<Locale, EntityPageLayoutCopy> = {
  en: { label: "Sections of this page", cite: { label: "Address of this view", copyLink: copyLink.en }, tabs: { overview: "Overview", records: "Records", relationships: "Relationships" } },
  ro: { label: "Secțiunile paginii", cite: { label: "Adresa acestei vizualizări", copyLink: copyLink.ro }, tabs: { overview: "Prezentare generală", records: "Înregistrări", relationships: "Relații" } },
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

const signalCount = (locale: Locale): SignalCountChipCopy =>
  locale === "ro"
    ? { label: (n, f) => roCount(n, f, "Semnal", "Semnale"), forEntity: (name) => `, ${name}` }
    : { label: (n, f) => `${f} ${plural(n, "Signal", "Signals")}`, forEntity: (name) => `, ${name}` };

const signalOrder = (locale: Locale): SignalOrderToggleCopy =>
  locale === "ro"
    ? { label: "Ordinea Semnalelor", options: { DATE_DESC: "după dată", VALUE_DESC: "după RON" } }
    : { label: "Order Signals", options: { DATE_DESC: "by date", VALUE_DESC: "by RON" } };

const entityRow = (locale: Locale): EntityResultRowCopy =>
  locale === "ro"
    ? {
        matched: "potrivit",
        cui: "CUI",
        records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
        national: "național",
        noCounty: "județ necunoscut",
        entityLink: entityLink.ro,
        signals: signalCount("ro"),
      }
    : {
        matched: "matched",
        cui: "CUI",
        records: (n, f) => `${f} ${plural(n, "Record", "Records")}`,
        national: "national",
        noCounty: "county unknown",
        entityLink: entityLink.en,
        signals: signalCount("en"),
      };

const recordRow = (locale: Locale): RecordResultRowCopy =>
  locale === "ro"
    ? {
        noValue: "fără valoare",
        valueCaption: { awarded: "valoare atribuită", ceiling: "plafon, neadunat" },
        channel: { DIRECT_PURCHASE: "Achiziție directă", CONTRACT: "Contract" },
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
        areaShare: (amount) => `Parte din asociere în selecție: ${amount}`,
      }
    : {
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
        badges: badges.en,
        party: { naturalPerson: "Persoană fizică", entityLink: entityLink.en },
        areaShare: (amount) => `Consortium share in the selection: ${amount}`,
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
        emptyLink: "Verifică ce a fost colectat",
        showAll: (_n, f) => `Arată toate cele ${f}`,
        goTo: goTo(locale),
        entityRow: entityRow(locale),
        recordRow: recordRow(locale),
      }
    : {
        label: "Results",
        tabs: { authorities: "Authorities", suppliers: "Suppliers", records: "Records" },
        empty: { authorities: "No authorities.", suppliers: "No suppliers.", records: "No Records." },
        emptyLink: "Check what has been harvested",
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
        emptyLink: "Verifică ce a fost colectat",
        outOfRange: (pages, formatted) => `Această pagină este după ultima: ${pages === 1 ? "există doar 1 pagină" : `sunt doar ${formatted}${pages % 100 >= 1 && pages % 100 <= 19 ? "" : " de"} pagini`}.`,
        noRowsHere: "Nu sunt rezultate pe această pagină: numărul de mai sus este estimat.",
        firstPage: "Mergi la pagina 1",
        back: "Înapoi la rezultate",
        cite: citeThisView(locale),
        order: orderSelect(locale),
        pagination: { label: "Paginile rezultatelor", previous: "Anterioara", next: "Următoarea", page: (n) => `Pagina ${n}` },
        entityRow: entityRow(locale),
        recordRow: recordRow(locale),
      }
    : {
        heading: { authorities: "Authorities", suppliers: "Suppliers", records: "Records" },
        showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
        empty: { authorities: "No authorities.", suppliers: "No suppliers.", records: "No Records." },
        emptyLink: "Check what has been harvested",
        outOfRange: (pages, formatted) => `This page is past the end: there ${pages === 1 ? "is only 1 page" : `are only ${formatted} pages`}.`,
        noRowsHere: "There are no results on this page: the count above is an estimate.",
        firstPage: "Go to page 1",
        back: "Back to results",
        cite: citeThisView(locale),
        order: orderSelect(locale),
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
  table: locale === "ro" ? { label: "Înregistrările entității", columns: { record: "Înregistrare", title: "Titlu", value: "Valoare" } } : { label: "Records of this entity", columns: { record: "Record", title: "Title", value: "Value" } },
  pagination: fullResults(locale).pagination,
});

const relationshipsTab = (locale: Locale): RelationshipsTabCopy => {
  const base = { entityLink: entityLink[locale], recordRow: recordRow(locale), pagination: fullResults(locale).pagination };
  return locale === "ro"
    ? {
        ...base,
        heading: "Relații",
        recordCount: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
        graph: {
          heading: "Principalele contrapărți · alege una ca să vezi înregistrările ei",
          label: "Graful principalelor contrapărți",
          naturalPerson: "Persoană fizică",
          unknown: "Contraparte neidentificată",
          node: (p) =>
            `${p.name}, ${p.amount}, ${p.records}; ${p.contract} prin contracte, ${p.directPurchase} prin achiziții directe` +
            `${p.wonTogether ? "; câștigat împreună" : ""}${p.hasSignals ? "; are Semnale" : ""}${p.selected ? "; ales" : ""}`,
          more: (n, f) => `încă ${roCount(n, f, "contraparte", "contrapărți")}`,
          empty: "Nicio contraparte pentru filtrele alese.",
          consortiumNote:
            "Sumele unui consorțiu sunt împărțite în mod egal între membri, prin convenție; valoarea întreagă a înregistrării apare pe pagina ei.",
        },
        legend: {
          title: "Legendă", edgeColour: "Culoarea unei linii este canalul care deține cei mai mulți RON cu acea contraparte.", centre: "Entitatea acestei pagini", size: "Aria cercului: banii cu contrapartea", contract: "Linie galbenă: contracte",
          directPurchase: "Linie albastră: achiziții directe", wonTogether: "Linie întreruptă: au câștigat împreună", signals: "Inel galben: are Semnale",
        },
        timeline: {
          heading: "Pe luni", label: "Banii pe luni", overall: "Toate contrapărțile", picked: (name) => name ?? "Contrapartea aleasă", empty: "Nicio lună în filtrele alese.",
          table: { caption: "Banii pe luni", month: "Luna", amount: "Total", picked: (name) => name ?? "Contrapartea aleasă" },
        },
        panel: {
          label: "Înregistrările contrapărții alese", eyebrow: "Contraparte aleasă", hint: "Alege o contraparte din graf ca să vezi toate înregistrările cu ea.", heading: "Înregistrări cu",
          total: (amount, records) => `${amount} în ${records}`, close: "Închide", loading: "Se încarcă înregistrările", empty: "Nicio înregistrare cu această contraparte.",
        },
      }
    : {
        ...base,
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
      };
};

const searchBar: Record<Locale, SearchBarCopy> = {
  en: { label: "Search", placeholder: "Search in Romanian, e.g. deszăpezire", hint: "The data is in Romanian. Try deszăpezire, a company name, a CUI with or without RO, or a CPV prefix such as 45. Diacritics, case and legal forms (SRL, SA) are ignored.", clear: "Clear search", loading: "Searching", minLengthHint: "Type at least 2 characters to search." },
  ro: { label: "Căutare", placeholder: "Caută în română, de ex. deszăpezire", hint: "Datele sunt în română. Încearcă deszăpezire, numele unei firme, un CUI cu sau fără RO sau un prefix CPV, de exemplu 45. Diacriticele, majusculele și formele juridice (SRL, SA) sunt ignorate.", clear: "Șterge căutarea", loading: "Se caută", minLengthHint: "Scrie cel puțin 2 caractere pentru a căuta." },
};

/** ONRC's N_VERSIUNE_CAEN: version 0 is the 1998 classification, 1 is 2003, 2 is 2008, 3 is 2025. */
const CAEN_YEARS = [1998, 2003, 2008, 2025];

const onrcSection: Record<Locale, OnrcSectionCopy> = {
  en: {
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
  ro: {
    heading: "Înmatriculare ONRC",
    registrationNumber: "Număr de înmatriculare",
    registrationDate: "Înmatriculată",
    registrationDateUnknown: "nu apare în instantaneul citit",
    legalForm: "Formă juridică",
    seat: "Sediu social",
    seatUnknown: "niciun sediu publicat",
    statuses: {
      heading: "Stare",
      none: "ONRC nu listează nicio stare.",
      unnamed: (code) => `cod de stare ${code}`,
      firstSeen: (snapshot) => `văzută prima oară în instantaneul din ${snapshot}`,
      sinceAtLeast: (snapshot) => `cel puțin din instantaneul din ${snapshot}`,
      caveat: "ONRC publică stările fără date. O dată de aici este primul instantaneu pe care îl deținem și care arată starea, aflat prin compararea instantaneelor; schimbarea în sine poate fi mai veche.",
    },
    caen: { heading: "Coduri CAEN autorizate", none: "ONRC nu listează niciun cod CAEN autorizat.", version: (v) => (v === null ? "" : `CAEN ${CAEN_YEARS[v] ?? v}`) },
    aliases: {
      heading: "Denumiri ONRC",
      none: "ONRC nu listează nicio denumire.",
      current: "denumirea legală azi",
      range: (first, last) => (first === last ? `văzută în instantaneul din ${first}` : `văzută în instantaneele din ${first} până în ${last}`),
      rangeSinceAtLeast: (first, last) => (first === last ? `văzută în instantaneul din ${first}, cel puțin` : `văzută cel puțin din ${first}, ultima dată în ${last}`),
      note: "Acestea sunt grafiile ONRC, păstrate ca alias-uri. Nu schimbă niciodată numele din capul paginii.",
    },
    source: (snapshot) => `Sursa: ONRC, instantaneul din ${snapshot}`,
    onrcOnly: "Această organizație există doar în ONRC: nicio achiziție din SEAP nu o numește. Nicio persoană a ei nu este afișată.",
  },
};

const peopleSection: Record<Locale, PeopleSectionCopy> = {
  en: {
    heading: "Administrators and legal representatives",
    intro: "As ONRC lists them for this organisation, which is tied to public money. People who share a name are never merged: a person is the same only when name and full birth date match.",
    none: "ONRC lists no administrator or legal representative for this organisation.",
    born: (year) => `born ${year}`,
    unlinked: "no birth date in ONRC: listed on this page only, linked to no one",
    personLink: (name) => `${name}: person page`,
    source: (snapshot) => `Source: ONRC, snapshot of ${snapshot}`,
  },
  ro: {
    heading: "Administratori și reprezentanți legali",
    intro: "Așa cum îi listează ONRC pentru această organizație, legată de bani publici. Persoanele cu același nume nu sunt niciodată unite: o persoană este aceeași doar dacă numele și data nașterii completă coincid.",
    none: "ONRC nu listează niciun administrator sau reprezentant legal pentru această organizație.",
    born: (year) => `născut în ${year}`,
    unlinked: "fără dată a nașterii în ONRC: listat doar pe această pagină, nelegat de nimeni",
    personLink: (name) => `${name}: pagina persoanei`,
    source: (snapshot) => `Sursa: ONRC, instantaneul din ${snapshot}`,
  },
};

const personDetail: Record<Locale, PersonDetailCopy> = {
  en: {
    privateView: "Private view: this page is shown only where the host reveals Restricted content. It joins one person's roles across organisations and is not public.",
    born: (year) => `born ${year}`,
    rolesHeading: "Roles",
    roleCount: (count) => (count === 1 ? "1 role" : `${count} roles`),
    noPage: "no organisation page",
    basis: "Each role is the same name and full birth date in ONRC's register. The birth year is shown; the full date and the birthplace never are.",
    source: (snapshot) => `Source: ONRC, snapshot of ${snapshot}`,
  },
  ro: {
    privateView: "Vedere privată: această pagină apare doar unde gazda dezvăluie conținutul restricționat. Unește rolurile unei persoane în mai multe organizații și nu este publică.",
    born: (year) => `născut în ${year}`,
    rolesHeading: "Roluri",
    roleCount: (count) => (count === 1 ? "1 rol" : `${count} roluri`),
    noPage: "fără pagină de organizație",
    basis: "Fiecare rol are același nume și aceeași dată a nașterii completă în registrul ONRC. Se arată anul nașterii; data completă și locul nașterii nu se arată niciodată.",
    source: (snapshot) => `Sursa: ONRC, instantaneul din ${snapshot}`,
  },
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

const signalCard: Record<Locale, SignalCardCopy> = {
  en: {
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
      entityLink: entityLink.en,
    },
    links: {
      reproduce: (n, f) => (n === 1 ? "See the Record" : `See the ${f} Records`),
      seap: { check: "Check in SEAP", checkEach: "Check each Record in SEAP" },
      methodology: "How this Signal is detected",
    },
  },
  ro: {
    rules: {
      OVER_CAP: {
        label: "Peste plafon",
        sentence: (n) => `O achiziție directă a fost atribuită pentru ${n.value}, adică de ${n.multiple} ori plafonul achiziției directe (${n.cap}).`,
        lawful: "Explicații legale posibile: o achiziție subsecventă unui acord-cadru, o excepție prevăzută de lege sau o eroare de introducere a valorii ori a tipului înregistrării.",
      },
      SPLITTING: {
        label: "Fracționare",
        sentence: (n) => `${roCount(n.purchasesCount, n.purchases, "achiziție directă", "achiziții directe")} din grupa CPV ${n.cpvGroup}, între ${n.from} și ${n.to}, însumează ${n.sum}, peste plafonul de ${n.cap} al unei singure achiziții.`,
        lawful: "Explicații legale posibile: nevoi distincte, linii bugetare distincte sau produse fără legătură din aceeași grupă CPV.",
      },
      FRAMEWORK_OVERRUN: {
        label: "Depășirea acordului-cadru",
        sentence: (n) => `Contractele subsecvente raportate pentru un acord-cadru însumează ${n.subsequent}, față de un plafon de ${n.ceiling}, adică ${n.ratio} din acesta.`,
        lawful: "Explicații legale posibile: indexarea prețurilor sau modificările permise de lege.",
      },
      NO_PUBLICATION: {
        label: "Fără publicare",
        sentence: (n) => `Atribuită prin procedura „${n.procedure}”, care nu presupune publicarea prealabilă a unui anunț.`,
        lawful: "Explicații legale posibile: urgența, un singur furnizor posibil sau un alt temei legal.",
      },
    },
    compact: { text: (label, when) => `${label}, ${when}` },
    date: (when) => `Ultima înregistrare: ${when}`,
    records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
    parties: {
      authority: "Autoritate contractantă",
      suppliers: "Furnizori",
      moreSuppliers: (_n, f) => `și încă ${f}`,
      entityLink: entityLink.ro,
    },
    links: {
      reproduce: (n, f) => (n === 1 ? "Vezi înregistrarea" : `Vezi cele ${roCount(n, f, "înregistrare", "înregistrări")}`),
      seap: { check: "Verifică în SEAP", checkEach: "Verifică fiecare înregistrare în SEAP" },
      methodology: "Cum este detectat acest Semnal",
    },
  },
};

const sourceEyebrow: Record<Locale, SourceEyebrowCopy> = {
  en: { search: "search", scope: "national", period: "2021 onward" },
  ro: { search: "caută", scope: "național", period: "din 2021" },
};

export const sampleCopy = {
  sourceEyebrow: (locale: Locale): SourceEyebrowCopy => sourceEyebrow[locale],
  signalCard: (locale: Locale): SignalCardCopy => signalCard[locale],
  signalBadge: (locale: Locale): SignalBadgeCopy => signalCard[locale],
  entityOverview,
  onrcSection: (locale: Locale): OnrcSectionCopy => onrcSection[locale],
  peopleSection: (locale: Locale): PeopleSectionCopy => peopleSection[locale],
  personDetail: (locale: Locale): PersonDetailCopy => personDetail[locale],
  searchBar: (locale: Locale): SearchBarCopy => searchBar[locale],
  recordsFacets,
  recordsTab,
  relationshipsTab,
  entityRow,
  signalCount,
  signalOrder,
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
  recordDetail: (locale: Locale): RecordDetailCopy => ({ ...recordDetail[locale], cite: citeThisRecord(locale), recordRow: recordRow(locale) }),
  copyLink: (locale: Locale): CopyLinkButtonCopy => copyLink[locale],
  citeThisView,
  orderSelect,
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
          nationalCaption: (source) => `${source} este colectat la nivel național; lacunele se aplică fiecărui județ`,
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
  coveragePageLayout: (locale: Locale): CoveragePageLayoutCopy =>
    locale === "ro"
      ? {
        eyebrow: "acoperire",
        title: "Acoperire",
        intro: "Ce conține explorerul din SEAP, trimestru cu trimestru și tip de înregistrare cu tip de înregistrare. Fiecare lacună, sau îndoială privind o lacună, apare aici împreună cu motivul sau regula din spatele ei.",
        grid: {
          label: "Acoperirea pe trimestre și tipuri de înregistrare",
          kindHeader: "Tip de înregistrare",
          quarterName: (quarter) => `T${quarter.slice(6)} ${quarter.slice(0, 4)}`,
          kinds: { DA: "Achiziții directe", DAN: "Notificări de atribuire a cumpărării directe", CONTRACT: "Contracte", AWARD_NOTICE: "Anunțuri de atribuire" },
          states: {
            LOADED: "Încărcat",
            KNOWN_GAP: "Lacună cunoscută",
            POSSIBLY_INCOMPLETE: "Posibil incomplet",
            NOT_IN_SOURCE: "Nu se vede în sursă",
            CRAWLED_PROVISIONAL: "Colectat, provizoriu",
            NOT_YET_LOADED: "Încă neîncărcat",
          },
          rules: {
            HAND_ENTERED: "Introdusă manual în fișierul de lacune, cu un motiv scris",
            COUNT_BELOW_NEIGHBOURS: "Mai puțin de 60% din mediana numărului de rânduri al trimestrelor învecinate",
            NO_PRIOR_CALL_BEFORE_BACKFILL: "Contractele atribuite fără anunț de participare nu apar în niciun fișier în masă; rămân nevizibile în sursă până rulează completarea din e-licitatie",
            AWAITING_BULK_FILE: "Se așteaptă fișierul în masă: fișierul în masă al trimestrului nu a fost publicat încă",
          },
          notYetLoaded: "Se așteaptă un fișier în masă pentru acest trimestru și tip de înregistrare",
          noCell: "fără informații",
          records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
          crawlOnly: (n, f) => `dintre care ${f} absente din datele în masă`,
          dataThrough: (date) => `date până la ${date}`,
          inRange: "în intervalul de date",
          windowNote: "trimestrele urmează data publicării · evidențiat: intervalul din chipul datei atribuirii",
          legend: { title: "Stările celulelor", range: "În intervalul de date" },
          seePage: "Vezi pagina Acoperire",
        },
        gridHeading: "Trimestre și tipuri de înregistrare",
        dataThrough: {
          heading: "Date până la",
          intro: "Până unde ajunge fiecare tip de înregistrare. Trimestrul curent vine din colectarea zilnică, înaintea fișierelor în masă.",
          none: "Nicio dată încă.",
          copy: { through: "date până la" },
        },
        crawlOnly: {
          heading: "Înregistrări absente din datele în masă",
          intro: "Înregistrări găsite prin colectare, care nu se află în fișierul în masă al trimestrului lor. Sunt păstrate și numărate în celula trimestrului.",
          line: (kind, quarter, n, f) => `${kind}, ${quarter}: ${roCount(n, f, "înregistrare absentă din datele în masă", "înregistrări absente din datele în masă")}`,
        },
        knownGaps: {
          heading: "Lacune cunoscute",
          intro: "Fiecare celulă care este lacună cunoscută, posibil incompletă sau nevizibilă în sursă, cu motivul sau regula ei.",
          empty: "Nicio lacună cunoscută în datele afișate.",
          columns: { quarter: "Trimestru", kind: "Tip de înregistrare", state: "Stare", reason: "Motiv sau regulă", records: "Înregistrări" },
        },
        rules: {
          heading: "Cum se stabilesc lacunele",
          intro: "Regulile sunt fixe și publice. Nimic nu este ascuns: un trimestru care pare greșit este semnalat de o regulă sau introdus manual, cu motivul lui.",
          names: {
            HAND_ENTERED: "Lacună cunoscută",
            COUNT_BELOW_NEIGHBOURS: "Posibil incomplet",
            NO_PRIOR_CALL_BEFORE_BACKFILL: "Nu se vede în sursă",
            AWAITING_BULK_FILE: "Se așteaptă fișierul în masă",
          },
          statesHeading: "Ce înseamnă fiecare stare",
          states: {
            LOADED: "Fișierul în masă al trimestrului pentru acest tip de înregistrare este încărcat. După ce rulează completarea din e-licitatie, anunțurile de atribuire din 2021-2022 sunt acoperite prin e-licitatie și apar tot ca încărcate.",
            KNOWN_GAP: "O lacună introdusă manual, cu un motiv scris.",
            POSSIBLY_INCOMPLETE: "Un fișier în masă este încărcat, dar numărul lui de rânduri este neobișnuit de mic față de vecini.",
            NOT_IN_SOURCE: "Sursa nu arată deloc aceste înregistrări, deocamdată.",
            CRAWLED_PROVISIONAL: "Încă fără fișier în masă; se afișează ce a găsit colectarea, iar datele se pot schimba când apare fișierul.",
            NOT_YET_LOADED: "Fișierul în masă pentru acest trimestru și tip de înregistrare nu este încă în date.",
          },
          methodology: "Cum se numără cifrele",
        },
        perCounty: {
          heading: "pe județ: N din M",
          body: (source, since) => `Pe hartă, fiecare județ se citește „N din M entități publice au înregistrări ${source} începând cu ${since}, plus K alte autorități contractante”. M vine din lista entităților publice a Ministerului Finanțelor. O entitate fără înregistrări poate pur și simplu să nu fi cumpărat nimic, de aceea numărul nu este arătat niciodată ca procent.`,
          lensLink: "deschide lentila Acoperire pe hartă →",
        },
        snapshot: {
          heading: "Lista entităților publice",
          line: (date) => `Lista entităților publice a Ministerului Finanțelor: versiunea din ${date}`,
          notLoaded: "Lista entităților publice a Ministerului Finanțelor nu este încărcată încă.",
        },
        empty: "Niciun trimestru din SEAP nu este încărcat încă.",
        loading: "Se încarcă acoperirea…",
        error: "Acoperirea nu a putut fi încărcată. Încearcă din nou peste puțin timp.",
      }
      : {
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
  coverageGrid: (locale: Locale): CoverageGridCopy => sampleCopy.coveragePageLayout(locale).grid,
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
