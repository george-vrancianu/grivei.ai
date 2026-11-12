import type { Copy } from "./types.ts";

const plural = (n: number, one: string, other: string) => (n === 1 ? one : other);

const entityLink: Copy["entityLink"] = {
  nameOnly: { label: "doar denumire", explanation: "Identificat doar după denumirea publicată (fără CUI). Cifrele pot amesteca entități omonime." },
  identityCurated: { label: "verificat manual", explanation: "O persoană a verificat și corectat identitatea acestei entități." },
};

export const ro: Copy = {
  brand: "Grivei.ai",
  nav: { label: "Principal", explore: "Explorează", search: "Căutare", coverage: "Acoperire", methodology: "Despre cifre" },
  language: { switchTo: "English", switchLabel: "Versiunea în engleză a acestei pagini" },
  status: { loading: "Se încarcă…", failed: "Datele nu au putut fi încărcate." },
  main: { title: "Explorează cheltuielile publice", total: "Total atribuit" },
  searchField: { label: "Căutare", placeholder: "Autoritate, furnizor, CUI, titlu…" },
  records: {
    heading: "Înregistrări",
    empty: "Nicio înregistrare încă.",
    noValue: "fără valoare",
    countSuffix: "Înregistrări",
    columns: { code: "Cod", title: "Titlu", authority: "Autoritate", supplier: "Furnizor", date: "Data", value: "Valoare" },
  },
  pages: {
    placeholder: "Această pagină nu este construită încă.",
    notFound: { title: "Pagina nu a fost găsită", back: "Înapoi la ecranul principal" },
    search: { title: "Căutare" },
    authority: { overview: "Autoritate", records: "Autoritate: Înregistrări", relationships: "Autoritate: Relații" },
    supplier: { overview: "Furnizor", records: "Furnizor: Înregistrări", relationships: "Furnizor: Relații" },
    record: { title: "Înregistrare" },
    coverage: { title: "Acoperire" },
    methodology: { title: "Despre cifre" },
  },
  badges: {
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
  entityLink,
  party: { naturalPerson: "Persoană fizică", entityLink },
  dataThrough: { through: "date până la" },
  total: {
    records: (n, f) => `${f} ${plural(n, "înregistrare", "înregistrări")}`,
    suspectLeftOut: (n, f) => `${f} ${plural(n, "valoare suspectă exclusă", "valori suspecte excluse")}`,
    noValue: (n, f) => `${f} ${plural(n, "înregistrare fără valoare", "înregistrări fără valoare")}`,
    frameworkCeilings: (amount) => `Plafoane de acorduri-cadru nenumărate: ${amount}`,
    methodology: "Cum se calculează acest total",
  },
};
