import type { Copy } from "./types.ts";
import { ruleLabels } from "./ruleLabels.ts";
import { methodologyRo } from "./methodologyRo.ts";

/** Romanian count phrase: singular for 1, plural for 0 and 2..19 (mod 100), "de" + plural otherwise (20 de, 120 de; 101 and 5 take none). */
export const roCount = (n: number, formatted: string, one: string, other: string): string => {
  if (n === 1) return `${formatted} ${one}`;
  const r = n % 100;
  return n === 0 || (r >= 1 && r <= 19) ? `${formatted} ${other}` : `${formatted} de ${other}`;
};

/** ONRC's N_VERSIUNE_CAEN: version 0 is the 1998 classification, 1 is 2003, 2 is 2008, 3 is 2025. */
const CAEN_YEARS = [1998, 2003, 2008, 2025];

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

/** The Signal card, its compact badge and the wording of each rule: label, sentence with the numbers filled in, lawful explanations. The rule labels everywhere else (facets, Record page) come from here. */
const signalCard: Copy["signalCard"] = {
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
    entityLink,
  },
  links: {
    reproduce: (n, f) => (n === 1 ? "Vezi înregistrarea" : `Vezi cele ${roCount(n, f, "înregistrare", "înregistrări")}`),
    seap: { check: "Verifică în SEAP", checkEach: "Verifică fiecare înregistrare în SEAP" },
    methodology: "Cum este detectat acest Semnal",
  },
};

