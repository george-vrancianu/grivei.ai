import type { MethodologyPageCopy } from "@grivei/ui";

/** Pagina de metodologie, „Despre cifre”: aceleași secțiuni și aceleași ancore ca în engleză. */
export const methodologyRo: MethodologyPageCopy = {
  title: "Despre cifre",
  intro:
    "Fiecare cifră din explorator vine din SEAP, sistemul electronic de achiziții publice, și este calculată după o singură regulă peste tot: totaluri, hartă, clasamente, harta fluxurilor și Semnale. Pagina aceasta spune care este regula. Cifrele din secțiunile Semnalelor sunt recalculate la fiecare încărcare a datelor.",
  contents: "Pe această pagină",
  sections: {
    awardedValue: {
      heading: "Valoarea atribuită",
      paragraphs: [
        "Singura măsură bănească pe care o adună exploratorul este valoarea atribuită: valoarea cu care a fost atribuită o înregistrare, în RON, așa cum o publică SEAP. Nu este suma plătită, iar modificările ulterioare ale contractelor nu sunt incluse.",
        "Totalul unei autorități contractante numără fiecare înregistrare o singură dată, indiferent câte loturi sau câștigători are. Totalul unui furnizor numără partea furnizorului (vezi Părți din asociere).",
        "Valoarea din sursă nu este niciodată modificată. Când o valoare este lăsată în afara unei sume, înregistrarea rămâne afișată și spune de ce.",
      ],
    },
    frameworkCeilings: {
      heading: "Plafoane de acord-cadru",
      paragraphs: [
        "Un acord-cadru („Cu acord cadru”) stabilește un plafon: valoarea maximă care poate fi atribuită în baza lui. Plafonul este afișat pe înregistrarea sa, dar nu se adună niciodată la un total, pentru că se numără contractele atribuite în baza acordului.",
        "Un contract atribuit în baza unui acord-cadru („Cu acord cadru subsecvent”) este un contract subsecvent și se numără. El arată acordul-cadru din care face parte: cel care are același număr de anunț de atribuire, cu plafonul și cât din el consumă contractele subsecvente raportate până acum. Un contract subsecvent al cărui acord-cadru nu se află în date se numără oricum și nu arată plafon. Un contract „Fără acord cadru” se numără ca de obicei.",
        "Mai multe contracte-cadru din același anunț de atribuire formează un singur acord, iar plafonul său este suma lor. Înregistrările citite de pe site-ul SEAP în trimestrul curent nu spun dacă fac parte dintr-un acord-cadru, așa că se numără ca niște contracte obișnuite. Un acord-cadru fără valoare publicată nu are plafon cu care să fie comparat.",
      ],
    },
    consortiumShares: {
      heading: "Părți din asociere",
      paragraphs: [
        "Când mai mulți furnizori câștigă împreună o atribuire, înregistrarea arată valoarea integrală și toți membrii. Partea autorității contractante numără atribuirea o singură dată, integral.",
        "Pe pagina unui furnizor, fiecare membru primește o parte egală din valoare. Este o convenție pentru totalurile pe partea furnizorilor, nu un fapt din sursă: SEAP nu publică cum își împarte o asociere banii. Când valoarea nu se împarte exact, banii rămași merg câte unul primilor membri, în ordinea publicată, astfel încât părțile se adună mereu la valoarea întreagă.",
      ],
    },
    suspectValues: {
      heading: "Valori suspecte",
      paragraphs: [
        "Unele valori publicate sunt foarte probabil erori de introducere. O regulă publicată le marchează; o înregistrare marcată rămâne afișată, căutabilă și etichetată „Valoare suspectă”, iar valoarea ei este lăsată în afara oricărei sume și a oricărui Semnal. Fiecare total spune câte înregistrări a lăsat deoparte și trimite la ele. Valoarea din sursă nu este corectată niciodată.",
        "Două reguli marchează o valoare:",
      ],
      items: [
        "O achiziție directă (DA sau DAN) de zece ori plafonul legal pentru data și tipul ei, sau mai mult. Plafoanele (Legea 98/2016, fără TVA) sunt 135.060 RON pentru bunuri și servicii și 450.200 RON pentru lucrări până la 9 septembrie 2022, respectiv 270.120 RON și 900.400 RON de la 10 septembrie 2022. Data atribuirii decide care se aplică. Lucrările se recunosc după tipul de contract sau după diviziunea CPV 45; diviziunea CPV 70 (chirii) nu este marcată niciodată. Valorile se compară așa cum sunt publicate, fără ajustare pentru TVA.",
        "Un contract sau un anunț de atribuire de 1 miliard RON sau mai mult este verificat față de valoarea lui estimată, căutată pe e-licitatie: la o sută de ori estimarea sau mai mult este marcat, iar peste 50 de miliarde RON fără estimare este marcat și el. Unul a cărui estimare nu a fost încă căutată este numărat.",
      ],
    },
    blankValues: {
      heading: "Valori lipsă",
      paragraphs: [
        "Când SEAP nu publică nicio valoare pentru o înregistrare, sau publică valoarea zero, înregistrarea spune „Fără valoare în SEAP”. Se numără ca înregistrare și nu adaugă nimic la nicio sumă. O valoare lipsă nu este o valoare suspectă și nu se citește ca zero cheltuit.",
      ],
    },
    contractModifications: {
      heading: "Modificările contractelor",
      paragraphs: [
        "Schimbările ulterioare ale unui contract (lucrări în plus, durată mai lungă, preț nou) nu sunt încărcate. Valoarea atribuită este valoarea atribuirii așa cum a fost publicată, deci suma plătită până la urmă poate diferi de ea. Excepția este descrisă în secțiunea următoare.",
      ],
    },
    backfilledValues: {
      heading: "Valorile înregistrărilor 2021–22 completate ulterior",
      paragraphs: [
        "Pentru 2023 încoace, exploratorul citește fișierele în bloc publicate de SEAP. Pentru 2021 și 2022 citește de pe e-licitatie, printr-o parcurgere unică, contractele atribuite prin negociere fără publicare prealabilă și alte câteva proceduri.",
        "Parcurgerea returnează valoarea curentă a unui anunț, așa că un anunț modificat de la atribuire arată valoarea modificată. Valorile acestor înregistrări sunt „la data parcurgerii”, nu strict valoarea de la atribuire, iar fiecare poartă în proveniență data parcurgerii. Se numără în totaluri ca orice altă înregistrare și poartă eticheta „Nu e în datele în bloc”.",
        "Înregistrările citite din SEAP în trimestrul curent, înainte să existe fișierele în bloc, poartă eticheta „Provizoriu” și se pot schimba când sosesc datele oficiale.",
      ],
    },
    supplierIdentity: {
      heading: "Identitatea furnizorului",
      paragraphs: [
        "Un furnizor este un CUI pe care îl cunoaște ANAF. Un CUI contează doar dacă trece cifra de control românească și ANAF îl găsește; denumirea furnizorului este cea de la ANAF, iar fiecare variantă folosită de SEAP este păstrată ca alias. Aliasurile nu unesc niciodată doi furnizori. Sucursalele, societățile din același grup și societățile fuzionate sunt entități separate, cu starea lor ANAF marcată.",
        "Un furnizor fără CUI cunoscut de ANAF (mai ales firme străine și asocieri) este identificat prin codul de TVA străin sau, în lipsă, prin denumirea publicată, iar pagina lui spune asta. O persoană fizică ce câștigă o înregistrare apare doar ca „Persoană fizică”: nu este numită și nu are pagină. Înregistrarea se numără totuși pe partea autorității.",
        "Două etichete marchează date care se contrazic. „CUI neconcordant”: CUI-ul furnizorului este chiar CUI-ul autorității, ceea ce nu poate fi corect, deci furnizorul este tratat ca nerezolvat. „Denumire diferită de ANAF”: denumirea publicată de SEAP nu seamănă cu cea pe care o are ANAF pentru acel CUI; înregistrarea rămâne legată prin CUI.",
        "Câteva identități sunt corectate manual, de exemplu cele mai mari contracte publicate fără CUI și CUI-urile evident greșite. Aceste corecturi se află într-un singur fișier ținut în depozitul de cod al proiectului, fiecare intrare este verificată și are un motiv scris, iar niciuna nu desparte vreodată o asociere în membrii ei. O înregistrare sau o entitate atinsă de o corectură spune „Verificat manual”.",
      ],
    },
    placement: {
      heading: "Amplasarea",
      paragraphs: [
        "Fiecare autoritate contractantă și fiecare furnizor este amplasat într-un județ (coduri ISO 3166-2:RO, București ca B) și, când se poate stabili, într-o UAT, după codul SIRUTA. Decide adresa din registrul TVA al ANAF. Pentru o autoritate pe care ANAF nu o amplasează, varianta de rezervă este pagina proprie a entității în SEAP. Pagina entității spune ce sursă a amplasat-o.",
        "O autoritate națională (minister, agenție națională, companie națională) nu este amplasată în București: apare lângă hartă. Care autorități sunt naționale rezultă din tipul de cumpărător publicat de SEAP pe anunțurile de atribuire și dintr-o listă verificată, ținută în depozitul de cod, cu un motiv pentru fiecare intrare. O autoritate pe care nicio sursă nu o amplasează într-un județ stă într-un tab separat, cu înregistrările și valoarea lor. Furnizorii străini rămân în afara hărții, într-o categorie proprie pe partea furnizorilor.",
      ],
    },
    coverageStatuses: {
      heading: "Stări de acoperire",
      paragraphs: [
        "Lentila Acoperire colorează fiecare județ, pentru fiecare Sursă, ca recoltat, recoltat cu lacune cunoscute, parțial sau nerecoltat. Spune dacă recolta este destul de completă ca să te poți baza pe lentila Bani în acel județ; nu măsoară niciodată cât cumpără o autoritate. Gri înseamnă nerecoltat, nu „fără cheltuieli”.",
        "O lacună cunoscută este o perioadă și un tip de înregistrare pentru care înregistrările unei Surse lipsesc sau pot fi incomplete, fie marcate de o regulă publicată, fie introduse manual cu un motiv scris.",
      ],
    },
  },
  signals: {
    heading: "Regulile Semnalelor",
    paragraphs: [
      "Un Semnal este un set de înregistrări potrivite de o regulă publicată, care merită verificate în documentele-sursă. Nu este niciodată o concluzie sau o acuzație: fiecare regulă descrie un tipar, iar un tipar poate avea o explicație obișnuită. Semnalele se numără, nu se notează și nu se clasifică.",
      "Un Semnal este datat după cea mai recentă înregistrare a sa. Fiecare Semnal trimite la un filtru al tabului Înregistrări care îl reproduce și la înregistrarea din SEAP. O valoare pe care regula de calcul o lasă în afara sumelor nu declanșează niciodată un Semnal și nu se numără în el. Sunt patru reguli; pentru fiecare, fereastra este perioada înregistrărilor la care se uită regula, iar rata națională de bază este ponderea autorităților contractante care au avut cel puțin un Semnal din acea regulă în anul de bază, dintre cele care au avut în acel an înregistrări la care se uită regula. Ambele sunt recalculate la fiecare încărcare a datelor.",
    ],
  },
  rules: {
    OVER_CAP: {
      heading: "Peste plafon",
      paragraphs: ["Peste plafon: o achiziție directă peste plafonul legal pentru data și tipul ei și sub de zece ori plafonul."],
      items: [
        "Doar achiziții directe (DA și DAN). Plafonul este cel în vigoare la data atribuirii, pentru tipul achiziției: 135.060 RON pentru bunuri și servicii și 450.200 RON pentru lucrări până la 9 septembrie 2022, apoi 270.120 RON și 900.400 RON (Legea 98/2016, fără TVA). Lucrările se recunosc după tipul de contract sau după diviziunea CPV 45.",
        "Strict peste plafon: o valoare exact egală cu plafonul se încadrează în el. La de zece ori plafonul sau mai mult, valoarea este tratată de regula de calcul și nu apare niciun Semnal.",
        "Diviziunea CPV 70 (chirii) este exceptată, iar o înregistrare fără valoare nu are cu ce să fie comparată.",
        "Un Semnal pentru fiecare autoritate și zi de atribuire; dacă mai multe achiziții se califică în aceeași zi, Semnalul o arată pe cea mai mare.",
      ],
      lawful: "Explicații legale posibile: o achiziție subsecventă unui acord-cadru, o excepție prevăzută de lege sau o eroare de introducere a valorii ori a tipului înregistrării.",
    },
    SPLITTING: {
      heading: "Fracționare",
      paragraphs: ["Fracționare: două sau mai multe achiziții directe care rămân fiecare la plafon sau sub el, dar împreună îl depășesc, ceea ce poate însemna o achiziție tăiată în bucăți."],
      items: [
        "Aceeași autoritate contractantă, același furnizor și aceeași grupă CPV (primele trei cifre ale codului CPV).",
        "Date de atribuire la cel mult 30 de zile una de alta: prima și ultima achiziție sunt la cel mult 30 de zile calendaristice distanță, numărând ambele zile.",
        "Fiecare achiziție la plafon sau sub plafonul de la data și tipul ei, iar suma peste plafonul în vigoare la data ultimei achiziții.",
        "Ferestrele care au o zi în comun se unesc într-un singur Semnal, de la prima achiziție la ultima. Ferestrele care nu se suprapun sunt Semnale separate.",
        "Rămân în afara regulii: diviziunea CPV 70, înregistrările fără valoare, persoanele fizice și înregistrările cu asociere.",
      ],
      lawful: "Explicații legale posibile: nevoi distincte, linii bugetare distincte sau produse fără legătură din aceeași grupă CPV.",
    },
    FRAMEWORK_OVERRUN: {
      heading: "Depășirea acordului-cadru",
      paragraphs: ["Depășirea acordului-cadru: contractele subsecvente raportate în baza unui acord-cadru însumează peste 110% din plafonul lui."],
      items: [
        "Acordul-cadru este un anunț de atribuire: plafonul lui este suma valorilor contractelor-cadru, iar contractele lui subsecvente sunt cele din același număr de anunț.",
        "Doar acorduri-cadru atribuite începând cu 1 ianuarie 2021, cu un plafon care nu este gol.",
        "Strict peste 110%: exact 110% nu este Semnal.",
        "Semnalul este datat după contractul subsecvent care a dus primul suma curentă peste 110% și cuprinde înregistrările de plafon și contractele subsecvente până la acela. Cifrele lui descriu acordul așa cum este raportat până la data până la care sunt încărcate datele, deci înregistrările listate pot însuma mai puțin decât totalul subsecvent afișat.",
      ],
      lawful: "Explicații legale posibile: indexarea prețurilor sau modificările permise de lege.",
    },
    NO_PUBLICATION: {
      heading: "Fără publicare",
      paragraphs: ["Fără publicare: un contract atribuit prin negociere fără publicare prealabilă („Negociere fără publicare prealabilă”), indiferent de valoare."],
      items: [
        "Doar contracte și anunțuri de atribuire, după procedura așa cum o publică SEAP. O achiziție directă nu are procedură. Alte proceduri fără anunț prealabil, precum „Norme proprii”, nu fac parte din această regulă.",
        "Citit din fișierele în bloc începând cu 2023, din parcurgerea trimestrului curent și, odată încărcat, din completarea 2021–22; fereastra arată de unde încep datele.",
        "Un Semnal pentru fiecare autoritate și zi de atribuire.",
      ],
      lawful: "Explicații legale posibile: urgența, un singur furnizor posibil sau un alt temei legal.",
    },
  },
  baseRate: {
    windowLabel: "Fereastra de timp",
    range: (from, to) => `${from} – ${to}`,
    openStart: (to) => `De la prima înregistrare încărcată până la ${to}`,
    rateLabel: "Cât de des apare la nivel național",
    rate: (percent, year) => `${percent} dintre autoritățile contractante au avut cel puțin unul în ${year}.`,
    none: (year) => `Nicio autoritate contractantă nu a avut vreunul în ${year}.`,
    dataThrough: (date) => `Date până la ${date}`,
    loading: "Se încarcă fereastra și cifra națională…",
    error: "Fereastra și cifra națională nu au putut fi încărcate. Regula de mai sus rămâne valabilă.",
    missing: "Nu există încă o cifră națională pentru această regulă.",
  },
};
