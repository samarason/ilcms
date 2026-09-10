#!/bin/sh
# ==============================================================================
# ILCMS Library Restorer
# Automatically restores src/lib/* modules if missing from the working directory.
# Compatible with both standard POSIX /bin/sh and bash.
# ==============================================================================
set -e

# Ensure execution from project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

mkdir -p src/lib

if [ ! -f "src/lib/auth.tsx" ]; then
    echo "Restoring src/lib/auth.tsx..."
    cat <<'EOF' > src/lib/auth.tsx
"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "LAWYER" | "JUDGE" | "PARALEGAL" | "ADMIN";
  title?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (role?: "LAWYER" | "JUDGE" | "PARALEGAL" | "ADMIN") => void;
  loginWithCredentials: (username: string, password?: string) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: () => {},
  loginWithCredentials: () => ({ success: false }),
  logout: () => {},
});

export const DEMO_USERS: Record<string, User> = {
  LAWYER: {
    id: "usr-lawyer-01",
    name: "Guðrún Sigurðardóttir hrl.",
    email: "gudrun@lex.is",
    role: "LAWYER",
  },
  JUDGE: {
    id: "usr-judge-01",
    name: "Jón Þórðarson héraðsdómari",
    email: "jon.thordarson@heradsdomstolar.is",
    role: "JUDGE",
  },
  PARALEGAL: {
    id: "usr-paralegal-01",
    name: "Ásta Einarsdóttir lögfræðinemi",
    email: "asta@lex.is",
    role: "PARALEGAL",
  },
  ADMIN: {
    id: "usr-admin-01",
    name: "Kerfisstjóri ILCMS",
    email: "admin@ilcms.is",
    role: "ADMIN",
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(DEMO_USERS.LAWYER);
  const [token, setToken] = useState<string | null>("mock-keycloak-jwt-token-airgap-poc");

  const login = (role: "LAWYER" | "JUDGE" | "PARALEGAL" | "ADMIN" = "LAWYER") => {
    setUser(DEMO_USERS[role] || DEMO_USERS.LAWYER);
    setToken(`jwt-token-${role.toLowerCase()}-${Date.now()}`);
  };

  const loginWithCredentials = (username: string, _password?: string): { success: boolean; error?: string } => {
    const trimmed = username.toLowerCase().trim();
    let foundRole: "LAWYER" | "JUDGE" | "PARALEGAL" | "ADMIN" = "LAWYER";

    if (trimmed.includes("judge") || trimmed.includes("domari") || trimmed.includes("dómari") || trimmed.includes("jon")) {
      foundRole = "JUDGE";
    } else if (trimmed.includes("paralegal") || trimmed.includes("asta") || trimmed.includes("nemi")) {
      foundRole = "PARALEGAL";
    } else if (trimmed.includes("admin") || trimmed.includes("kerfisstjori")) {
      foundRole = "ADMIN";
    } else {
      foundRole = "LAWYER";
    }

    setUser(DEMO_USERS[foundRole] || DEMO_USERS.LAWYER);
    setToken(`jwt-token-${foundRole.toLowerCase()}-${Date.now()}`);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        login,
        loginWithCredentials,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

EOF
fi

if [ ! -f "src/lib/store.ts" ]; then
    echo "Restoring src/lib/store.ts..."
    cat <<'EOF' > src/lib/store.ts
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
    notes: "Birting staðfest af stefnuvotti 16. ágúst. Gæta að því að greinargerðarfrestur stefnda rennur út 16. september 2026.",
    notes_updated_at: "2026-08-17T09:15:00Z",
    content: `STEFNA Í EINKAMÁLI

Ár 2026, þriðjudaginn 16. ágúst, stefnir undirrituð Guðrún Sigurðardóttir, hrl., f.h.:
Eignarhaldsfélagsins Brekku ehf., kt. 520412-0890,
að Skútuvogi 12, 104 Reykjavík, hér eftir nefnt stefnandi,

á hendur:
Verktakafélaginu Hamri ehf., kt. 610819-1420,
að Tangabryggju 4, 110 Reykjavík, hér eftir nefnt stefndi,

fyrir Héraðsdóm Reykjavíkur, Dómhúsinu við Lækjartorg, til dómþings sem þar verður háð:
Fimmtudaginn 24. september 2026 kl. 09:30.

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
    target_date: "2026-09-24",
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
    target_date: "2026-10-15",
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
    target_date: "2026-09-22",
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
    target_date: getRelativeDeadlineDateStr(18),
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
    target_date: getRelativeDeadlineDateStr(42),
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
    target_date: getRelativeDeadlineDateStr(28),
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
    target_date: getRelativeDeadlineDateStr(46),
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


EOF
fi

if [ ! -f "src/lib/ollama.ts" ]; then
    echo "Restoring src/lib/ollama.ts..."
    cat <<'EOF' > src/lib/ollama.ts
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaHealthResult {
  healthy: boolean;
  models: string[];
  error?: string;
}

export interface OllamaChatResult {
  text: string;
  modelUsed: string;
  isRealInference: boolean;
}

class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    this.defaultModel = process.env.OLLAMA_MODEL || "gemma2:9b";
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  async checkHealth(): Promise<OllamaHealthResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { healthy: false, models: [], error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const models = (data.models || []).map((m: any) => m.name || m.model);
      return { healthy: true, models };
    } catch (err: any) {
      return {
        healthy: false,
        models: [],
        error: err.message || "Ollama service unavailable or starting up",
      };
    }
  }

  async chat(messages: ChatMessage[], modelOverride?: string): Promise<OllamaChatResult> {
    let targetModel = modelOverride || this.defaultModel;

    const tryChat = async (m: string): Promise<OllamaChatResult | null> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);
        const res = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: m,
            messages,
            stream: false,
            options: {
              temperature: 0.2,
              top_p: 0.9,
            },
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data?.message?.content || "";
          if (content.trim()) {
            return {
              text: content,
              modelUsed: m,
              isRealInference: true,
            };
          }
        }
      } catch (err) {
        // Continue
      }
      return null;
    };

    const res1 = await tryChat(targetModel);
    if (res1) return res1;

    try {
      const health = await this.checkHealth();
      if (health.healthy && health.models.length > 0) {
        const discovered =
          health.models.find((name: string) => name.toLowerCase().includes("gemma")) ||
          health.models[0];
        if (discovered && discovered !== targetModel) {
          const res2 = await tryChat(discovered);
          if (res2) return res2;
        }
      }
    } catch {}

    return {
      text: "",
      modelUsed: targetModel,
      isRealInference: false,
    };
  }
}

export const ollama = new OllamaClient();

EOF
fi

if [ ! -f "src/lib/legal-knowledge.ts" ]; then
    echo "Restoring src/lib/legal-knowledge.ts..."
    cat <<'EOF' > src/lib/legal-knowledge.ts
export interface LegalStatute {
  id: string;
  act_name: string;
  act_number: string;
  article: string;
  title: string;
  text: string;
  keywords: string[];
}

export interface LegalPrecedent {
  id: string;
  case_reference: string;
  court: string;
  date: string;
  parties: string;
  summary: string;
  key_findings: string;
  statutory_basis: string[];
}

export const PRE_SEEDED_STATUTES: LegalStatute[] = [
  {
    id: "statute-em-80",
    act_name: "Lög um meðferð einkamála",
    act_number: "91/1991",
    article: "80. gr.",
    title: "Stefnufrestur",
    text: "Stefnufrestur skal vera minnst 3 sólarhringar ef stefndi hefur búsetu eða dvalarstað í sama dómumdæmi og dómþing er háð. Ef stefndi býr annars staðar á landinu skal fresturinn vera minnst 14 sólarhringar. Ef hann býr í Evrópu skal fresturinn vera minnst einn mánuður en 3 mánuðir ef hann býr utan Evrópu. Stefnufrestur telst frá birtingu stefnu til þingfestingardags.",
    keywords: ["stefnufrestur", "birting", "þingfesting", "dómumdæmi", "80. gr.", "frestur"],
  },
  {
    id: "statute-em-81",
    act_name: "Lög um meðferð einkamála",
    act_number: "91/1991",
    article: "81. gr.",
    title: "Dómhlé",
    text: "Dómhlé eru frá 15. júlí til 15. ágúst og frá 20. desember til 5. janúar, svo og dymbilviku og páskaviku. Í dómhléum líða stefnufrestir ekki nema stefnandi krefjist þess sérstaklega eða lög kveði sérstaklega á um annað. Ef frestur á að renna út í dómhléi framlengist hann til fyrsta virka dags að dómhléi loknu.",
    keywords: ["dómhlé", "sumarfrí", "jól", "páskar", "stefnufrestur", "frestur", "81. gr."],
  },
  {
    id: "statute-em-97",
    act_name: "Lög um meðferð einkamála",
    act_number: "91/1991",
    article: "97. gr.",
    title: "Greinargerð stefnda",
    text: "Við þingfestingu máls skal dómari gefa stefnda hæfilegan frest til að leggja fram greinargerð, venjulega ekki lengri en 3 til 4 vikur, nema sérstakar ástæður mæli með öðru. Ef stefndi sækir ekki þing eða skilar ekki greinargerð innan frests má kveða upp útivistardóm skv. kröfum stefnanda.",
    keywords: ["greinargerð", "frestur", "þingfesting", "útivistardómur", "stefndi", "97. gr."],
  },
  {
    id: "statute-em-101",
    act_name: "Lög um meðferð einkamála",
    act_number: "91/1991",
    article: "101. gr.",
    title: "Gagnaöflun og málatilbúnaður",
    text: "Eftir framlagningu greinargerðar ákveður dómari frest til gagnaöflunar. Aðilar skulu leggja fram öll skrifleg sönnunargögn og tilgreina vitni sem óskað er eftir að leiða fyrir dóm. Sé óskað eftir dómkvaddri matsgerð skal það gert án ástæðulauss dráttar.",
    keywords: ["gagnaöflun", "matsgerð", "sönnunargögn", "vitni", "101. gr."],
  },
  {
    id: "statute-em-115",
    act_name: "Lög um meðferð einkamála",
    act_number: "91/1991",
    article: "115. gr.",
    title: "Dómsuppkvaðning",
    text: "Dómur skal kveðinn upp svo fljótt sem auðið er eftir að mál er dómtekið og eigi síðar en innan 4 vikna. Ef sérstaklega stendur á má fresturinn vera allt að 6 vikum en þá skal bóka sérstaklega um ástæður dráttar.",
    keywords: ["dómsuppkvaðning", "dómur", "frestur", "dómtekið", "115. gr."],
  },
  {
    id: "statute-fk-17",
    act_name: "Lög um fasteignakaup",
    act_number: "40/2002",
    article: "17. gr.",
    title: "Galli á fasteign",
    text: "Fasteign telst gölluð ef hún svarar ekki til þeirra krafna sem leiða af samningi aðila eða ákvæðum laga þessara. Fasteign telst einnig gölluð ef hún er í verulega verra ástandi en kaupandi hafði ástæðu til að ætla miðað við kaupverð og aldur hennar.",
    keywords: ["fasteignakaup", "galli", "leyndur galli", "mygla", "17. gr."],
  },
  {
    id: "statute-fk-27",
    act_name: "Lög um fasteignakaup",
    act_number: "40/2002",
    article: "27. gr.",
    title: "Tilkynning um galla (Aðfinnslufrestur)",
    text: "Kaupandi glatar rétti til að bera fyrir sig galla ef hann tilkynnir seljanda ekki um hann án ástæðulauss dráttar eftir að hann varð hans var eða mátti verða hans var við venjulega athugun. Tilkynning verður þó alltaf að berast í síðasta lagi innan 5 ára frá því að kaupandi veitti fasteign viðtöku.",
    keywords: ["tilkynningarfrestur", "aðfinnslufrestur", "fasteignakaup", "ván", "27. gr."],
  },
];

export const PRE_SEEDED_PRECEDENTS: LegalPrecedent[] = [
  {
    id: "prec-hrd-120-2021",
    case_reference: "Hrd. 120/2021",
    court: "Hæstiréttur Íslands",
    date: "2021-11-04",
    parties: "Kaupendur gegn Seljendum einbýlishúss",
    summary: "Mál varðaði leyndan rakagalla og myglu í útveggjum og loftplötum einbýlishúss. Kaupendur létu gera faglega úttekt og tilkynntu seljanda um galla 2 mánuðum eftir skoðun sérfræðings.",
    key_findings: "Hæstiréttur staðfesti að tilkynning innan 2 mánaða frá því að fagleg matsgerð lá fyrir teldist gerð án ástæðulauss dráttar skv. 27. gr. laga nr. 40/2002. Kaupendum dæmdur afsláttur að fjárhæð 8,5 milljónir króna.",
    statutory_basis: ["27. gr. laga nr. 40/2002", "17. gr. laga nr. 40/2002"],
  },
  {
    id: "prec-lr-45-2023",
    case_reference: "Landsréttur 45/2023",
    court: "Landsréttur",
    date: "2023-03-15",
    parties: "A gegn B ehf.",
    summary: "Áfrýjað úrskurði héraðsdóms um frávísun máls þar sem stefna var birt stefnda á Akureyri aðeins 8 sólarhringum fyrir þingfestingu í Héraðsdómi Reykjavíkur.",
    key_findings: "Landsréttur staðfesti frávísun málsins. Lögbundinn 14 sólarhringa stefnufrestur skv. 80. gr. laga nr. 91/1991 þegar stefndi er með búsetu utan dómumdæmis er ófrávíkjanleg réttarfarsregla til verndar varnaraðila.",
    statutory_basis: ["80. gr. laga nr. 91/1991", "81. gr. laga nr. 91/1991"],
  },
  {
    id: "prec-hrd-412-2019",
    case_reference: "Hrd. 412/2019",
    court: "Hæstiréttur Íslands",
    date: "2019-10-10",
    parties: "Fyrrverandi framkvæmdastjóri gegn Tæknilausnum hf.",
    summary: "Fyrirvaralaus riftun ráðningarsamnings vegna meintra trúnaðarbrota starfsmanns.",
    key_findings: "Hæstiréttur taldi félaginu ekki hafa tekist að sanna verulegar eða ásetningslegar vanefndir sem réttlættu riftun. Félaginu var gert að greiða laun út samningsbundinn 6 mánaða uppsagnarfrest ásamt miskabótum.",
    statutory_basis: ["Lög nr. 19/1979", "Samningalög nr. 7/1936"],
  },
  {
    id: "prec-hrd-58-2020",
    case_reference: "Hrd. 58/2020",
    court: "Hæstiréttur Íslands",
    date: "2020-04-23",
    parties: "Byggingarfélag X ehf. gegn Verkkaupa Y",
    summary: "Ágreiningur um lokauppgjör verksamnings og dagsektir vegna tafa við afhendingu fjölbýlishúss.",
    key_findings: "Verkkaupi glataði rétti til dagsekta að hluta þar sem hann hafði ekki svarað tímanlega tilkynningum verktaka um tafir af völdum hönnunarbreytinga.",
    statutory_basis: ["ÍST 30:2012", "Samningalög nr. 7/1936"],
  },
];

EOF
fi

if [ ! -f "src/lib/statutory-deadlines.ts" ]; then
    echo "Restoring src/lib/statutory-deadlines.ts..."
    cat <<'EOF' > src/lib/statutory-deadlines.ts
export interface SummonsCalculationInput {
  serviceDate: string; // YYYY-MM-DD
  defendantLocation: "same_district" | "other_district" | "europe" | "outside_europe";
  courtName?: string;
  grantDefenseWeeks?: number; // default: 3
}

export interface StatutoryDeadlineItem {
  id: string;
  name: string;
  category: "stefnufrestur" | "greinargerdfrestur" | "gagnaoflun" | "malsflutningur" | "domsuppkvadning" | "afryjun";
  targetDate: string;
  statutoryReference: string;
  description: string;
  isCourtRecessAdjusted: boolean;
  status: "pending" | "approaching" | "urgent" | "passed";
  daysRemaining: number;
}

export interface SummonsCalculationResult {
  serviceDate: string;
  earliestCourtDate: string;
  defendantLocation: string;
  isCourtRecessAffected: boolean;
  courtRecessNote?: string;
  deadlines: StatutoryDeadlineItem[];
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function isCourtRecess(date: Date): boolean {
  const month = date.getMonth(); // 0-indexed: 6 = July, 7 = August, 11 = December, 0 = January
  const day = date.getDate();

  if (month === 6 && day >= 15) return true;
  if (month === 7 && day <= 15) return true;
  if (month === 11 && day >= 20) return true;
  if (month === 0 && day <= 5) return true;

  return false;
}

export function adjustToNextCourtBusinessDay(date: Date): Date {
  const d = new Date(date);
  while (isCourtRecess(d)) {
    d.setDate(d.getDate() + 1);
  }
  while (d.getDay() === 0 || d.getDay() === 6 || isCourtRecess(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function calculateCivilSummonsDeadlines(input: SummonsCalculationInput): SummonsCalculationResult {
  const service = new Date(input.serviceDate);
  const now = new Date();

  let noticeDays = 3;
  let locDescription = "Í sama dómumdæmi (3 sólarhringar)";

  switch (input.defendantLocation) {
    case "same_district":
      noticeDays = 3;
      locDescription = "Í sama dómumdæmi (3 sólarhringar)";
      break;
    case "other_district":
      noticeDays = 14;
      locDescription = "Annars staðar á Íslandi (14 sólarhringar)";
      break;
    case "europe":
      noticeDays = 30;
      locDescription = "Í Evrópu (1 mánuður / 30 dagar)";
      break;
    case "outside_europe":
      noticeDays = 90;
      locDescription = "Utan Evrópu (3 mánuðir / 90 dagar)";
      break;
  }

  let earliestCourt = new Date(service);
  earliestCourt.setDate(earliestCourt.getDate() + noticeDays);

  const recessTriggered = isCourtRecess(earliestCourt) || isCourtRecess(service);
  earliestCourt = adjustToNextCourtBusinessDay(earliestCourt);

  function getStatus(target: Date): { status: "pending" | "approaching" | "urgent" | "passed"; daysRemaining: number } {
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { status: "passed", daysRemaining: diff };
    if (diff <= 3) return { status: "urgent", daysRemaining: diff };
    if (diff <= 10) return { status: "approaching", daysRemaining: diff };
    return { status: "pending", daysRemaining: diff };
  }

  const defenseWeeks = input.grantDefenseWeeks || 3;
  const defenseDate = new Date(earliestCourt);
  defenseDate.setDate(defenseDate.getDate() + defenseWeeks * 7);
  const defenseAdjusted = adjustToNextCourtBusinessDay(defenseDate);

  const discoveryDate = new Date(defenseAdjusted);
  discoveryDate.setDate(discoveryDate.getDate() + 21);
  const discoveryAdjusted = adjustToNextCourtBusinessDay(discoveryDate);

  const hearingDate = new Date(discoveryAdjusted);
  hearingDate.setDate(hearingDate.getDate() + 28);
  const hearingAdjusted = adjustToNextCourtBusinessDay(hearingDate);

  const judgmentDate = new Date(hearingAdjusted);
  judgmentDate.setDate(judgmentDate.getDate() + 28);
  const judgmentAdjusted = adjustToNextCourtBusinessDay(judgmentDate);

  const appealDate = new Date(judgmentAdjusted);
  appealDate.setDate(appealDate.getDate() + 28);
  const appealAdjusted = adjustToNextCourtBusinessDay(appealDate);

  const deadlines: StatutoryDeadlineItem[] = [
    {
      id: "dl-summons",
      name: "Fyrsti lögmæti þingfestingardagur (Stefnufrestur)",
      category: "stefnufrestur",
      targetDate: formatDate(earliestCourt),
      statutoryReference: "80. gr. laga nr. 91/1991",
      description: `Lögbundinn lágmarksstefnufrestur: ${locDescription}.`,
      isCourtRecessAdjusted: recessTriggered,
      ...getStatus(earliestCourt),
    },
    {
      id: "dl-defense",
      name: "Frestur stefnda til framlagningar greinargerðar",
      category: "greinargerdfrestur",
      targetDate: formatDate(defenseAdjusted),
      statutoryReference: "97. gr. laga nr. 91/1991",
      description: `Almennur ${defenseWeeks} vikna greinargerðarfrestur dómara. Útivistardómur ef vanrækt.`,
      isCourtRecessAdjusted: isCourtRecess(defenseDate),
      ...getStatus(defenseAdjusted),
    },
    {
      id: "dl-discovery",
      name: "Gagnaöflunarfrestur og matsgerðir",
      category: "gagnaoflun",
      targetDate: formatDate(discoveryAdjusted),
      statutoryReference: "101. gr. laga nr. 91/1991",
      description: "Framlagning viðbótargagna og ósk um dómkvaðningu matsmanna eða vitni.",
      isCourtRecessAdjusted: isCourtRecess(discoveryDate),
      ...getStatus(discoveryAdjusted),
    },
    {
      id: "dl-hearing",
      name: "Áætlaður aðalmálflutningur",
      category: "malsflutningur",
      targetDate: formatDate(hearingAdjusted),
      statutoryReference: "102. gr. laga nr. 91/1991",
      description: "Munnlegur málflutningur lögmanna og skýrslutökur aðila og vitna.",
      isCourtRecessAdjusted: isCourtRecess(hearingDate),
      ...getStatus(hearingAdjusted),
    },
    {
      id: "dl-judgment",
      name: "Lögbundinn frestur til dómsuppkvaðningar",
      category: "domsuppkvadning",
      targetDate: formatDate(judgmentAdjusted),
      statutoryReference: "115. gr. laga nr. 91/1991",
      description: "Dómur skal kveðinn upp innan 4 vikna frá dómsetningu.",
      isCourtRecessAdjusted: isCourtRecess(judgmentDate),
      ...getStatus(judgmentAdjusted),
    },
    {
      id: "dl-appeal",
      name: "Áfrýjunarfrestur til Landsréttar",
      category: "afryjun",
      targetDate: formatDate(appealAdjusted),
      statutoryReference: "143. gr. laga nr. 91/1991",
      description: "Almennur áfrýjunarfrestur einkamála er 4 vikur frá birtingu dóms.",
      isCourtRecessAdjusted: isCourtRecess(appealDate),
      ...getStatus(appealAdjusted),
    },
  ];

  return {
    serviceDate: input.serviceDate,
    earliestCourtDate: formatDate(earliestCourt),
    defendantLocation: input.defendantLocation,
    isCourtRecessAffected: recessTriggered,
    courtRecessNote: recessTriggered
      ? "Athugið: Stefnufrestur lendir í eða snertir dómhlé (15. júlí - 15. ágúst eða jól/páskar skv. 81. gr.). Fresturinn hefur verið framlengdur til fyrsta virka dags að dómhléi loknu."
      : undefined,
    deadlines,
  };
}

EOF
fi

if [ ! -f "src/lib/court-bundle.ts" ]; then
    echo "Restoring src/lib/court-bundle.ts..."
    cat <<'EOF' > src/lib/court-bundle.ts
import { CaseItem, DocumentItem } from "./store";

export interface CourtExhibitItem {
  id: string;
  number: number;
  title: string;
  category: string;
  date: string;
  startPage: number;
  endPage: number;
  pageCount: number;
  relevance: string;
}

export interface CourtBundleParty {
  name: string;
  idNumber: string;
  attorney: string;
  role: "stefnandi" | "stefndi";
}

export interface CourtBundleMetadata {
  caseNumber: string;
  courtName: string;
  actionType: string;
  plaintiff: CourtBundleParty;
  defendant: CourtBundleParty;
  compilationDate: string;
  totalExhibits: number;
  totalPages: number;
  exhibits: CourtExhibitItem[];
}

export function generateCourtBundle(
  caseItem: CaseItem,
  docs: DocumentItem[],
  overrides?: Partial<CourtBundleMetadata>
): CourtBundleMetadata {
  let currentPage = 1;

  const exhibits: CourtExhibitItem[] = docs.map((d, index) => {
    const pageCount = d.page_count || 1;
    const start = currentPage;
    const end = currentPage + pageCount - 1;
    currentPage = end + 1;

    let relevance = "Lagt fram til sönnunar á málsatvikum.";
    if (d.doc_type === "Stefna") relevance = "Kröfugerð, málsástæður og lögvarðir hagsmunir stefnanda.";
    if (d.doc_type === "Samningur") relevance = "Sönnun á samningssambandi og samningsskyldum aðila.";
    if (d.doc_type === "Matsgerð" || d.doc_type === "Sérfræðiskýrsla") relevance = "Sérfræðilegt mat á tjóni, göllum og orsakasamhengi.";

    return {
      id: d.id,
      number: index + 1,
      title: d.title,
      category: d.doc_type || "Almennt málsskjal",
      date: d.created_at.split("T")[0],
      startPage: start,
      endPage: end,
      pageCount,
      relevance,
    };
  });

  const bundle: CourtBundleMetadata = {
    caseNumber: caseItem.case_number,
    courtName: overrides?.courtName || "Héraðsdómur Reykjavíkur",
    actionType: "Einkamál",
    plaintiff: overrides?.plaintiff || {
      name: caseItem.title.split(" gegn ")[0] || "Stefnandi",
      idNumber: "540269-0129",
      attorney: "Guðrún Sigurðardóttir hrl.",
      role: "stefnandi",
    },
    defendant: overrides?.defendant || {
      name: caseItem.title.split(" gegn ")[1] || "Stefndi",
      idNumber: "620104-3380",
      attorney: "Tómas Gunnarsson hdl.",
      role: "stefndi",
    },
    compilationDate: new Date().toISOString().split("T")[0],
    totalExhibits: exhibits.length,
    totalPages: Math.max(1, currentPage - 1),
    exhibits,
    ...overrides,
  };

  return bundle;
}

export function formatDomaskjalaskraText(bundle: CourtBundleMetadata): string {
  const line = "=".repeat(78);
  const thinLine = "-".repeat(78);

  const header = `
${line}
                   DÓMASKJALASKRÁ FYRIR HÉRAÐSDÓMI
${line}
Dómstóll:      ${bundle.courtName}
Málsnúmer:     ${bundle.caseNumber}
Tegund máls:   ${bundle.actionType}

Stefnandi:     ${bundle.plaintiff.name} (kt. ${bundle.plaintiff.idNumber})
Málflytjandi:  ${bundle.plaintiff.attorney}

Stefndi:       ${bundle.defendant.name} (kt. ${bundle.defendant.idNumber})
Málflytjandi:  ${bundle.defendant.attorney}

Frágangsdags:  ${bundle.compilationDate}
Samtals:       ${bundle.totalExhibits} málsskjöl | ${bundle.totalPages} blaðsíður
${line}

NR.  HEITI MÁLSSKJALS                           BLS.         SÖNNUNARÞÝÐING
${thinLine}`;

  const rows = bundle.exhibits
    .map((ex) => {
      const numStr = String(ex.number).padStart(2, "0");
      const titleStr = ex.title.padEnd(42, " ").slice(0, 42);
      const pageStr = `bls. ${ex.startPage}–${ex.endPage}`.padEnd(12, " ");
      return `${numStr}   ${titleStr} ${pageStr} ${ex.relevance}`;
    })
    .join("\n");

  const footer = `
${thinLine}
Málsgagnasafn þetta er frágengið samkvæmt reglum dómstólasýslunnar um frágang
og framlagningu málsgagna í einkamálum fyrir héraðsdómstólum.
${line}
`;

  return `${header}\n${rows}\n${footer}`;
}

EOF
fi

if [ ! -f "src/lib/docxExtractor.ts" ]; then
    echo "Restoring src/lib/docxExtractor.ts..."
    cat <<'EOF' > src/lib/docxExtractor.ts
import mammoth from "mammoth";
import JSZip from "jszip";

export interface DocxExtractionResult {
  text: string;
  html?: string;
  pageCount: number;
  wordCount: number;
}

export function isDocxBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
}

async function extractWithJSZip(buffer: Buffer): Promise<{ text: string; html?: string }> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file("word/document.xml");
    if (!docXmlFile) {
      return { text: "" };
    }
    const xmlContent = await docXmlFile.async("string");
    
    let processed = xmlContent
      .replace(/<w:br[^>]*\/>/gi, "\n")
      .replace(/<w:tab[^>]*\/>/gi, "\t")
      .replace(/<\/w:p>/gi, "\n\n");

    const textMatches = processed.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
    if (!textMatches) {
      const stripped = processed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      return { text: stripped };
    }

    const textParts = textMatches.map((tag) => {
      const match = tag.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/i);
      return match ? match[1] : "";
    });

    const combinedText = textParts.join("").replace(/\n{3,}/g, "\n\n").trim();
    return { text: combinedText };
  } catch (err) {
    console.warn("JSZip extraction failed:", err);
    return { text: "" };
  }
}

function extractFromRawDocxString(rawStr: string): string {
  try {
    const wtMatches = rawStr.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
    if (wtMatches && wtMatches.length > 0) {
      const clean = wtMatches
        .map((tag) => {
          const m = tag.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/i);
          return m ? m[1] : "";
        })
        .join("")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      if (clean.length > 20) return clean;
    }
  } catch (err) {
    console.warn("Raw string extraction failed:", err);
  }
  return "";
}

export async function extractTextFromDocx(
  input: Buffer | Uint8Array | string
): Promise<DocxExtractionResult> {
  let buffer: Buffer;

  if (typeof input === "string") {
    buffer = Buffer.from(input, "binary");
  } else if (Buffer.isBuffer(input)) {
    buffer = input;
  } else {
    buffer = Buffer.from(input);
  }

  let text = "";
  let html = "";

  try {
    const rawResult = await mammoth.extractRawText({ buffer });
    if (rawResult && rawResult.value && rawResult.value.trim().length > 0) {
      text = rawResult.value.trim();
    }

    const htmlResult = await mammoth.convertToHtml({ buffer });
    if (htmlResult && htmlResult.value) {
      html = htmlResult.value;
    }
  } catch (mammothErr) {
    console.warn("Mammoth extraction encountered error, attempting fallback:", mammothErr);
  }

  if (!text || text.trim().length === 0) {
    const zipResult = await extractWithJSZip(buffer);
    if (zipResult.text && zipResult.text.length > 0) {
      text = zipResult.text;
    }
  }

  if ((!text || text.trim().length === 0) && typeof input === "string") {
    const rawExtracted = extractFromRawDocxString(input);
    if (rawExtracted && rawExtracted.length > 0) {
      text = rawExtracted;
    }
  }

  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const pageCount = Math.max(1, Math.ceil(wordCount / 300));

  return {
    text,
    html: html || undefined,
    pageCount,
    wordCount,
  };
}

EOF
fi

if [ ! -f "src/lib/pdfExtractor.ts" ]; then
    echo "Restoring src/lib/pdfExtractor.ts..."
    cat <<'EOF' > src/lib/pdfExtractor.ts
import { extractText } from "unpdf";

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  info?: any;
}

export async function extractTextFromPdf(
  input: Buffer | Uint8Array | string
): Promise<PdfExtractionResult> {
  let uint8Array: Uint8Array;

  if (typeof input === "string") {
    if (input.startsWith("data:")) {
      const base64Part = input.split(",")[1] || "";
      uint8Array = new Uint8Array(Buffer.from(base64Part, "base64"));
    } else {
      uint8Array = new Uint8Array(Buffer.from(input, "binary"));
    }
  } else if (Buffer.isBuffer(input)) {
    uint8Array = new Uint8Array(input);
  } else {
    uint8Array = input;
  }

  try {
    const res = await extractText(uint8Array, { mergePages: true });
    const text = Array.isArray(res.text) ? res.text.join("\n\n") : (res.text || "");
    const pageCount = res.totalPages || Math.max(1, Math.ceil(text.length / 1500));
    return {
      text: text.trim(),
      pageCount,
      info: (res as any)?.info,
    };
  } catch (err) {
    console.warn("unpdf extraction failed, falling back to stream parsing:", err);
    // Simple fallback scanner for PDF text streams
    try {
      const latin1 = Buffer.from(uint8Array).toString("latin1");
      const btMatches = latin1.match(/BT[\s\S]*?ET/g);
      let fallbackText = "";
      if (btMatches) {
        for (const block of btMatches) {
          const tjMatches = block.match(/\((.*?)\)\s*Tj/g) || block.match(/\[(.*?)\]\s*TJ/g);
          if (tjMatches) {
            fallbackText += tjMatches.map(m => m.replace(/[\(\)\[\]]|Tj|TJ/g, "").trim()).join(" ") + "\n";
          }
        }
      }
      const pageCountMatch = latin1.match(/\/Count\s+(\d+)/);
      const pageCount = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 1;
      return {
        text: fallbackText.trim() || "[PDF skjal móttekið]",
        pageCount: Math.max(1, pageCount),
      };
    } catch {
      return {
        text: "[PDF skjal móttekið]",
        pageCount: 1,
      };
    }
  }
}

EOF
fi

if [ ! -f "src/lib/invoiceUtils.ts" ]; then
    echo "Restoring src/lib/invoiceUtils.ts..."
    cat <<'EOF' > src/lib/invoiceUtils.ts
import { InvoiceItem } from "./store";

/**
 * Formats an invoice according to Icelandic standards (lög nr. 50/1988 um virðisaukaskatt og reglugerð nr. 50/1993 um bókhald)
 */
export function formatIcelandicInvoiceText(invoice: InvoiceItem): string {
  const line = "=".repeat(78);
  const thinLine = "-".repeat(78);

  const statusMap: Record<string, string> = {
    draft: "DRÖG",
    issued: "ÚTGEFIÐ",
    paid: "GREITT",
    cancelled: "ÓGILT / FELLT NIÐUR",
  };

  const statusLabel = statusMap[invoice.status] || invoice.status.toUpperCase();

  let out = "";
  out += `${line}\n`;
  out += `                          REIKNINGUR / INVOICE\n`;
  out += `                           [ ${statusLabel} ]\n`;
  out += `${line}\n\n`;

  out += `ÚTGEFANDI (LÖGMANNSSTOFA):\n`;
  out += `Nafn:          ${invoice.law_firm_name || "Lögmenn Lækjargötu slf."}\n`;
  out += `Kennitala:     ${invoice.law_firm_kennitala || "540209-1120"}\n`;
  out += `VSK-númer:     ${invoice.law_firm_vat_no || "102345"}\n`;
  out += `Málflytjandi:  ${invoice.attorney_name || "Guðrún Sigurðardóttir hrl."}\n`;
  out += `Bankareikn.:   ${invoice.law_firm_bank || "0101-26-045678"}\n\n`;

  out += `GREIÐANDI (UMBJÓÐANDI):\n`;
  out += `Nafn:          ${invoice.client_name}\n`;
  if (invoice.client_kennitala) {
    out += `Kennitala:     ${invoice.client_kennitala}\n`;
  }
  if (invoice.client_address) {
    out += `Heimilisfang:  ${invoice.client_address}\n`;
  }
  out += `Málsnúmer:     ${invoice.case_number} - ${invoice.case_title}\n\n`;

  out += `REIKNINGSUPPLÝSINGAR:\n`;
  out += `Reikningsnr.:  ${invoice.invoice_number}\n`;
  out += `Útgáfudagur:   ${invoice.issue_date}\n`;
  out += `Gjalddagi:     ${invoice.due_date}\n`;
  out += `Eindagi:       ${invoice.penalty_date}\n`;
  if (invoice.payment_date) {
    out += `Greiðsludagur: ${invoice.payment_date} (${invoice.payment_reference || "Greiðsla móttekin"})\n`;
  }

  out += `\n${thinLine}\n`;
  out += `SUNDURLIÐUN REIKNINGS\n`;
  out += `${thinLine}\n`;
  out += `LÝSING / VERKÞÁTTUR                  MAGN     EIN.VERÐ     VSK%    SAMTALS M. VSK\n`;
  out += `${thinLine}\n`;

  if (!invoice.line_items || invoice.line_items.length === 0) {
    out += `Engir liðir á reikningi.\n`;
  } else {
    invoice.line_items.forEach((item, index) => {
      const num = String(index + 1).padStart(2, " ");
      const desc = item.description.length > 34 ? item.description.slice(0, 31) + "..." : item.description.padEnd(34, " ");
      const qty = item.quantity.toFixed(1).padStart(5, " ");
      const price = `${item.unit_price.toLocaleString("is-IS")} kr.`.padStart(11, " ");
      const vatPct = `${Math.round(item.vat_rate * 100)}%`.padStart(5, " ");
      const tot = `${item.total_inc_vat.toLocaleString("is-IS")} kr.`.padStart(14, " ");
      out += `${num}. ${desc} ${qty} ${price} ${vatPct} ${tot}\n`;
    });
  }

  out += `${thinLine}\n`;
  out += `Samtals án virðisaukaskatts:                              kr. ${invoice.subtotal_ex_vat.toLocaleString("is-IS")}\n`;
  out += `Virðisaukaskattur samtals (24% / 0% VSK):                 kr. ${invoice.total_vat.toLocaleString("is-IS")}\n`;
  out += `------------------------------------------------------------------------------\n`;
  out += `HEILDARFJÁRHÆÐ M. VSK:                                    kr. ${invoice.total_inc_vat.toLocaleString("is-IS")}\n`;

  if (invoice.retainer_deducted > 0) {
    out += `Frádráttur af tryggingafé (vörslureikningi):            - kr. ${invoice.retainer_deducted.toLocaleString("is-IS")}\n`;
    out += `------------------------------------------------------------------------------\n`;
    out += `EFTIRSTÖÐVAR TIL GREIÐSLU:                                kr. ${invoice.final_amount_due.toLocaleString("is-IS")}\n`;
  }

  if (invoice.notes) {
    out += `\nAthugasemdir:\n${invoice.notes}\n`;
  }

  out += `\n${line}\n`;
  out += `GREIÐSLUSKILMÁLAR:\n`;
  out += `Vinsamlegast leggið inn á ofangreindan reikning og tilgreinið reikningsnúmer sem tilvísun.\n`;
  out += `Sé reikningur ekki greiddur á eindaga reiknast hæstu lögleyfðu dráttarvextir\n`;
  out += `samkvæmt 1. mgr. 6. gr. laga nr. 38/2001 um vexti og verðtryggingu frá gjalddaga.\n`;
  out += `${line}\n`;

  return out;
}

EOF
fi

if [ ! -f "src/lib/costStatement.ts" ]; then
    echo "Restoring src/lib/costStatement.ts..."
    cat <<'EOF' > src/lib/costStatement.ts
import {
  CaseItem,
  TimeEntryItem,
  ExpenseItem,
  TASK_CATEGORY_LABELS,
  EXPENSE_TYPE_LABELS,
} from "./store";

export interface CostStatementSummary {
  totalMinutes: number;
  totalHours: number;
  billableMinutes: number;
  billableHours: number;
  legalFeeExVat: number;
  legalFeeVat: number;
  legalFeeIncVat: number;
  courtFees: number;
  otherExpensesExVat: number;
  otherExpensesVat: number;
  totalExpensesIncVat: number;
  grandTotalClaim: number;
  vatRate: number;
}

export function calculateCostSummary(
  timeEntries: TimeEntryItem[],
  expenses: ExpenseItem[]
): CostStatementSummary {
  const vatRate = 0.24;

  let totalMinutes = 0;
  let billableMinutes = 0;
  let legalFeeExVat = 0;

  timeEntries.forEach((entry) => {
    totalMinutes += entry.duration_minutes;
    if (entry.is_billable) {
      billableMinutes += entry.duration_minutes;
      const hours = entry.duration_minutes / 60;
      legalFeeExVat += Math.round(hours * entry.hourly_rate);
    }
  });

  const legalFeeVat = Math.round(legalFeeExVat * vatRate);
  const legalFeeIncVat = legalFeeExVat + legalFeeVat;

  let courtFees = 0;
  let otherExpensesExVat = 0;
  let otherExpensesVat = 0;

  expenses.forEach((exp) => {
    if (exp.expense_type === "court_fee") {
      courtFees += exp.amount;
    } else {
      otherExpensesExVat += exp.amount;
      otherExpensesVat += exp.vat_amount || (exp.vat_rate ? Math.round(exp.amount * exp.vat_rate) : 0);
    }
  });

  const totalExpensesIncVat = courtFees + otherExpensesExVat + otherExpensesVat;
  const grandTotalClaim = legalFeeIncVat + totalExpensesIncVat;

  return {
    totalMinutes,
    totalHours: Number((totalMinutes / 60).toFixed(2)),
    billableMinutes,
    billableHours: Number((billableMinutes / 60).toFixed(2)),
    legalFeeExVat,
    legalFeeVat,
    legalFeeIncVat,
    courtFees,
    otherExpensesExVat,
    otherExpensesVat,
    totalExpensesIncVat,
    grandTotalClaim,
    vatRate,
  };
}

export interface CostStatementFormatOptions {
  courtName?: string;
  judgeName?: string;
  partyName?: string;
  partyRole?: string;
  attorneyName?: string;
  attorneyTitle?: string;
  clientVatDeductible?: boolean;
  includeInterestClaim?: boolean;
  interestText?: string;
  additionalRemarks?: string;
}

export function formatCourtCostStatementText(
  caseItem: CaseItem,
  timeEntries: TimeEntryItem[],
  expenses: ExpenseItem[],
  optionsOrAttorney: string | CostStatementFormatOptions = "Guðrún Sigurðardóttir hrl.",
  partyNameArg?: string
): string {
  const summary = calculateCostSummary(timeEntries, expenses);
  const dateStr = new Date().toLocaleDateString("is-IS", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const line = "=".repeat(78);
  const thinLine = "-".repeat(78);

  let attorneyName = "Guðrún Sigurðardóttir hrl.";
  let courtName = "Héraðsdómur Reykjavíkur";
  let judgeName: string | undefined = undefined;
  let partyName: string | undefined = partyNameArg;
  let partyRole = "Stefnandi";
  let clientVatDeductible = false;
  let includeInterestClaim = true;
  let interestText: string | undefined = undefined;
  let additionalRemarks: string | undefined = undefined;

  if (typeof optionsOrAttorney === "object" && optionsOrAttorney !== null) {
    if (optionsOrAttorney.attorneyName) {
      attorneyName = `${optionsOrAttorney.attorneyName}${
        optionsOrAttorney.attorneyTitle ? ` ${optionsOrAttorney.attorneyTitle}` : ""
      }`;
    }
    if (optionsOrAttorney.courtName) courtName = optionsOrAttorney.courtName;
    if (optionsOrAttorney.judgeName) judgeName = optionsOrAttorney.judgeName;
    if (optionsOrAttorney.partyName) partyName = optionsOrAttorney.partyName;
    if (optionsOrAttorney.partyRole) partyRole = optionsOrAttorney.partyRole;
    if (optionsOrAttorney.clientVatDeductible !== undefined) clientVatDeductible = optionsOrAttorney.clientVatDeductible;
    if (optionsOrAttorney.includeInterestClaim !== undefined) includeInterestClaim = optionsOrAttorney.includeInterestClaim;
    if (optionsOrAttorney.interestText) interestText = optionsOrAttorney.interestText;
    if (optionsOrAttorney.additionalRemarks) additionalRemarks = optionsOrAttorney.additionalRemarks;
  } else if (typeof optionsOrAttorney === "string") {
    attorneyName = optionsOrAttorney;
  }

  const partyDisplay = partyName || (caseItem.title.includes(" gegn ") ? caseItem.title.split(" gegn ")[0] : "Stefnandi");

  const finalLegalFee = clientVatDeductible ? summary.legalFeeExVat : summary.legalFeeIncVat;
  const finalExpenses = clientVatDeductible
    ? summary.courtFees + summary.otherExpensesExVat
    : summary.totalExpensesIncVat;
  const grandTotal = finalLegalFee + finalExpenses;

  let out = "";
  out += `${line}\n`;
  out += `                MÁLSKOSTNAÐARYFIRLIT FYRIR HÉRAÐSDÓMI\n`;
  out += `               (skv. 130. gr. laga nr. 91/1991 um meðferð einkamála)\n`;
  out += `${line}\n\n`;

  out += `Dómstóll:      ${courtName}${judgeName ? ` (Dómari: ${judgeName})` : ""}\n`;
  out += `Málsnúmer:     ${caseItem.case_number}\n`;
  out += `Málsaðilar:    ${caseItem.title}\n`;
  out += `Aðili:         ${partyDisplay} (${partyRole})\n`;
  out += `Málflytjandi:  ${attorneyName}\n`;
  out += `Dagsetning:    ${dateStr}\n`;
  out += `\n${thinLine}\n`;
  out += `I. SUNDURLIÐUN Á LÖGMANNSÞÓKNUN (VINNUSTUNDIR)\n`;
  out += `${thinLine}\n`;
  out += `DAGS.        KLST.  TÍMAGJALD    VERKÞÁTTUR OG LÝSING Á LÖGFRÆÐISTÖRFUM\n`;
  out += `${thinLine}\n`;

  const billableEntries = timeEntries.filter((e) => e.is_billable);
  if (billableEntries.length === 0) {
    out += `Engir tímaliðir skráðir.\n`;
  } else {
    billableEntries.forEach((e) => {
      const hrs = (e.duration_minutes / 60).toFixed(1).padStart(4, " ");
      const rate = `${e.hourly_rate.toLocaleString("is-IS")} kr.`.padStart(11, " ");
      const cat = TASK_CATEGORY_LABELS[e.task_category] || e.task_category;
      out += `${e.date}  ${hrs}  ${rate}  [${cat}]\n`;
      out += `                          ${e.description} (${e.user_name})\n`;
    });
  }

  out += `\n${thinLine}\n`;
  out += `Samtals unnar stundir málflytjanda:       ${summary.billableHours.toLocaleString("is-IS")} klst.\n`;
  out += `Lögmannsþóknun alls án VSK:               kr. ${summary.legalFeeExVat.toLocaleString("is-IS")}\n`;
  out += `Virðisaukaskattur (24% VSK):              kr. ${summary.legalFeeVat.toLocaleString("is-IS")}\n`;
  out += `LÖGMANNSÞÓKNUN SAMTALS M. VSK:            kr. ${summary.legalFeeIncVat.toLocaleString("is-IS")}\n`;

  out += `\n${thinLine}\n`;
  out += `II. ÚTLAGÐUR KOSTNAÐUR OG DÓMGJÖLD\n`;
  out += `${thinLine}\n`;
  out += `DAGS.        UPPHÆÐ         LIÐUR / TEGUND\n`;
  out += `${thinLine}\n`;

  if (expenses.length === 0) {
    out += `Enginn útlagður kostnaður skráður.\n`;
  } else {
    expenses.forEach((exp) => {
      const expType = EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type;
      const totalAmount = exp.amount + (exp.vat_amount || 0);
      const amtStr = `${totalAmount.toLocaleString("is-IS")} kr.`.padStart(12, " ");
      out += `${exp.incurred_date}  ${amtStr}  ${exp.title} (${expType})\n`;
    });
  }

  out += `\n${thinLine}\n`;
  out += `Dómgjöld skv. lögum nr. 88/1991 (0% VSK):  kr. ${summary.courtFees.toLocaleString("is-IS")}\n`;
  out += `Annar útlagður kostnaður án VSK:          kr. ${summary.otherExpensesExVat.toLocaleString("is-IS")}\n`;
  out += `Virðisaukaskattur af útlögðum kostnaði:   kr. ${summary.otherExpensesVat.toLocaleString("is-IS")}\n`;
  out += `ÚTLAGÐUR KOSTNAÐUR SAMTALS:               kr. ${summary.totalExpensesIncVat.toLocaleString("is-IS")}\n`;

  out += `\n${line}\n`;
  out += `III. HEILDARKRAFA UM MÁLSKOSTNAÐ\n`;
  out += `${line}\n`;
  if (clientVatDeductible) {
    out += `1. Lögmannsþóknun án VSK (VSK-skyldur umbj.): kr. ${finalLegalFee.toLocaleString("is-IS")}\n`;
    out += `2. Útlagður kostnaður og dómgjöld án VSK:     kr. ${finalExpenses.toLocaleString("is-IS")}\n`;
    out += `------------------------------------------------------------------------------\n`;
    out += `HEILDARKRAFA UM MÁLSKOSTNAÐ (ÁN VSK):         kr. ${grandTotal.toLocaleString("is-IS")}\n`;
    out += `  (Umbjóðandi nýtir innskatt skv. 130. gr. laga nr. 91/1991 og laga nr. 50/1988)\n\n`;
  } else {
    out += `1. Lögmannsþóknun málflytjanda m. VSK:        kr. ${summary.legalFeeIncVat.toLocaleString("is-IS")}\n`;
    out += `2. Útlagður kostnaður og dómgjöld:            kr. ${summary.totalExpensesIncVat.toLocaleString("is-IS")}\n`;
    out += `------------------------------------------------------------------------------\n`;
    out += `HEILDARKRAFA UM MÁLSKOSTNAÐ:                  kr. ${grandTotal.toLocaleString("is-IS")} m. VSK\n\n`;
  }

  if (includeInterestClaim) {
    out += `${interestText || "Þess er krafist að gagnaðili verði dæmdur til að greiða málskostnað þennan\nmeð dráttarvöxtum samkvæmt 1. mgr. 6. gr. laga nr. 38/2001 um vexti og\nverðtryggingu frá þeim degi sem liðinn er mánuður frá uppkvaðningu dóms\ntil greiðsludags."}\n\n`;
  }

  if (additionalRemarks) {
    out += `IV. ATHUGASEMDIR:\n${additionalRemarks}\n\n`;
  }

  out += `Virðingarfyllst,\n`;
  out += `${attorneyName}\n`;
  out += `f.h. ${partyDisplay} (${partyRole})\n`;
  out += `${line}\n`;

  return out;
}

EOF
fi

if [ ! -f "src/lib/courtCostDocxGenerator.ts" ]; then
    echo "Restoring src/lib/courtCostDocxGenerator.ts..."
    cat <<'EOF' > src/lib/courtCostDocxGenerator.ts
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  HeadingLevel,
  AlignmentType,
} from "docx";
import {
  CaseItem,
  TimeEntryItem,
  ExpenseItem,
  TASK_CATEGORY_LABELS,
  EXPENSE_TYPE_LABELS,
} from "./store";
import { calculateCostSummary } from "./costStatement";

export interface CourtCostStatementOptions {
  courtName?: string;
  judgeName?: string;
  attorneyName?: string;
  attorneyTitle?: string;
  lawFirm?: string;
  partyName?: string;
  partyRole?: string;
  opposingPartyName?: string;
  clientVatDeductible?: boolean;
  includeInterestClaim?: boolean;
  interestText?: string;
  additionalRemarks?: string;
  selectedTimeEntryIds?: string[];
  selectedExpenseIds?: string[];
}

export async function generateCourtCostDocxBlob(
  caseItem: CaseItem,
  timeEntries: TimeEntryItem[],
  expenses: ExpenseItem[],
  options: CourtCostStatementOptions = {}
): Promise<Blob> {
  // Filter by selected IDs if provided
  let filteredTime = timeEntries;
  if (options.selectedTimeEntryIds && options.selectedTimeEntryIds.length > 0) {
    filteredTime = timeEntries.filter((t) => options.selectedTimeEntryIds!.includes(t.id));
  } else {
    filteredTime = timeEntries.filter((t) => t.is_billable);
  }

  let filteredExpenses = expenses;
  if (options.selectedExpenseIds && options.selectedExpenseIds.length > 0) {
    filteredExpenses = expenses.filter((e) => options.selectedExpenseIds!.includes(e.id));
  }

  const summary = calculateCostSummary(filteredTime, filteredExpenses);

  const courtName = options.courtName || "Héraðsdómur Reykjavíkur";
  const judgeName = options.judgeName;
  const attorneyFullName = `${options.attorneyName || "Guðrún Sigurðardóttir"}${
    options.attorneyTitle ? ` ${options.attorneyTitle}` : ""
  }`;
  const lawFirm = options.lawFirm || "Lögmenn Lækjargötu slf.";
  const partyName = options.partyName || (caseItem.title.includes(" gegn ") ? caseItem.title.split(" gegn ")[0] : "Stefnandi");
  const partyRole = options.partyRole || "Stefnandi";
  const opposingParty = options.opposingPartyName || (caseItem.title.includes(" gegn ") ? caseItem.title.split(" gegn ")[1] : "Stefndi");
  const clientVatDeductible = Boolean(options.clientVatDeductible);

  const finalLegalFee = clientVatDeductible ? summary.legalFeeExVat : summary.legalFeeIncVat;
  const finalExpenses = clientVatDeductible
    ? summary.courtFees + summary.otherExpensesExVat
    : summary.totalExpensesIncVat;
  const grandTotal = finalLegalFee + finalExpenses;

  const dateStr = new Date().toLocaleDateString("is-IS", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tableBorderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  };

  const tableBorderBottomThin = {
    top: { style: BorderStyle.NONE, size: 0, color: "auto" },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
    left: { style: BorderStyle.NONE, size: 0, color: "auto" },
    right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  };

  // Time entries rows
  const timeRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: tableBorderBottomThin,
          children: [new Paragraph({ children: [new TextRun({ text: "Dags.", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 12, type: WidthType.PERCENTAGE },
          borders: tableBorderBottomThin,
          children: [new Paragraph({ children: [new TextRun({ text: "Klst.", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 18, type: WidthType.PERCENTAGE },
          borders: tableBorderBottomThin,
          children: [new Paragraph({ children: [new TextRun({ text: "Tímagjald", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 55, type: WidthType.PERCENTAGE },
          borders: tableBorderBottomThin,
          children: [new Paragraph({ children: [new TextRun({ text: "Verkþáttur og starfslýsing", bold: true, size: 20 })] })],
        }),
      ],
    }),
  ];

  if (filteredTime.length === 0) {
    timeRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 4,
            borders: tableBorderNone,
            children: [new Paragraph({ children: [new TextRun({ text: "Engir tímaliðir tilgreindir.", italics: true, size: 20 })] })],
          }),
        ],
      })
    );
  } else {
    filteredTime.forEach((t) => {
      const hours = (t.duration_minutes / 60).toFixed(1);
      const cat = TASK_CATEGORY_LABELS[t.task_category] || t.task_category;
      timeRows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: tableBorderBottomThin,
              children: [new Paragraph({ children: [new TextRun({ text: t.date, size: 19 })] })],
            }),
            new TableCell({
              borders: tableBorderBottomThin,
              children: [new Paragraph({ children: [new TextRun({ text: `${hours} klst.`, size: 19 })] })],
            }),
            new TableCell({
              borders: tableBorderBottomThin,
              children: [new Paragraph({ children: [new TextRun({ text: `${t.hourly_rate.toLocaleString("is-IS")} kr.`, size: 19 })] })],
            }),
            new TableCell({
              borders: tableBorderBottomThin,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: `[${cat}] `, bold: true, size: 19 }),
                    new TextRun({ text: t.description, size: 19 }),
                    new TextRun({ text: ` (${t.user_name})`, italics: true, size: 18, color: "555555" }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    });
  }

  // Expense rows
  const expenseRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          borders: tableBorderBottomThin,
          children: [new Paragraph({ children: [new TextRun({ text: "Dags.", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 22, type: WidthType.PERCENTAGE },
          borders: tableBorderBottomThin,
          children: [new Paragraph({ children: [new TextRun({ text: "Upphæð", bold: true, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 63, type: WidthType.PERCENTAGE },
          borders: tableBorderBottomThin,
          children: [new Paragraph({ children: [new TextRun({ text: "Liður / Fylgiskjal", bold: true, size: 20 })] })],
        }),
      ],
    }),
  ];

  if (filteredExpenses.length === 0) {
    expenseRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            borders: tableBorderNone,
            children: [new Paragraph({ children: [new TextRun({ text: "Enginn útlagður kostnaður tilgreindur.", italics: true, size: 20 })] })],
          }),
        ],
      })
    );
  } else {
    filteredExpenses.forEach((exp) => {
      const expType = EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type;
      const totalAmount = exp.amount + (exp.vat_amount || 0);
      expenseRows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: tableBorderBottomThin,
              children: [new Paragraph({ children: [new TextRun({ text: exp.incurred_date, size: 19 })] })],
            }),
            new TableCell({
              borders: tableBorderBottomThin,
              children: [new Paragraph({ children: [new TextRun({ text: `${totalAmount.toLocaleString("is-IS")} kr.`, size: 19 })] })],
            }),
            new TableCell({
              borders: tableBorderBottomThin,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: exp.title, bold: true, size: 19 }),
                    new TextRun({ text: ` (${expType})`, size: 18, color: "555555" }),
                    exp.receipt_doc_title
                      ? new TextRun({ text: ` [Fylgiskjal: ${exp.receipt_doc_title}]`, italics: true, size: 18, color: "004488" })
                      : new TextRun({ text: "" }),
                  ],
                }),
              ],
            }),
          ],
        })
      );
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "MÁLSKOSTNAÐARYFIRLIT FYRIR HÉRAÐSDÓMI",
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({
                text: "(skv. 130. gr. laga nr. 91/1991 um meðferð einkamála)",
                italics: true,
                size: 20,
              }),
            ],
          }),

          // Court & Case Details
          new Paragraph({
            children: [
              new TextRun({ text: "Dómstóll:     ", bold: true, size: 21 }),
              new TextRun({ text: courtName, size: 21 }),
              judgeName ? new TextRun({ text: ` (Dómari: ${judgeName})`, size: 21, italics: true }) : new TextRun({ text: "" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Málsnúmer:    ", bold: true, size: 21 }),
              new TextRun({ text: caseItem.case_number, size: 21 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Málsaðilar:   ", bold: true, size: 21 }),
              new TextRun({ text: `${caseItem.title}`, size: 21 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Málsaðili:    ", bold: true, size: 21 }),
              new TextRun({ text: `${partyName} (${partyRole})`, size: 21 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Málflytjandi: ", bold: true, size: 21 }),
              new TextRun({ text: `${attorneyFullName}, f.h. ${lawFirm}`, size: 21 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({ text: "Dagsetning:   ", bold: true, size: 21 }),
              new TextRun({ text: dateStr, size: 21 }),
            ],
          }),

          // Heading I
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "I. Sundurliðun á lögmannsþóknun (Vinnustundir)",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: timeRows,
          }),

          // Time totals
          new Paragraph({
            spacing: { before: 160 },
            children: [
              new TextRun({ text: "Samtals unnar stundir málflytjanda: ", bold: true, size: 21 }),
              new TextRun({ text: `${summary.billableHours.toLocaleString("is-IS")} klst.`, size: 21 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Lögmannsþóknun alls án VSK:         ", bold: true, size: 21 }),
              new TextRun({ text: `kr. ${summary.legalFeeExVat.toLocaleString("is-IS")}`, size: 21 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Virðisaukaskattur (24% VSK):        ", bold: true, size: 21 }),
              new TextRun({ text: `kr. ${summary.legalFeeVat.toLocaleString("is-IS")}`, size: 21 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({ text: "LÖGMANNSÞÓKNUN SAMTALS M. VSK:      ", bold: true, size: 21 }),
              new TextRun({ text: `kr. ${summary.legalFeeIncVat.toLocaleString("is-IS")}`, bold: true, size: 21 }),
            ],
          }),

          // Heading II
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "II. Útlagður kostnaður og dómgjöld",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: expenseRows,
          }),

          // Expense totals
          new Paragraph({
            spacing: { before: 160 },
            children: [
              new TextRun({ text: "Dómgjöld skv. lögum nr. 88/1991 (0% VSK): ", bold: true, size: 21 }),
              new TextRun({ text: `kr. ${summary.courtFees.toLocaleString("is-IS")}`, size: 21 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Annar útlagður kostnaður án VSK:         ", bold: true, size: 21 }),
              new TextRun({ text: `kr. ${summary.otherExpensesExVat.toLocaleString("is-IS")}`, size: 21 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Virðisaukaskattur af útlögðum kostnaði:  ", bold: true, size: 21 }),
              new TextRun({ text: `kr. ${summary.otherExpensesVat.toLocaleString("is-IS")}`, size: 21 }),
            ],
          }),
          new Paragraph({
            spacing: { after: 260 },
            children: [
              new TextRun({ text: "ÚTLAGÐUR KOSTNAÐUR SAMTALS:              ", bold: true, size: 21 }),
              new TextRun({ text: `kr. ${summary.totalExpensesIncVat.toLocaleString("is-IS")}`, bold: true, size: 21 }),
            ],
          }),

          // Heading III
          new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
            children: [
              new TextRun({
                text: "III. Heildarkrafa um málskostnað",
                bold: true,
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: clientVatDeductible
                  ? "1. Lögmannsþóknun málflytjanda án VSK (VSK-skyldur umbj.): "
                  : "1. Lögmannsþóknun málflytjanda m. VSK:                     ",
                size: 21,
              }),
              new TextRun({ text: `kr. ${finalLegalFee.toLocaleString("is-IS")}`, bold: true, size: 21 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: clientVatDeductible
                  ? "2. Útlagður kostnaður og dómgjöld án VSK:                  "
                  : "2. Útlagður kostnaður og dómgjöld samtals:                  ",
                size: 21,
              }),
              new TextRun({ text: `kr. ${finalExpenses.toLocaleString("is-IS")}`, bold: true, size: 21 }),
            ],
          }),
          new Paragraph({
            spacing: { before: 100, after: 200 },
            children: [
              new TextRun({
                text: `HEILDARKRAFA UM MÁLSKOSTNAÐ: kr. ${grandTotal.toLocaleString("is-IS")} ${
                  clientVatDeductible ? "(án VSK skv. 130. gr. eml.)" : "(með VSK)"
                }`,
                bold: true,
                size: 24,
              }),
            ],
          }),

          // Interest claim
          ...(options.includeInterestClaim !== false
            ? [
                new Paragraph({
                  spacing: { after: 200 },
                  children: [
                    new TextRun({
                      text:
                        options.interestText ||
                        "Þess er krafist að gagnaðili verði dæmdur til að greiða málskostnað þennan með dráttarvöxtum samkvæmt 1. mgr. 6. gr. laga nr. 38/2001 um vexti og verðtryggingu frá þeim degi sem liðinn er mánuður frá uppkvaðningu dóms til greiðsludags.",
                      italics: true,
                      size: 20,
                    }),
                  ],
                }),
              ]
            : []),

          // Additional remarks
          ...(options.additionalRemarks
            ? [
                new Paragraph({
                  spacing: { before: 100, after: 200 },
                  children: [
                    new TextRun({ text: "Athugasemdir: ", bold: true, size: 20 }),
                    new TextRun({ text: options.additionalRemarks, size: 20 }),
                  ],
                }),
              ]
            : []),

          // Sign-off
          new Paragraph({
            spacing: { before: 300 },
            children: [new TextRun({ text: "Virðingarfyllst,", size: 21 })],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: attorneyFullName,
                bold: true,
                size: 21,
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: `f.h. ${partyName} (${partyRole})`, size: 20 })],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}

EOF
fi

if [ ! -f "src/lib/deadline-urgency.ts" ]; then
    echo "Restoring src/lib/deadline-urgency.ts..."
    cat <<'EOF' > src/lib/deadline-urgency.ts
// Utility to evaluate statutory and procedural deadline urgency
// Flags any deadline occurring within the next 48 hours for immediate prioritization

export interface DeadlineUrgencyResult {
  hasDeadlines: boolean;
  isUrgent48h: boolean;
  urgencyLevel: "critical" | "warning" | "normal";
  closestDeadline: any | null;
  hoursRemaining: number;
  badgeText: string;
  badgeColor: {
    bg: string;
    text: string;
    border: string;
    icon: string;
  };
}

/**
 * Parses YYYY-MM-DD (or ISO string or YYYY-MM-DD HH:mm) into a Date object.
 * Assumes end-of-business court closing time (16:00:00 local time) if only date is provided.
 */
export function parseDeadlineToDate(targetDateStr: string): Date {
  if (!targetDateStr) return new Date(NaN);

  if (targetDateStr.includes("T")) {
    return new Date(targetDateStr);
  }

  // Handle "YYYY-MM-DD HH:mm"
  if (targetDateStr.includes(" ")) {
    const [datePart, timePart] = targetDateStr.split(" ");
    const parts = (datePart || "").split("-").map((p) => parseInt(p, 10));
    const [hh, mm] = (timePart || "16:00").split(":").map((p) => parseInt(p, 10));
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      return new Date(parts[0], parts[1] - 1, parts[2], isNaN(hh) ? 16 : hh, isNaN(mm) ? 0 : mm, 0);
    }
  }

  const parts = targetDateStr.split("-").map((p) => parseInt(p, 10));
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    return new Date(parts[0], parts[1] - 1, parts[2], 16, 0, 0);
  }

  return new Date(targetDateStr);
}

/**
 * Formats a deadline target_date string nicely for UI display
 */
export function formatDeadlineToDisplay(targetDateStr: string): string {
  if (!targetDateStr) return "";
  if (targetDateStr.includes("T")) {
    const d = new Date(targetDateStr);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => (n < 10 ? "0" + n : n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  }
  return targetDateStr;
}

/**
 * Calculates remaining hours from now until target date.
 */
export function getDeadlineHoursRemaining(targetDateStr: string, now: Date = new Date()): number {
  const target = parseDeadlineToDate(targetDateStr);
  if (isNaN(target.getTime())) return Infinity;
  const diffMs = target.getTime() - now.getTime();
  return diffMs / (1000 * 60 * 60);
}

/**
 * Evaluates whether a case has any deadlines within the next 48 hours.
 */
export function evaluateCaseDeadlineUrgency(
  caseId: string,
  deadlinesList: any[],
  now: Date = new Date()
): DeadlineUrgencyResult {
  const caseDeadlines = (deadlinesList || []).filter((d) => d.case_id === caseId);

  if (!caseDeadlines.length) {
    return {
      hasDeadlines: false,
      isUrgent48h: false,
      urgencyLevel: "normal",
      closestDeadline: null,
      hoursRemaining: Infinity,
      badgeText: "",
      badgeColor: { bg: "", text: "", border: "", icon: "" },
    };
  }

  const sorted = [...caseDeadlines].sort((a, b) => {
    const tA = parseDeadlineToDate(a.target_date).getTime();
    const tB = parseDeadlineToDate(b.target_date).getTime();
    return tA - tB;
  });

  const closest = sorted[0];
  const hoursRemaining = getDeadlineHoursRemaining(closest.target_date, now);

  if (hoursRemaining <= 24) {
    const isOverdue = hoursRemaining < 0;
    const badgeText = isOverdue ? "Útrunnið!" : `Innan 24 klst (${Math.max(1, Math.round(hoursRemaining))} klst)`;

    return {
      hasDeadlines: true,
      isUrgent48h: true,
      urgencyLevel: "critical",
      closestDeadline: closest,
      hoursRemaining,
      badgeText,
      badgeColor: {
        bg: "#fee2e2",
        text: "#b91c1c",
        border: "#fca5a5",
        icon: "🚨",
      },
    };
  }

  if (hoursRemaining <= 48) {
    const hours = Math.round(hoursRemaining);
    return {
      hasDeadlines: true,
      isUrgent48h: true,
      urgencyLevel: "warning",
      closestDeadline: closest,
      hoursRemaining,
      badgeText: `Innan 48 klst (${hours} klst)`,
      badgeColor: {
        bg: "#fef3c7",
        text: "#b45309",
        border: "#fde68a",
        icon: "⚠️",
      },
    };
  }

  return {
    hasDeadlines: true,
    isUrgent48h: false,
    urgencyLevel: "normal",
    closestDeadline: closest,
    hoursRemaining,
    badgeText: "",
    badgeColor: { bg: "", text: "", border: "", icon: "" },
  };
}

EOF
fi

if [ ! -f "src/lib/legal-drafting.ts" ]; then
    echo "Restoring src/lib/legal-drafting.ts..."
    cat <<'EOF' > src/lib/legal-drafting.ts
import { CaseItem, DocumentItem } from "./store";
import { LegalStatute, LegalPrecedent } from "./legal-knowledge";
import { ollama } from "./ollama";

export type LegalDocType = "stefna" | "greinargerð";

export interface LegalDraftRequest {
  case_id: string;
  doc_type: LegalDocType;
  selected_statute_ids?: string[];
  selected_precedent_ids?: string[];
  selected_doc_ids?: string[];
  court_name?: string;
  claim_amount?: string;
  custom_claims?: string;
  lawyer_notes?: string;
}

export interface LegalDraftResponse {
  title: string;
  doc_type: LegalDocType;
  content: string;
  summary: string;
  court_name: string;
  generated_at: string;
  model_used: string;
  inference_source: "ollama_airgap" | "local_rules_engine";
  stats: {
    statutes_count: number;
    precedents_count: number;
    documents_count: number;
    word_count: number;
  };
  sections: {
    header: string;
    claims: string;
    facts: string;
    legal_grounds: string;
    evidence: string;
    procedure: string;
  };
}

export function buildLegalDraftPrompt(
  c: CaseItem,
  docType: LegalDocType,
  statutes: LegalStatute[],
  precedents: LegalPrecedent[],
  docs: DocumentItem[],
  courtName: string,
  claimAmount?: string,
  customClaims?: string,
  lawyerNotes?: string
): { systemInstruction: string; userPrompt: string } {
  const parties = c.title.split(" gegn ");
  const plaintiff = parties[0]?.trim() || "Stefnandi";
  const defendant = parties[1]?.trim() || "Stefndi";

  const systemInstruction = `Þú ert sérhæfður dómstólalögmaður og réttarfarsfræðingur í íslensku dómskerfi (ILCMS).
Verkefni þitt er að semja fullbúin, formlega gallalaus og rökstudd drög að ${docType === "stefna" ? "STEFNU" : "GREINARGERÐ"} fyrir ${courtName || "Héraðsdóm Reykjavíkur"} samkvæmt lögum um meðferð einkamála nr. 91/1991.

Mikilvægar reglur um íslenska skjalagerð fyrir dómstóla:
1. Notaðu staðlaða uppbyggingu íslenskra dómsskjala:
   - DÓMSTÓLL OG MÁLSNÚMER Í HAUS
   - AÐILAR OG MÁLFLYTJENDUR
   - I. DÓMKRÖFUR (Aðalkröfur, varakröfur, vextir og dráttarvextir skv. lögum nr. 38/2001, málskostnaður skv. 130. gr. laga nr. 91/1991)
   - II. MÁLSATVIK (Heildstæð, tímaröðuð málsatvikalýsing byggð á fyrirliggjandi málsskjölum og lýsingu)
   - III. MÁLSÁSTÆÐUR OG LAGARÖK (Nákvæm lögfræðileg röksemdafærsla sem fléttar saman öll tilgreind lagaákvæði og dómafordæmi við atvik málsins)
   - IV. SÖNNUNARGÖGN OG SKJALASKRÁ (Númeruð skrá yfir framlögð skjöl og væntanlega vitnaleiðslu)
   - V. RÉTTARFAR (Varnarþing, stefnufrestur/greinargerðarfrestur, birting, málshæfi)
   - DAGSETNING OG UNDIRSKRIFT LÖGMANNS
2. Textinn skal vera á vandaðri, formfastri lögfræðiíslensku.
3. Notaðu nákvæmlega þau gögn, lagaákvæði og fordæmi sem eru lögð fram í fyrirspurninni.`;

  const statutesBlock =
    statutes.length > 0
      ? statutes
          .map((s) => `• ${s.act_name} nr. ${s.act_number}, ${s.article} (${s.title}):\n  „${s.text}“`)
          .join("\n\n")
      : "Engin sérstök lagaákvæði valin.";

  const precedentsBlock =
    precedents.length > 0
      ? precedents
          .map((p) => `• ${p.case_reference} (${p.court}, ${p.date}) - ${p.parties}:\n  Útdráttur: ${p.summary}\n  Niðurstaða: ${p.key_findings}`)
          .join("\n\n")
      : "Engin sérstök dómafordæmi valin.";

  const docsBlock =
    docs.length > 0
      ? docs
          .map((d, idx) => `[Málsskjal ${idx + 1}] ${d.title} (${d.doc_type}, ${d.page_count} bls.):\n${d.summary || d.content?.slice(0, 600) || ""}`)
          .join("\n\n")
      : "Engin sérstök málsskjöl tilgreind.";

  const userPrompt = `Vinsamlegast semdu heildstæð og lögfræðilega vönduð drög að ${docType === "stefna" ? "STEFNU" : "GREINARGERÐ"}:

DÓMSTÓLL: ${courtName || "Héraðsdómur Reykjavíkur"}
MÁLSNÚMER: ${c.case_number}
HEITI MÁLS: ${c.title}
STEFNANDI: ${plaintiff}
STEFNDI: ${defendant}
LÝSING: ${c.description}
${claimAmount ? `FJÁRHÆÐARKRAFA: ${claimAmount}` : ""}
${customClaims ? `SÉRSTÖK KRÖFUGERÐ: ${customClaims}` : ""}
${lawyerNotes ? `LEIÐBEININGAR LÖGMANNS: ${lawyerNotes}` : ""}

VALIN LAGAÁKVÆÐI:
${statutesBlock}

VALIN DÓMAFORDÆMI:
${precedentsBlock}

MÁLSSKJÖL Í MÁLINU:
${docsBlock}`;

  return { systemInstruction, userPrompt };
}

export function generateLocalLegalDraft(
  c: CaseItem,
  docType: LegalDocType,
  statutes: LegalStatute[],
  precedents: LegalPrecedent[],
  docs: DocumentItem[],
  courtName: string = "Héraðsdómur Reykjavíkur",
  claimAmount?: string,
  customClaims?: string,
  lawyerNotes?: string
): LegalDraftResponse {
  const parties = c.title.split(" gegn ");
  const plaintiff = parties[0]?.trim() || "Stefnandi";
  const defendant = parties[1]?.trim() || "Stefndi";
  const todayStr = new Date().toLocaleDateString("is-IS", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const resolvedAmount =
    claimAmount ||
    (c.id === "case-01"
      ? "kr. 48.500.000"
      : c.id === "case-02"
      ? "kr. 21.400.000"
      : c.id === "case-03"
      ? "kr. 14.200.000"
      : c.id === "case-04"
      ? "kr. 35.800.000"
      : c.id === "case-05"
      ? "kr. 18.600.000"
      : "kr. 10.000.000");

  const header = `Í HÉRAÐSDÓMI REYKJAVÍKUR
Dómþing háð í Dómhúsinu við Lækjartorg

Mál nr. ${c.case_number}

${plaintiff}
(kt. 010185-2349)
að heimilisfangi Reykjavík
Málflytjandi: Guðrún Sigurðardóttir hrl.

gegn

${defendant}
(kt. 540269-0129)
að heimilisfangi Reykjavík
Málflytjandi: Tómas Gunnarsson hdl.

================================================================================
                               ${docType === "stefna" ? "S T E F N A" : "G R E I N A R G E R Ð"}
================================================================================`;

  let claims = "";
  if (docType === "stefna") {
    claims = `I. DÓMKRÖFUR STEFNANDA

Stefnandi gerir eftirfarandi dómkröfur í málinu:

1. Aðalkrafa:
   Að stefndi, ${defendant}, verði með dómi dæmdur til að greiða stefnanda, ${plaintiff}, fjárhæð að upphæð ${resolvedAmount}, ásamt vöxtum skv. 8. gr. laga nr. 38/2001 um vexti og dráttarvexti frá kröfudegi og dráttarvöxtum skv. 1. mgr. 6. gr., sbr. 9. gr. sömu laga frá birtingardegi stefnu þessarar til greiðsludags.

2. Varakrafa:
   Til vara er þess krafist að stefndi verði dæmdur til greiðslu skaðabóta eða afsláttar eftir mati og sanngirnisúrlausn dómsins með sömu vöxtum og dráttarvöxtum og greinir í aðalkröfu.

3. Málskostnaðarkrafa:
   Að stefndi verði dæmdur til að greiða stefnanda málskostnað að skaðlausu samkvæmt framlögðum málskostnaðarreikningi málflytjanda stefnanda, sbr. 130. gr. laga nr. 91/1991 um meðferð einkamála, ásamt virðisaukaskatti skv. lögum nr. 50/1988.
${customClaims ? `\nSérstök viðbótarkrafa stefnanda:\n${customClaims}` : ""}`;
  } else {
    claims = `I. DÓMKRÖFUR STEFNDA

Stefndi gerir eftirfarandi dómkröfur í málinu:

1. Aðalkrafa:
   Að stefndi, ${defendant}, verði sýknaður af öllum kröfum stefnanda, ${plaintiff}, í máli þessu.

2. Varakrafa (til frávísunar):
   Til vara er þess krafist að máli þessu verði vísað frá dómi vegna vanefnda á lögbundnum stefnufresti skv. 80. gr. laga nr. 91/1991 eða ófullnægjandi málatilbúnaðar skv. 80. og 96. gr. sömu laga.

3. Þrautavarakrafa:
   Til þrautavara að greiðslur stefnda verði stórlega lækkaðar með tilliti til eigin sakar stefnanda eða ófyrirséðra samningsatvika.

4. Málskostnaðarkrafa:
   Að stefnandi verði dæmdur til að greiða stefnda fullan málskostnað skv. 130. gr. laga nr. 91/1991 um meðferð einkamála, ásamt virðisaukaskatti.
${customClaims ? `\nSérstakar varnarkröfur stefnda:\n${customClaims}` : ""}`;
  }

  const docFacts = docs
    .map((d, i) => `   (${i + 1}) Skv. málsskjali „${d.title}“ (${d.doc_type}): ${d.summary || "Staðfesting á efnisþáttum málsins."}`)
    .join("\n");

  const facts = `II. MÁLSATVIK

${c.description}

Málsatvik eru nánar rakin í eftirfarandi málsskjölum sem lögð eru fram til stuðnings málinu:
${docFacts || "   Málsatvik styðjast við framlögð gögn aðila og málskjöl í dómaskjalaskrá."}

Aðilar áttu í lögmætu og bindandi samningssambandi. Ágreiningur sá sem hér liggur fyrir dómstólum varðar vanefndir á samningsbundnum og lögmæltum skyldum. Stefnandi sendi tímanlegar skriflegar aðfinnslur og tilkynningar um leið og forsendur lágu fyrir. Stefndi hefur engu að síður neitað að efna skyldur sínar eða bæta fyrir tjónið með fullnægjandi hætti, sem gerir dómstólameðferð óumflýjanlega.
${lawyerNotes ? `\nÁrétting lögmanns um málsatvik:\n${lawyerNotes}` : ""}`;

  const statutesArg =
    statutes.length > 0
      ? statutes
          .map((s) => {
            return `• ${s.act_name} nr. ${s.act_number} — ${s.article} (${s.title}):
  Samkvæmt ákvæðinu: „${s.text}“
  Ákvæði þetta hefur beina þýðingu í málinu. Það rennir ótvíræðum lagastoðum undir réttarstöðu aðila og styður ${docType === "stefna" ? "kröfugerð stefnanda um full efndabót og lögvarða hagsmuni" : "varnir stefnda um sýknu og frávísun málsins"}.`;
          })
          .join("\n\n")
      : `• Lög um meðferð einkamála nr. 91/1991:
  Byggt er á almennum meginreglum einkamálaréttar um sönnunarbyrði, málshæfi og réttarfarslega hagsmuni.`;

  const precedentsArg =
    precedents.length > 0
      ? `\n\nTil stuðnings er sérstaklega vísað til eftirfarandi dómafordæma:\n` +
        precedents
          .map((p) => {
            return `• ${p.case_reference} (${p.court}, ${p.date}):
  Í dóminum komst rétturinn að þeirri niðurstöðu að: „${p.key_findings}“.`;
          })
          .join("\n\n")
      : "";

  const legalGrounds = `III. MÁLSÁSTÆÐUR OG LAGARÖK

Kröfur ${docType === "stefna" ? "stefnanda" : "stefnda"} í máli þessu byggjast á gildandi íslenskum lögum, formfestum réttarheimildum og viðurkenndri dómvenju Hæstaréttar og Landsréttar.

Löggilt lagaákvæði sem reynir á í málinu:
${statutesArg}${precedentsArg}

Krafa um vexti og dráttarvexti styðst við 8. og 9. gr. laga nr. 38/2001 um vexti og dráttarvexti.
Krafa um málskostnað er studd 1. mgr. 130. gr. laga nr. 91/1991 um meðferð einkamála, enda hefur rekstur máls þessa haft í för með sér umtalsverðan kostnað vegna lögfræðiaðstoðar og gagnaöflunar.`;

  const evidenceList = docs
    .map(
      (d, i) =>
        `   Skjal nr. ${i + 1}: „${d.title}“ (${d.doc_type}, ${d.page_count} bls.) — Varðar: ${d.summary || "Sönnun á málsatvikum"}.`
    )
    .join("\n");

  const evidence = `IV. SÖNNUNARGÖGN OG SKJALASKRÁ

${docType === "stefna" ? "Stefnandi" : "Stefndi"} leggur fram eftirfarandi málsskjöl til sönnunar á málsástæðum sínum í samræmi við 101. gr. laga nr. 91/1991:

${evidenceList || "   1. Skrifleg samningsgögn og tilkynningar aðila.\n   2. Framlögð vottorð og skoðunarskýrslur sérfræðinga."}

Þá áskilur málsaðili sér rétt til að leggja fram viðbótargögn, leiða vitni fyrir dóm og krefjast dómkvaddra matsmanna ef þörf krefur við rekstur málsins.`;

  let procedure = "";
  if (docType === "stefna") {
    procedure = `V. RÉTTARFAR OG STEFNUFRESTUR

Mál þetta er höfðað fyrir ${courtName || "Héraðsdómi Reykjavíkur"} á grundvelli almennra reglna um varnarþing skv. 24. gr. laga nr. 91/1991 um meðferð einkamála.

Stefnufrestur er ákveðinn í samræmi við 80. gr. laga nr. 91/1991 og skal vera minnst 3 sólarhringar ef stefndi hefur búsetu í sama dómumdæmi, en 14 sólarhringar ef búseta er utan dómumdæmis.

Stefndi er hér með löglega kallaður til að mæta fyrir dómþingi ${courtName || "Héraðsdóms Reykjavíkur"} sem háð verður í Dómhúsinu við Lækjartorg, til að hlýða á dómkröfur stefnanda, leggja fram varnir og gögn.

Sérstaklega er vakin athygli stefnda á því að mæti hann ekki við þingfestingu málsins eða láti ekki lögmætan umboðsmann sækja þing, má kveða upp útivistardóm samkvæmt kröfum stefnanda skv. 1. mgr. 113. gr. laga nr. 91/1991.`;
  } else {
    procedure = `V. RÉTTARFAR OG FRESTIR

Greinargerð þessi er lögð fram í samræmi við 97. gr. laga nr. 91/1991 um meðferð einkamála innan þess frests sem dómari veitti við þingfestingu málsins.

Stefndi andmælir öllum kröfum stefnanda sem órökstuddum og ósönnuðum og krefst þess að frestur verði veittur til frekari gagnaöflunar skv. 101. gr. sömu laga.`;
  }

  const fullContent = `${header}

${claims}

${facts}

${legalGrounds}

${evidence}

${procedure}

Reykjavík, ${todayStr}

Virðingarfyllst,
Fyrir hönd ${docType === "stefna" ? plaintiff : defendant},

___________________________________________
${docType === "stefna" ? "Guðrún Sigurðardóttir hrl." : "Tómas Gunnarsson hdl."}
Lögmaður / Málflytjandi`;

  const wordCount = fullContent.split(/\s+/).filter(Boolean).length;

  return {
    title: `${docType === "stefna" ? "Stefna" : "Greinargerð"} í máli ${c.case_number} (${c.title})`,
    doc_type: docType,
    content: fullContent,
    summary: `Sjálfvirk skjalagerð: Drög að ${docType} í máli ${c.case_number} byggð á ${statutes.length} völdum lagaákvæðum, ${precedents.length} dómafordæmum og ${docs.length} málsskjölum.`,
    court_name: courtName,
    generated_at: new Date().toISOString(),
    model_used: "icelandic-legal-rules-engine",
    inference_source: "local_rules_engine",
    stats: {
      statutes_count: statutes.length,
      precedents_count: precedents.length,
      documents_count: docs.length,
      word_count: wordCount,
    },
    sections: {
      header,
      claims,
      facts,
      legal_grounds: legalGrounds,
      evidence,
      procedure,
    },
  };
}

export async function generateLegalDraft(
  c: CaseItem,
  docType: LegalDocType,
  statutes: LegalStatute[],
  precedents: LegalPrecedent[],
  docs: DocumentItem[],
  courtName: string = "Héraðsdómur Reykjavíkur",
  claimAmount?: string,
  customClaims?: string,
  lawyerNotes?: string
): Promise<LegalDraftResponse> {
  const { systemInstruction, userPrompt } = buildLegalDraftPrompt(
    c,
    docType,
    statutes,
    precedents,
    docs,
    courtName,
    claimAmount,
    customClaims,
    lawyerNotes
  );

  // PATH 1: Ollama Local Air-Gap Inference (Local Host / K3s)
  try {
    const ollamaResponse = await ollama.chat([
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt },
    ]);

    if (ollamaResponse.isRealInference && ollamaResponse.text?.trim()?.length > 200) {
      const generatedText = ollamaResponse.text.trim();
      const wordCount = generatedText.split(/\s+/).filter(Boolean).length;
      return {
        title: `${docType === "stefna" ? "Stefna" : "Greinargerð"} í máli ${c.case_number} (${c.title})`,
        doc_type: docType,
        content: generatedText,
        summary: `Staðbundið Ollama-skjal að ${docType} í máli ${c.case_number}.`,
        court_name: courtName,
        generated_at: new Date().toISOString(),
        model_used: ollamaResponse.modelUsed || "ollama-legal-gemma",
        inference_source: "ollama_airgap",
        stats: {
          statutes_count: statutes.length,
          precedents_count: precedents.length,
          documents_count: docs.length,
          word_count: wordCount,
        },
        sections: {
          header: "Í HÉRAÐSDÓMI REYKJAVÍKUR",
          claims: "I. DÓMKRÖFUR",
          facts: "II. MÁLSATVIK",
          legal_grounds: "III. MÁLSÁSTÆÐUR OG LAGARÖK",
          evidence: "IV. SÖNNUNARGÖGN",
          procedure: "V. RÉTTARFAR",
        },
      };
    }
  } catch (ollamaErr: any) {
    console.warn("[Draft API] Ollama call error, proceeding to local rules engine:", ollamaErr?.message || ollamaErr);
  }

  return generateLocalLegalDraft(
    c,
    docType,
    statutes,
    precedents,
    docs,
    courtName,
    claimAmount,
    customClaims,
    lawyerNotes
  );
}
EOF
fi

echo "Library files verification and restoration complete."

