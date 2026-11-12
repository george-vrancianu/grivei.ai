import type { Copy } from "./types.ts";

/** Romanian count phrase: singular for 1, plural for 0 and 2..19 (mod 100), "de" + plural otherwise (20 de, 120 de; 101 and 5 take none). */
export const roCount = (n: number, formatted: string, one: string, other: string): string => {
  if (n === 1) return `${formatted} ${one}`;
  const r = n % 100;
  return n === 0 || (r >= 1 && r <= 19) ? `${formatted} ${other}` : `${formatted} de ${other}`;
};

const entityLink: Copy["entityLink"] = {
  nameOnly: { label: "doar denumire", explanation: "Identificat doar după denumirea publicată (fără CUI). Cifrele pot amesteca entități omonime." },
  identityCurated: { label: "verificat manual", explanation: "O persoană a verificat și corectat identitatea acestei entități." },
};

const badges: Copy["badges"] = {
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
};

export const ro: Copy = {
  brand: "Grivei.ai",
  nav: { label: "Principal", explore: "Explorează", search: "Căutare", coverage: "Acoperire", methodology: "Despre cifre" },
  language: { switchTo: "English", switchLabel: "Versiunea în engleză a acestei pagini" },
  status: { loading: "Se încarcă…", failed: "Datele nu au putut fi încărcate." },
  main: { title: "Explorează cheltuielile publice", total: "Total atribuit" },
  searchField: { label: "Căutare", placeholder: "Autoritate, furnizor, CUI, titlu…" },
  results: {
    label: "Rezultate",
    tabs: { authorities: "Autorități", suppliers: "Furnizori", records: "Înregistrări" },
    empty: { authorities: "Nicio autoritate nu corespunde.", suppliers: "Niciun furnizor nu corespunde.", records: "Nicio înregistrare nu corespunde." },
    showAll: (_n, formatted) => `Arată toate cele ${formatted}`,
    goTo: { heading: "Mergi la pagină", open: "Deschide pagina", cui: "CUI", nameOnly: "identificat doar după denumire" },
    entityRow: {
      matched: "potrivit",
      records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
      national: "național",
      noCounty: "județ necunoscut",
      entityLink,
    },
    recordRow: {
      noValue: "fără valoare",
      consortium: {
        label: "asociere",
        explanation: "Se afișează valoarea integrală a contractului. Partea fiecărui membru este o convenție de părți egale, nu o sumă publicată.",
      },
      authority: "Autoritate",
      winners: "Câștigători",
      matchedIn: (field) => `Potrivit în ${field}`,
      fields: {
        TITLE: "titlu", AUTHORITY: "autoritate", SUPPLIER: "furnizor", CPV_CODE: "cod CPV", CPV_DESCRIPTION: "descriere CPV",
        PUBLIC_CODE: "cod public", CUI: "CUI",
      },
      badges,
      party: { naturalPerson: "Persoană fizică", entityLink },
    },
  },
  fullResults: {
    showing: (from, to, total) => `Se afișează ${from}–${to} din ${total}`,
    outOfRange: (pages, formatted) => `Această pagină este după ultima: ${pages === 1 ? "există doar 1 pagină" : `sunt doar ${roCount(pages, formatted, "pagină", "pagini")}`}.`,
    noRowsHere: "Nu sunt rezultate pe această pagină: numărul de mai sus este estimat.",
    firstPage: "Mergi la pagina 1",
    back: "Înapoi la rezultate",
    pagination: { label: "Paginile rezultatelor", previous: "Anterioara", next: "Următoarea", page: (n) => `Pagina ${n}` },
  },
  mainScreenLayout: {
    lens: { label: "Lentila hărții", money: "Bani", coverage: "Acoperire" },
    regions: { search: "Căutare", map: "Harta", results: "Rezultate" },
  },
  filterChips: {
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
    badges: { group: "Insigne ale înregistrărilor", badges: badges },
    active: {
      group: "Filtre active",
      none: "Niciun filtru activ.",
      from: (when) => `Din ${when}`,
      to: (when) => `Până în ${when}`,
      remove: (chip) => `Elimină ${chip}`,
      clearAll: "Șterge tot",
    },
  },
  pages: {
    placeholder: "Această pagină nu este construită încă.",
    notFound: { title: "Pagina nu a fost găsită", back: "Înapoi la ecranul principal" },
    search: { title: "Căutare" },
    record: { title: "Înregistrare" },
    coverage: { title: "Acoperire" },
    methodology: { title: "Despre cifre" },
  },
  badges,
  entityLink,
  party: { naturalPerson: "Persoană fizică", entityLink },
  dataThrough: { through: "date până la" },
  total: {
    records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
    suspectLeftOut: (n, f) => roCount(n, f, "valoare suspectă exclusă", "valori suspecte excluse"),
    noValue: (n, f) => roCount(n, f, "înregistrare fără valoare", "înregistrări fără valoare"),
    frameworkCeilings: (amount) => `Plafoane de acorduri-cadru neincluse: ${amount}`,
    methodology: "Cum se calculează acest total",
  },
  entityPage: {
    layout: { label: "Secțiunile paginii", tabs: { overview: "Prezentare generală", records: "Înregistrări", relationships: "Relații" } },
    header: {
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
    notFound: { title: "Entitatea nu a fost găsită", body: "Nicio autoritate sau furnizor nu este publicat sub această cheie." },
    tabBody: {
      overview: "Prezentarea generală nu este construită încă.",
      relationships: "Fila Relații nu este construită încă.",
    },
    recordsTab: {
      heading: "Înregistrări",
      facets: {
        label: "Filtre pe fațete",
        groups: {
          signal: "Semnal", channel: "Canal", procedure: "Procedură", year: "Anul atribuirii",
          counterpartyOfAuthority: "Furnizor", counterpartyOfSupplier: "Autoritate contractantă", badge: "Insigne",
        },
        option: (label, count) => `${label} (${count})`,
        counterpartyKey: (key) => `Contraparte ${key}`,
        signals: { OVER_CAP: "Peste plafon", SPLITTING: "Fracționare", FRAMEWORK_OVERRUN: "Depășirea acordului-cadru", NO_PUBLICATION: "Fără publicare" },
      },
      empty: { text: "Nicio înregistrare nu se potrivește cu aceste filtre.", clear: "Șterge filtrele" },
    },
  },
};
