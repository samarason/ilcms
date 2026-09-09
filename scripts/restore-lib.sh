#!/usr/bin/env bash
# ==============================================================================
# ILCMS Library Restorer
# Automatically restores src/lib/* modules if missing from the working directory.
# ==============================================================================
set -euo pipefail

# Ensure execution from project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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
];
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

echo "Library files verification and restoration complete."
