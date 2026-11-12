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
import type { TotalFigureCopy } from "../molecules/TotalFigure/index.ts";

const badges: Record<Locale, BadgeCopy> = {
  en: {
    FRAMEWORK_CEILING: { label: "Framework ceiling", explanation: "The agreed maximum of a framework agreement, not money awarded. Never added to a total." },
    SUBSEQUENT_CONTRACT: { label: "Subsequent contract", explanation: "Awarded under a framework agreement. Counted here; the framework's ceiling is not." },
    CONSORTIUM_SHARE: { label: "Consortium share", explanation: "Several suppliers won together; each is shown with an equal share of the value." },
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
    CONSORTIUM_SHARE: { label: "Parte din asociere", explanation: "Mai mulți furnizori au câștigat împreună; fiecare apare cu o parte egală din valoare." },
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

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);

export const sampleCopy = {
  badges: (locale: Locale): BadgeCopy => badges[locale],
  entityLink: (locale: Locale): EntityLinkCopy => entityLink[locale],
  party: (locale: Locale): PartyNameCopy => ({ naturalPerson: "Persoană fizică", entityLink: entityLink[locale] }),
  dataThrough: (locale: Locale): DataThroughDateCopy => ({ through: locale === "ro" ? "date până la" : "data through" }),
  entityHeader: (locale: Locale): EntityHeaderCopy => entityHeader[locale],
  entityPageLayout: (locale: Locale): EntityPageLayoutCopy => entityPageLayout[locale],
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
  total: (locale: Locale): TotalFigureCopy =>
    locale === "ro"
      ? {
          records: (n, f) => `${f} ${plural(n, "înregistrare", "înregistrări")}`,
          suspectLeftOut: (n, f) => `${f} ${plural(n, "valoare suspectă exclusă", "valori suspecte excluse")}`,
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
