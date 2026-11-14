// Sample copy of the ONRC displays (#178) for stories and tests, in both languages. The app's catalogue (`sources.onrc`) satisfies the same copy types.
import type { Locale } from "../../theme/index.ts";
import type { OnrcFilterChipsCopy } from "../molecules/OnrcFilterChips/index.ts";
import type { OnrcResultRowCopy } from "../molecules/OnrcResultRow/index.ts";
import type { PageNavCopy } from "../molecules/PageNav/index.ts";
import type { OnrcCountMapCopy } from "../organisms/OnrcCountMap/index.ts";
import type { OnrcResultsCopy } from "../organisms/OnrcResults/index.ts";
import type { SnapshotCoverageCopy } from "../organisms/SnapshotCoverage/index.ts";

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);
const roCount = (n: number, f: string, one: string, other: string) => (n === 1 ? `${f} ${one}` : n === 0 || (n % 100 >= 1 && n % 100 <= 19) ? `${f} ${other}` : `${f} de ${other}`);

const row: Record<Locale, OnrcResultRowCopy> = {
  en: {
    registrationNumber: "Reg. no.", cui: "CUI", registered: (date) => `registered ${date}`, registrationDateUnknown: "registration date not in the snapshot read", noCounty: "no county",
    seapCounterparty: "SEAP counterparty", caen: "CAEN", statusUnnamed: (code) => `status ${code}`, matchedIn: (field) => `Matched in ${field}`,
    fields: { NAME: "name", ALIAS: "earlier name", CUI: "CUI", CAEN: "CAEN code", REGISTRATION_NUMBER: "registration number" },
  },
  ro: {
    registrationNumber: "Nr. înmatriculare", cui: "CUI", registered: (date) => `înmatriculată pe ${date}`, registrationDateUnknown: "data înmatriculării nu apare în instantaneul citit", noCounty: "fără județ",
    seapCounterparty: "parte în SEAP", caen: "CAEN", statusUnnamed: (code) => `starea ${code}`, matchedIn: (field) => `Potrivit în ${field}`,
    fields: { NAME: "denumire", ALIAS: "denumire anterioară", CUI: "CUI", CAEN: "cod CAEN", REGISTRATION_NUMBER: "număr de înmatriculare" },
  },
};

const pagination: Record<Locale, PageNavCopy> = {
  en: { label: "Result pages", previous: "Previous", next: "Next", page: (n) => `Page ${n}` },
  ro: { label: "Pagini de rezultate", previous: "Înapoi", next: "Înainte", page: (n) => `Pagina ${n}` },
};

const results: Record<Locale, OnrcResultsCopy> = {
  en: {
    heading: (n, f) => `${f} ${plural(n, "registration", "registrations")}`, showing: (from, to, total) => `Showing ${from}–${to} of ${total}`,
    empty: "No registration matches. Sole traders (PFA, II, IF) are not listed.", emptyLink: "Check which ONRC snapshots are held", row: row.en, pagination: pagination.en,
  },
  ro: {
    heading: (n, f) => roCount(n, f, "înmatriculare", "înmatriculări"), showing: (from, to, total) => `Se afișează ${from}–${to} din ${total}`,
    empty: "Nicio înmatriculare nu corespunde. PFA-urile, întreprinderile individuale și cele familiale (PFA, II, IF) nu sunt listate.", emptyLink: "Verifică ce instantanee ONRC deținem", row: row.ro, pagination: pagination.ro,
  },
};

