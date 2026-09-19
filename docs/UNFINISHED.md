# ILCMS — Ókláruð Verkefni & Framtíðarviðbætur (Unfinished & Roadmap)

Þetta skjal tekur saman þá þætti sem eru ókláraðir eða þarfnast frekari útfærslu í **ILCMS (Icelandic Legal Case Management System)**, sem og lista yfir mögulegar viðbætur og endurbætur sem geta aukið virði kerfisins fyrir íslenskar lögfræðistofur og dómstóla.

---

## 1. Ókláruð Verkefni & Takmarkanir (Unfinished Items)

### 1.1 Raunveruleg Auðkenning með Rafrænum Skilríkjum (Auðkenni eID)
- **Núverandi staða:** Kerfið notar staðbundið Keycloak 24 OIDC prófunarumhverfi með hlutverkaskiptingu (`lawyer`, `judge`, `admin`) og staðbundnum lykilorðum.
- **Ólokið:** Bein tenging við íslenska skilríkjaþjónustu (Auðkenni / Dokobit / Smart-ID) í gegnum SAML/OIDC tengilið í Keycloak. Í raunheimum krefst málskráning og rafræn undirritun lögmanna fullgildra rafrænna skilríkja skv. lögum nr. 55/2019.

### 1.2 Bein Samþætting við Réttargátt Dómstólasýslunnar (Court API)
- **Núverandi staða:** Kerfið býr til málsgagnasöfn og stefnur á fullgildu PDF formi í samræmi við reglur dómstólasýslunnar nr. 1/2020, sem lögmaður getur hlaðið niður og hlaðið handvirkt inn í Réttargátt.
- **Ólokið:** Bein tvíhliða API-tenging við Réttargáttina til að senda stefnur rafrænt, taka við þingfestingartilkynningum og sækja sjálfvirkt dóma og úrskurði þegar þeir falla.

### 1.3 Sjálfvirk Textalesun (OCR) fyrir Skönnuð Myndaskjöl
- **Núverandi staða:** Textagreining virkar að fullu á rafrænum PDF skjölum með textalagi og DOCX (Word) skrám.
- **Ólokið:** Ef lögð eru fram eldri skönnuð pappírsskjöl eða ljósrit án innbyggðs textalags (image-only PDFs) þarf innbyggða OCR vél (t.d. Tesseract OCR eða staðbundið OCR mállíkan) til að gera þau leitarbær og aðgengileg fyrir staðbundnu gervigreindina.

### 1.4 Hljóðritun og Sjálfvirk Utskrift Málflutnings (Whisper Audio Transcription)
- **Núverandi staða:** Lögmenn færa inn munnlegar athugasemdir og minnispunkta í textaformi.
- **Ólokið:** Staðbundið hljóðgreiningarlíkan (t.d. staðbundið Whisper fine-tuned fyrir íslensku) til að taka upp og umrita sjálfkrafa vitnaskýrslur, málflutning eða viðtöl við skjólstæðinga án þess að hljóðupptökur fari út af tölvunni.

### 1.5 Rafræn Undirritun Dómsskjala (PAdES / eIDAS)
- **Núverandi staða:** Stefnumótun og skjalagerð framleiðir tilbúin dómsskjöl með undirritunarlínum og lögmannsnúmeri.
- **Ólokið:** Innbyggt ferli til að undirrita PDF skjalið með fullgildri rafrænni innsiglun eða lögmannsundirskrift beint í kerfinu áður en það er sent í dóm.

---

## 2. Tillögur að Viðbótum & Endurbótum (Possible Add-ons & Improvements)

### 2.1 Bein Samtenging við Rafrænt Lagasafn Alþingis
- Sjálfvirk sókn í nýjustu útgáfur laga í gegnum opinbert XML/JSON vefviðmót Alþingis.
- Viðvörunarkerfi sem lætur lögmann vita ef vitnað er í lagagrein sem hefur tekið breytingum eða fallið úr gildi.

### 2.2 Stækkaður Gagnagrunnur Dómafordæma (Precedent Knowledge Base)
- Uppsetning á sérhæfðu vigursafni (pgvector HNSW) sem inniheldur alla Hæstaréttardóma frá 1990 og Landsréttardóma frá stofnun hans.
- Lögmaður getur beðið um: *„Finndu dóma þar sem 2. mgr. 130. gr. eml. var beitt vegna óhóflegs málskostnaðar“* eða *„Finndu sambærileg mál um galla á fasteign skv. 17. gr. laga nr. 40/2002“*.

### 2.3 Hagsmunaárekstrar & Hæfisskoðun (Conflict of Interest Check)
- Sjálfvirk leit í öllum sögulegum málum stofunnar þegar nýtt mál er skráð:
  - Athuga hvort gagnaðili eða tengdir aðilar hafi áður verið skjólstæðingar stofunnar.
  - Athuga hvort lögmenn stofunnar séu vanhæfir skv. lögum um lögmenn nr. 77/1998 eða siðareglum LMFÍ.

### 2.4 Gátt Skjólstæðings (Secure Client Portal)
- Aðgangur fyrir skjólstæðing til að:
  - Fylgjast með framgangi máls síns og næstu réttarhöldum.
  - Hlaða upp frumgögnum (reikningum, ljósmyndum af göllum, samningum) beint inn í málið.
  - Yfirfara drög að greinargerð eða stefnu áður en hún er lögð fram.

### 2.5 Bókhaldstenging & Kröfustýring
- Tenging við íslensk bókhaldskerfi (DK, Regla, PayDay eða Navision) fyrir:
  - Sjálfvirka stofnun reikninga út frá tímamælingum skv. 130. gr.
  - Rafræna birtingu reikninga og kröfugerð í netbanka skjólstæðings.

### 2.6 Snjallur Samanburður við Stefnu Gagnaðila
- Greining á stefnu gagnaðila með einum smelli:
  - Kerfið dregur út allar tölulegar kröfur, vaxtakröfur og málsástæður.
  - Stillir sjálfkrafa upp mótbárum og frávísunarástæðum sem lögmaður getur unnið áfram í greinargerð sinni.
