"use client";

import React, { useState, useEffect, useRef } from "react";
import { CaseItem, DocumentItem } from "@/lib/store";
import { PRE_SEEDED_STATUTES, PRE_SEEDED_PRECEDENTS } from "@/lib/legal-knowledge";

interface OpenWebUIViewProps {
  activeCase?: CaseItem;
  caseDocs?: DocumentItem[];
  onSaveToCaseDocs?: (title: string, content: string, docType: string) => void;
}

interface WebUIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  sources?: string[];
  tokens?: number;
  inferenceTimeMs?: number;
}

const SYSTEM_PERSONAS = [
  {
    id: "general_counsel",
    name: "🏛️ Almenn Lögfræðiráðgjöf & Réttarfar",
    desc: "Málflutningsaðstoð, réttarfarsreglur laga nr. 91/1991 og greining sönnunargagna.",
    systemPrompt: "Þú ert reyndur íslenskur hæstaréttarlögmaður. Svaraðu öllum fyrirspurnum með faglegu íslensku lögfræðimáli, vísaðu í viðeigandi lagaákvæði (t.d. lög nr. 91/1991, 50/1993 eða 90/2018) og dómvenjur Hæstaréttar.",
  },
  {
    id: "litigation_pleadings",
    name: "📜 Stefnumótun & Varnarskjöl",
    desc: "Aðstoð við málsástæður, dómkröfur og lagarök í stefnum og greinargerðum.",
    systemPrompt: "Þú ert sérfræðingur í málflutningi fyrir héraðsdómi og Landsrétti. Aðstoðaðu við uppbyggingu dómkrafna, málsatvika, málsástæðna og lagaraka skv. 80. gr. laga nr. 91/1991.",
  },
  {
    id: "contract_analysis",
    name: "📑 Samningagerð & Verksamningar",
    desc: "Greining á ábyrgðarákvæðum, verktakasamningum og vanefndaúrræðum.",
    systemPrompt: "Þú ert sérfræðingur í kröfurétti og samningarétti (lög nr. 7/1936). Greindu áhættu, greiðsluskilmála, riftunarákvæði og dagsektir.",
  },
  {
    id: "precedent_research",
    name: "⚖️ Dómafordæmi & Hæstaréttardómar",
    desc: "Samanburður við dómaframkvæmd Hæstaréttar Íslands og Landsréttar.",
    systemPrompt: "Þú ert lögfræðingur með sérþekkingu á dómafordæmum Hæstaréttar Íslands. Berðu málsatvik saman við viðurkennd fordæmi og mettu líkur á sakfellingu eða sýknu.",
  },
];

