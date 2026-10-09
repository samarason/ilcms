export interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  description: string;
  priority: "HIGH" | "NORMAL" | "LOW";
  status: "OPEN" | "ACTIVE" | "PENDING" | "CLOSED";
  created_at: string;
}

export interface DocumentVersion {
  id: string;
  version_number: number;
  created_at: string;
  author?: string;
  change_summary?: string;
  file_name?: string;
  title?: string;
  file_size?: number;
  page_count: number;
  content?: string;
  is_pdf?: boolean;
  pdf_data_url?: string;
  is_docx?: boolean;
  docx_data_url?: string;
  html_content?: string;
}

export interface DocumentItem {
  id: string;
  case_id: string;
  title: string;
  doc_type: string;
  status: "READY" | "PROCESSING" | "INDEXED";
  page_count: number;
  created_at: string;
  summary?: string;
  content?: string;
  author?: string;
  filing_date?: string;
  notes?: string;
  notes_updated_at?: string;
  is_pdf?: boolean;
  pdf_data_url?: string;
  is_docx?: boolean;
  docx_data_url?: string;
  html_content?: string;
  file_size?: number;
  version?: number;
  versions?: DocumentVersion[];
  updated_at?: string;
}

export interface CaseDeadlineItem {
  id: string;
  case_id: string;
  name: string;
  category: "stefnufrestur" | "greinargerdfrestur" | "gagnaoflun" | "malsflutningur" | "domsuppkvadning" | "afryjun";
  target_date: string;
  statutory_reference: string;
  description: string;
  is_court_recess_adjusted: boolean;
  status: "pending" | "approaching" | "urgent" | "passed";
  created_at: string;
}

export type TimeTaskCategory =
  | "pleading"
  | "discovery"
  | "hearing"
  | "consultation"
  | "correspondence"
  | "research"
  | "other";

export interface TimeEntryItem {
  id: string;
  case_id: string;
  user_id: string;
  user_name: string;
  user_role?: string;
  date: string;
  duration_minutes: number;
  hourly_rate: number;
  task_category: TimeTaskCategory;
  description: string;
  is_billable: boolean;
  status: "unbilled" | "invoiced" | "written_off";
  created_at: string;
}

export type ExpenseType =
  | "court_fee"
  | "service_fee"
  | "expert_appraisal"
  | "travel"
  | "other";

export interface ExpenseItem {
  id: string;
  case_id: string;
  expense_type: ExpenseType;
  title: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  incurred_date: string;
  receipt_doc_title?: string;
  status: "unbilled" | "invoiced";
  created_at: string;
}

