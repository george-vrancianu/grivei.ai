import { withAmounts, type MethodologyPageCopy } from "@grivei/ui";

/** Pagina de metodologie, „Despre cifre”: aceleași secțiuni și aceleași ancore ca în engleză. */
export const methodologyRo: MethodologyPageCopy = {
  eyebrow: "despre cifre",
  title: "Despre cifre",
  intro:
    "Fiecare înregistrare și fiecare sumă din explorator vine din SEAP, sistemul electronic de achiziții publice, și este calculată după o singură regulă peste tot: totaluri, hartă, clasamente, fluxul de bani și Semnale. Pagina aceasta spune care este regula. Cifrele din secțiunile Semnalelor sunt recalculate la fiecare încărcare a datelor.",
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
        "Mai multe contracte-cadru din același anunț de atribuire formează un singur acord, iar plafonul său este suma lor. Înregistrările citite de pe site-ul SEAP (cele din trimestrul curent și cele completate pentru 2021–22) nu spun dacă fac parte dintr-un acord-cadru, așa că se numără ca niște contracte obișnuite. Un acord-cadru fără valoare publicată nu are plafon cu care să fie comparat.",
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
        withAmounts((a, b, c, d) => `O achiziție directă (DA sau DAN) de zece ori plafonul legal pentru data și tipul ei, sau mai mult. Plafoanele (Legea 98/2016, fără TVA) sunt ${a} pentru bunuri și servicii și ${b} pentru lucrări până la 9 septembrie 2022, respectiv ${c} și ${d} de la 10 septembrie 2022. Data atribuirii decide care se aplică. Lucrările se recunosc după tipul de contract sau după diviziunea CPV 45; diviziunea CPV 70 (chirii) nu este marcată niciodată. Valorile se compară așa cum sunt publicate, fără ajustare pentru TVA.`, ["13506000", "45020000", "27012000", "90040000"]),
        withAmounts((a, b) => `Un contract sau un anunț de atribuire de ${a} sau mai mult este verificat față de valoarea lui estimată, căutată pe e-licitatie: la o sută de ori estimarea sau mai mult este marcat, iar peste ${b} fără estimare este marcat și el. Unul a cărui estimare nu a fost încă căutată este numărat.`, ["100000000000", "5000000000000"]),
      ],
    },
    blankValues: {
      heading: "Valori lipsă",
      paragraphs: [
        "Când SEAP nu publică nicio valoare pentru o înregistrare, sau publică valoarea zero, înregistrarea spune „Nicio valoare în SEAP”. Se numără ca înregistrare și nu adaugă nimic la nicio sumă. O valoare lipsă nu este o valoare suspectă și nu se citește ca zero cheltuit.",
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
        "Achizițiile directe, contractele și anunțurile de atribuire din 2021 încoace vin din fișierele publice în masă ale SEAP. Aceste fișiere nu cuprind contractele din 2021 și 2022 atribuite prin negociere fără publicare prealabilă și alte câteva proceduri; exploratorul le citește de pe e-licitatie, printr-o parcurgere unică, împreună cu puținele anunțuri mai noi care lipsesc din fișierele în masă.",
        "Parcurgerea returnează valoarea curentă a unui anunț, așa că un anunț modificat de la atribuire arată valoarea modificată. Valorile acestor înregistrări completate ulterior sunt „la data parcurgerii”, nu strict valoarea de la atribuire, iar fiecare poartă în proveniență data parcurgerii. Se numără în totaluri ca orice altă înregistrare și poartă eticheta „Absent din datele în masă”.",
        "Înregistrările citite din SEAP în trimestrul curent, înainte să existe fișierele în masă, poartă eticheta „Provizoriu” și se pot schimba când sosesc datele oficiale.",
      ],
    },
    supplierIdentity: {
      heading: "Identitatea furnizorului",
      paragraphs: [
        "Un furnizor este un CUI pe care îl cunoaște ANAF. Un CUI contează doar dacă trece cifra de control românească și ANAF îl găsește; denumirea furnizorului este cea de la ANAF, iar fiecare variantă folosită de SEAP este păstrată ca alias. Aliasurile nu unesc niciodată doi furnizori. Sucursalele, societățile din același grup și societățile fuzionate sunt entități separate, cu starea lor ANAF marcată.",
        "Un furnizor fără CUI cunoscut de ANAF (mai ales firme străine și asocieri) este identificat prin codul de TVA străin sau, în lipsă, prin denumirea publicată, iar pagina lui spune asta. O persoană fizică ce câștigă o înregistrare apare doar ca „Persoană fizică”: nu este numită și nu are pagină. Înregistrarea se numără totuși pe partea autorității.",
        "Două etichete marchează date care se contrazic. „CUI neconcordant”: CUI-ul furnizorului este chiar CUI-ul autorității, ceea ce nu poate fi corect, deci furnizorul este tratat ca nerezolvat. „Denumire diferită de ANAF”: denumirea publicată de SEAP nu seamănă cu cea pe care o are ANAF pentru acel CUI; înregistrarea rămâne legată prin CUI.",
        "Câteva identități sunt corectate manual, de exemplu cele mai mari contracte publicate fără CUI și CUI-urile evident greșite. Aceste corecturi se află într-un singur fișier ținut în depozitul de cod al proiectului, fiecare intrare este verificată și are un motiv scris, iar niciuna nu desparte vreodată o asociere în membrii ei. O înregistrare sau o entitate atinsă de o corectură spune „Identitate verificată manual”.",
      ],
    },
    placement: {
      heading: "Amplasarea",
      paragraphs: [
        "Fiecare autoritate contractantă și fiecare furnizor este amplasat într-un județ (coduri ISO 3166-2:RO, București ca B) și, când se poate stabili, într-o UAT, după codul SIRUTA. Decide adresa din registrul TVA al ANAF. Pentru o autoritate pe care ANAF nu o amplasează, varianta de rezervă este pagina proprie a entității în SEAP. Pagina entității spune ce sursă a amplasat-o.",
        "O autoritate națională (minister, agenție națională, companie națională) nu este amplasată în București: apare lângă hartă. Care autorități sunt naționale rezultă din tipul de cumpărător publicat de SEAP pe anunțurile de atribuire și dintr-o listă verificată, ținută în depozitul de cod, cu un motiv pentru fiecare intrare. O autoritate pe care nicio sursă nu o amplasează într-un județ stă într-o casetă proprie, lângă hartă, cu înregistrările și valoarea lor. Furnizorii străini rămân în afara hărții, într-o categorie proprie pe partea furnizorilor.",
      ],
    },
    coverageStatuses: {
      heading: "Stări de acoperire",
      paragraphs: [
        "Lentila Acoperire colorează fiecare județ, pentru fiecare Sursă, ca recoltat, recoltat cu lacune cunoscute, parțial sau nerecoltat. Spune dacă recolta este destul de completă ca să te poți baza pe lentila Bani în acel județ; nu măsoară niciodată cât cumpără o autoritate. Gri înseamnă nerecoltat, nu „fără cheltuieli”.",
        "O lacună cunoscută este o perioadă și un tip de înregistrare pentru care înregistrările unei Surse lipsesc sau pot fi incomplete, fie marcate de o regulă publicată, fie introduse manual cu un motiv scris.",
      ],
    },
    publicEnterprises: {
      heading: "Întreprinderi publice (AMEPIP)",
      paragraphs: [
        "Pagina unei organizații spune „întreprindere publică (AMEPIP)” când CUI-ul ei apare în tabelele de indicatori pe care AMEPIP le publică ca date deschise: societățile cărora li se aplică Ordonanța de urgență nr. 109/2011 privind guvernanța corporativă a întreprinderilor publice. AMEPIP este Agenția pentru Monitorizarea și Evaluarea Performanțelor Întreprinderilor Publice. Potrivirea se face doar după CUI, niciodată după nume, iar pagina arată rândul din tabel pe care se sprijină, cu anii financiari pentru care apare.",
        "AMEPIP nu are o listă proprie de CUI-uri: exploratorul citește CUI-urile din cea mai nouă ediție a indicatorilor financiari și de guvernanță pe care AMEPIP o publică pe data.gov.ro, sub licența CC-BY-4.0. O ediție cuprinde mai mulți ani financiari, iar o societate este marcată dacă apare în oricare dintre ei. Așadar o societate privatizată, fuzionată sau scoasă din monitorizare într-un an anterior al ediției rămâne marcată, motiv pentru care pagina arată anii pentru care apare. AMEPIP publică o ediție o dată sau de două ori pe an, așa că o societate devenită între timp întreprindere publică poate să nu fie încă marcată. Lipsa marcajului spune doar că CUI-ul nu se află în ediția pe care o avem, nu că societatea este privată. Denumirea, numărul de înregistrare și starea ONRC apar așa cum le scrie AMEPIP.",
        "Ce lasă lista deoparte: cuprinde doar societățile pe care AMEPIP le monitorizează potrivit acelei ordonanțe și care apar în tabelele ei de indicatori. O societate a statului sau a unei autorități locale, dar în afara ordonanței, sau una pentru care AMEPIP nu a publicat indicatori, nu se află în ea. Exploratorul citește doar CUI-ul, denumirea, numărul de înregistrare, starea și anii așa cum îi scrie AMEPIP, și nimic despre proprietar, cota deținută sau consiliul de administrație. AMEPIP publică fără un calendar fix, așa că lista poate fi depășită; data ediției este arătată mai jos.",
      ],
    },
    partyAndLeadership: {
      heading: "Partid și conducere (AEP)",
      paragraphs: [
        "Pagina unei autorități poate arăta o Listă a conducerii, iar o înregistrare poate arăta un Partid, pentru primării, sectoarele Bucureștiului, Primăria Generală a Municipiului București și consiliile județene. Exploratorul citește câștigătorul din voturile din procesele-verbale finale ale Autorității Electorale Permanente (AEP) pentru alegerile locale din 2020 și 2024, turul de repetare din octombrie 2020 din trei comune și alegerile parțiale din decembrie 2025. Partidul unui mandat este lista pe care a candidat liderul, exact așa cum a fost înscrisă la acele alegeri. Un independent nu candidează pe nicio listă, așa că se afișează „Independent”, care nu este niciodată partid; o alianță își păstrează denumirea înregistrată, cu partidele membre înregistrate acolo unde le cunoaștem; iar familii de partide nu există (ALDE nu este numărat ca PNL). Este posibil ca un lider să-și fi schimbat partidul de la alegeri încoace: nicio sursă nu înregistrează schimbările, așa că pagina nu pretinde niciodată un partid actual, iar liderii nu sunt legați niciodată de o pagină de persoană.",
        "Un mandat durează de la jurământ până la jurământul succesorului. AEP nu publică date ale jurământului pe comune, așa că presupunem jurământul la 30 de zile după alegeri (iar pentru 2024, după 27 septembrie 2024, când au încetat mandatele din 2020). Ce rămâne între două mandate apare ca gol și nu este atribuit niciodată celui mai apropiat lider: fereastra de predare din toamna lui 2024, un lider interimar după o vacanță (mandatul pe care îl avem este tăiat la data vacanței, acolo unde o cunoaștem, iar altfel, ca presupunere, cu 90 de zile înainte de alegerile parțiale, ceea ce este doar cel mai devreme moment obișnuit al unei vacanțe) și un mandat fără rezultate (o autoritate fără câștigător în procesele-verbale, sau egalitate). Nu avem alegerile parțiale din mai 2025 și nici pe cele din 2021–2023, iar data vacanței o cunoaștem doar pentru câteva autorități: pentru orice altă vacanță mandatul liderului anterior rămâne deschis, iar Partidul lui poate fi afișat și pentru înregistrările de după vacanță, deci un Partid din preajma unei schimbări de lider nu este o certitudine. Rezultatele din decembrie 2025 sunt rezultate parțiale dintr-un fișier unic (copia Code for Romania a site-ului AEP), niciodată reîmprospătat automat; data până la care merg este afișată mai jos.",
        "Partidul unei înregistrări este Partidul mandatului în funcție la data atribuirii, la autoritatea ei. Un organism subordonat îl moștenește când ordonatorul lui principal de credite, în lista entităților publice a Ministerului Finanțelor, este exact o primărie, un sector, o primărie generală sau un consiliu județean, iar fiecare instantaneu lunar păstrat al listei care îl menționează spune același lucru: pagina arată atunci „prin autoritate, ordonator principal de credite, lista MF din data, relație de finanțare, legătură actuală”. O școală (finanțată dublu, cu un minister printre ordonatori), o companie municipală, o asociație de dezvoltare intercomunitară (ADI), un organism a cărui legătură este contrazisă de un instantaneu păstrat și administrația centrală nu au Partid. Un furnizor nu are niciodată Partid.",
        "Filtrul de partid din căutare păstrează înregistrările al căror Partid este lista aleasă de dumneavoastră, exact așa cum a fost înscrisă. O alianță se potrivește sub propria denumire și niciodată printr-unul dintre partidele ei membre, iar „Independent” nu este oferit niciodată ca partid. Înregistrările organismelor subordonate care moștenesc un Partid sunt incluse; nu există o vedere doar cu cele directe. Totalul de sub filtru spune ce acoperă: înregistrările potrivite și valoarea lor, împărțite între autoritățile conduse direct și organismele subordonate, ce lasă filtrul pe dinafară (alte liste, lideri independenți și înregistrări fără niciun Partid) și ponderea din valoarea setului căreia nu i se atribuie niciun partid. Citiți-l drept atribuirile autorităților conduse de o listă, niciodată ca toți banii publici.",
        "Un Partid este lista de la alegeri, niciodată una de mai târziu. Pentru un organism subordonat el se sprijină și pe o legătură de azi: Lista entităților publice a Ministerului Finanțelor este un instantaneu lunar, iar exploratorul ține doar câteva, fiindcă aduce de fiecare dată pe cel mai nou. Legătura citită din ele se aplică tuturor înregistrărilor organismului din ferestrele de mandat pe care le deținem, oricând au fost atribuite, așa că un organism care a avut alt ordonator principal în 2020 sau 2021 arată, pentru acele atribuiri, Partidul autorității de azi. O legătură asupra căreia două instantanee păstrate nu concordă este abandonată, dar cu un singur instantaneu păstrat o schimbare de ordonator nu poate fi văzută. De aceea un asemenea Partid este etichetat ca derivat, numărat separat de autoritățile conduse direct în Totalul de sub filtrul de Partid și descris ca relație de finanțare și legătură actuală.",
      ],
    },
    financialStatements: {
      heading: "Situații financiare (MF)",
      paragraphs: [
        "Pagina unui furnizor arată situațiile lui financiare anuale pe ani: cifra de afaceri, profitul sau pierderea, datoriile, capitalurile și numărul mediu de salariați. Provin din fișierele de date în masă pe care Ministerul Finanțelor (MF) le publică pe data.gov.ro, sub licența CC-BY-4.0, câte un set pe an fiscal, începând cu anul fiscal 2021. Exploratorul citește fișierele societăților: bilanț lung și scurt, formatul prescurtat și raportorii IFRS. Băncile, asigurătorii, fondurile și organizațiile non-profit depun alte formulare și nu sunt afișate. Fiecare rând numește MF și fișierul din care au fost citite cifrele. Sumele sunt în RON, așa cum au fost depuse, iar profitul sau pierderea este profitul net minus pierderea netă.",
        "MF publică fișierele unui an în iunie anul următor și le republică după un an, cu corecturi. Fiecare rând spune din ce publicare provine: un an republicat de MF arată cifrele revizuite, iar cel mai recent an este prima publicare și poate fi încă revizuit. O celulă lăsată goală de MF se afișează „nedeclarat”, niciodată zero: un număr mediu de salariați necompletat nu înseamnă o firmă fără salariați. O societate care nu a depus pentru un an nu are rând pentru acel an.",
        "Lângă cifre, pagina arată atribuirile aceluiași an calendaristic și ponderea lor în cifra de afaceri a anului. Este context, niciodată un Semnal, și nu se adună niciodată la valoarea atribuită: situațiile unei societăți și atribuirile ei sunt măsuri diferite și rămân separate. Atribuirile sunt valoarea atribuită a furnizorului, numărată după aceeași regulă ca orice alt total, după anul datei atribuirii. Valoarea întreagă a unui contract se numără în anul atribuirii, oricâți ani ar dura, așa că ponderea poate depăși 100% și nu este o pondere din veniturile societății. O cifră de afaceri necompletată sau zero nu dă nicio pondere.",
        // #187: the 24% is a placeholder taken from the ticket text, not measured; re-measure on the national build and update here, in the other language and in methodology.test.ts.
        "Trei limite însoțesc cifrele. În primul rând, golurile sunt frecvente: aproximativ un sfert dintre rânduri (24%) nu declară cifra de afaceri, iar numărul de salariați lipsește și el uneori; ambele apar ca „nedeclarat”, iar fără cifra de afaceri, sau cu una zero ori negativă, nu există pondere în cifra de afaceri. În al doilea rând, cifrele sunt așa cum le-au depus societățile și le-a publicat MF, iar exploratorul nu le verifică și nu le corectează: o greșeală de tastare sau o cifră de afaceri negativă apare așa cum a fost publicată. În al treilea rând, o primă publicare este revizuită cel mult o dată: MF republică fișierele unui an un an mai târziu, iar rândul revizuit îl înlocuiește pe cel din prima publicare doar pentru societățile pe care le conține fișierul revizuit, așa că anul altei societăți rămâne prima publicare, etichetat ca atare. Regulile de Semnal care citesc aceste cifre spun cum tratează un gol și cel mai recent an.",
      ],
    },
    firmDonations: {
      heading: "Donații ale firmelor (BaniPartide)",
      paragraphs: [
        "Pagina unei organizații listează donațiile și împrumuturile pe care companiile le-au făcut partidelor, când CUI-ul companiei apare în tabelul BaniPartide cu donatorii-firme. BaniPartide este o platformă a Expert Forum, publicată sub licența CC Attribution 4.0. Tabelul este întocmit din publicările anuale ale partidelor din Monitorul Oficial și de pe paginile Autorității Electorale Permanente (AEP). BaniPartide nu dă o referință la raport pentru fiecare rând, așa că fiecare linie citează BaniPartide și, prin metodologia acesteia, acele publicări. Potrivirea se face doar după CUI, niciodată după nume. Partidul apare exact cum îl publică BaniPartide: nu este potrivit cu un Partid, iar o donație a unei firme nu este niciodată un Partid.",
        "Exploratorul încarcă tabelul o singură dată dintr-o copie arhivată și verifică doar din când în când dacă BaniPartide a publicat unul mai nou, așa că donațiile recente pot lipsi: pagina spune care este cel mai recent an acoperit de tabel. Un rând este trecut sub un an. O dată apare doar unde celula publicată de BaniPartide conține o singură dată; altfel celula este arătată așa cum a fost publicată. Sunt încărcate doar companiile. Donatorii persoane fizice nu sunt niciodată încărcați, afișați sau numărați aici, iar un comerciant persoană fizică (PFA, II sau IF) nu apare ca donator.",
        "Pe pagina unui furnizor, „acest furnizor este și donator-firmă” este context, niciodată un Semnal: o companie care câștigă contracte publice și donează unui partid nu face, prin aceasta, ceva greșit. O donație este o măsură diferită de valoarea atribuită, așa că suma ei nu se adună niciodată la aceasta, iar donațiile nu se adună niciodată între ele.",
        "BaniPartide este o sursă secundară: un tabel pe care Expert Forum îl întocmește din publicările anuale ale partidelor, nu acele publicări. O greșeală de tastare sau un rând lipsă din el se preia ca atare, iar exploratorul nu le corectează și nu le completează. Un rând fără CUI valid (o persoană fizică trecută printre firme, „n/a” sau un id gol, ca la unele împrumuturi) este abandonat, așa că o donație a unei societăți pe care BaniPartide o înregistrează fără CUI nu este listată. Exploratorul deține o singură copie arhivată, până la anul indicat mai jos: donațiile din anii următori lipsesc până se încarcă un tabel mai nou. Numele donatorului și numele reprezentantului societății nu sunt încărcate niciodată.",
      ],
    },
    onrcRegister: {
      heading: "Înmatriculările ONRC (registrul comerțului)",
      paragraphs: [
        "ONRC, Oficiul Național al Registrului Comerțului, publică registrul comerțului ca date deschise pe data.gov.ro, câte un instantaneu întreg al registrului la o dată. Exploratorul deține câte un instantaneu pentru fiecare lună din martie 2026, luna în care apar prima oară datele nașterii în fișiere, și ultimul instantaneu al fiecărui trimestru, înapoi până în 2021. O înmatriculare este înregistrarea ONRC: căutarea și harta numără înmatriculări, niciodată bani. ONRC nu are o măsură bănească, așa că cifrele sale nu sunt niciodată ordonate împreună cu cele din SEAP. Datele sunt la zi până la data celui mai nou instantaneu, iar o lună din martie 2026 încoace fără instantaneu păstrat este o lacună cunoscută pe pagina Acoperire. O înmatriculare fără număr de înmatriculare este lăsată deoparte.",
        "Faptele despre înmatriculare afișate (data înmatriculării, forma juridică, sediul, codurile CAEN autorizate) sunt citite doar din cel mai nou instantaneu. Instantaneele de dinainte de mijlocul lui 2025 au un format mai vechi, fără data înmatriculării și fără coduri CAEN: servesc doar la datarea stărilor și a denumirilor. O societate pe care ONRC o listează fără dată de înmatriculare nu intră niciodată într-o regulă de Semnal care are nevoie de ea. Un CUI gol, zero sau care nu trece cifra de control nu leagă înmatricularea de nicio organizație.",
        "Stările ONRC (radiere, insolvență, reorganizare și celelalte) nu sunt datate: un instantaneu listează stările pe care le are o societate, nu când au început. Exploratorul datează o stare comparând instantaneele: „văzută prima oară în extrasul din” o dată este primul instantaneu păstrat care o arată, iar „cel puțin din” când acela este cel mai vechi instantaneu păstrat. Schimbarea în sine poate fi mai veche, cu cel mult timpul dintre două instantanee, și cu mai mult când lipsește instantaneul unei luni. O dată de aici nu este niciodată data la care a început starea. Data radierii folosită de un Semnal vine de la ANAF, nu de la ONRC.",
        "ONRC listează codurile CAEN pentru care o societate este autorizată și nu spune care este cel principal, așa că exploratorul nu arată o activitate principală. O regulă care întreabă dacă o societate poate face un anumit fel de lucrări întreabă dacă vreunul dintre codurile ei autorizate este de acel fel, iar o autorizare nu este o dovadă a ceea ce face societatea. Nici codul SIRUTA nu apare în fișiere: sediul este un județ și o adresă scrisă. UAT-ul unei organizații vine din adresa ANAF când ANAF are CUI-ul; altfel înmatricularea este plasată la nivel de județ, iar fără județ ajunge în categoria „Fără județ”.",
        "O înmatriculare se leagă de o organizație doar după CUI. Un CUI pe care ANAF nu îl cunoaște, dar ONRC îl listează, devine o pagină proprie, cu insigna „CUI doar în ONRC”. Denumirile ONRC sunt păstrate ca alias și nu înlocuiesc niciodată numele din capul paginii, care este cel de la ANAF. Sucursalele și succesorii rămân separați.",
        "Fișierele ONRC listează administratori și reprezentanți legali cu nume și dată a nașterii, fără CNP. Datele nașterii apar doar în instantaneele din martie 2026 încoace. Sunt numite doar persoanele unei organizații legate de bani publici, furnizor sau autoritate în SEAP: o organizație care există doar în ONRC are pagina și faptele ei, dar persoanele ei nu sunt arătate. Un titular apare cu nume, rol și anul nașterii, cu citarea instantaneului. Persoanele cu același nume nu sunt niciodată contopite: două rânduri de rol sunt o singură persoană doar când se potrivesc numele și data completă a nașterii, un titular fără dată a nașterii este listat doar pe acea pagină și nelegat de nimeni, iar același nume și aceeași dată cu locuri de naștere în județe diferite este o potrivire posibilă, ținută pentru verificare și niciodată arătată. Titularii înmatriculării unui comerciant persoană fizică (PFA, II sau IF) nu sunt arătați, iar niciun beneficiar real, rudă sau CNP nu este arătat vreodată.",
      ],
    },
  },
  signals: {
    heading: "Regulile Semnalelor",
    paragraphs: [
      "Un Semnal este un set de înregistrări potrivite de o regulă publicată, care merită verificate în documentele-sursă. Nu este niciodată o concluzie sau o acuzație: fiecare regulă descrie un tipar, iar un tipar poate avea o explicație obișnuită. Semnalele se numără, nu se notează și nu se clasifică.",
      "Un Semnal este datat după cea mai recentă înregistrare a sa. Fiecare Semnal trimite la un filtru al tabului Înregistrări care îl reproduce și la înregistrarea din SEAP. O valoare pe care regula de calcul o lasă în afara sumelor nu declanșează niciodată un Semnal și nu se numără în el. Sunt zece reguli; pentru fiecare, fereastra este perioada înregistrărilor la care se uită regula, iar rata națională de bază este ponderea autorităților contractante care au avut cel puțin un Semnal din acea regulă în anul de bază, dintre cele care au avut în acel an înregistrări la care se uită regula. Ambele sunt recalculate la fiecare încărcare a datelor.",
    ],
  },
  rules: {
    OVER_CAP: {
      heading: "Peste plafon",
      paragraphs: ["Peste plafon: o achiziție directă peste plafonul legal pentru data și tipul ei, dar sub de zece ori valoarea acestuia."],
      items: [
        withAmounts((a, b, c, d) => `Doar achiziții directe (DA și DAN). Plafonul este cel în vigoare la data atribuirii, pentru tipul achiziției: ${a} pentru bunuri și servicii și ${b} pentru lucrări până la 9 septembrie 2022, apoi ${c} și ${d} (Legea 98/2016, fără TVA). Lucrările se recunosc după tipul de contract sau după diviziunea CPV 45.`, ["13506000", "45020000", "27012000", "90040000"]),
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
        "Acordul-cadru este un anunț de atribuire: plafonul lui este suma valorilor înregistrărilor sale de plafon (o valoare pe care regula de numărare o lasă deoparte nu se adună, nici în plafon, nici în suma subsecventă), iar contractele lui subsecvente sunt cele din același număr de anunț, indiferent de autoritatea care le-a semnat.",
        "Doar acorduri-cadru atribuite începând cu 1 ianuarie 2021 (data celei mai vechi înregistrări de plafon), cu un plafon care nu este gol.",
        "Strict peste 110%: exact 110% nu este Semnal.",
        "Semnalul aparține autorității care a încheiat acordul-cadru și este datat după cea mai recentă înregistrare a lui. Cuprinde înregistrările de plafon ale acelei autorități și contractele ei subsecvente până la cel care a dus primul suma curentă peste 110%; contractele raportate după acela nu sunt listate. Cifrele lui descriu acordul așa cum este raportat până la data până la care sunt încărcate datele, deci înregistrările listate pot însuma mai puțin decât totalul subsecvent afișat.",
      ],
      lawful: "Explicații legale posibile: indexarea prețurilor sau modificările permise de lege.",
    },
    NO_PUBLICATION: {
      heading: "Fără publicare",
      paragraphs: ["Fără publicare: un contract atribuit prin negociere fără publicare prealabilă („Negociere fără publicare prealabilă”), indiferent de valoare."],
      items: [
        "Doar contracte și anunțuri de atribuire, după procedura așa cum o publică SEAP. O achiziție directă nu are procedură. Alte proceduri fără anunț prealabil, precum „Norme proprii”, nu fac parte din această regulă.",
        "Regula citește fișierele în masă începând cu 2023, parcurgerea trimestrului curent și, odată încărcată, completarea 2021–22; fereastra arată de unde încep datele.",
        "Un Semnal pentru fiecare autoritate și zi de atribuire.",
      ],
      lawful: "Explicații legale posibile: urgența, un singur furnizor posibil sau un alt temei legal.",
    },
    YOUNG_FIRM: {
      heading: "Firmă tânără",
      paragraphs: ["Firmă tânără: un furnizor a cărui primă înregistrare apare în cel mult 90 de zile de la înmatriculare sau care câștigă o înregistrare mare în cel mult 180 de zile de la ea."],
      items: [
        "Data înmatriculării: data pe care ONRC o înscrie pentru înmatricularea furnizorului, din cel mai recent instantaneu ONRC. Un furnizor listat de ONRC fără dată de înmatriculare (formatul mai vechi al instantaneelor nu are) nu intră niciodată în regulă, iar regula nu se afișează deloc cât timp nu este încărcată nicio dată de înmatriculare. Data este a societății: una reînmatriculată poate părea mai tânără decât afacerea ei.",
        "Primul contract: înregistrările furnizorului din cea mai veche zi în care are o înregistrare în explorator (mai multe înregistrări în acea zi, de la autorități diferite sau un contract și anunțul său de atribuire, contează toate). Contează când acea zi este în ziua înmatriculării sau după ea și cel mult 90 de zile după. Înregistrările din zilele ulterioare din acele 90 de zile sunt doar context și nu sunt niciodată un Semnal de sine stătător.",
        withAmounts((a) => `Înregistrare mare: orice înregistrare cu valoare numărată de cel puțin ${a} (exact atât contează), datată la cel mult 180 de zile după înmatriculare, fie că este prima a furnizorului, fie nu. O valoare lipsă, lăsată deoparte sau de plafon contează ca zero.`, ["100000000"]),
        "Zilele sunt zile calendaristice de la ziua înmatriculării până la data atribuirii înregistrării; ziua 90 și ziua 180 intră. O înregistrare datată înainte de înmatriculare nu contează niciodată. O înregistrare cu asociere contează când oricare dintre membri respectă regula.",
        "Fereastra și rata: fereastra începe cu prima înregistrare încărcată, iar rata de mai jos este recalculată la fiecare încărcare, pe un an calendaristic ca la celelalte reguli.",
      ],
      lawful: "Explicații legale posibile: o societate înființată pentru un singur contract sau o afacere existentă care a primit o înmatriculare nouă după o restructurare ori o schimbare a formei juridice.",
    },
    NO_CONSTRUCTION_CAEN: {
      heading: "Lucrări fără CAEN de construcții",
      paragraphs: ["Lucrări fără CAEN de construcții: o înregistrare de lucrări de valoare mare câștigată de o firmă fără niciun cod CAEN de construcții printre codurile sale autorizate."],
      items: [
        withAmounts((a) => `Lucrările se stabilesc ca în regula de numărare: tipul de contract Lucrări sau diviziunea CPV 45. Valoarea numărată a înregistrării este de cel puțin ${a} (exact atât contează); o valoare lipsă, lăsată deoparte sau de plafon nu declanșează niciodată regula.`, ["100000000"]),
        "Codurile autorizate sunt cele din cel mai recent instantaneu ONRC. Construcțiile sunt diviziunile 41, 42 și 43 din CAEN Rev.2 (2008) și Rev.3 (2025), după revizuirea fiecărui cod; pentru codurile mai vechi CAEN 1998 și 2003 este diviziunea 45.",
        "Necunoscutul nu este niciodată Semnal: un câștigător fără entitate, fără înmatriculare ONRC sau fără coduri înscrise (formatul mai vechi al instantaneelor nu are) nu declanșează regula. O asociere o declanșează doar când niciunul dintre membri nu are un cod de construcții.",
        "Un registru permite unei firme să aibă coduri pe care nu le folosește și să lucreze sub coduri pe care nu le are. Fereastra și rata: fereastra începe cu prima înregistrare încărcată, iar rata de mai jos este recalculată la fiecare încărcare.",
      ],
      lawful: "Explicații legale posibile: construcția este făcută de un subcontractant sau de un asociat, registrul este depășit ori firma lucrează sub un cod pe care nu l-a înscris.",
    },
    AFTER_STRIKE_OFF: {
      heading: "După radiere",
      paragraphs: ["După radiere: o înregistrare datată după ziua în care ANAF arată furnizorul radiat."],
      items: [
        "Radierea este data din răspunsul ANAF pentru CUI-ul furnizorului („RADIERE din data ...”), la ziua la care a fost obținut ultima oară acel răspuns. Starea de radiată din ONRC nu are dată și nu este folosită aici. Un răspuns care spune radiat fără dată nu declanșează niciodată regula.",
        "Data atribuirii înregistrării trebuie să fie după ziua radierii: o înregistrare din chiar ziua aceea nu contează. Orice înregistrare contează, indiferent de valoare, inclusiv una fără valoare.",
        "O societate radiată și reînmatriculată apoi, sau a cărei radiere a fost anulată, arată starea pe care ANAF a dat-o ultima oară. O fuziune sau un succesor este o altă entitate și nu este legat.",
        "Fereastra și rata: fereastra începe cu prima înregistrare încărcată, iar rata de mai jos este recalculată la fiecare încărcare.",
      ],
      lawful: "Explicații legale posibile: o întârziere între atribuire și publicare, o societate succesoare care a preluat activitatea sub alt număr sau o radiere pe care ANAF a anulat-o ulterior.",
    },
    INSOLVENCY: {
      heading: "Insolvență",
      paragraphs: ["Insolvență: furnizorul este acum în insolvență sau reorganizare și are înregistrări în ultimele șase luni."],
      items: [
        "Starea: stările pe care ONRC le arată pentru furnizor în cel mai recent instantaneu, citite după denumirea pe care ONRC o publică pentru fiecare: insolvență, reorganizare judiciară sau faliment. O denumire care spune că procedura s-a încheiat („închiderea procedurii”, „ieșire din insolvență”) nu contează. Celelalte stări (dizolvare, lichidare, suspendare, radiere) nu fac parte din această regulă.",
        "Starea nu este datată. Datele deschise ale ONRC listează stările unei societăți în fiecare instantaneu, nu când au început, așa că explicatorul poate spune doar în ce instantaneu a fost văzută prima oară o stare (și „cel puțin din” când acela este cel mai vechi instantaneu păstrat). Procedura poate fi mai veche decât acel instantaneu sau mai nouă decât înregistrarea: un Semnal spune „acum în insolvență și a câștigat recent”, niciodată „a câștigat în timp ce era în insolvență”.",
        "„Acum” este data celui mai recent instantaneu ONRC, iar „ultimele șase luni” sunt cele șase luni calendaristice până la el, inclusiv. O înregistrare datată după acel instantaneu este în afara a ceea ce spune starea. Orice înregistrare contează, indiferent de valoare.",
        "Rata: spre deosebire de celelalte reguli, rata de mai jos este măsurată pe cele șase luni până la cel mai recent instantaneu ONRC (intervalul de timp pe care îl vede regula), ca ponderea autorităților cu o înregistrare în acele luni care au un Semnal în ele. Anul afișat lângă rată este anul acelui instantaneu. Este recalculată la fiecare încărcare.",
      ],
      lawful: "Explicații legale posibile: înregistrarea a fost atribuită înainte de începerea procedurii sau procedura permite continuarea activității printr-un plan de reorganizare.",
    },
    FEW_EMPLOYEES: {
      heading: "Cel mult un angajat",
      paragraphs: ["Cel mult un angajat: un furnizor căruia i s-a atribuit o sumă mare într-un an și care a raportat cel mult un angajat în medie pentru acel an fiscal."],
      items: [
        withAmounts((a) => `Atribuiri: valoarea atribuită furnizorului în anul calendaristic al datelor de atribuire ale înregistrărilor, numărată după aceeași regulă ca orice alt total (un membru al unei asocieri are o parte egală; o valoare lipsă, lăsată deoparte sau de plafon nu adaugă nimic), de cel puțin ${a} (exact atât contează). Semnalul listează înregistrările numărate ale furnizorului din acel an.`, ["500000000"]),
        "Angajați: numărul mediu de angajați pe care furnizorul l-a raportat Ministerului Finanțelor pentru același an fiscal, din situația pe care o avem (versiunea revizuită, când există). Un 0 sau un 1 raportat contează. Un câmp gol este „neraportat” și nu declanșează niciodată regula; fără situație pentru an nu există Semnal, deci un an de atribuire mai nou decât cel mai nou an fiscal păstrat nu poate declanșa regula.",
        "Numărul este o medie anuală: o firmă îl poate menține mic prin subcontractare sau angajând prin altă societate, iar o situație poate conține o cifră greșită.",
        "Fereastra și rata: rata de mai jos este măsurată în cel mai nou an fiscal păstrat, cel mai nou an pe care îl vede regula, și recalculată la fiecare încărcare.",
      ],
      lawful: "Explicații legale posibile: lucrarea este subcontractată sau făcută de personal angajat printr-o altă societate ori media anuală subestimează o forță de muncă sezonieră.",
    },
    NO_FINANCIAL_STATEMENT: {
      heading: "Fără situații financiare",
      paragraphs: ["Fără situații financiare: un SRL sau un SA căruia i s-a atribuit o sumă mare într-un an, fără situație financiară pentru acel an fiscal sau pentru anul dinainte."],
      items: [
        "Forma juridică: forma juridică a furnizorului așa cum o listează ONRC, SRL sau SA. Persoanele fizice autorizate, instituțiile publice și celelalte forme nu declanșează niciodată regula, nici un furnizor pe care ONRC nu îl listează (forma lui juridică este necunoscută).",
        withAmounts((a) => `Atribuiri: numărate ca la regula angajaților, de cel puțin ${a} (exact atât contează) în anul calendaristic al datelor de atribuire ale înregistrărilor.`, ["100000000"]),
        "Fără situație: explicatorul nu are nicio situație pentru acel CUI nici pentru anul de atribuire, nici pentru anul dinainte, în nicio versiune; oricare dintre ele scoate furnizorul din regulă.",
        "Cel mai nou an fiscal este lăsat deoparte până la versiunea lui revizuită. Ministerul Finanțelor publică situațiile unui an în iunie anul următor și le corectează și completează un an mai târziu, deci o situație care lipsește din prima versiune poate lipsi doar din ea. Un an de atribuire nu este evaluat cât timp cel mai nou an fiscal păstrat nu are versiune revizuită, iar anul de atribuire este acela sau unul ulterior; nici nu este evaluat dacă anul dinainte nu este unul pentru care păstrăm situații (primul an fiscal păstrat este 2021, deci primul an de atribuire este 2022).",
        "O societate înmatriculată cu puțin timp înainte de anul atribuirii poate să nu aibă încă situație, iar o situație poate fi depusă sub alt CUI după o fuziune. Fereastra și rata: rata de mai jos este măsurată în cel mai nou an de atribuire pe care îl evaluează regula și recalculată la fiecare încărcare.",
      ],
      lawful: "Explicații legale posibile: societatea a depus târziu sau sub alt CUI, s-a înființat cu puțin timp înainte ori fișierele Ministerului Finanțelor sunt incomplete.",
    },
  },
  referenceDataThrough: (date) => `Date până la ${date}`,
  referenceFiscalYearThrough: (year) => `Date până la anul fiscal ${year}`,
  referenceYearThrough: (year) => `Date până în ${year}`,
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
