"use client";

import React, { useState, useMemo } from "react";
import { LegalPrecedent, LegalStatute } from "@/lib/legal-knowledge";

interface LegalCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  precedents: LegalPrecedent[];
  statutes: LegalStatute[];
  initialItemAId?: string | null;
  initialItemBId?: string | null;
  initialItemAType?: "precedent" | "statute";
  initialItemBType?: "precedent" | "statute";
}

type CompareItemType = "precedent" | "statute";

export function LegalCompareModal({
  isOpen,
  onClose,
  precedents,
  statutes,
  initialItemAId,
  initialItemBId,
  initialItemAType,
  initialItemBType,
}: LegalCompareModalProps) {
  // Determine starting selections
  const defaultAKey = useMemo(() => {
    if (initialItemAId && initialItemAType) {
      return `${initialItemAType}:${initialItemAId}`;
    }
    if (precedents.length > 0) {
      return `precedent:${precedents[0].id}`;
    }
    if (statutes.length > 0) {
      return `statute:${statutes[0].id}`;
    }
    return "";
  }, [initialItemAId, initialItemAType, precedents, statutes]);

  const defaultBKey = useMemo(() => {
    if (initialItemBId && initialItemBType) {
      return `${initialItemBType}:${initialItemBId}`;
    }
    if (precedents.length > 1) {
      return `precedent:${precedents[1].id}`;
    }
    if (statutes.length > 0) {
      return `statute:${statutes[0].id}`;
    }
    return "";
  }, [initialItemBId, initialItemBType, precedents, statutes]);

  const [selectedKeyA, setSelectedKeyA] = useState<string>(defaultAKey);
  const [selectedKeyB, setSelectedKeyB] = useState<string>(defaultBKey);
  const [searchHighlight, setSearchHighlight] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copyAllSuccess, setCopyAllSuccess] = useState(false);

  // Sync state if initial props change when opened
  React.useEffect(() => {
    if (isOpen) {
      if (initialItemAId && initialItemAType) {
        setSelectedKeyA(`${initialItemAType}:${initialItemAId}`);
      } else if (!selectedKeyA && defaultAKey) {
        setSelectedKeyA(defaultAKey);
      }
      if (initialItemBId && initialItemBType) {
        setSelectedKeyB(`${initialItemBType}:${initialItemBId}`);
      } else if (!selectedKeyB && defaultBKey) {
        setSelectedKeyB(defaultBKey);
      }
    }
  }, [isOpen, initialItemAId, initialItemBId, initialItemAType, initialItemBType, defaultAKey, defaultBKey]);

  if (!isOpen) return null;

  // Resolve Item A
  const resolveItem = (key: string) => {
    if (!key) return null;
    const [type, id] = key.split(":");
    if (type === "precedent") {
      const item = precedents.find((p) => p.id === id);
      return item ? { type: "precedent" as CompareItemType, data: item } : null;
    }
    if (type === "statute") {
      const item = statutes.find((s) => s.id === id);
      return item ? { type: "statute" as CompareItemType, data: item } : null;
    }
    return null;
  };

  const itemA = resolveItem(selectedKeyA);
  const itemB = resolveItem(selectedKeyB);

  // Swap Left and Right
  const handleSwap = () => {
    const temp = selectedKeyA;
    setSelectedKeyA(selectedKeyB);
    setSelectedKeyB(temp);
  };

  // Preset Selection Helper
  const applyPreset = (keyA: string, keyB: string) => {
    setSelectedKeyA(keyA);
    setSelectedKeyB(keyB);
  };

  // Helper to copy text of a specific item
  const handleCopyItem = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Helper to copy comparison summary
  const handleCopyBoth = () => {
    let text = "=== SAMANBURÐUR Á RÉTTARHEIMILDUM (ILCMS) ===\n\n";
    if (itemA) {
      if (itemA.type === "precedent") {
        const p = itemA.data as LegalPrecedent;
        text += `[LIÐUR A: DÓMAFORDÆMI]\nTilvísun: ${p.case_reference} (${p.court}, ${p.date})\nAðilar: ${p.parties}\nLagastoð: ${p.statutory_basis.join(", ")}\nMálavextir:\n${p.summary}\nNiðurstaða:\n${p.key_findings}\n\n`;
      } else {
        const s = itemA.data as LegalStatute;
        text += `[LIÐUR A: LAGAGREIN]\nÁkvæði: ${s.article} (${s.title})\nLög: ${s.act_name} ${s.act_number}\nEfnisorð: ${s.keywords.join(", ")}\nLagatexti:\n${s.text}\n\n`;
      }
    }
    text += "--------------------------------------------------------\n\n";
    if (itemB) {
      if (itemB.type === "precedent") {
        const p = itemB.data as LegalPrecedent;
        text += `[LIÐUR B: DÓMAFORDÆMI]\nTilvísun: ${p.case_reference} (${p.court}, ${p.date})\nAðilar: ${p.parties}\nLagastoð: ${p.statutory_basis.join(", ")}\nMálavextir:\n${p.summary}\nNiðurstaða:\n${p.key_findings}\n\n`;
      } else {
        const s = itemB.data as LegalStatute;
        text += `[LIÐUR B: LAGAGREIN]\nÁkvæði: ${s.article} (${s.title})\nLög: ${s.act_name} ${s.act_number}\nEfnisorð: ${s.keywords.join(", ")}\nLagatexti:\n${s.text}\n\n`;
      }
    }
    navigator.clipboard.writeText(text);
    setCopyAllSuccess(true);
    setTimeout(() => setCopyAllSuccess(false), 2500);
  };

  // Helper to highlight matching query in text
  const renderHighlightedText = (content: string, query: string) => {
    if (!query.trim()) return content;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = content.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          style={{
            backgroundColor: "#fef08a",
            color: "#854d0e",
            padding: "1px 3px",
            borderRadius: "2px",
            fontWeight: 600,
          }}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      id="legal-compare-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="legal-compare-modal-content"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "1250px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #cbd5e1",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            backgroundColor: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.4rem" }}>⚖️</span>
              <div>
                <h3
                  id="legal-compare-modal-title"
                  style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}
                >
                  Samanburður á dómafordæmum og lagagreinum
                </h3>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                  Bera saman tvö dómafordæmi eða lagaákvæði hlið við hlið (Side-by-side comparison)
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              id="compare-swap-btn"
              onClick={handleSwap}
              title="Víxla vinstri og hægri hlið"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
            >
              <span>⇄</span> Víxla hliðum
            </button>

            <button
              id="compare-copy-all-btn"
              onClick={handleCopyBoth}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: copyAllSuccess ? "#dcfce7" : "#ffffff",
                color: copyAllSuccess ? "#15803d" : "#334155",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>{copyAllSuccess ? "✓" : "📋"}</span>
              {copyAllSuccess ? "Afritað!" : "Afrita samanburð"}
            </button>

            <button
              id="compare-modal-close-btn"
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                color: "#64748b",
                fontSize: "1.1rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#fee2e2";
                e.currentTarget.style.color = "#dc2626";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.color = "#64748b";
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* TOOLBAR: PRESETS & SEARCH HIGHLIGHT */}
        <div
          style={{
            padding: "10px 20px",
            backgroundColor: "#f1f5f9",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          {/* Quick presets */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
              Flýtitillögur:
            </span>
            <button
              onClick={() => applyPreset("precedent:prec-lr-45-2023", "statute:statute-em-80")}
              style={{
                fontSize: "0.74rem",
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#1e40af",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ⚖️ Lrd. 45/2023 vs. 📜 80. gr. eml.
            </button>
            <button
              onClick={() => applyPreset("precedent:prec-hrd-120-2021", "statute:statute-fk-27")}
              style={{
                fontSize: "0.74rem",
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#1e40af",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ⚖️ Hrd. 120/2021 vs. 📜 27. gr. fk.
            </button>
            <button
              onClick={() => applyPreset("statute:statute-em-80", "statute:statute-em-81")}
              style={{
                fontSize: "0.74rem",
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#166534",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              📜 80. gr. vs. 📜 81. gr. eml.
            </button>
            <button
              onClick={() => applyPreset("precedent:prec-hrd-120-2021", "precedent:prec-lr-45-2023")}
              style={{
                fontSize: "0.74rem",
                padding: "3px 8px",
                borderRadius: "4px",
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#1e40af",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              ⚖️ Hrd. 120/2021 vs. ⚖️ Lrd. 45/2023
            </button>
          </div>

          {/* Search/Highlight query */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <input
              id="compare-search-highlight-input"
              type="text"
              placeholder="🔍 Auðkenna orð í báðum textum..."
              value={searchHighlight}
              onChange={(e) => setSearchHighlight(e.target.value)}
              style={{
                padding: "4px 10px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                fontSize: "0.78rem",
                width: "220px",
                backgroundColor: "#ffffff",
                outline: "none",
              }}
            />
            {searchHighlight && (
              <button
                onClick={() => setSearchHighlight("")}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  padding: "2px 4px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* COMPARISON BODY (SIDE BY SIDE) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            backgroundColor: "#f8fafc",
          }}
        >
          {/* COLUMN A (LEFT) */}
          <div
            id="compare-pane-a"
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: itemA?.type === "precedent" ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            {/* Header / Selector for A */}
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: itemA?.type === "precedent" ? "#eff6ff" : "#f0fdf4",
                borderBottom: itemA?.type === "precedent" ? "1px solid #dbeafe" : "1px solid #dcfce7",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: itemA?.type === "precedent" ? "#1e40af" : "#166534",
                  }}
                >
                  {itemA?.type === "precedent" ? "⚖️ Liður A: Dómafordæmi" : "📜 Liður A: Lagagrein"}
                </span>

                {itemA && (
                  <button
                    onClick={() => {
                      const txt =
                        itemA.type === "precedent"
                          ? `${(itemA.data as LegalPrecedent).case_reference}\n${(itemA.data as LegalPrecedent).summary}\n${(itemA.data as LegalPrecedent).key_findings}`
                          : `${(itemA.data as LegalStatute).article} ${(itemA.data as LegalStatute).title}\n${(itemA.data as LegalStatute).text}`;
                      handleCopyItem("A", txt);
                    }}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: copiedKey === "A" ? "#16a34a" : "#2563eb",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {copiedKey === "A" ? "✓ Afritað" : "📋 Afrita texta"}
                  </button>
                )}
              </div>

              {/* Selector A */}
              <select
                id="compare-select-a"
                value={selectedKeyA}
                onChange={(e) => setSelectedKeyA(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#0f172a",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <optgroup label="⚖️ Fordæmi Hæstaréttar og Landsréttar">
                  {precedents.map((p) => (
                    <option key={`precedent:${p.id}`} value={`precedent:${p.id}`}>
                      {p.case_reference} — {p.court} ({p.date}) - {p.parties}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📜 Gildandi lagagreinar">
                  {statutes.map((s) => (
                    <option key={`statute:${s.id}`} value={`statute:${s.id}`}>
                      {s.act_name} {s.act_number} — {s.article} ({s.title})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Content for A */}
            <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
              {itemA?.type === "precedent" && (
                <PrecedentDetailView
                  precedent={itemA.data as LegalPrecedent}
                  highlight={searchHighlight}
                  renderHighlighted={renderHighlightedText}
                />
              )}
              {itemA?.type === "statute" && (
                <StatuteDetailView
                  statute={itemA.data as LegalStatute}
                  highlight={searchHighlight}
                  renderHighlighted={renderHighlightedText}
                />
              )}
              {!itemA && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 20px" }}>
                  Veldu réttarheimild í fellilistanum hér að ofan.
                </div>
              )}
            </div>
          </div>

          {/* COLUMN B (RIGHT) */}
          <div
            id="compare-pane-b"
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#ffffff",
              borderRadius: "8px",
              border: itemB?.type === "precedent" ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              overflow: "hidden",
            }}
          >
            {/* Header / Selector for B */}
            <div
              style={{
                padding: "12px 14px",
                backgroundColor: itemB?.type === "precedent" ? "#eff6ff" : "#f0fdf4",
                borderBottom: itemB?.type === "precedent" ? "1px solid #dbeafe" : "1px solid #dcfce7",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  style={{
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: itemB?.type === "precedent" ? "#1e40af" : "#166534",
                  }}
                >
                  {itemB?.type === "precedent" ? "⚖️ Liður B: Dómafordæmi" : "📜 Liður B: Lagagrein"}
                </span>

                {itemB && (
                  <button
                    onClick={() => {
                      const txt =
                        itemB.type === "precedent"
                          ? `${(itemB.data as LegalPrecedent).case_reference}\n${(itemB.data as LegalPrecedent).summary}\n${(itemB.data as LegalPrecedent).key_findings}`
                          : `${(itemB.data as LegalStatute).article} ${(itemB.data as LegalStatute).title}\n${(itemB.data as LegalStatute).text}`;
                      handleCopyItem("B", txt);
                    }}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      color: copiedKey === "B" ? "#16a34a" : "#2563eb",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {copiedKey === "B" ? "✓ Afritað" : "📋 Afrita texta"}
                  </button>
                )}
              </div>

              {/* Selector B */}
              <select
                id="compare-select-b"
                value={selectedKeyB}
                onChange={(e) => setSelectedKeyB(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "#0f172a",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <optgroup label="⚖️ Fordæmi Hæstaréttar og Landsréttar">
                  {precedents.map((p) => (
                    <option key={`precedent:${p.id}`} value={`precedent:${p.id}`}>
                      {p.case_reference} — {p.court} ({p.date}) - {p.parties}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📜 Gildandi lagagreinar">
                  {statutes.map((s) => (
                    <option key={`statute:${s.id}`} value={`statute:${s.id}`}>
                      {s.act_name} {s.act_number} — {s.article} ({s.title})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Content for B */}
            <div style={{ padding: "16px", overflowY: "auto", flex: 1 }}>
              {itemB?.type === "precedent" && (
                <PrecedentDetailView
                  precedent={itemB.data as LegalPrecedent}
                  highlight={searchHighlight}
                  renderHighlighted={renderHighlightedText}
                />
              )}
              {itemB?.type === "statute" && (
                <StatuteDetailView
                  statute={itemB.data as LegalStatute}
                  highlight={searchHighlight}
                  renderHighlighted={renderHighlightedText}
                />
              )}
              {!itemB && (
                <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 20px" }}>
                  Veldu réttarheimild í fellilistanum hér að ofan.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: "12px 20px",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
            💡 Hægt er að bera saman tvö dómafordæmi, tvö lagaákvæði, eða dómafordæmi og lagagreinina sem reynir á.
          </div>
          <button
            id="compare-modal-footer-close-btn"
            onClick={onClose}
            style={{
              padding: "7px 18px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#ffffff",
              color: "#334155",
              fontSize: "0.85rem",
              fontWeight: 600,
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

// Sub-component for rendering a Precedent card in comparison
function PrecedentDetailView({
  precedent,
  highlight,
  renderHighlighted,
}: {
  precedent: LegalPrecedent;
  highlight: string;
  renderHighlighted: (content: string, query: string) => React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Title & metadata */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1d4ed8" }}>
            {renderHighlighted(precedent.case_reference, highlight)}
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              background: "#dbeafe",
              color: "#1e40af",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: 600,
            }}
          >
            {precedent.court} ({precedent.date})
          </span>
        </div>
        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>
          {renderHighlighted(precedent.parties, highlight)}
        </div>
      </div>

      {/* Statutory Basis Tags */}
      {precedent.statutory_basis && precedent.statutory_basis.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              marginBottom: "4px",
            }}
          >
            Tilgreind lagastoð:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {precedent.statutory_basis.map((basis, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: "0.75rem",
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: "1px solid #bfdbfe",
                  fontWeight: 500,
                }}
              >
                {renderHighlighted(basis, highlight)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary (Málavextir) */}
      <div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#475569",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            marginBottom: "4px",
          }}
        >
          Málavextir og ágreiningsefni:
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            lineHeight: 1.5,
            color: "#334155",
            whiteSpace: "pre-line",
          }}
        >
          {renderHighlighted(precedent.summary, highlight)}
        </p>
      </div>

      {/* Key Findings (Forsendur og niðurstaða) */}
      <div
        style={{
          padding: "12px",
          borderRadius: "6px",
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderLeft: "4px solid #16a34a",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#15803d",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            marginBottom: "4px",
          }}
        >
          Forsendur og niðurstaða dóms:
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "0.85rem",
            lineHeight: 1.5,
            color: "#166534",
            fontWeight: 500,
            whiteSpace: "pre-line",
          }}
        >
          {renderHighlighted(precedent.key_findings, highlight)}
        </p>
      </div>
    </div>
  );
}

// Sub-component for rendering a Statute card in comparison
function StatuteDetailView({
  statute,
  highlight,
  renderHighlighted,
}: {
  statute: LegalStatute;
  highlight: string;
  renderHighlighted: (content: string, query: string) => React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Title & Act */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "#15803d" }}>
            {renderHighlighted(statute.article, highlight)} ({renderHighlighted(statute.title, highlight)})
          </span>
        </div>
        <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#1e293b" }}>
          {renderHighlighted(statute.act_name, highlight)} nr. {renderHighlighted(statute.act_number, highlight)}
        </div>
      </div>

      {/* Keywords */}
      {statute.keywords && statute.keywords.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              marginBottom: "4px",
            }}
          >
            Efnisorð / Leitarlyklar:
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
            {statute.keywords.map((kw, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: "0.75rem",
                  backgroundColor: "#f0fdf4",
                  color: "#166534",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  border: "1px solid #bbf7d0",
                  fontWeight: 500,
                }}
              >
                {renderHighlighted(kw, highlight)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Statutory Text */}
      <div
        style={{
          padding: "14px",
          borderRadius: "6px",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderLeft: "4px solid #3b82f6",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "#1e40af",
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            marginBottom: "6px",
          }}
        >
          Lagatexti ákvæðis:
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "0.88rem",
            lineHeight: 1.6,
            color: "#1e293b",
            whiteSpace: "pre-line",
          }}
        >
          {renderHighlighted(statute.text, highlight)}
        </p>
      </div>
    </div>
  );
}