export function getRelativeDeadlineDateStr(hoursFromNow: number): string {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const casesStore: CaseItem[] = [
  {
    id: "case-01",
    case_number: "E-1024/2026",
    title: "Eignarhaldsfélagið Brekka ehf. gegn Verktakafélaginu Hamri ehf.",
    description: "Krafa um riftun verksamnings og greiðslu skaðabóta vegna stórfelldra vanefnda og tafa við framkvæmdir við Bryggjuhverfi.",
    priority: "HIGH",
    status: "ACTIVE",
    created_at: "2026-08-15T10:00:00Z",
  },
  {
    id: "case-02",
    case_number: "E-1089/2026",
    title: "Helga Sigurðardóttir gegn Tryggingafélaginu Vörður hf.",
    description: "Mál vegna ágreinings um varanlega örorku og bótakröfu í kjölfar umferðarslyss á Vesturlandsvegi skv. skaðabótalögum nr. 50/1993.",
    priority: "NORMAL",
    status: "ACTIVE",
    created_at: "2026-08-20T14:30:00Z",
  },
  {
    id: "case-03",
    case_number: "E-1142/2026",
    title: "Árni Jónsson gegn Sigurði Ólafssyni",
    description: "Krafa um afslátt af kaupverði fasteignar að Laugavegi 45 vegna leyndra myglu- og rakaskemmda skv. 17. og 27. gr. laga nr. 40/2002.",
    priority: "HIGH",
    status: "OPEN",
    created_at: "2026-09-01T09:15:00Z",
  },
  {
    id: "case-04",
    case_number: "E-1025/2026",
    title: "Sparisjóður Austurlands hf. gegn Norðurfelli ehf.",
    description: "Flýtimeðferð vegna gjaldfellingar lánasamnings að fjárhæð kr. 35.800.000 og sjálfskuldarábyrgðar stjórnarformanns. Bráður greinargerðarfrestur stefnda rennur út innan skamms skv. 97. gr. laga nr. 91/1991.",
    priority: "HIGH",
    status: "ACTIVE",
    created_at: "2026-09-08T08:30:00Z",
  },
  {
    id: "case-05",
    case_number: "E-1218/2026",
    title: "Kristín Valdimarsdóttir gegn Sjúkratryggingum Íslands",
    description: "Krafa um bráðabirgðaúrskurð dómara skv. 102. gr. eml. um greiðsluþátttöku í lífsnauðsynlegri sérhæfðri krabbameinsmeðferð við Háskólasjúkrahúsið í Uppsölum að fjárhæð kr. 18.600.000. Brýnn málflutningsfrestur.",
    priority: "HIGH",
    status: "ACTIVE",
    created_at: "2026-09-09T09:00:00Z",
  },
];

export const docsStore: DocumentItem[] = [
  {
    id: "doc-01-stefna",
    case_id: "case-01",
    title: "Stefna og stefnubirtingarvottorð.pdf",
    doc_type: "Stefna",
    status: "READY",
    page_count: 8,
    created_at: "2026-08-16T11:00:00Z",
    filing_date: "2026-08-16",
    author: "Guðrún Sigurðardóttir hrl., lögmaður stefnanda",
    summary: "Stefna Eignarhaldsfélagsins Brekku ehf. á hendur Verktakafélaginu Hamri ehf. vegna vanefnda á verksamningi við Bryggjuhverfi.",
    notes: "Birting staðfest af stefnuvotti 16. ágúst. Gæta að því að greinargerðarfrestur stefnda rennur út 16. október 2026.",
    notes_updated_at: "2026-08-17T09:15:00Z",
    content: `STEFNA Í EINKAMÁLI

Ár 2026, þriðjudaginn 16. ágúst, stefnir undirrituð Guðrún Sigurðardóttir, hrl., f.h.:
Eignarhaldsfélagsins Brekku ehf., kt. 520412-0890,
að Skútuvogi 12, 104 Reykjavík, hér eftir nefnt stefnandi,

á hendur:
Verktakafélaginu Hamri ehf., kt. 610819-1420,
að Tangabryggju 4, 110 Reykjavík, hér eftir nefnt stefndi,

fyrir Héraðsdóm Reykjavíkur, Dómhúsinu við Lækjartorg, til dómþings sem þar verður háð:
Fimmtudaginn 24. október 2026 kl. 09:30.

I. DÓMKRÖFUR STEFNANDA:
1. Að viðurkennt verði með dómi að stefnanda hafi verið rétt og heimilt að rifta verksamningi aðila dags. 15. janúar 2024 um uppsteypu og lokafrágang við Bryggjuhverfi 14–18.
2. Að stefndi verði dæmdur til að greiða stefnanda skaðabætur að fjárhæð kr. 48.500.000, ásamt vöxtum og dráttarvöxtum skv. lögum nr. 38/2001.
3. Málskostnaður.

II. MÁLSATVIK OG RÖK:
Verksamningur 15. janúar 2024. Verklok áttu að vera 1. febrúar 2026. Stefndi stöðvaði vinnu í desember 2025. Framvinda var aðeins 54%. Riftun 1. mars 2026.`,
  },
  {
    id: "doc-01-samningur",
    case_id: "case-01",
    title: "Verksamningur Bryggjuhverfi 2024.pdf",
    doc_type: "Samningur",
    status: "READY",
    page_count: 24,
    created_at: "2026-08-16T11:05:00Z",
    filing_date: "2026-08-16",
    author: "Verkkaupi og aðalverktaki",
    summary: "Verksamningur aðila um fullnaðarfrágang á 24 íbúðum við Bryggjuhverfi. Samningsfjárhæð kr. 340.000.000.",
    content: `VERKSAMNINGUR UM BYGGINGARFRAMKVÆMDIR
Verkkaupi: Eignarhaldsfélagið Brekka ehf.
Verktaki: Verktakafélagið Hamar ehf.
Heildarverkverð: kr. 340.000.000. Dagsektir kr. 250.000 á dag.`,
  },
  {
    id: "doc-01-matsgerd",
    case_id: "case-01",
    title: "Matsgerð dómkvaddra matsmanna.pdf",
    doc_type: "Sérfræðiskýrsla",
    status: "READY",
    page_count: 42,
    created_at: "2026-08-22T08:30:00Z",
    filing_date: "2026-08-22",
    author: "Dómkvaddir matsmenn: Ingvar Þórðarson byggingarverkfræðingur og Katrín Birgisdóttir húsameistari",
    summary: "Dómkvaðning skv. lögum nr. 91/1991. Mat á raunverulegri framvindu (54%), byggingargöllum og heildartjóni (kr. 48.500.000).",
    notes: "Athuga sérstaklega útreikning á bls. 28 varðandi rakaskemmdir og bera saman við verksamning. Gera athugasemd við málflutning ef gagnaðili krefst yfirmats.",
    notes_updated_at: "2026-08-23T14:20:00Z",
    content: `DÓMSKÖLLUÐ MATSGERÐ
Fyrir Héraðsdómi Reykjavíkur í máli nr. E-1024/2026
Matsmenn: Ingvar Þórðarson og Katrín Birgisdóttir.
Framvinda unninna verkþátta: 54%. Gallar: kr. 16.400.000. Lokafrágangur: kr. 32.100.000. Heildartjón: kr. 48.500.000.`,
  },
  {
    id: "doc-02-stefna",
    case_id: "case-02",
    title: "Stefna vegna líkamstjóns.pdf",
    doc_type: "Stefna",
    status: "READY",
    page_count: 6,
    created_at: "2026-08-21T09:00:00Z",
    filing_date: "2026-08-21",
    author: "Lögfræðiþjónusta stefnanda",
    summary: "Stefna á hendur tryggingafélaginu Verði vegna umferðarslyss á Vesturlandsvegi. Krafist bóta skv. lögum nr. 50/1993.",
    content: `STEFNA Í SKAÐABÓTAMÁLI
Stefnandi: Helga Sigurðardóttir. Stefndi: Tryggingafélagið Vörður hf.
Bótakrafa: kr. 21.400.000 skv. 1., 4. og 5. gr. skaðabótalaga nr. 50/1993.`,
  },
  {
    id: "doc-02-laeknisvottord",
    case_id: "case-02",
    title: "Örorkumat og sérfræðivottorð læknis.pdf",
    doc_type: "Læknisvottorð",
    status: "READY",
    page_count: 14,
    created_at: "2026-08-21T09:10:00Z",
    filing_date: "2026-08-21",
    author: "Dr. Ólafur Kjartansson bæklunarlæknir",
    summary: "Læknisfræðilegt mat á varanlegri örorku (25%) og varanlegum miska (15 stig) í kjölfar hálshnykks.",
    content: `LÆKNISFRÆÐILEGT ÖRORKUMAT OG SÉRFRÆÐIVOTTORÐ
Sjúklingur: Helga Sigurðardóttir.
Varanleg örorka: 25%. Varanlegur miski: 15 stig.`,
  },
  {
    id: "doc-03-kaupsamningur",
    case_id: "case-03",
    title: "Kaupsamningur og afsali - Laugavegur 45.pdf",
    doc_type: "Kaupsamningur",
    status: "READY",
    page_count: 11,
    created_at: "2026-09-02T10:00:00Z",
    filing_date: "2026-09-02",
    author: "Fasteignasala Reykjavíkur",
    summary: "Kaupsamningur um 4ra herbergja íbúð að Laugavegi 45. Kaupverð kr. 98.000.000.",
    content: `KAUPSAMNINGUR UM FASTEIGN
Kaupandi: Árni Jónsson. Seljandi: Sigurður Ólafsson.
Laugavegur 45, 101 Reykjavík. Kaupverð kr. 98.000.000. Ástandsyfirlýsing skv. 17. gr. laga nr. 40/2002.`,
  },
  {
    id: "doc-03-mygluskýrsla",
    case_id: "case-03",
    title: "Skoðunarskýrsla Náttúrustofu um myglusvepp.pdf",
    doc_type: "Matsgerð",
    status: "READY",
    page_count: 18,
    created_at: "2026-09-02T10:15:00Z",
    filing_date: "2026-09-02",
    author: "Náttúrustofa & Byggingagallar ehf.",
    summary: "Skoðun og sýnataka á Laugavegi 45. Staðfestur útbreiddur mygluvöxtur og ónýt einangrun í útveggjum.",
    content: `SKOÐUNARSKÝRSLA UM INNIVIST, RAKA OG MYGLU
Laugavegur 45. Svartmygla (Stachybotrys chartarum). Úrbótakostnaður kr. 14.200.000.`,
  },
  {
    id: "doc-04-stefna",
    case_id: "case-04",
    title: "Stefna í flýtimeðferðarmáli og gjaldfelling.pdf",
    doc_type: "Stefna",
    status: "READY",
    page_count: 9,
    created_at: "2026-09-08T09:00:00Z",
    filing_date: "2026-09-08",
    author: "Lögmannsstofa Reykjavíkur slf., f.h. Sparisjóðs Austurlands hf.",
    summary: "Stefna á hendur Norðurfelli ehf. og sjálfskuldarábyrgðarmanni vegna vanefnda á lánasamningi. Krafist kr. 35.800.000 auk dráttarvaxta.",
    content: `STEFNA Í FLÝTIMEÐFERÐARMÁLI
Stefnandi: Sparisjóður Austurlands hf., kt. 620598-2139
Stefndu: 1. Norðurfell ehf., kt. 581014-0320
         2. Jónas Hallgrímsson, kt. 240776-4189 (ábyrgðarmaður)
Fyrir Héraðsdóm Reykjavíkur. Krafa um greiðslu kr. 35.800.000 ásamt hæstu lögleyfðu dráttarvöxtum skv. lögum nr. 38/2001.`,
  },
  {
    id: "doc-04-skuldabref",
    case_id: "case-04",
    title: "Skuldabréf nr. 49201 og sjálfskuldarábyrgð.pdf",
    doc_type: "Samningur",
    status: "READY",
    page_count: 14,
    created_at: "2026-09-08T09:15:00Z",
    filing_date: "2026-09-08",
    author: "Lánadeild Sparisjóðs Austurlands hf.",
    summary: "Skilmálar skuldabréfs og þinglýst sjálfskuldarábyrgðaryfirlýsing stjórnarformanns vegna rekstrarláns.",
    content: `SKULDABRÉF MEÐ SJÁLFSKULDARÁBYRGÐ
Lánveitandi: Sparisjóður Austurlands hf.
Aðalskuldari: Norðurfell ehf. Sjálfskuldarábyrgðarmaður: Jónas Hallgrímsson.
Höfuðstóll: kr. 35.800.000. Gjaldfellingarákvæði við 30 daga vanskil.`,
  },
  {
    id: "doc-04-drog-greinargerd",
    case_id: "case-04",
    title: "Drög að greinargerð og varnarorðum stefnda.docx",
    doc_type: "Greinargerð",
    status: "READY",
    page_count: 7,
    created_at: "2026-09-09T14:20:00Z",
    filing_date: "2026-09-09",
    author: "Guðrún Sigurðardóttir hrl., lögmaður varnaraðila",
    summary: "Drög að vörnum stefnda fyrir dómi. Gerð krafa um sýknu og frávísun vegna formgalla á gjaldfellingarseðli skv. 143. gr. eml.",
    notes: "Bráðaaðgerð: Greinargerðarfrestur rennur út innan skamms. Senda þarf andmæli fyrir dómþing.",
    notes_updated_at: "2026-09-09T15:00:00Z",
    content: `GREINARGERÐ STEFNDA Í FLÝTIMEÐFERÐ
Mál nr. E-1025/2026
Stefndu krefjast sýknu af öllum kröfum stefnanda, til vara frávísunar.
Rök: Gjaldfelling lánsins var ólögmæt þar sem stefnandi veitti ekki lögbundinn 14 daga frest til greiðslujöfnunar.`,
  },
  {
    id: "doc-05-stefna",
    case_id: "case-05",
    title: "Stefna og krafa um bráðabirgðaúrskurð dómara.pdf",
    doc_type: "Stefna",
    status: "READY",
    page_count: 12,
    created_at: "2026-09-09T10:30:00Z",
    filing_date: "2026-09-09",
    author: "Lögmannsstofa stefnanda f.h. Kristínar Valdimarsdóttur",
    summary: "Stefna á hendur Sjúkratryggingum Íslands og ríkinu með kröfu um bráðabirgðaúrskurð skv. 2. mgr. 102. gr. eml. um greiðsluþátttöku í læknismeðferð í Uppsölum.",
    content: `STEFNA MEÐ KRÖFU UM BRÁÐABIRGÐAÚRSKURÐ DÓMARA
Stefnandi: Kristín Valdimarsdóttir, kt. 120385-4819
Stefndu: 1. Sjúkratryggingar Íslands, kt. 490908-0840
         2. Íslenska ríkið, kt. 440269-0129
Kröfur: Viðurkenning á rétti til greiðsluþátttöku kr. 18.600.000 vegna lífsnauðsynlegrar meðferðar, og bráðabirgðaráðstöfun dómara samdægurs skv. 102. gr. laga nr. 91/1991.`,
  },
  {
    id: "doc-05-synjun",
    case_id: "case-05",
    title: "Synjunarúrskurður Sjúkratrygginga Íslands.pdf",
    doc_type: "Stjórnvaldsúrskurður",
    status: "READY",
    page_count: 5,
    created_at: "2026-09-09T11:00:00Z",
    filing_date: "2026-09-09",
    author: "Úrskurðarnefnd velferðarmála / Sjúkratryggingar",
    summary: "Synjun á umsókn stefnanda um greiðsluþátttöku í sérhæfðri ónæmismeðferð á Háskólasjúkrahúsinu í Uppsölum skv. reglugerð nr. 431/2012.",
    content: `ÁKVÖRÐUN SJÚKRATRYGGINGA ÍSLANDS
Mál nr. S-8924/2026
Umsókn um greiðsluþátttöku í meðferð erlendis synjað á grundvelli þess að meðferðin teljist ekki gagnreynd skv. mati ráðgjafalæknis stofnunarinnar.`,
  },
  {
    id: "doc-05-laeknamat",
    case_id: "case-05",
    title: "Læknisfræðilegt bráðamat og yfirlýsing yfirlæknis.pdf",
    doc_type: "Sérfræðiskýrsla",
    status: "READY",
    page_count: 15,
    created_at: "2026-09-09T11:20:00Z",
    filing_date: "2026-09-09",
    author: "Prófessor Ólafur Guðmundsson, yfirlæknir krabbameinslækninga Landspítala",
    summary: "Bráðamat: Hefðbundin lyfja- og geislameðferð á Íslandi hefur ekki skilað árangri. Meðferð í Svíþjóð er eini raunhæfi lífsbjargandi kosturinn og hver vika skiptir máli.",
    notes: "Mjög afgerandi sérfræðimat. Stuðlar að fullu við bráðabirgðakröfu skv. 102. gr. eml.",
    notes_updated_at: "2026-09-09T12:00:00Z",
    content: `LÆKNISFRÆÐILEG ÁLITSGERÐ OG BRÁÐAMAT
Sjúklingur: Kristín Valdimarsdóttir.
Niðurstaða: Meðferðin í Uppsölum er lífsbjargandi og rökstudd með nýjustu klínískum rannsóknum. Dráttur á meðferð skerðir lífslíkur sjúklings óafturkræft.`,
  },
];

export const deadlinesStore: CaseDeadlineItem[] = [
  {
    id: "dl-01",
    case_id: "case-01",
    name: "Þingfesting og greinargerðarfrestur",
    category: "greinargerdfrestur",
    target_date: "2026-10-24",
    statutory_reference: "97. gr. laga nr. 91/1991",
    description: "Frestur stefnda til að leggja fram greinargerð og skrifleg sönnunargögn.",
    is_court_recess_adjusted: false,
    status: "urgent",
    created_at: "2026-08-16T12:00:00Z",
  },
  {
    id: "dl-02",
    case_id: "case-01",
    name: "Frestur til gagnaöflunar og dómkvaðningar",
    category: "gagnaoflun",
    target_date: "2026-11-15",
    statutory_reference: "101. gr. laga nr. 91/1991",
    description: "Lokafrestur málsaðila til að óska eftir yfirmatsgerð eða vitnaleiðslum.",
    is_court_recess_adjusted: false,
    status: "pending",
    created_at: "2026-08-16T12:00:00Z",
  },
  {
    id: "dl-03",
    case_id: "case-03",
    name: "Stefnufrestur (stefndi utan dómumdæmis)",
    category: "stefnufrestur",
    target_date: "2026-10-22",
    statutory_reference: "80. gr. laga nr. 91/1991",
    description: "Lögbundinn 14 sólarhringa lágmarksstefnufrestur fyrir birtingu utan dómumdæmis.",
    is_court_recess_adjusted: false,
    status: "urgent",
    created_at: "2026-09-02T11:00:00Z",
  },
  {
    id: "dl-04",
    case_id: "case-04",
    name: "Bráðafrestur: Greinargerð og varnir (Flýtimeðferð)",
    category: "greinargerdfrestur",
    target_date: getRelativeDeadlineDateStr(18 + 720 - 336),
    statutory_reference: "97. gr. og 143. gr. laga nr. 91/1991",
    description: "Lokafrestur stefnda til að leggja fram skriflega greinargerð, sýknukröfur og málsgögn í flýtimeðferðarmáli.",
    is_court_recess_adjusted: false,
    status: "urgent",
    created_at: "2026-09-08T10:00:00Z",
  },
  {
    id: "dl-04-sub",
    case_id: "case-04",
    name: "Frestur til að höfða staðfestingarmál vegna kyrrsetningar",
    category: "stefnufrestur",
    target_date: getRelativeDeadlineDateStr(42 + 720 - 336),
    statutory_reference: "3. mgr. 44. gr. laga nr. 31/1990",
    description: "Lögbundinn 7 daga frestur gerðarbeiðanda til að höfða staðfestingarmál vegna framkvæmdrar kyrrsetningar í eignum skuldara.",
    is_court_recess_adjusted: false,
    status: "urgent",
    created_at: "2026-09-08T10:30:00Z",
  },
  {
    id: "dl-05",
    case_id: "case-05",
    name: "Brýnn málflutningsfrestur vegna bráðabirgðaúrskurðar",
    category: "malsflutningur",
    target_date: getRelativeDeadlineDateStr(28 + 720),
    statutory_reference: "2. mgr. 102. gr. laga nr. 91/1991",
    description: "Úrlausnarkrafa og dómþing um bráðabirgðaráðstöfun dómara um greiðsluþátttöku í lífsnauðsynlegri læknismeðferð erlendis.",
    is_court_recess_adjusted: false,
    status: "urgent",
    created_at: "2026-09-09T10:15:00Z",
  },
  {
    id: "dl-05-sub",
    case_id: "case-05",
    name: "Frestur ríkislögmanns til að leggja fram andmæli og sérfræðimat",
    category: "gagnaoflun",
    target_date: getRelativeDeadlineDateStr(46 + 720),
    statutory_reference: "101. gr. laga nr. 91/1991",
    description: "Lokafrestur stefndu til að skila andmælum og læknisfræðilegum sérfræðigögnum fyrir dómþing.",
    is_court_recess_adjusted: false,
    status: "urgent",
    created_at: "2026-09-09T10:45:00Z",
  },
];

export const timeEntriesStore: TimeEntryItem[] = [
  {
    id: "time-01",
    case_id: "case-01",
    user_id: "usr-lawyer-01",
    user_name: "Guðrún Sigurðardóttir hrl.",
    user_role: "Málflytjandi / Partner",
    date: "2026-08-15",
    duration_minutes: 180,
    hourly_rate: 36000,
    task_category: "pleading",
    description: "Gagnaöflun, rýni verksamnings við Bryggjuhverfi og samning stefnu á hendur Verktakafélaginu Hamri ehf.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-08-15T16:30:00Z",
  },
  {
    id: "time-02",
    case_id: "case-01",
    user_id: "usr-paralegal-01",
    user_name: "Ásta Einarsdóttir lögfræðinemi",
    user_role: "Aðstoðarmaður / Paralegal",
    date: "2026-08-16",
    duration_minutes: 120,
    hourly_rate: 22000,
    task_category: "discovery",
    description: "Flokkun málsskjala, undirbúningur dómaskjalaskrár og afhending stefnu til stefnuvotts.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-08-16T12:00:00Z",
  },
  {
    id: "time-03",
    case_id: "case-01",
    user_id: "usr-lawyer-01",
    user_name: "Guðrún Sigurðardóttir hrl.",
    user_role: "Málflytjandi / Partner",
    date: "2026-08-25",
    duration_minutes: 90,
    hourly_rate: 36000,
    task_category: "consultation",
    description: "Fundur með stjórn Brekku ehf. farið yfir málsvarnir stefnda og undirbúin viðbótargögn.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-08-25T15:00:00Z",
  },
  {
    id: "time-04",
    case_id: "case-01",
    user_id: "usr-lawyer-01",
    user_name: "Guðrún Sigurðardóttir hrl.",
    user_role: "Málflytjandi / Partner",
    date: "2026-09-02",
    duration_minutes: 60,
    hourly_rate: 36000,
    task_category: "hearing",
    description: "Mæting í þinghald fyrir Héraðsdómi Reykjavíkur. Stefna lögð fram og greinargerðarfrestur veittur.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-09-02T11:30:00Z",
  },
  {
    id: "time-05",
    case_id: "case-02",
    user_id: "usr-lawyer-01",
    user_name: "Guðrún Sigurðardóttir hrl.",
    user_role: "Málflytjandi / Partner",
    date: "2026-08-21",
    duration_minutes: 150,
    hourly_rate: 36000,
    task_category: "research",
    description: "Útreikningur bótaréttar skv. lögum nr. 50/1993, rýni á læknisfræðilegu örorkumati og fordæmum Hæstaréttar.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-08-21T14:00:00Z",
  },
  {
    id: "time-06",
    case_id: "case-03",
    user_id: "usr-lawyer-01",
    user_name: "Guðrún Sigurðardóttir hrl.",
    user_role: "Málflytjandi / Partner",
    date: "2026-09-03",
    duration_minutes: 120,
    hourly_rate: 36000,
    task_category: "pleading",
    description: "Samning stefnu vegna leyndra galla og myglu í fasteign að Laugavegi 45.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-09-03T16:00:00Z",
  },
  {
    id: "time-07",
    case_id: "case-04",
    user_id: "usr-lawyer-01",
    user_name: "Guðrún Sigurðardóttir hrl.",
    user_role: "Málflytjandi / Partner",
    date: "2026-09-08",
    duration_minutes: 150,
    hourly_rate: 36000,
    task_category: "pleading",
    description: "Bráðarýni á stefnu Sparisjóðs Austurlands í flýtimeðferð og mótun varnarorða vegna skorts á gjaldfellingarfresti.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-09-08T14:30:00Z",
  },
  {
    id: "time-08",
    case_id: "case-04",
    user_id: "usr-paralegal-01",
    user_name: "Ásta Einarsdóttir lögfræðinemi",
    user_role: "Aðstoðarmaður / Paralegal",
    date: "2026-09-09",
    duration_minutes: 90,
    hourly_rate: 22000,
    task_category: "discovery",
    description: "Yfirferð bankayfirlita og greiðslukvittana Norðurfells ehf. til undirbúnings málsvarna fyrir greinargerðarfrest.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-09-09T11:00:00Z",
  },
  {
    id: "time-09",
    case_id: "case-05",
    user_id: "usr-lawyer-01",
    user_name: "Guðrún Sigurðardóttir hrl.",
    user_role: "Málflytjandi / Partner",
    date: "2026-09-09",
    duration_minutes: 180,
    hourly_rate: 36000,
    task_category: "pleading",
    description: "Mótun stefnu og bráðakröfu um bráðabirgðaúrskurð dómara skv. 102. gr. eml. vegna lífsnauðsynlegrar krabbameinsmeðferðar.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-09-09T16:00:00Z",
  },
  {
    id: "time-10",
    case_id: "case-05",
    user_id: "usr-lawyer-01",
    user_name: "Guðrún Sigurðardóttir hrl.",
    user_role: "Málflytjandi / Partner",
    date: "2026-09-10",
    duration_minutes: 60,
    hourly_rate: 36000,
    task_category: "consultation",
    description: "Samráð við lækna á krabbameinsdeild Landspítala vegna tímaramma meðferðar í Svíþjóð.",
    is_billable: true,
    status: "unbilled",
    created_at: "2026-09-10T09:30:00Z",
  },
];

export const expensesStore: ExpenseItem[] = [
  {
    id: "exp-01",
    case_id: "case-01",
    expense_type: "court_fee",
    title: "Dómgjald vegna útgáfu og þingfestingar stefnu (l. nr. 88/1991)",
    amount: 26000,
    vat_rate: 0,
    vat_amount: 0,
    incurred_date: "2026-08-16",
    receipt_doc_title: "Kvittun Héraðsdóms Reykjavíkur - Dómgjald.pdf",
    status: "unbilled",
    created_at: "2026-08-16T11:30:00Z",
  },
  {
    id: "exp-02",
    case_id: "case-01",
    expense_type: "service_fee",
    title: "Þóknun stefnuvotts fyrir löglega birtingu stefnu á Hamri ehf.",
    amount: 14500,
    vat_rate: 0.24,
    vat_amount: 3480,
    incurred_date: "2026-08-16",
    receipt_doc_title: "Reikningur Stefnuvotta Reykjavíkur ehf.pdf",
    status: "unbilled",
    created_at: "2026-08-16T15:00:00Z",
  },
  {
    id: "exp-03",
    case_id: "case-01",
    expense_type: "expert_appraisal",
    title: "Frumálit dómkvadds matsanns á byggingatæknilegum göllum",
    amount: 185000,
    vat_rate: 0.24,
    vat_amount: 44400,
    incurred_date: "2026-08-28",
    receipt_doc_title: "Reikningur Verkfræðistofu Reykjavíkur.pdf",
    status: "unbilled",
    created_at: "2026-08-28T16:00:00Z",
  },
  {
    id: "exp-04",
    case_id: "case-03",
    expense_type: "court_fee",
    title: "Dómgjald vegna stefnu að Laugavegi 45",
    amount: 26000,
    vat_rate: 0,
    vat_amount: 0,
    incurred_date: "2026-09-02",
    status: "unbilled",
    created_at: "2026-09-02T10:00:00Z",
  },
  {
    id: "exp-05",
    case_id: "case-04",
    expense_type: "court_fee",
    title: "Þingfestingargjald í flýtimeðferðarmáli",
    amount: 35000,
    vat_rate: 0,
    vat_amount: 0,
    incurred_date: "2026-09-08",
    status: "unbilled",
    created_at: "2026-09-08T09:30:00Z",
  },
  {
    id: "exp-06",
    case_id: "case-05",
    expense_type: "expert_appraisal",
    title: "Sérfræðilegt bráðamat erlends sérfræðilæknis vegna ónæmismeðferðar",
    amount: 120000,
    vat_rate: 0.24,
    vat_amount: 28800,
    incurred_date: "2026-09-09",
    status: "unbilled",
    created_at: "2026-09-09T14:00:00Z",
  },
];

export const TASK_CATEGORY_LABELS: Record<TimeTaskCategory, string> = {
  pleading: "Stefnu- og greinargerðarsmíð",
  discovery: "Gagnaöflun og skjalaskoðun",
  hearing: "Dómþing, fyrirtökur og málflutningur",
  consultation: "Viðtöl við umbjóðanda og vitni",
  correspondence: "Samskipti við dóm og gagnaðila",
  research: "Lagarannsóknir og fordæmaleit",
  other: "Önnur lögfræðistörf",
};

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  court_fee: "Dómgjöld (l. nr. 88/1991)",
  service_fee: "Stefnubirtingarkostnaður",
  expert_appraisal: "Matsgerðir og sérfræðiálit",
  travel: "Ferðakostnaður",
  other: "Ýmis útlagður kostnaður",
};