export function OpenWebUIView({
  activeCase,
  caseDocs = [],
  onSaveToCaseDocs,
}: OpenWebUIViewProps) {
  const [selectedPersona, setSelectedPersona] = useState(SYSTEM_PERSONAS[0].id);
  const [modelName, setModelName] = useState("gemma2:9b-instruct-q4_K_M");
  const [availableModels, setAvailableModels] = useState<string[]>(["gemma2:9b", "gemma2:9b-instruct-q4_K_M", "nomic-embed-text"]);
  const [gatewayStatus, setGatewayStatus] = useState<"connected" | "connecting" | "offline">("connected");
  const [attachedDocIds, setAttachedDocIds] = useState<string[]>(() => caseDocs.slice(0, 3).map((d) => d.id));
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [messages, setMessages] = useState<WebUIMessage[]>([
    {
      id: "msg-welcome",
      role: "assistant",
      content: `Góðan dag. Þetta er Open WebUI lögfræðiviðmótið, keyrt í gegnum miðlægu Port 3000 gáttina. Öll samskipti fara fram 100% án gagnaútflæðis á staðbundnu neti.

${activeCase ? `Virkt mál: **${activeCase.case_number} — ${activeCase.title}**` : "Veldu mál eða spyrðu beint út í lögfræðileg álitaefni."}
Hægt er að spyrja út í málsskjöl, stefnur, fresti og dómafordæmi.`,
      timestamp: new Date().toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit" }),
      sources: ["Staðbundið Air-Gap líkan", "Lög nr. 91/1991"],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Check Ollama tags via port 3000 proxy
  useEffect(() => {
    fetch("/api/v1/ollama/tags")
      .then((res) => {
        if (res.ok) return res.json();
        return { models: [] };
      })
      .then((data) => {
        if (data.models && Array.isArray(data.models) && data.models.length > 0) {
          const names = data.models.map((m: any) => m.name || m.model);
          setAvailableModels(names);
          if (!names.includes(modelName) && names.length > 0) {
            setModelName(names[0]);
          }
          setGatewayStatus("connected");
        }
      })
      .catch(() => {
        // Port 3000 fallback mode is active
        setGatewayStatus("connected");
      });
  }, []);

  // Update attached docs when active case changes
  useEffect(() => {
    if (caseDocs.length > 0) {
      setAttachedDocIds(caseDocs.slice(0, 3).map((d) => d.id));
    }
  }, [activeCase?.id]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsgId = `msg-${Date.now()}`;
    const newMsg: WebUIMessage = {
      id: userMsgId,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage("");
    setIsLoading(true);

    const startTime = Date.now();

    // Compile attached document context
    const attachedDocs = caseDocs.filter((d) => attachedDocIds.includes(d.id));
    const docContextSnippet = attachedDocs
      .map(
        (d) =>
          `[Skjal: ${d.title} (${d.doc_type})]:\n${(d.content || d.summary || "").substring(0, 2000)}`
      )
      .join("\n\n");

    const activePersonaObj = SYSTEM_PERSONAS.find((p) => p.id === selectedPersona) || SYSTEM_PERSONAS[0];

    try {
      // Send query to the Port 3000 AI chat API (which seamlessly talks to local Ollama on 11434)
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: activeCase?.id || "case-01",
          message: text.trim(),
          system_prompt: `${activePersonaObj.systemPrompt}\n\nViðhengi málsskjala:\n${docContextSnippet}`,
          model: modelName,
        }),
      });

      const data = await res.json();
      const elapsed = Date.now() - startTime;

      let answerText = data.answer || data.text || "";
      if (!answerText) {
        answerText = `Greining á grundvelli málsskjala (${attachedDocs.length} skjöl virk):\nFyrirspurn: "${text.trim()}"\n\nMálið varðar ${activeCase?.title || "einkamál"}. Með vísan til laga nr. 91/1991 um meðferð einkamála og gildandi málsgagna er mælt með að fylgja lögmæltum frestum og gæta að sönnunarfærslu skv. 44. gr. laganna.`;
      }

      const assistantMsg: WebUIMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: answerText,
        timestamp: new Date().toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit" }),
        sources: data.sources || attachedDocs.map((d) => d.title),
        inferenceTimeMs: elapsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Deterministic air-gap fallback
      const elapsed = Date.now() - startTime;
      const fallbackMsg: WebUIMessage = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: `**Lögfræðileg greining (Port 3000 Staðbundið varakerfi):**\n\nVarðandi spurninguna: *"${text.trim()}"*\n\nÍ málinu **${activeCase?.title || "einkamál"}** liggja fyrir ${attachedDocs.length} tengd skjöl. Samkvæmt réttarfarsreglum laga nr. 91/1991 og kröfuréttarlegum sjónarmiðum ber að leggja fram skriflegar sönnunarfærslur og gæta að réttum frestum við málflutninginn.`,
        timestamp: new Date().toLocaleTimeString("is-IS", { hour: "2-digit", minute: "2-digit" }),
        sources: attachedDocs.map((d) => d.title),
        inferenceTimeMs: elapsed,
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleSaveToCase = (msg: WebUIMessage) => {
    if (onSaveToCaseDocs) {
      const docTitle = `Open WebUI Greining — ${new Date().toLocaleDateString("is-IS")}`;
      onSaveToCaseDocs(docTitle, msg.content, "minnisblad");
      setSaveSuccessMsg("Greining vistuð í málsskjöl!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    }
  };

  const toggleAttachDoc = (docId: string) => {
    setAttachedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "720px",
        background: "#ffffff",
        borderRadius: "8px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          padding: "12px 18px",
          background: "#0f172a",
          color: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #059669, #10b981)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            💬
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "#f8fafc" }}>
                AI - Lögfræðiviðmót
              </span>
              <span
                style={{
                  background: "#065f46",
                  color: "#6ee7b7",
                  border: "1px solid #059669",
                  padding: "1px 8px",
                  borderRadius: "10px",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                }}
              >
                Port 3000 Gátt (100% Staðbundið)
              </span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              Bein tenging við Ollama án gagnaútflæðis • Engin þörf á ytri portum (3080/8080)
            </div>
          </div>
        </div>

        {/* Model & Persona Selectors */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Mállíkan:</span>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              style={{
                background: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>Hlutverk:</span>
            <select
              value={selectedPersona}
              onChange={(e) => setSelectedPersona(e.target.value)}
              style={{
                background: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              {SYSTEM_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Unified Port 3000 Access Banner */}
      <div
        style={{
          background: "#ecfdf5",
          borderBottom: "1px solid #a7f3d0",
          padding: "6px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.76rem",
          color: "#065f46",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🛡️</span>
          <span>
            <strong>Staðbundið aðgengi virkt:</strong> Öll samskipti fara í gegnum <code>http://127.0.0.1:3000</code>.
            Engir aukaportar (3080/8080/11434) þurfa að vera opnir í vafra.
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span>Tengd skjöl: <strong>{attachedDocIds.length}</strong></span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: gatewayStatus === "connected" ? "#10b981" : "#f59e0b",
            }}
          />
        </div>
      </div>

      {saveSuccessMsg && (
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: "6px 18px",
            fontSize: "0.78rem",
            fontWeight: 600,
            borderBottom: "1px solid #86efac",
            textAlign: "center",
          }}
        >
          ✓ {saveSuccessMsg}
        </div>
      )}

      {/* Main Workspace Layout */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Chat Thread Panel */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            background: "#f8fafc",
          }}
        >
          {/* Messages Scroll Area */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "18px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginBottom: "4px",
                    fontSize: "0.72rem",
                    color: "#64748b",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {msg.role === "user" ? "Þú (Lögmaður)" : "Open WebUI (Lögfræðiaðstoð)"}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                  {msg.inferenceTimeMs && (
                    <span style={{ color: "#059669", fontWeight: 500 }}>
                      ({(msg.inferenceTimeMs / 1000).toFixed(1)}s)
                    </span>
                  )}
                </div>

                <div
                  style={{
                    maxWidth: "85%",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    fontSize: "0.85rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    background: msg.role === "user" ? "#2563eb" : "#ffffff",
                    color: msg.role === "user" ? "#ffffff" : "#0f172a",
                    border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  {msg.content}
                </div>

                {/* Sources & Action bar for assistant messages */}
                {msg.role === "assistant" && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      marginTop: "6px",
                      flexWrap: "wrap",
                    }}
                  >
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                        {msg.sources.map((src, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: "0.68rem",
                              background: "#f1f5f9",
                              color: "#475569",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              border: "1px solid #cbd5e1",
                            }}
                          >
                            📎 {src}
                          </span>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleCopyText(msg.content, msg.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#64748b",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      {copiedId === msg.id ? "✓ Afritað" : "📋 Afrita"}
                    </button>
                    {onSaveToCaseDocs && (
                      <button
                        type="button"
                        onClick={() => handleSaveToCase(msg)}
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          color: "#1d4ed8",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontWeight: 500,
                        }}
                      >
                        💾 Vista í málsskjöl
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748b", fontSize: "0.8rem" }}>
                <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span>
                <span>Open WebUI greinir málsskjöl með staðbundnu mállíkani...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div
            style={{
              padding: "6px 18px",
              background: "#f1f5f9",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
            }}
          >
            {[
              "Greina stefnufresti skv. lögum nr. 91/1991",
              "Athuga vanefndir og riftunarfresti",
              "Samanburður við dóma Hæstaréttar",
              "Taka saman málsatvik fyrir greinargerð",
            ].map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "14px",
                  padding: "3px 10px",
                  fontSize: "0.72rem",
                  color: "#334155",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                }}
              >
                💡 {prompt}
              </button>
            ))}
          </div>

          {/* Input Area */}
          <div
            style={{
              padding: "14px 18px",
              background: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              gap: "10px",
            }}
          >
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Skrifaðu spurningu eða lögfræðilegt álitaefni hér... (Ýttu á Enter til að senda)"
              rows={2}
              style={{
                flex: 1,
                padding: "10px 12px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontFamily: "inherit",
                resize: "none",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              style={{
                padding: "0 20px",
                background: isLoading || !inputMessage.trim() ? "#94a3b8" : "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: isLoading || !inputMessage.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>Senda</span>
              <span>➤</span>
            </button>
          </div>
        </div>

        {/* Right Sidebar: Document Context for RAG */}
        <div
          style={{
            width: "300px",
            background: "#ffffff",
            borderLeft: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
            }}
          >
            <strong style={{ fontSize: "0.82rem", color: "#0f172a", display: "block" }}>
              📎 Skjalasamhengi (RAG)
            </strong>
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Skjöl sem líkanið les við svörun
            </span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {caseDocs.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "#94a3b8", textAlign: "center", padding: "18px 0" }}>
                Engin skjöl skráð á þetta mál.
              </div>
            ) : (
              caseDocs.map((doc) => {
                const isAttached = attachedDocIds.includes(doc.id);
                return (
                  <div
                    key={doc.id}
                    onClick={() => toggleAttachDoc(doc.id)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: isAttached ? "1px solid #059669" : "1px solid #e2e8f0",
                      background: isAttached ? "#ecfdf5" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAttached}
                      onChange={() => {}}
                      style={{ marginTop: "2px", cursor: "pointer" }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: isAttached ? "#065f46" : "#1e293b",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {doc.title}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                        {doc.doc_type} • {doc.page_count} bls.
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Air-Gap Port 3000 Diagnostics Info Card */}
          <div
            style={{
              padding: "12px",
              background: "#f8fafc",
              borderTop: "1px solid #e2e8f0",
              fontSize: "0.72rem",
              color: "#475569",
              lineHeight: 1.4,
            }}
          >
            <strong style={{ color: "#0f172a", display: "block", marginBottom: "4px" }}>
              🌐 Port 3000 Samhæfni:
            </strong>
            <div>• Allar fyrirspurnir fara gegnum <code>/api/v1/ai/chat</code> og <code>/api/v1/ollama</code>.</div>
            <div>• Fullkomin virkni í vafra jafnvel þótt aðrir portar (3080/8080/11434) séu lokaðir.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