export const ro: Copy = {
  brand: "Grivei.ai",
  nav: { label: "Principal", explore: "Explorează", search: "Căutare", coverage: "Acoperire", methodology: "Despre cifre" },
  footer: {
    provenance: "sursa: SEAP, prin exporturile trimestriale de pe data.gov.ro și colectarea de pe e-licitatie.ro · fiecare înregistrare trimite la documentul său sursă",
    signals: "Semnalele sunt numărate, niciodată notate cu un scor",
  },
  language: { groupLabel: "Limba", current: "RO", switchTo: "EN", switchLabel: "Versiunea în engleză a acestei pagini" },
  status: { loading: "Se încarcă…", failed: "Datele nu au putut fi încărcate." },
  main: { title: "Explorează cheltuielile publice", total: "Total atribuit", mapUnavailable: "Harta nu a putut fi încărcată." },
  sourceEyebrow: { search: "caută", scope: "național", period: "din 2021" },
  searchBar: { label: "Căutare", placeholder: "Caută în română, de ex. deszăpezire", hint: "Datele sunt în română. Încearcă deszăpezire, numele unei firme, un CUI cu sau fără RO sau un prefix CPV, de exemplu 45. Diacriticele, majusculele și formele juridice (SRL, SA) sunt ignorate.", clear: "Șterge căutarea", loading: "Se caută", minLengthHint: "Scrie cel puțin 2 caractere pentru a căuta." },
  results: {
    label: "Rezultate",
    tabs: { authorities: "Autorități", suppliers: "Furnizori", records: "Înregistrări" },
    empty: { authorities: "Nicio autoritate nu corespunde.", suppliers: "Niciun furnizor nu corespunde.", records: "Nicio înregistrare nu corespunde." },
    emptyLink: "Verifică ce a fost colectat",
    showAll: (_n, formatted) => `Arată toate cele ${formatted}`,
    goTo: { heading: "Mergi la pagină", open: "Deschide pagina", cui: "CUI", nameOnly: "identificat doar după denumire" },
    entityRow: {
      matched: "potrivit",
      cui: "CUI",
      records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
      national: "național",
      noCounty: "județ necunoscut",
      entityLink,
      signals: { label: (n, f) => roCount(n, f, "Semnal", "Semnale"), forEntity: (name) => `, ${name}` },
    },
    recordRow: {
      noValue: "fără valoare",
      valueCaption: { awarded: "valoare atribuită", ceiling: "plafon, neadunat" },
      channel: { DIRECT_PURCHASE: "Achiziție directă", CONTRACT: "Contract" },
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
      areaShare: (amount) => `Parte din asociere în selecție: ${amount}`,
    },
  },
  fullResults: {
    showing: (from, to, total) => `Se afișează ${from}–${to} din ${total}`,
    outOfRange: (pages, formatted) => `Această pagină este după ultima: ${pages === 1 ? "există doar 1 pagină" : `sunt doar ${roCount(pages, formatted, "pagină", "pagini")}`}.`,
    noRowsHere: "Nu sunt rezultate pe această pagină: numărul de mai sus este estimat.",
    firstPage: "Mergi la pagina 1",
    back: "Înapoi la rezultate",
    cite: { label: "Citează această vizualizare", copyLink: { label: "Copiază linkul", copied: "Link copiat", failed: "Linkul nu a putut fi copiat" } },
    order: { label: "ordine", options: { VALUE_DESC: "valoare, de la cea mai mare", DATE_DESC: "dată, cele mai noi întâi", DATE_ASC: "dată, cele mai vechi întâi" } },
    pagination: { label: "Paginile rezultatelor", previous: "Anterioara", next: "Următoarea", page: (n) => `Pagina ${n}` },
  },
  mainScreenLayout: {
    lens: { label: "Lentila hărții", money: "Bani", coverage: "Acoperire" },
    regions: { search: "Căutare", map: "Harta", results: "Rezultate" },
  },
  moneyLensMap: {
    map: { mapLabel: "Harta județelor", legendTitle: "Valoare atribuită", noData: "Fără date", areaLabel: (name, value) => `${name}: ${value}`, atMost: (value) => `până la ${value}` },
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
  },
  coverageLensMap: {
    map: { mapLabel: "Harta acoperirii pe județe", legendTitle: "Acoperire", noData: "Fără date", areaLabel: (name, value) => `${name}: ${value}`, atMost: (value) => `până la ${value}` },
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
        return k > 0 ? `${entities}, plus ${roCount(k, p.otherAuthoritiesText, "altă autoritate contractantă", "alte autorități contractante")}` : entities;
      },
      boughtNothingNote: "O entitate fără înregistrări poate pur și simplu să nu fi cumpărat nimic.",
    },
    tiles: {
      heading: "În afara hărții",
      national: "Național",
      unplaced: "Autorități neplasate",
      unplacedAuthorities: (n, f) => roCount(n, f, "autoritate fără județ", "autorități fără județ"),
      records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
      suspectLeftOut: (n, f) => roCount(n, f, "valoare suspectă exclusă", "valori suspecte excluse"),
    },
  },
  zoomedCounty: {
    map: {
      map: { mapLabel: "Harta UAT-urilor județului", legendTitle: "Valoare atribuită", noData: "Nicio autoritate nu a cumpărat", areaLabel: (name, value) => `${name}: ${value}`, atMost: (value) => `până la ${value}` },
      figures: {
        records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
        suspectLeftOut: (n, f) => roCount(n, f, "valoare suspectă exclusă", "valori suspecte excluse"),
      },
      authorities: (n, f) => roCount(n, f, "autoritate", "autorități"),
      circleKey: "Mărimea cercului: numărul de autorități",
      unknownUat: "Județ cunoscut, UAT necunoscut",
    },
    back: "Înapoi la România",
    title: (name, sectors) => (sectors ? `${name}: sectoare` : `${name}: UAT-uri`),
    selectedUat: (name) => `Rezultate pentru ${name}`,
    clearUat: "Arată tot județul",
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
    notFound: { title: "Pagina nu a fost găsită", back: "Înapoi la ecranul principal" },
    search: { title: "Căutare" },
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
  recordPage: {
    notFound: { title: "Înregistrarea nu a fost găsită", body: (code) => `Nicio înregistrare nu este publicată sub codul ${code}.` },
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
    cite: { label: "Adresa acestei înregistrări", copyLink: { label: "Copiază linkul", copied: "Link copiat", failed: "Linkul nu a putut fi copiat" } },
    badges: { heading: "Insigne și semnificația lor" },
    signals: {
      heading: "Semnalele din care face parte această înregistrare",
      rules: ruleLabels(signalCard.rules),
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
  entityPage: {
    layout: { label: "Secțiunile paginii", cite: { label: "Adresa acestei vizualizări", copyLink: { label: "Copiază linkul", copied: "Link copiat", failed: "Linkul nu a putut fi copiat" } }, tabs: { overview: "Prezentare generală", records: "Înregistrări", relationships: "Relații" } },
    header: {
      identity: {
        cui: "CUI",
        foreignVatId: "Cod TVA străin",
        nameOnly: { label: "Identificat doar după denumire", explanation: "Pentru acest furnizor nu există un CUI cunoscut de ANAF, deci este identificat după codul TVA străin sau după denumirea publicată. Cifrele pot amesteca entități omonime." },
        identityCurated: { label: "Identitate verificată manual", explanation: "O persoană a verificat și corectat identitatea acestei entități." },
        onrcOnly: { label: "Doar ONRC", explanation: "ANAF nu cunoaște acest CUI. ONRC, registrul comerțului, îl listează, deci această pagină arată numele și datele din ONRC." },
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
    onrc: {
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
    notFound: { title: "Entitatea nu a fost găsită", body: "Nicio autoritate sau furnizor nu este publicat sub această cheie." },
    relationships: {
      lens: { label: "Afișare", options: { graph: "Graf", flow: "Flux de bani" } },
      tab: {
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
      },
      flow: {
        map: { mapLabel: "Harta fluxului de bani pe județe", legendTitle: "Flux", noData: "Fără bani" },
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
      },
    },
    overview: {
      headline: {
        label: "Cifre principale", total: "Total atribuit", counterparties: "Contraparți", topShare: (p) => `Cea mai mare deține ${p} din total`,
        directPurchase: "Pondere prin achiziție directă", signals: "Semnale",
      },
      signals: { heading: (_n, f) => `Semnale (${f})`, empty: "Niciun semnal pentru această entitate." },
      counterparties: { heading: "Contraparți", records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"), more: (_n, f) => `și încă ${f}`, empty: "Nicio contraparte în această selecție." },
      procedures: { heading: "Tipuri de procedură", records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"), empty: "Nicio procedură în această selecție." },
      consortia: {
        heading: "Asocieri", convention: "Partea egală a fiecărui membru este o convenție de calcul, nu o cifră publicată de SEAP.",
        share: (amount) => `parte egală ${amount}`, records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"),
      },
      frameworks: {
        heading: "Acorduri-cadru",
        line: (n, f, ceilings, reported) => `${roCount(n, f, "acord-cadru", "acorduri-cadru")}, plafoane ${ceilings}, contracte subsecvente raportate ${reported}`,
        none: "Niciun acord-cadru.", note: "Plafoanele nu sunt bani atribuiți și nu intră în total.",
      },
      largest: { heading: "Cele mai mari înregistrări", note: "Doar înregistrările numărate: valorile suspecte și plafoanele acordurilor-cadru nu apar aici.", empty: "Nicio înregistrare numărată în această selecție." },
      aliases: {
        heading: "Apare în SEAP ca", intro: "Fiecare denumire sub care SEAP a publicat această entitate.",
        records: (n, f) => roCount(n, f, "înregistrare", "înregistrări"), range: (a, b) => `prima oară ${a}, ultima oară ${b}`, singleDay: (d) => `doar la ${d}`,
      },
    },
    signalPages: { label: "Paginile Semnalelor", previous: "Anterioara", next: "Următoarea", page: (n) => `Pagina ${n}` },
    signalOrder: { label: "Ordinea Semnalelor", options: { DATE_DESC: "după dată", VALUE_DESC: "după RON" } },
    recordsNoRole: { authority: "Această entitate nu are Înregistrări ca autoritate contractantă.", supplier: "Această entitate nu are Înregistrări ca furnizor." },
    recordsTab: {
      heading: "Înregistrări",
      table: { label: "Înregistrările entității", columns: { record: "Înregistrare", title: "Titlu", value: "Valoare" } },
      facets: {
        label: "Filtre pe fațete",
        groups: {
          signal: "Semnal", channel: "Canal", procedure: "Procedură", year: "Anul atribuirii",
          counterpartyOfAuthority: "Furnizor", counterpartyOfSupplier: "Autoritate contractantă", badge: "Insigne",
        },
        option: (label, count) => `${label} (${count})`,
        counterpartyKey: (key) => `Contraparte ${key}`,
        signals: ruleLabels(signalCard.rules),
      },
      empty: { text: "Nicio înregistrare nu se potrivește cu aceste filtre.", clear: "Șterge filtrele" },
      onlyMatching: { query: (q) => `doar înregistrările care se potrivesc cu „${q}”`, filters: "doar înregistrările care se potrivesc filtrelor căutării" },
    },
  },
  signalCard,
  methodology: methodologyRo,
  /** The Coverage page (`/explore/coverage`) and the compact grid on the Coverage lens. */
  coverage: {
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
  },
};