export type PaymentMethod = "bank_transfer" | "credit_card" | "cash" | "other";

export interface InvoiceLineItem {
  id: string;
  type: "time" | "expense" | "custom";
  ref_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  amount_ex_vat: number;
  vat_amount: number;
  total_inc_vat: number;
}

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  case_id: string;
  case_number: string;
  case_title: string;
  client_name: string;
  client_kennitala?: string;
  client_address?: string;
  attorney_name: string;
  law_firm_name: string;
  law_firm_kennitala: string;
  law_firm_vat_no: string;
  law_firm_bank: string;
  issue_date: string;
  due_date: string;
  penalty_date: string;
  status: "draft" | "issued" | "paid" | "cancelled";
  line_items: InvoiceLineItem[];
  subtotal_ex_vat: number;
  total_vat: number;
  total_inc_vat: number;
  retainer_deducted: number;
  final_amount_due: number;
  notes?: string;
  payment_date?: string;
  payment_reference?: string;
  created_at: string;
}

export interface RetainerTransactionItem {
  id: string;
  case_id: string;
  type: "deposit" | "deduction" | "refund";
  amount: number;
  date: string;
  payment_method: PaymentMethod;
  reference: string;
  invoice_id?: string;
  invoice_number?: string;
  notes?: string;
  created_at: string;
}

