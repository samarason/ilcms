"use client";

import React, { useState } from "react";
import { CaseItem, DocumentItem } from "@/lib/store";

interface StefnaGreinargerdWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase?: CaseItem;
  caseDocs?: DocumentItem[];
}

export function StefnaGreinargerdWindowModal({
  isOpen,
  onClose,
  activeCase,
  caseDocs = [],
}: StefnaGreinargerdWindowModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedSide, setCopiedSide] = useState<string | null>(null);

  if (!isOpen) return null;

  // Find Stefna and Greinargerð from caseDocs or fall back to first two docs or defaults
  const stefnaDoc =
    caseDocs.find(
      (d) => d.doc_type?.toLowerCase() === "stefna" || d.title?.toLowerCase().includes("stefna")
    ) || caseDocs[0];

  const greinargerdDoc =
    caseDocs.find(
      (d) => d.doc_type?.toLowerCase() === "greinargerð" || d.title?.toLowerCase().includes("greinargerð")
    ) || caseDocs[1];

  const stefnaText =
    stefnaDoc?.content ||
    `HÉRAÐSDÓMUR REYKJAVÍKUR\nMál nr. ${activeCase?.case_number || "E-1025/2026"}\n\nSTEFNA\n\nStefnandi: Sparisjóður Austurlands hf., kt. 620598-2139\nGegn\nStefnda: Norðurfell ehf., kt. 450918-2990\n\nI. DÓMKRÖFUR\n1. Stefndi verði dæmdur til að greiða stefnanda kr. 35.800.000 auk dráttarvaxta skv. lagaáskilnaði.`;

  const greinargerdText =
    greinargerdDoc?.content ||
    `HÉRAÐSDÓMUR REYKJAVÍKUR\nMál nr. ${activeCase?.case_number || "E-1025/2026"}\n\nGREINARGERÐ\n\nStefnandi: Sparisjóður Austurlands hf.\nGegn\nStefnda: Norðurfell ehf.\n\nI. SÝKNU- OG FRÁVÍSUNARKRÖFUR\n1. Stefndi krefst sýknu af öllum kröfum stefnanda í máli þessu.`;

  const handleCopy = (side: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSide(side);
    setTimeout(() => setCopiedSide(null), 2000);
  };

  const handlePrintAll = () => {
    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Stefna og Greinargerð - ${activeCase?.case_number || ""}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.5; margin: 30px; color: #000; }
              .doc-box { margin-bottom: 40px; page-break-after: always; }
              h1 { font-size: 14pt; border-bottom: 1px solid #000; padding-bottom: 6px; }
              pre { white-space: pre-wrap; font-family: inherit; font-size: 10.5pt; }
            </style>
          </head>
          <body>
            <div class="doc-box">
              <h1>STEFNA (SUMMONS) - ${stefnaDoc?.title || "Stefna"}</h1>
              <pre>${stefnaText}</pre>
            </div>
            <div class="doc-box">
              <h1>GREINARGERÐ (DEFENSE) - ${greinargerdDoc?.title || "Greinargerð"}</h1>
              <pre>${greinargerdText}</pre>
            </div>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWin.document.close();
    }
  };

  return (
    <div
      id="stefna-greinargerd-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 10, 20, 0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMaximized ? "0" : "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="stefna-greinargerd-modal-container"
        style={{
          width: isMaximized ? "100vw" : "96vw",
          maxWidth: isMaximized ? "100%" : "1400px",
          height: isMaximized ? "100vh" : "92vh",
          background: "#090d16",
          border: isMaximized ? "none" : "1px solid #2563eb",
          borderRadius: isMaximized ? "0" : "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#f8fafc",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            background: "#0f172a",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
                boxShadow: "0 2px 10px rgba(37, 99, 235, 0.35)",
              }}
            >
              ⚖️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc" }}>
                  Sjálfstæður Gluggi: Stefna og Greinargerð
                </h2>
                <span
                  style={{
                    background: "#1e3a8a",
                    color: "#93c5fd",
                    border: "1px solid #2563eb",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                  }}
                >
                  {activeCase ? `${activeCase.case_number} • ${activeCase.title}` : "Hlið við hlið samanburður"}
                </span>
                <span
                  style={{
                    background: "#065f46",
                    color: "#6ee7b7",
                    border: "1px solid #059669",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                  }}
                >
                  🛡️ 100% Air-Gapped ILCMS
                </span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "2px" }}>
                Opnað í sérstöku viðmótsglugga (Sjálfstæður Gluggi) án þess að opna í pane #2
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="text"
              placeholder="🔍 Leita í skjalatexta..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                borderRadius: "6px",
                color: "#f8fafc",
                padding: "6px 10px",
                fontSize: "0.78rem",
                width: "200px",
              }}
            />
            <button
              onClick={handlePrintAll}
              title="Prenta bæði skjöl"
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#cbd5e1",
                padding: "6px 12px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>🖨️</span> Prenta
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Minnka glugga" : "Hámarka glugga"}
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#94a3b8",
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isMaximized ? "🗗" : "🗖"}
            </button>
            <button
              id="btn-close-stefna-greinargerd-modal"
              onClick={onClose}
              title="Loka glugga"
              style={{
                background: "#1e293b",
                border: "1px solid #334155",
                color: "#94a3b8",
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "1.2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Dual Window Body */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            padding: "16px",
            background: "#030712",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Left: Stefna (Summons) */}
          <div
            style={{
              background: "#090d16",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "#0f172a",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1rem" }}>⚖️</span>
                <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#60a5fa" }}>
                  {stefnaDoc?.title || "Stefna (Summons)"}
                </span>
                <span style={{ fontSize: "0.72rem", background: "#1e3a8a", color: "#93c5fd", padding: "1px 6px", borderRadius: "4px" }}>
                  {stefnaDoc?.doc_type || "Stefna"}
                </span>
              </div>
              <button
                onClick={() => handleCopy("stefna", stefnaText)}
                style={{
                  background: copiedSide === "stefna" ? "#065f46" : "#1e293b",
                  color: copiedSide === "stefna" ? "#6ee7b7" : "#cbd5e1",
                  border: "1px solid #334155",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {copiedSide === "stefna" ? "✓ Afritað" : "📋 Afrita"}
              </button>
            </div>
            <div
              style={{
                flex: 1,
                padding: "16px",
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: "0.82rem",
                color: "#e2e8f0",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {stefnaText}
            </div>
          </div>

          {/* Right: Greinargerð (Defense) */}
          <div
            style={{
              background: "#090d16",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                background: "#0f172a",
                borderBottom: "1px solid #1e293b",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1rem" }}>🛡️</span>
                <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#34d399" }}>
                  {greinargerdDoc?.title || "Greinargerð (Defense)"}
                </span>
                <span style={{ fontSize: "0.72rem", background: "#065f46", color: "#6ee7b7", padding: "1px 6px", borderRadius: "4px" }}>
                  {greinargerdDoc?.doc_type || "Greinargerð"}
                </span>
              </div>
              <button
                onClick={() => handleCopy("greinargerð", greinargerdText)}
                style={{
                  background: copiedSide === "greinargerð" ? "#065f46" : "#1e293b",
                  color: copiedSide === "greinargerð" ? "#6ee7b7" : "#cbd5e1",
                  border: "1px solid #334155",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {copiedSide === "greinargerð" ? "✓ Afritað" : "📋 Afrita"}
              </button>
            </div>
            <div
              style={{
                flex: 1,
                padding: "16px",
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: "0.82rem",
                color: "#e2e8f0",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {greinargerdText}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            background: "#090d16",
            borderTop: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
            💡 Sjálfstæður Gluggi tengdur við mál <strong style={{ color: "#f8fafc" }}>{activeCase?.case_number}</strong> í ILCMS kerfinu.
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              padding: "6px 16px",
              borderRadius: "6px",
              fontWeight: 600,
              fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            Loka glugga
          </button>
        </div>
      </div>
    </div>
  );
}