const filterChips: Record<Locale, OnrcFilterChipsCopy> = {
  en: {
    label: "Filters",
    status: { group: "Status", options: { 1048: "In operation", 1107: "Insolvency", 1084: "Struck off", 1074: "Temporarily suspended" }, other: (code) => `Status ${code}` },
    seapCounterparty: { group: "In SEAP", yes: "SEAP counterparties only", no: "Not in SEAP" },
    caen: { label: "CAEN code or prefix", hint: "Digits, e.g. 4211 or 42" },
    registered: { group: "Registered", from: "From", to: "To" },
    active: {
      group: "Active filters", none: "No filters", caen: (code) => `CAEN ${code}`, county: (area) => `County ${area}`, unplaced: "No county", from: (date) => `Registered from ${date}`, to: (date) => `Registered to ${date}`,
      seapCounterparty: { yes: "SEAP counterparties only", no: "Not in SEAP" }, remove: (chip) => `Remove ${chip}`, clearAll: "Clear all",
    },
  },
  ro: {
    label: "Filtre",
    status: { group: "Stare", options: { 1048: "În funcțiune", 1107: "Insolvență", 1084: "Radiată", 1074: "Întrerupere temporară" }, other: (code) => `Starea ${code}` },
    seapCounterparty: { group: "În SEAP", yes: "Doar părți în SEAP", no: "Nu în SEAP" },
    caen: { label: "Cod CAEN sau prefix", hint: "Cifre, de ex. 4211 sau 42" },
    registered: { group: "Înmatriculată", from: "De la", to: "Până la" },
    active: {
      group: "Filtre active", none: "Niciun filtru", caen: (code) => `CAEN ${code}`, county: (area) => `Județul ${area}`, unplaced: "Fără județ", from: (date) => `Înmatriculată de la ${date}`, to: (date) => `Înmatriculată până la ${date}`,
      seapCounterparty: { yes: "Doar părți în SEAP", no: "Nu în SEAP" }, remove: (chip) => `Elimină ${chip}`, clearAll: "Șterge toate",
    },
  },
};

const countMap: Record<Locale, OnrcCountMapCopy> = {
  en: {
    map: { mapLabel: "Map of counties by registrations", legendTitle: "Registrations", noData: "No registrations", areaLabel: (name, value) => `${name}: ${value}`, atMost: (value) => `up to ${value}` },
    unplaced: "No county", tilesHeading: "Off the map", registrations: (n, f) => `${f} ${plural(n, "registration", "registrations")}`,
  },
  ro: {
    map: { mapLabel: "Harta județelor după înmatriculări", legendTitle: "Înmatriculări", noData: "Fără înmatriculări", areaLabel: (name, value) => `${name}: ${value}`, atMost: (value) => `până la ${value}` },
    unplaced: "Fără județ", tilesHeading: "În afara hărții", registrations: (n, f) => roCount(n, f, "înmatriculare", "înmatriculări"),
  },
};

const snapshots: Record<Locale, SnapshotCoverageCopy> = {
  en: {
    label: "ONRC snapshots", columns: { period: "Period", state: "State", records: "Registrations", reason: "Reason" },
    states: { LOADED: "Loaded", KNOWN_GAP: "Known gap", POSSIBLY_INCOMPLETE: "Possibly incomplete", NOT_IN_SOURCE: "Not in the source", CRAWLED_PROVISIONAL: "Provisional", NOT_YET_LOADED: "Not yet loaded" },
    snapshot: (date) => `Snapshot of ${date}`, month: (month) => month, missingSnapshot: "No snapshot of this month is held.", dataThroughKind: "Registrations", dataThrough: { through: "data through" }, empty: "No ONRC snapshot is held yet.",
  },
  ro: {
    label: "Instantanee ONRC", columns: { period: "Perioadă", state: "Stare", records: "Înmatriculări", reason: "Motiv" },
    states: { LOADED: "Încărcat", KNOWN_GAP: "Lacună cunoscută", POSSIBLY_INCOMPLETE: "Posibil incomplet", NOT_IN_SOURCE: "Absent din sursă", CRAWLED_PROVISIONAL: "Provizoriu", NOT_YET_LOADED: "Încă neîncărcat" },
    snapshot: (date) => `Instantaneul din ${date}`, month: (month) => month, missingSnapshot: "Nu deținem niciun instantaneu din această lună.", dataThroughKind: "Înmatriculări", dataThrough: { through: "date până la" }, empty: "Nu deținem încă niciun instantaneu ONRC.",
  },
};

export const sampleOnrcCopy = {
  row: (locale: Locale) => row[locale],
  results: (locale: Locale) => results[locale],
  filterChips: (locale: Locale) => filterChips[locale],
  countMap: (locale: Locale) => countMap[locale],
  snapshots: (locale: Locale) => snapshots[locale],
};