export const retainersStore: RetainerTransactionItem[] = [
  {
    id: "ret-01",
    case_id: "case-01",
    type: "deposit",
    amount: 500000,
    date: "2026-08-15",
    payment_method: "bank_transfer",
    reference: "Innborgun á vörslureikning - Mál E-1024/2026",
    notes: "Upphaflegt tryggingafé vegna rekstrar máls gegn Hamri ehf.",
    created_at: "2026-08-15T11:00:00Z",
  },
  {
    id: "ret-02",
    case_id: "case-02",
    type: "deposit",
    amount: 250000,
    date: "2026-08-20",
    payment_method: "bank_transfer",
    reference: "Innborgun á vörslureikning - Mál E-1089/2026",
    notes: "Tryggingafé vegna líkamstjónamáls",
    created_at: "2026-08-20T10:00:00Z",
  },
  {
    id: "ret-04",
    case_id: "case-04",
    type: "deposit",
    amount: 450000,
    date: "2026-09-08",
    payment_method: "bank_transfer",
    reference: "Innborgun á vörslureikning - Mál E-1025/2026",
    notes: "Tryggingafé vegna flýtimeðferðar og varna fyrir dómi",
    created_at: "2026-09-08T11:00:00Z",
  },
  {
    id: "ret-05",
    case_id: "case-05",
    type: "deposit",
    amount: 500000,
    date: "2026-09-09",
    payment_method: "bank_transfer",
    reference: "Innborgun á vörslureikning - Mál E-1218/2026",
    notes: "Málskostnaðartrygging vegna bráðakröfu um bráðabirgðaúrskurð",
    created_at: "2026-09-09T11:30:00Z",
  },
];

