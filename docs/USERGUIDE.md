# ILCMS Notendahandbók (User Guide)

> *This document was written with the assistance of AI. All code and documentation have been human-reviewed and verified.*

Velkomin(n) í **ILCMS (Icelandic Legal Case Management System)** — sérhæft málaskrár- og réttarfarskerfi hannað fyrir íslenska lögmenn, lögfræðistofur og dómstóla.

Kerfið er sérsniðið að kröfum **laga um meðferð einkamála nr. 91/1991**, **reglum dómstólasýslunnar um málsgagnasöfn** og ströngum trúnaðarkröfum lögmannastéttarinnar (**100% Air-Gapped AI**).

---

## Efnisyfirlit

1. [Að hefja notkun](#1-að-hefja-notkun)
2. [Vinnusvæðið (3-Pane Layout)](#2-vinnusvæðið-3-pane-layout)
3. [Málaskrá & Ný Mál (Cases)](#3-málaskrá--ný-mál-cases)
4. [Dómaskjöl & Gögn (Documents & Exhibits)](#4-dómaskjöl--gögn-documents--exhibits)
5. [Lögboðnir Dómsfrestir (Statutory Deadlines)](#5-lögboðnir-dómsfrestir-statutory-deadlines)
6. [Málsgagnasafn (Court Bundle Generator)](#6-málsgagnasafn-court-bundle-generator)
7. [Málastjórnun & Skjalagerð (Legal Drafting)](#7-málastjórnun--skjalagerð-legal-drafting)
8. [Tímar & Málskostnaður skv. 130. gr. eml. (Cost Tracker)](#8-tímar--málskostnaður-skv-130-gr-eml-cost-tracker)
9. [100% Air-Gapped Lögfræðiaðstoðarmaður (AI Assistant)](#9-100-air-gapped-lögfræðiaðstoðarmaður-ai-assistant)
10. [Kerfisstjórn ILCMS & Auðlindavöktun K3s (Admin Console & Cluster Metrics)](#10-kerfisstjórn-ilcms--auðlindavöktun-k3s-admin-console--cluster-metrics)
11. [Flýtilyklar & Góð Ráð](#11-flýtilyklar--góð-ráð)

---

## 1. Að hefja notkun

### Aðgangur í vafra
Þegar kerfið hefur verið sett upp með `./install.sh` er farið á:
- **Vefslóð kerfis:** `http://localhost:3000` (eða úthlutaðri lénaslóð)
- **Auðkenning:** Innskráning með Keycloak OIDC eða prófunaraðgangi (`lawyer@ilcms.is`).

### Hlutverk & Trúnaðaröryggi
Öll gögn skjólstæðinga, stefnur, greinargerðir og málsskjöl eru geymd staðbundið. **Gervigreindareining kerfisins (AI) er 100% Air-Gapped** — hún keyrir einangruð á tölvunni án nokkurs gagnaútflæðis á netið.

---

## 2. Vinnusvæðið (3-Pane Layout)

Vinnusvæði ILCMS er skipulagt í þrjá meginhluta til að hámarka yfirsýn við málflutning og skjalagerð:

```
+-----------------------------------------------------------------------------------------------+
| TOPPSTIKA: Málsupplýsingar, flýtiaðgerðir, tímataka og Air-Gap öryggisstöðuvísir            |
+--------------------------+-------------------------------------+------------------------------+
| VINSTRI DÁLKUR           | MIÐDÁLKUR                           | HÆGRI DÁLKUR                 |
| (Málaskrá)               | (Málavinnsla & Skjalaborð)          | (100% Air-Gapped AI)         |
|                          |                                     |                              |
| • Leit í málum           | • Skjöl & Dómsmálagögn              | • Lögfræðiaðstoðarmaður      |
| • Málalisti & Forgangur  | • Lögboðnir frestir (Einkamálalög)  | • Staðbundið Gemma 2 9B      |
| • Síun eftir dómstólum   | • Málsgagnasafn (Dómstólasýslan)    | • RAG tilvísanir í skjöl     |
| • Stofnun nýs máls       | • Rafræn skjalagerð (Stefna/Grein.) | • Lagasafn & Hæstaréttardómar|
|                          | • Tímar & Málskostnaður (130. gr.)  | • Zero Egress staðfesting    |
+--------------------------+-------------------------------------+------------------------------+
```

---

## 3. Málaskrá & Ný Mál (Cases)

### Skoða málaskrá
Í vinstri dálki er listi yfir virk dómsmál:
- **Málsnúmer:** Opinbert dómsnúmer (t.d. *E-1025/2026* eða *E-1218/2026*).
- **Málsaðilar:** Sóknaraðili (stefnandi) og varnaraðili (stefndi).
- **Dómstóll:** Héraðsdómur Reykjavíkur, Héraðsdómur Vesturlands, Landsréttur eða Hæstiréttur.
- **Flýtimeðferð:** Sérstakt merki ef málið er rekið samkvæmt XIX. kafla einkamálalaga (flýtimeðferð).
- **Frestaðvörun:** Sjálfvirk litakóðun ef lögboðinn frestur rennur út innan 48 klst. eða er útrunninn.

### Stofna nýtt dómsmál
1. Smellið á hnappinn **„+ Nýtt mál“** efst í vinstri dálki.
2. Fyllið út:
   - Heiti máls og málsnúmer.
   - Dómstól og deild.
   - Nöfn stefnanda, stefnda og lögmanna þeirra.
   - Flýtimeðferð (Já/Nei).
3. Smellið á **„Stofna mál“**. Málið bætist strax við málaskrána.

---

## 4. Dómaskjöl & Gögn (Documents & Exhibits)

### Yfirlit skjala (Tab: „Skjöl“)
Fyrir hvert mál birtast öll skjöl flokkuð sem:
- **Dómsmálaskjöl:** Stefna, greinargerð, fyrirkall, dómtökubeiðni.
- **Málsgögn & Skjöl sóknaraðila (A-merkt):** A-1, A-2, A-3 (samningar, reikningar, tölvupóstar, matsgerðir).
- **Málsgögn & Skjöl varnaraðila (B-merkt):** B-1, B-2 (andmæli, greiðslukvittanir).

### Hlaða upp gögnum
- Styður **PDF** og **DOCX** (Word) skjöl.
- Sjálfvirk textagreining (*text extraction*) dregur út meginmál fyrir leit og gervigreind.
- Kerfið reiknar sjálfkrafa orðafjölda og blaðsíðufjölda.

### Sækja dæmaskjöl úr dæmasafni (`/examples`)
ILCMS inniheldur innbyggt dæmasafn með raunverulegum íslenskum dóms- og málsgögnum í möppunni `/examples`. Þessi gögn henta sérstaklega vel við prófanir og kennslu:
1. **Opna dæmasafn:**
   - Smellið á **„📁 Dæmaskjöl“** í vinstri hliðarstiku við hliðina á *„+ Nýtt mál“*, eða
   - Smellið á **„📁 Sækja dæmaskjöl (/examples)“** í skjalaglugga virka málsins, eða
   - Notið flýtihnappinn neðst í glugganum *„Stofna nýtt mál“*.
2. **Innihald dæmasafnsins:**
   - **Sérfræðiskýrsla og matsgerð dómkvaddra matsmanna** (`01-serfraediskyrsla-fasteignamat.txt`): Úttekt byggingarverkfræðings og húsasmíðameistara á göllum á utanhússklæðningu, einangrun og rakaskemmdum með ítarlegu kostnaðarmati (kr. 35.278.000).
   - **Verksamningur um endurbætur utanhúss** (`02-samningur-verksamningur.txt`): Fullbúinn verksamningur skv. ÍST 30:2012 að fjárhæð kr. 64.800.000 með ákvæðum um dagsektir og riftun.
   - **Stefna í einkamáli fyrir Héraðsdómi Reykjavíkur** (`03-stefna-heradsdomur.txt`): Formleg stefna með dómkröfum um skaðabætur, dagsektir, dráttarvexti og málskostnað.
   - **Tölvupóstar og samskiptasaga** (`04-tolvupostar-samskipti.txt`): Skrifleg samskiptasaga lögmanns, stjórnar húsfélags og verktaka.
   - **Greiðsluáskorun og yfirlýsing um riftun** (`05-greidsluaskorun-riftun.txt`): Formleg áskorun með 15 daga fresti og riftunaryfirlýsing.
   - **Beiðni um dómkvaðningu matsmanna** (`06-domkvaedning-matsmanna.txt`): Beiðni til dómstóls skv. XII. kafla laga nr. 91/1991 með 6 matsspurningum.
3. **Forskoðun og innflutningur:**
   - Í innflutningsglugganum er hægt að forskoða meginmál hvers skjals áður en það er flutt inn.
   - Veljið hvort skjölin skuli sett inn í **núverandi mál**, **annað skráð mál**, eða hvort **stofna eigi nýtt mál** út frá dæmaskjölunum.
   - Einnig er hægt að hlaða niður frumskjölum beint af slóðinni `/examples/[skráarheiti]`.

---

## 5. Lögboðnir Dómsfrestir (Statutory Deadlines)

Kerfið inniheldur sjálfvirka reiknivél fyrir alla helstu fresti samkvæmt **lögum nr. 91/1991 um meðferð einkamála**:

### Helstu frestir í kerfinu
1. **Þingfestingarfrestur (80. gr.):** Stefna birt með lögboðnum fyrirvara fyrir þingfestingu.
2. **Greinargerðarfrestur (96. gr. og 101. gr.):** Frestur stefnda til að leggja fram greinargerð og skrifleg varnarorð.
3. **Flýtimeðferðarfrestir (XIX. kafli):** Styttir frestir í flýtimeðferð (oft 1–2 vikur).
4. **Dómkvaðning matsmanna (X. kafli):** Frestur til að leggja fram matsspurningar og andmæli.
5. **Málflutningsfrestur (102. gr.):** Undirbúningur aðalmeðferðar og munnlegs flutnings.
6. **Áfrýjunarfrestur (144. gr. og 154. gr.):** Frestur til að skjóta máli til Landsréttar eða Hæstaréttar.

### Aðgerðir
- **Reikna frest:** Smellið á **„Endurreikna fresti“** eða breytið dagsetningu þingfestingar.
- **Flytja í dagatal:** Smellið á **„Flytja í iCal (.ics)“** til að samstilla við Outlook, Google Calendar eða Apple Calendar.

---

## 6. Málsgagnasafn (Court Bundle Generator)

Samkvæmt **reglum dómstólasýslunnar nr. 1/2020** er gerð rík krafa um frágang málsgagnasafna við aðalmeðferð.

### Sjálfvirkar aðgerðir í ILCMS:
1. **Forsíða málsgagnasafns:** Býr sjálfkrafa til forsíðu með dómstóli, málsnúri, nöfnum aðila og lögmanna.
2. **Formlegt Efnisyfirlit (Table of Contents):**
   - Skjöl rakin í réttri tímaröð eða skjalaskrá.
   - Skýr greinarmunur á gögnum stefnanda (A-1, A-2...) og stefnda (B-1, B-2...).
   - Blaðsíðutilvísanir í heildarsafni (t.d. „Bls. 12–24“).
3. **Hlaupandi blaðsíðutal (Bates Stamping):** Númerar allar blaðsíður í réttri röð neðst á hverri síðu (`Bls. X af Y`).
4. **Bindi (Volumes):** Ef skjalafjöldi fer yfir 300 blaðsíður skiptir kerfið safninu sjálfkrafa í Bindi I, Bindi II o.s.frv.
5. **Útflutningur:** Hægt er að hlaða niður tilbúnu PDF skjali til útprentunar eða rafrænnar afhendingar í gegnum Réttargátt.

---

## 7. Málastjórnun & Skjalagerð (Legal Drafting)

### Gerð dómsskjala (Tab: „Skjalagerð“)
Kerfið býður upp á sérsniðin sniðmát samkvæmt íslenskri réttarvenju:
- **Stefna í einkamáli (Writ of Summons):** Dómkröfur, málsatvik, málsástæður, lagarök og sönnunargögn.
- **Greinargerð stefnda (Statement of Defense):** Frávísunarkröfur, sýknukröfur, andmæli við málavaxtalýsingu.
- **Flýtimeðferðarstefna (XIX. kafli).**
- **Kröfugerð um málskostnað (130. gr.).**

### Samanburður dómsskjala (Diff Tool)
Hægt er að bera saman tvær útgáfur af greinargerð eða bera saman stefnu og greinargerð hlið við hlið með litakóðuðum breytingum (viðbætur / eyðingar).

---

## 8. Tímar & Málskostnaður skv. 130. gr. eml. (Cost Tracker)

Samkvæmt **130. gr. laga nr. 91/1991** ber að kveða á um málskostnað í dómi. Lögmenn verða að leggja fram sundurliðað málskostnaðaryfirlit við lok aðalmeðferðar.

### Virkni í ILCMS:
1. **Rauntíma Tímataka (Live Billable Timer):**
   - Smellið á **„Ræsa tímatöku“** þegar unnið er í málinu.
   - Skráning á tegund vinnu: *Rannsókn máls, skjalagerð, samningaviðræður, málflutningur*.
2. **Reiknivél stefnugjalda (131. gr.):** Reiknar sjálfkrafa lögboðin stimpilgjöld og réttargjöld miðað við kröfufjárhæð.
3. **Útlagður kostnaður:** Skráning á kostnaði vegna birtingar stefnuvotta, matsgerða og sérfræðiskýrslna.
4. **Virðisaukaskattur (24% VSK):** Sjálfvirkur útreikningur.
5. **Formlegt Málskostnaðaryfirlit:** Myndar tilbúið skjal sem lögmaður getur afhent dómara við lok flutnings.

---

## 9. 100% Air-Gapped Lögfræðiaðstoðarmaður (AI Assistant)

### Hvað þýðir 100% Air-Gapped?
Lögmönnum er skylt að gæta þagmælsku um málefni umbjóðenda sinna (**lög um lögmenn nr. 77/1998** og **persónuverndarlög nr. 90/2018**). Með því að keyra mállíkanið **100% staðbundið á tölvunni**:
- Ekkert orð, skjal eða málsatvik fer á skýjaþjóna eða til þriðja aðila.
- Gervigreindin virkar jafnvel þótt tölvan sé tekin úr sambandi við netið.

### Aðgerðir aðstoðarmannsins:
- **Spurningar um málsskjöl:** Spyrjið um atriði í samningum, vitnisburðum eða matsgerðum virka málsins.
- **Rökstuðningur og lagagreinar:** Fáið tillögur að lagatilvísunum í einkamálalög, fasteignakaupalög eða skaðabótalög.
- **Heimildartilvísanir (Citations):** Öll svör aðstoðarmannsins innihalda beinar tilvísanir í blaðsíður og skjöl í málinu.

---

## 10. Kerfisstjórn ILCMS & Auðlindavöktun K3s (Admin Console & Cluster Metrics)

Fyrir stjórnendur kerfisins (notendur með hlutverkið `admin`) er innbyggt sérstakt stjórnborð:

### Aðgangur að kerfisstjórn
- Smellið á hnappinn **„⚙️ Kerfisstjórn“** (`#btn-admin-console`) efst til hægri í toppstikunni eða í prófílvalmynd.

### Rauntímavöktun á K3s klasa (Resource Monitor)
Innbyggður auðlindamælir (`K3sResourceMonitorWidget`) birtir lifandi mælingar beint úr Linux kjarna og K3s gámaumhverfi:
- **Örgjörvi (CPU):** Hlutfall nýtingar, fjöldi kjarna og álag (`load averages 1m/5m/15m`).
- **Vinnsluminni (RAM):** Rauntímanotkun gáma (Ollama, PostgreSQL, Keycloak, Web) á móti heildarminni hýsils, með sérstakri viðvörun ef minni fer yfir 85%.
- **Geymslupláss (Disk):** Nýting á NVMe/SSD gagnageymslum, gagnagrunnsskrám og líkanageymslu Ollama (`/root/.ollama`).
- **Gámastaða (STAÐA):** Sýnir lifandi stöðu hvers þjónustugáms (`Ready`, `Running`, `Health`).

### Kerfisaðgerðir stjórnanda:
- **Aðgangsstýring:** Yfirlit yfir virka notendur, hlutverk (`lawyer`, `judge`, `admin`, `paralegal`) og innskráningarsögu.
- **Skyndiminni & Vigurgrunnur:** Aðgerðir til að endurbyggja HNSW leitarvigur (`pgvector`) og tæma tímabundin skyndiminni.
- **Öryggisskoðun (Air-Gap Audit):** Staðfesting á zero outbound egress og prófun á staðbundnu neteinangrunarkerfi.

---

## 11. Flýtilyklar & Góð Ráð

| Aðgerð | Hvar finnst hún? | Lýsing |
| :--- | :--- | :--- |
| **Flýtileit í málum** | Vinstri dálkur | Sláið inn málsnúmer eða nafn aðila |
| **Nýtt mál** | Vinstri dálkur | Hnappurinn `+ Nýtt mál` |
| **Dæmasafn (/examples)** | Vinstri dálkur eða Skjöl | Hnappurinn `📁 Dæmaskjöl` til að sækja tilbúin íslensk málsgögn |
| **Málsgagnasafn** | Miðdálkur -> `Málsgagnasafn` | Skoða efnisyfirlit og búa til heildar PDF skv. reglum 1/2020 |
| **Tímataka** | Miðdálkur -> `Tímar & Málskostnaður` | Byrja/stöðva tíma með einum smelli og reikna 130. gr. kostnað |
| **Air-Gap Innviðir** | Toppstika -> `🛡️ Air-Gap` | Sjá stöðu staðbundins Ollama og vinnsluminnis |
| **Kerfisstjórn & K3s Monitor** | Toppstika -> `⚙️ Kerfisstjórn` | Opna stjórnborð með rauntímavöktun á CPU, RAM og diski |
