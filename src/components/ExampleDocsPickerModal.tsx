"use client";

import React, { useState, useEffect } from "react";
import { CaseItem } from "@/lib/store";

export interface ExampleDocItem {
  id: string;
  filename: string;
  title: string;
  doc_type: string;
  author: string;
  filing_date: string;
  page_count: number;
  summary: string;
  tags: string[];
  content: string;
  file_size?: number;
}

interface ExampleDocsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCaseId: string | null;
  cases: CaseItem[];
  onSuccess: (targetCaseId: string, newCaseCreated?: boolean) => void;
}

export function ExampleDocsPickerModal({
  isOpen,
  onClose,
  currentCaseId,
  cases,
  onSuccess,
}: ExampleDocsPickerModalProps) {
  const [examples, setExamples] = useState<ExampleDocItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected example document IDs
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  // Previewing document
  const [previewDoc, setPreviewDoc] = useState<ExampleDocItem | null>(null);

  // Target mode: "current" | "existing" | "new"
  const [targetMode, setTargetMode] = useState<"current" | "existing" | "new">(
    currentCaseId ? "current" : "new"
  );
  const [selectedTargetCaseId, setSelectedTargetCaseId] = useState<string>(currentCaseId || "");
  const [newCaseTitle, setNewCaseTitle] = useState(
    "Húsfélagið Hlíðarvegi 42 gegn Byggingafélaginu Vörðu ehf."
  );
  const [newCaseDesc, setNewCaseDesc] = useState(
    "Dómsmál vegna riftunar verksamnings, verulegra galla á utanhússklæðningu, rakaskemmda og bótagreiðslu skv. dómkvaddri matsgerð."
  );

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchExamples();
      if (currentCaseId) {
        setSelectedTargetCaseId(currentCaseId);
        setTargetMode("current");
      } else {
        setTargetMode("new");
      }
    }
  }, [isOpen, currentCaseId]);

  const fetchExamples = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/examples");
      if (!res.ok) {
        throw new Error("Gat ekki sótt dæmaskjöl úr /examples");
      }
      const data: ExampleDocItem[] = await res.json();
      setExamples(data);
      // Default to selecting all example documents so user can insert complete case packet easily
      setSelectedDocIds(data.map((d) => d.id));
      if (data.length > 0) {
        setPreviewDoc(data[0]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Villa við að sækja dæmaskjöl");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === examples.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(examples.map((d) => d.id));
    }
  };

  const handleImport = async () => {
    if (selectedDocIds.length === 0) {
      alert("Vinsamlegast veldu að minnsta kosti eitt dæmaskjal.");
      return;
    }

    let finalCaseId = "";
    if (targetMode === "current") {
      if (!currentCaseId) {
        alert("Ekkert virkt mál er valið.");
        return;
      }
      finalCaseId = currentCaseId;
    } else if (targetMode === "existing") {
      if (!selectedTargetCaseId) {
        alert("Vinsamlegast veldu mál úr listanum.");
        return;
      }
      finalCaseId = selectedTargetCaseId;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        mode: targetMode === "new" ? "create_new_case" : "insert_to_case",
        caseId: finalCaseId,
        exampleIds: selectedDocIds,
        newCaseTitle: newCaseTitle.trim(),
        newCaseDescription: newCaseDesc.trim(),
        newCasePriority: "HIGH",
      };

      const res = await fetch("/api/v1/examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Mistókst að flytja inn dæmaskjöl");
      }

      const result = await res.json();
      setSuccessMsg(
        targetMode === "new"
          ? `Nýtt mál stofnað og ${result.insertedCount} dæmaskjölum bætt við!`
          : `${result.insertedCount} dæmaskjölum bætt inn í málið!`
      );

      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess(result.caseId, targetMode === "new");
        onClose();
      }, 900);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Villa kom upp við innflutning");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentCase = cases.find((c) => c.id === currentCaseId);

  return (
    <div
      id="example-docs-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
    >
      <div
        id="example-docs-modal"
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "1000px",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
          border: "1px solid #cbd5e1",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.3rem" }}>📁</span>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                Sækja dæmaskjöl í mál (/examples)
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: "#e0f2fe",
                  color: "#0369a1",
                  fontWeight: 600,
                  border: "1px solid #bae6fd",
                }}
              >
                Raunveruleg dóm- og lögfræðigögn
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Veldu tilbúin dæmaskjöl (Sérfræðiskýrsla, Samningur, Stefna, Tölvupóstar o.fl.) til að setja
              inn í núverandi mál eða stofna nýtt dæmamál.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.3rem",
              color: "#64748b",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Split view (Left: List + target config, Right: Preview) */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            overflow: "hidden",
            minHeight: "440px",
          }}
        >
          {/* Left Column: Target choice & Document selection */}
          <div
            style={{
              padding: "20px",
              overflowY: "auto",
              borderRight: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Destination Selection */}
            <div
              style={{
                background: "#f1f5f9",
                padding: "14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
              }}
            >
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155", textTransform: "uppercase" }}>
                Hvert viltu setja dæmaskjölin?
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
                {/* Option 1: Current Case */}
                {currentCase && (
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      fontSize: "0.84rem",
                      cursor: "pointer",
                      padding: "6px 8px",
                      borderRadius: "6px",
                      background: targetMode === "current" ? "#ffffff" : "transparent",
                      border: targetMode === "current" ? "1px solid #3b82f6" : "1px solid transparent",
                    }}
                  >
                    <input
                      type="radio"
                      name="targetMode"
                      checked={targetMode === "current"}
                      onChange={() => setTargetMode("current")}
                    />
                    <div>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        Núverandi valið mál:
                      </span>{" "}
                      <span style={{ color: "#2563eb" }}>{currentCase.title}</span>{" "}
                      <span style={{ fontSize: "0.74rem", color: "#64748b" }}>({currentCase.case_number})</span>
                    </div>
                  </label>
                )}

                {/* Option 2: Choose existing case */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: targetMode === "existing" ? "#ffffff" : "transparent",
                    border: targetMode === "existing" ? "1px solid #3b82f6" : "1px solid transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="targetMode"
                    checked={targetMode === "existing"}
                    onChange={() => setTargetMode("existing")}
                  />
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>Annað skráð mál:</span>
                  <select
                    disabled={targetMode !== "existing"}
                    value={selectedTargetCaseId}
                    onChange={(e) => setSelectedTargetCaseId(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "4px 8px",
                      fontSize: "0.8rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      background: targetMode === "existing" ? "#fff" : "#f8fafc",
                    }}
                  >
                    <option value="">-- Veldu mál úr málaskrá --</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.case_number} – {c.title}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Option 3: Create New Case */}
                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    background: targetMode === "new" ? "#ffffff" : "transparent",
                    border: targetMode === "new" ? "1px solid #3b82f6" : "1px solid transparent",
                  }}
                >
                  <input
                    type="radio"
                    name="targetMode"
                    checked={targetMode === "new"}
                    onChange={() => setTargetMode("new")}
                    style={{ marginTop: "4px" }}
                  />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      ✨ Stofna nýtt mál út frá dæmaskjölum
                    </span>
                    {targetMode === "new" && (
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        <input
                          type="text"
                          value={newCaseTitle}
                          onChange={(e) => setNewCaseTitle(e.target.value)}
                          placeholder="Titill nýs máls..."
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            fontSize: "0.82rem",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                          }}
                        />
                        <textarea
                          rows={2}
                          value={newCaseDesc}
                          onChange={(e) => setNewCaseDesc(e.target.value)}
                          placeholder="Lýsing máls..."
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            fontSize: "0.78rem",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </div>

            {/* Document Checkboxes Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                Tiltæk dæmaskjöl í /examples ({examples.length}):
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  background: "none",
                  border: "none",
                  color: "#2563eb",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {selectedDocIds.length === examples.length ? "Afvelja öll" : "Velja öll"}
              </button>
            </div>

            {/* Document list cards */}
            {loading ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#64748b" }}>
                Hleður dæmaskjölum...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {examples.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  const isCurrentPreview = previewDoc?.id === doc.id;

                  return (
                    <div
                      key={doc.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: isCurrentPreview ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                        background: isChecked ? "#f0f9ff" : "#ffffff",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleDoc(doc.id);
                        }}
                        style={{ marginTop: "4px", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>
                            {doc.title}
                          </span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background: "#e2e8f0",
                              color: "#475569",
                              fontWeight: 600,
                            }}
                          >
                            {doc.doc_type}
                          </span>
                        </div>
                        <p style={{ margin: "3px 0 0 0", fontSize: "0.74rem", color: "#64748b", lineHeight: 1.4 }}>
                          {doc.summary}
                        </p>
                        <div
                          style={{
                            marginTop: "6px",
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                            fontSize: "0.7rem",
                            color: "#94a3b8",
                          }}
                        >
                          <span>👤 {doc.author}</span>
                          <span>•</span>
                          <span>📄 {doc.page_count} bls.</span>
                          <span>•</span>
                          <span>📂 <code>/examples/{doc.filename}</code></span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Live Document Preview */}
          <div
            style={{
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              background: "#fafafa",
              overflow: "hidden",
            }}
          >
            {previewDoc ? (
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <div style={{ marginBottom: "12px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "#2563eb",
                        textTransform: "uppercase",
                      }}
                    >
                      Forskoðun skammtastærðar
                    </span>
                    <a
                      href={`/examples/${previewDoc.filename}`}
                      download={previewDoc.filename}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: "0.72rem",
                        color: "#0369a1",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      ⬇️ Sækja frumskjal ({previewDoc.filename})
                    </a>
                  </div>
                  <h4 style={{ margin: "4px 0 2px 0", fontSize: "0.95rem", color: "#0f172a" }}>
                    {previewDoc.title}
                  </h4>
                  <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    Tegund: <strong>{previewDoc.doc_type}</strong> • Höfundur: {previewDoc.author} • Dags: {previewDoc.filing_date}
                  </div>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: "auto",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "14px",
                    fontFamily: "monospace",
                    fontSize: "0.76rem",
                    whiteSpace: "pre-wrap",
                    color: "#1e293b",
                    lineHeight: 1.5,
                  }}
                >
                  {previewDoc.content}
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                }}
              >
                Veldu dæmaskjal til að forskoða innihald
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <div>
            {error && (
              <span style={{ fontSize: "0.82rem", color: "#ef4444", fontWeight: 600 }}>
                ⚠️ {error}
              </span>
            )}
            {successMsg && (
              <span style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 600 }}>
                ✓ {successMsg}
              </span>
            )}
            {!error && !successMsg && (
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                Valin dæmaskjöl: <strong>{selectedDocIds.length}</strong> af {examples.length}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#475569",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Loka
            </button>
            <button
              id="btn-confirm-import-examples"
              type="button"
              disabled={submitting || selectedDocIds.length === 0}
              onClick={handleImport}
              style={{
                padding: "8px 18px",
                borderRadius: "6px",
                border: "none",
                background: selectedDocIds.length > 0 ? "#2563eb" : "#94a3b8",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: selectedDocIds.length > 0 ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {submitting ? (
                "Flytur inn..."
              ) : (
                <>
                  <span>📥</span>
                  <span>
                    {targetMode === "new"
                      ? `Stofna mál og flytja inn (${selectedDocIds.length})`
                      : `Setja inn í mál (${selectedDocIds.length})`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