export const invoicesStore: InvoiceItem[] = [
  {
    id: "inv-demo-01",
    invoice_number: "REIK-2026-0001",
    case_id: "case-01",
    case_number: "E-1024/2026",
    case_title: "Eignarhaldsfélagið Brekka ehf. gegn Verktakafélaginu Hamri ehf.",
    client_name: "Eignarhaldsfélagið Brekka ehf.",
    client_kennitala: "520412-0890",
    client_address: "Skútuvogi 12, 104 Reykjavík",
    attorney_name: "Guðrún Sigurðardóttir hrl.",
    law_firm_name: "Lögmenn Lækjargötu slf.",
    law_firm_kennitala: "540209-1120",
    law_firm_vat_no: "102345",
    law_firm_bank: "0101-26-045678",
    issue_date: "2026-08-31",
    due_date: "2026-09-14",
    penalty_date: "2026-09-30",
    status: "issued",
    line_items: [
      {
        id: "li-demo-01",
        type: "time",
        ref_id: "time-01",
        description: "Gagnaöflun, rýni verksamnings við Bryggjuhverfi og samning stefnu (3.0 klst. á kr. 36.000)",
        quantity: 3,
        unit_price: 36000,
        vat_rate: 0.24,
        amount_ex_vat: 108000,
        vat_amount: 25920,
        total_inc_vat: 133920,
      },
      {
        id: "li-demo-02",
        type: "expense",
        ref_id: "exp-01",
        description: "Dómgjald vegna útgáfu og þingfestingar stefnu (l. nr. 88/1991)",
        quantity: 1,
        unit_price: 26000,
        vat_rate: 0,
        amount_ex_vat: 26000,
        vat_amount: 0,
        total_inc_vat: 26000,
      },
    ],
    subtotal_ex_vat: 134000,
    total_vat: 25920,
    total_inc_vat: 159920,
    retainer_deducted: 0,
    final_amount_due: 159920,
    notes: "Fyrsti reikningur vegna stefnugerðar og þingfestingar.",
    created_at: "2026-08-31T15:00:00Z",
  },
];

export function calculateRetainerBalance(
  caseId: string,
  retainers: RetainerTransactionItem[] = retainersStore
) {
  const caseTx = retainers.filter((t) => t.case_id === caseId);
  let totalDeposited = 0;
  let totalDeducted = 0;
  let totalRefunded = 0;

  caseTx.forEach((tx) => {
    if (tx.type === "deposit") {
      totalDeposited += tx.amount;
    } else if (tx.type === "deduction") {
      totalDeducted += tx.amount;
    } else if (tx.type === "refund") {
      totalRefunded += tx.amount;
    }
  });

  const currentBalance = Math.max(0, totalDeposited - totalDeducted - totalRefunded);

  return {
    totalDeposited,
    totalDeducted,
    totalRefunded,
    currentBalance,
    transactions: caseTx,
  };
}


