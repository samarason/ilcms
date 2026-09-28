"use client";

import React, { useState, useEffect } from "react";
import { CaseItem, DocumentItem } from "@/lib/store";
import { OpenWebUIView } from "@/components/OpenWebUIView";

export default function OpenWebUIStandalonePage() {
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/cases")
      .then((res) => res.json())
      .then((data: CaseItem[]) => {
        setCases(data);
        if (data.length > 0) {
          setSelectedCaseId(data[0].id);
        }
      })
      .catch((err) => console.error("Error loading cases for Open WebUI window:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedCaseId) {
      setDocs([]);
      return;
    }
    fetch(`/api/v1/cases/${selectedCaseId}/documents`)
      .then((res) => res.json())
      .then((data: DocumentItem[]) => setDocs(data))
      .catch((err) => console.error("Error loading case docs for Open WebUI window:", err));
  }, [selectedCaseId]);

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  const handleSaveToCaseDocs = async (title: string, content: string, docType: string) => {
    if (!selectedCaseId) return;
    try {
      await fetch(`/api/v1/cases/${selectedCaseId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          doc_type: docType,
          content,
          author: "Guðrún Sigurðardóttir hrl.",
        }),
      });
      // Refresh docs
      const res = await fetch(`/api/v1/cases/${selectedCaseId}/documents`);
      const updatedDocs = await res.json();
      setDocs(updatedDocs);
    } catch (err) {
      console.error("Failed to save doc from Open WebUI window:", err);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        backgroundColor: "#0f172a",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* Top Bar for Standalone Window */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 18px",
          background: "#064e3b",
          borderBottom: "1px solid #047857",
          color: "#ffffff",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
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
              <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#f8fafc" }}>
                AI - Lögfræðiviðmót
              </h1>
              <span
                style={{
                  background: "#047857",
                  color: "#a7f3d0",
                  border: "1px solid #10b981",
                  padding: "1px 8px",
                  borderRadius: "10px",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                }}
              >
                Sjálfstæður Gluggi (Port 3000)
              </span>
            </div>
          </div>
        </div>

        {/* Case Selector and Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem" }}>
            <span style={{ color: "#a7f3d0" }}>Virkt mál:</span>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              style={{
                background: "#065f46",
                color: "#f8fafc",
                border: "1px solid #10b981",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "0.78rem",
                cursor: "pointer",
                maxWidth: "320px",
              }}
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.case_number} — {c.title}
                </option>
              ))}
            </select>
          </div>

          <a
            href="/"
            style={{
              color: "#e2e8f0",
              background: "#1e293b",
              border: "1px solid #475569",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "0.76rem",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>⬅</span>
            <span>Aftur í ILCMS</span>
          </a>
        </div>
      </header>

      {/* Main Open WebUI Area */}
      <main style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {loading ? (
          <div style={{ padding: "40px", color: "#94a3b8", textAlign: "center" }}>
            Hleð Open WebUI lögfræðiviðmóti...
          </div>
        ) : (
          <OpenWebUIView
            activeCase={activeCase}
            caseDocs={docs}
            onSaveToCaseDocs={handleSaveToCaseDocs}
          />
        )}
      </main>
    </div>
  );
}
