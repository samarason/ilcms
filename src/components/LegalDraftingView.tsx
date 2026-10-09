"use client";

import React, { useState, useEffect } from "react";
import { CaseItem, DocumentItem } from "@/lib/store";
import { LegalStatute, LegalPrecedent, PRE_SEEDED_STATUTES, PRE_SEEDED_PRECEDENTS } from "@/lib/legal-knowledge";
import { LegalDraftResponse, LegalDocType } from "@/lib/legal-drafting";

interface LegalDraftingViewProps {
  activeCase: CaseItem;
  caseDocs: DocumentItem[];
  statutes?: LegalStatute[];
  precedents?: LegalPrecedent[];
  onDocumentSaved?: () => void;
  preSelectedStatuteIds?: string[];
  preSelectedPrecedentIds?: string[];
}

export function LegalDraftingView({
  activeCase,
  caseDocs,
  statutes = PRE_SEEDED_STATUTES,
  precedents = PRE_SEEDED_PRECEDENTS,
  onDocumentSaved,
  preSelectedStatuteIds = [],
  preSelectedPrecedentIds = [],
}: LegalDraftingViewProps) {
  // Pleading configuration
  const [docType, setDocType] = useState<LegalDocType>("stefna");
  const [courtName, setCourtName] = useState<string>("Héraðsdómur Reykjavíkur");
  const [claimAmount, setClaimAmount] = useState<string>(
    activeCase.id === "case-01"
      ? "kr. 48.500.000"
      : activeCase.id === "case-02"
      ? "kr. 21.400.000"
      : activeCase.id === "case-03"
      ? "kr. 14.200.000"
      : activeCase.id === "case-04"
      ? "kr. 35.800.000"
      : activeCase.id === "case-05"
      ? "kr. 18.600.000"
      : "kr. 10.000.000"
  );
  const [customClaims, setCustomClaims] = useState<string>("");
  const [lawyerNotes, setLawyerNotes] = useState<string>("");

  // Selection states
  const [selectedStatuteIds, setSelectedStatuteIds] = useState<string[]>(() => {
    if (preSelectedStatuteIds.length > 0) return preSelectedStatuteIds;
    // Default statutes based on case
    if (activeCase.id === "case-01") {
      return ["statute-fk-17", "statute-fk-27", "statute-em-80", "statute-em-130", "statute-vx-8-9"];
    }
    if (activeCase.id === "case-04") {
      return ["statute-em-80", "statute-em-97", "statute-em-130", "statute-vx-8-9"];
    }
    if (activeCase.id === "case-05") {
      return ["statute-em-80", "statute-em-102", "statute-em-130"];
    }
    return ["statute-em-80", "statute-em-130", "statute-vx-8-9"];
  });

  const [selectedPrecedentIds, setSelectedPrecedentIds] = useState<string[]>(() => {
    if (preSelectedPrecedentIds.length > 0) return preSelectedPrecedentIds;
    if (activeCase.id === "case-01") return ["prec-hrd-58-2020", "prec-hrd-412-2019"];
    if (activeCase.id === "case-03") return ["prec-hrd-120-2021"];
    return [];
  });

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => {
    return caseDocs.map((d) => d.id);
  });

  // Filters and accordion toggles
  const [statuteFilter, setStatuteFilter] = useState("");
  const [precedentFilter, setPrecedentFilter] = useState("");
  const [customStatuteText, setCustomStatuteText] = useState("");
  const [showCustomStatuteInput, setShowCustomStatuteInput] = useState(false);

  // Active custom statutes added by user
  const [customStatutesList, setCustomStatutesList] = useState<LegalStatute[]>([]);

  // Generation status and draft result
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStep, setGeneratingStep] = useState("");
  const [draftResult, setDraftResult] = useState<LegalDraftResponse | null>(null);
  const [editableContent, setEditableContent] = useState("");
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [isModalMaximized, setIsModalMaximized] = useState(false);

  // Save document state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Combine static and custom statutes
  const allStatutes = [...statutes, ...customStatutesList];

  // Sync selected documents when active case changes
  useEffect(() => {
    setSelectedDocIds(caseDocs.map((d) => d.id));
  }, [caseDocs, activeCase.id]);

  // Adjust defaults when changing doc type
  const handleDocTypeChange = (newType: LegalDocType) => {
    setDocType(newType);
    if (newType === "stefna") {
      if (!selectedStatuteIds.includes("statute-em-80")) {
        setSelectedStatuteIds((prev) => [...prev, "statute-em-80"]);
      }
    } else {
      if (!selectedStatuteIds.includes("statute-em-97")) {
        setSelectedStatuteIds((prev) => [...prev, "statute-em-97"]);
      }
    }
  };

  const handleToggleStatute = (id: string) => {
    setSelectedStatuteIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleTogglePrecedent = (id: string) => {
    setSelectedPrecedentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddCustomStatute = () => {
    if (!customStatuteText.trim()) return;
    const newStatute: LegalStatute = {
      id: "statute-custom-" + Date.now(),
      act_name: "Lögfræðilegt ákvæði",
      act_number: "Sérákvæði",
      article: "Sérákvæði",
      title: "Handvirkt skráð lagaákvæði",
      text: customStatuteText.trim(),
      keywords: ["sérákvæði"],
    };
    setCustomStatutesList((prev) => [newStatute, ...prev]);
    setSelectedStatuteIds((prev) => [newStatute.id, ...prev]);
    setCustomStatuteText("");
    setShowCustomStatuteInput(false);
  };

  // Generate Draft Action
  const handleGenerateDraft = async () => {
    setIsGenerating(true);
    setSaveSuccessMsg(null);
    setGeneratingStep("Greinir valin lagaákvæði og málsskjöl...");

    try {
      const stepTimer1 = setTimeout(() => {
        setGeneratingStep("Fléttar saman málsatvik og réttarheimildir...");
      }, 700);

      const stepTimer2 = setTimeout(() => {
        setGeneratingStep("Gervigreind mótar formfast dómstólaskjal...");
      }, 1400);

      const res = await fetch("/api/v1/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case_id: activeCase.id,
          doc_type: docType,
          selected_statute_ids: selectedStatuteIds,
          selected_precedent_ids: selectedPrecedentIds,
          selected_doc_ids: selectedDocIds,
          court_name: courtName,
          claim_amount: claimAmount,
          custom_claims: customClaims,
          lawyer_notes: lawyerNotes,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (!res.ok) {
        throw new Error(`Villa í beiðni: ${res.statusText}`);
      }

      const data: LegalDraftResponse = await res.json();
      setDraftResult(data);
      setEditableContent(data.content);
      setViewMode("preview");
      setShowDraftModal(true);
    } catch (err: any) {
      console.error("Villa við skjalagerð:", err);
      alert("Ekki tókst að mynda drög: " + (err.message || err));
    } finally {
      setIsGenerating(false);
      setGeneratingStep("");
    }
  };

  // Save generated draft as a real document in the case
  const handleSaveAsDocument = async () => {
    if (!draftResult) return;
    setIsSaving(true);
    setSaveSuccessMsg(null);

    try {
      const title =
        docType === "stefna"
          ? `Stefna í máli ${activeCase.case_number}`
          : `Greinargerð í máli ${activeCase.case_number}`;

      const res = await fetch(`/api/v1/cases/${activeCase.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: editableContent || draftResult.content,
          doc_type: docType === "stefna" ? "Stefna" : "Greinargerð",
          author: "Lögmaður (Sjálfvirk skjalagerð)",
          summary: draftResult.summary,
          change_summary: `Sjálfvirk drög að ${docType} vistuð í málaskrá.`,
        }),
      });

      if (!res.ok) {
        throw new Error("Ekki tókst að vista málsskjal.");
      }

      setSaveSuccessMsg(`Skjalið „${title}“ hefur verið vistað í dómaskjalaskrá málsins!`);
      if (onDocumentSaved) {
        onDocumentSaved();
      }
    } catch (err: any) {
      alert("Villa við vistun: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = editableContent || draftResult?.content || "";
    if (textToCopy && navigator?.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handlePrint = () => {
    const text = editableContent || draftResult?.content || "";
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${draftResult?.title || "Dómstólaskjal"}</title>
            <style>
              body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; margin: 40px; color: #000; }
              pre { white-space: pre-wrap; font-family: inherit; font-size: 11pt; }
            </style>
          </head>
          <body>
            <pre>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
            <script>window.print();</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const filteredStatutes = allStatutes.filter((s) => {
    if (!statuteFilter) return true;
    const q = statuteFilter.toLowerCase();
    return (
      s.act_name.toLowerCase().includes(q) ||
      s.article.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.text.toLowerCase().includes(q)
    );
  });

  const filteredPrecedents = precedents.filter((p) => {
    if (!precedentFilter) return true;
    const q = precedentFilter.toLowerCase();
    return (
      p.case_reference.toLowerCase().includes(q) ||
      p.parties.toLowerCase().includes(q) ||
      p.summary.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
          color: "#ffffff",
          padding: "20px 24px",
          borderRadius: "8px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "1.4rem" }}>✍️</span>
              <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
                Sjálfvirk skjalagerð (Mynda drög)
              </h2>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                Gervigreind & Lögfræðivél
              </span>
            </div>
            <p style={{ margin: 0, fontSize: "0.86rem", color: "#e0e7ff", maxWidth: "800px", lineHeight: 1.5 }}>
              Semdu formlega réttarfarsskjöl fyrir dómstóla með því að nýta valin lagaákvæði, dómafordæmi og
              staðbundin gögn úr málinu sem inntak fyrir gervigreindina.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              padding: "10px 14px",
              borderRadius: "6px",
              fontSize: "0.82rem",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}
          >
            <div style={{ color: "#c7d2fe", fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 700 }}>
              Virkt mál
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", marginTop: "2px" }}>
              {activeCase.case_number}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#e0e7ff" }}>
              {activeCase.title}
            </div>
          </div>
        </div>
      </div>

      {/* Main Drafting Workspace */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Configuration & Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Step 1: Document Type & Court Details */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "18px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <h3 style={{ margin: "0 0 14px 0", fontSize: "0.95rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ background: "#2563eb", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                1
              </span>
              Tegund dómstólaskjals og dómstóll
            </h3>

            {/* Doc Type Selector Radio Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <button
                type="button"
                id="btn-select-stefna"
                onClick={() => handleDocTypeChange("stefna")}
                style={{
                  padding: "12px 14px",
                  borderRadius: "6px",
                  border: docType === "stefna" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: docType === "stefna" ? "#eff6ff" : "#ffffff",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.92rem", color: docType === "stefna" ? "#1d4ed8" : "#1e293b" }}>
                    ⚖️ Stefna (Summons)
                  </span>
                  {docType === "stefna" && (
                    <span style={{ background: "#2563eb", color: "#fff", borderRadius: "50%", width: "16px", height: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>
                      ✓
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  Málshöfðun stefnanda, dómkröfur, málsatvik og vextir skv. 80. gr. eml.
                </div>
              </button>

              <button
                type="button"
                id="btn-select-greinargerd"
                onClick={() => handleDocTypeChange("greinargerð")}
                style={{
                  padding: "12px 14px",
                  borderRadius: "6px",
                  border: docType === "greinargerð" ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: docType === "greinargerð" ? "#eff6ff" : "#ffffff",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.92rem", color: docType === "greinargerð" ? "#1d4ed8" : "#1e293b" }}>
                    🛡️ Greinargerð (Defense)
                  </span>
                  {docType === "greinargerð" && (
                    <span style={{ background: "#2563eb", color: "#fff", borderRadius: "50%", width: "16px", height: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem" }}>
                      ✓
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                  Varnir stefnda, sýknu- og frávísunarkröfur skv. 97. gr. eml.
                </div>
              </button>
            </div>

            {/* Court name and claim amount */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Dómstóll
                </label>
                <select
                  value={courtName}
                  onChange={(e) => setCourtName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    background: "#fff",
                  }}
                >
                  <option value="Héraðsdómur Reykjavíkur">Héraðsdómur Reykjavíkur</option>
                  <option value="Héraðsdómur Reykjaness">Héraðsdómur Reykjaness</option>
                  <option value="Héraðsdómur Vesturlands">Héraðsdómur Vesturlands</option>
                  <option value="Héraðsdómur Norðurlands eystra">Héraðsdómur Norðurlands eystra</option>
                  <option value="Héraðsdómur Suðurlands">Héraðsdómur Suðurlands</option>
                  <option value="Landsréttur">Landsréttur (Áfrýjun)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                  Fjárhæðarkrafa (Aðalkrafa)
                </label>
                <input
                  type="text"
                  value={claimAmount}
                  onChange={(e) => setClaimAmount(e.target.value)}
                  placeholder="t.d. kr. 48.500.000"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Step 2: Valin lagaákvæði (Selected Legal Provisions) */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "18px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "#2563eb", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                  2
                </span>
                Valin lagaákvæði ({selectedStatuteIds.length} valin)
              </h3>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedStatuteIds(allStatutes.map((s) => s.id))}
                  style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: "0.74rem", cursor: "pointer", fontWeight: 600 }}
                >
                  Velja öll
                </button>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <button
                  type="button"
                  onClick={() => setSelectedStatuteIds([])}
                  style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.74rem", cursor: "pointer" }}
                >
                  Hreinsa
                </button>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <button
                  type="button"
                  onClick={() => setShowCustomStatuteInput(!showCustomStatuteInput)}
                  style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "2px 8px", color: "#334155", fontSize: "0.74rem", cursor: "pointer", fontWeight: 600 }}
                >
                  + Bæta við ákvæði
                </button>
              </div>
            </div>

            {/* Custom Statute Input Form */}
            {showCustomStatuteInput && (
              <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "12px", marginBottom: "12px" }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Bæta við sérstöku lagaákvæði í inntak:
                </div>
                <textarea
                  rows={2}
                  value={customStatuteText}
                  onChange={(e) => setCustomStatuteText(e.target.value)}
                  placeholder="t.d. 1. mgr. 24. gr. laga nr. 91/1991 um almennt varnarþing eða 36. gr. samningalaga..."
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.82rem", boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={() => setShowCustomStatuteInput(false)}
                    style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.76rem", cursor: "pointer" }}
                  >
                    Hætta við
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCustomStatute}
                    style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 10px", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer" }}
                  >
                    Bæta við í valin ákvæði
                  </button>
                </div>
              </div>
            )}

            {/* Filter Search */}
            <input
              type="text"
              placeholder="Sía lagaákvæði (t.d. 80. gr., málskostnaður, galli, vextir)..."
              value={statuteFilter}
              onChange={(e) => setStatuteFilter(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: "4px",
                border: "1px solid #e2e8f0",
                fontSize: "0.8rem",
                marginBottom: "10px",
                boxSizing: "border-box",
              }}
            />

            {/* Statutes Checklist */}
            <div
              id="drafting-statutes-tree"
              className="scrollable-tree"
              style={{ maxHeight: "240px", overflowY: "auto", overflowX: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" }}
            >
              {filteredStatutes.map((s) => {
                const isSelected = selectedStatuteIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: isSelected ? "#f0fdf4" : "#f8fafc",
                      border: isSelected ? "1px solid #86efac" : "1px solid #f1f5f9",
                      cursor: "pointer",
                      transition: "all 0.1s ease",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleStatute(s.id)}
                      style={{ marginTop: "3px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.84rem", color: isSelected ? "#166534" : "#1e293b" }}>
                          {s.article} ({s.act_name})
                        </span>
                        <span style={{ fontSize: "0.72rem", color: isSelected ? "#15803d" : "#64748b" }}>
                          nr. {s.act_number}
                        </span>
                        <span style={{ fontSize: "0.72rem", background: isSelected ? "#dcfce7" : "#e2e8f0", color: isSelected ? "#166534" : "#475569", padding: "1px 6px", borderRadius: "3px", fontWeight: 600 }}>
                          {s.title}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.76rem", color: isSelected ? "#15803d" : "#64748b", marginTop: "2px", lineHeight: 1.35 }}>
                        {s.text.length > 140 ? s.text.slice(0, 140) + "..." : s.text}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Step 3: Staðbundin gögn úr málinu (Local Case Documents) */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "18px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "#2563eb", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                  3
                </span>
                Staðbundin málsskjöl ({selectedDocIds.length}/{caseDocs.length} valin)
              </h3>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedDocIds(caseDocs.map((d) => d.id))}
                  style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: "0.74rem", cursor: "pointer", fontWeight: 600 }}
                >
                  Velja öll
                </button>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <button
                  type="button"
                  onClick={() => setSelectedDocIds([])}
                  style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.74rem", cursor: "pointer" }}
                >
                  Hreinsa
                </button>
              </div>
            </div>

            <p style={{ margin: "0 0 10px 0", fontSize: "0.78rem", color: "#64748b" }}>
              Gervigreindin mun nota valin skjöl sem beint inntak til að draga upp málsatvik og raða upp sönnunargagnaskrá (IV. SÖNNUNARGÖGN):
            </p>

            <div
              id="drafting-case-docs-tree"
              className="scrollable-tree"
              style={{ maxHeight: "200px", overflowY: "auto", overflowX: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" }}
            >
              {caseDocs.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>
                  Engin málsskjöl hafa verið skráð í þetta mál ennþá.
                </div>
              ) : (
                caseDocs.map((d, idx) => {
                  const isSelected = selectedDocIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        background: isSelected ? "#eff6ff" : "#f8fafc",
                        border: isSelected ? "1px solid #bfdbfe" : "1px solid #f1f5f9",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleDoc(d.id)}
                        style={{ marginTop: "3px" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 600, fontSize: "0.82rem", color: isSelected ? "#1e40af" : "#1e293b" }}>
                            {idx + 1}. {d.title}
                          </span>
                          <span style={{ fontSize: "0.7rem", background: "#dbeafe", color: "#1e40af", padding: "1px 5px", borderRadius: "3px" }}>
                            {d.doc_type}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            ({d.page_count} bls.)
                          </span>
                        </div>
                        {d.summary && (
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                            {d.summary.length > 100 ? d.summary.slice(0, 100) + "..." : d.summary}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Step 4: Valin dómafordæmi (Court Precedents) */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "18px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ background: "#2563eb", color: "#fff", width: "22px", height: "22px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                  4
                </span>
                Valin dómafordæmi ({selectedPrecedentIds.length} valin)
              </h3>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => setSelectedPrecedentIds(precedents.map((p) => p.id))}
                  style={{ background: "transparent", border: "none", color: "#2563eb", fontSize: "0.74rem", cursor: "pointer", fontWeight: 600 }}
                >
                  Velja öll
                </button>
                <span style={{ color: "#cbd5e1" }}>|</span>
                <button
                  type="button"
                  onClick={() => setSelectedPrecedentIds([])}
                  style={{ background: "transparent", border: "none", color: "#64748b", fontSize: "0.74rem", cursor: "pointer" }}
                >
                  Hreinsa
                </button>
              </div>
            </div>

            <div
              id="drafting-precedents-tree"
              className="scrollable-tree"
              style={{ maxHeight: "200px", overflowY: "auto", overflowX: "auto", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "4px" }}
            >
              {filteredPrecedents.map((p) => {
                const isSelected = selectedPrecedentIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      background: isSelected ? "#eff6ff" : "#f8fafc",
                      border: isSelected ? "1px solid #bfdbfe" : "1px solid #f1f5f9",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleTogglePrecedent(p.id)}
                      style={{ marginTop: "3px" }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: isSelected ? "#1d4ed8" : "#1e293b" }}>
                          {p.case_reference}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "#64748b" }}>
                          {p.court} ({p.date})
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 500 }}>
                          {p.parties}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: isSelected ? "#1e40af" : "#64748b", marginTop: "2px" }}>
                        {p.key_findings.length > 110 ? p.key_findings.slice(0, 110) + "..." : p.key_findings}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Optional: Tactical lawyer notes */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "18px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
              Áherslur og sérstakar leiðbeiningar lögmanns (valfrjálst)
            </label>
            <textarea
              rows={2}
              value={lawyerNotes}
              onChange={(e) => setLawyerNotes(e.target.value)}
              placeholder="t.d. Leggja sérstaka áherslu á að aðfinnslur voru sendar innan 14 daga og krefjast dráttarvaxta frá gjalddaga reiknings..."
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                fontSize: "0.82rem",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            id="btn-trigger-generate-draft"
            onClick={handleGenerateDraft}
            disabled={isGenerating}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: isGenerating ? "#93c5fd" : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              padding: "14px 20px",
              borderRadius: "8px",
              border: "none",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: isGenerating ? "not-allowed" : "pointer",
              boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.3)",
              transition: "all 0.15s ease",
            }}
          >
            {isGenerating ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>{generatingStep || "Gervigreind myndar drög..."}</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span>
                  Mynda drög að {docType === "stefna" ? "stefnu" : "greinargerð"}
                </span>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  {selectedStatuteIds.length} lög • {selectedDocIds.length} gögn
                </span>
              </>
            )}
          </button>

          {/* Quick Launcher Card if draft has already been generated */}
          {draftResult && (
            <div
              id="draft-ready-banner"
              style={{
                background: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "8px",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                flexWrap: "wrap",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.3rem" }}>🪟</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#166534" }}>
                    Drög tilbúin: {draftResult.title}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#4b5563" }}>
                    {draftResult.court_name} • {draftResult.stats.word_count} orð • Smelltu til að skoða í sjálfstæðum glugga
                  </div>
                </div>
              </div>
              <button
                type="button"
                id="btn-reopen-draft-window"
                onClick={() => setShowDraftModal(true)}
                style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 4px rgba(22,163,74,0.3)",
                }}
              >
                <span>🪟</span>
                <span>Opna í sjálfstæðum glugga</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DEDICATED INTERFACE WINDOW (SJÁLFSTÆÐUR GLUGGI) MODAL */}
      {showDraftModal && draftResult && (
        <div
          id="drafting-dedicated-window-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6, 10, 20, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: isModalMaximized ? "0" : "16px",
            overflow: "hidden",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDraftModal(false);
          }}
        >
          <div
            id="drafting-dedicated-window-container"
            style={{
              width: isModalMaximized ? "100vw" : "96vw",
              maxWidth: isModalMaximized ? "100%" : "1350px",
              height: isModalMaximized ? "100vh" : "92vh",
              background: "#090d16",
              border: isModalMaximized ? "none" : "1px solid #2563eb",
              borderRadius: isModalMaximized ? "0" : "12px",
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
                background: "#0a192f",
                borderBottom: "1px solid #1e3a8a",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                    boxShadow: "0 2px 10px rgba(37, 99, 235, 0.35)",
                  }}
                >
                  {draftResult.doc_type === "stefna" ? "⚖️" : "🛡️"}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc" }}>
                      Sjálfstæður Gluggi: {draftResult.title}
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
                      Sjálfstæður Gluggi
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontWeight: 600,
                        background:
                          draftResult.inference_source === "ollama_airgap"
                            ? "#172554"
                            : "#2e1065",
                        color:
                          draftResult.inference_source === "ollama_airgap"
                            ? "#93c5fd"
                            : "#d8b4fe",
                        border:
                          draftResult.inference_source === "ollama_airgap"
                            ? "1px solid #1d4ed8"
                            : "1px solid #7c3aed",
                      }}
                    >
                      {draftResult.inference_source === "ollama_airgap"
                        ? "🔵 Ollama Local Airgap"
                        : "🟣 Íslensk réttarfarsvél"}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        fontWeight: 600,
                        background: "#064e3b",
                        color: "#6ee7b7",
                        border: "1px solid #059669",
                      }}
                    >
                      🛡️ 100% Air-Gapped
                    </span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "2px" }}>
                    {activeCase.case_number} • {activeCase.title} • {draftResult.court_name} • {draftResult.stats.word_count} orð • {draftResult.stats.statutes_count} lagaákvæði • {draftResult.stats.documents_count} sönnunargögn
                  </div>
                </div>
              </div>

              {/* Header Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalMaximized(!isModalMaximized)}
                  title={isModalMaximized ? "Minnka glugga" : "Hámarka glugga"}
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
                  {isModalMaximized ? "🗗" : "🗖"}
                </button>
                <button
                  type="button"
                  id="btn-close-draft-window-modal"
                  onClick={() => setShowDraftModal(false)}
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

            {/* Sub-Toolbar: Mode switcher & Actions */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 20px",
                background: "#0f172a",
                borderBottom: "1px solid #1e293b",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", gap: "6px", background: "#1e293b", padding: "3px", borderRadius: "6px" }}>
                <button
                  type="button"
                  onClick={() => setViewMode("preview")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "4px",
                    border: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: viewMode === "preview" ? "#2563eb" : "transparent",
                    color: viewMode === "preview" ? "#ffffff" : "#94a3b8",
                    boxShadow: viewMode === "preview" ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
                  }}
                >
                  📜 Forskoðun
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("edit")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "4px",
                    border: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    background: viewMode === "edit" ? "#2563eb" : "transparent",
                    color: viewMode === "edit" ? "#ffffff" : "#94a3b8",
                    boxShadow: viewMode === "edit" ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
                  }}
                >
                  ✏️ Breyta texta
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: copySuccess ? "#065f46" : "#1e293b",
                    color: copySuccess ? "#6ee7b7" : "#cbd5e1",
                    border: "1px solid #334155",
                    borderRadius: "5px",
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span>{copySuccess ? "✓" : "📋"}</span>
                  <span>{copySuccess ? "Afritað!" : "Afrita"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#1e293b",
                    color: "#cbd5e1",
                    border: "1px solid #334155",
                    borderRadius: "5px",
                    padding: "6px 12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <span>🖨️</span>
                  <span>Prenta / PDF</span>
                </button>

                <button
                  type="button"
                  id="btn-save-draft-document-window"
                  onClick={handleSaveAsDocument}
                  disabled={isSaving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "5px",
                    padding: "6px 14px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                  }}
                >
                  <span>{isSaving ? "⏳" : "💾"}</span>
                  <span>{isSaving ? "Vistar..." : "Vista sem málsskjal"}</span>
                </button>
              </div>
            </div>

            {/* Save Notice */}
            {saveSuccessMsg && (
              <div
                style={{
                  margin: "8px 20px 0 20px",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  background: "#064e3b",
                  border: "1px solid #059669",
                  color: "#6ee7b7",
                  fontSize: "0.82rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>✓</span>
                <span>{saveSuccessMsg}</span>
              </div>
            )}

            {/* Window Content Body */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "20px",
                background: "#030712",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              {viewMode === "preview" ? (
                <div
                  style={{
                    background: "#ffffff",
                    color: "#0f172a",
                    maxWidth: "880px",
                    width: "100%",
                    margin: "0 auto",
                    padding: "48px 56px",
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: "0.95rem",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    boxSizing: "border-box",
                  }}
                >
                  {editableContent || draftResult.content}
                </div>
              ) : (
                <textarea
                  rows={28}
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  style={{
                    width: "100%",
                    maxWidth: "960px",
                    margin: "0 auto",
                    flex: 1,
                    background: "#0f172a",
                    color: "#f8fafc",
                    fontFamily: "Consolas, 'Courier New', monospace",
                    fontSize: "0.88rem",
                    lineHeight: 1.7,
                    padding: "20px",
                    borderRadius: "8px",
                    border: "1px solid #334155",
                    boxSizing: "border-box",
                    resize: "none",
                  }}
                />
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 20px",
                background: "#090d16",
                borderTop: "1px solid #1e293b",
                fontSize: "0.78rem",
                color: "#94a3b8",
              }}
            >
              <div>
                💡 Sjálfstæður gluggi fyrir réttarfarsskjalagerð í ILCMS.
              </div>
              <button
                type="button"
                onClick={() => setShowDraftModal(false)}
                style={{
                  background: "#1e293b",
                  color: "#cbd5e1",
                  border: "1px solid #334155",
                  padding: "6px 14px",
                  borderRadius: "5px",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Loka glugga
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
