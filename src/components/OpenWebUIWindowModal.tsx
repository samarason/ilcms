"use client";

import React, { useState } from "react";
import { CaseItem, DocumentItem } from "@/lib/store";
import { OpenWebUIView } from "@/components/OpenWebUIView";

interface OpenWebUIWindowModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase?: CaseItem;
  caseDocs?: DocumentItem[];
  onSaveToCaseDocs?: (title: string, content: string, docType: string) => void;
}

export function OpenWebUIWindowModal({
  isOpen,
  onClose,
  activeCase,
  caseDocs = [],
  onSaveToCaseDocs,
}: OpenWebUIWindowModalProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      id="open-webui-modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 10, 20, 0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
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
        id="open-webui-modal-container"
        style={{
          width: isMaximized ? "100vw" : "96vw",
          maxWidth: isMaximized ? "100%" : "1350px",
          height: isMaximized ? "100vh" : "92vh",
          background: "#090d16",
          border: isMaximized ? "none" : "1px solid #065f46",
          borderRadius: isMaximized ? "0" : "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#f8fafc",
        }}
      >
        {/* Header Bar - styled consistently with AdminConsoleModal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            background: "#0a1914",
            borderBottom: "1px solid #065f46",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #059669, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)",
              }}
            >
              💬
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc" }}>
                  AI - Lögfræðiviðmót
                </h2>
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
                  Staðbundið Lögfræðiviðmót
                </span>
                <span
                  style={{
                    background: "#1e293b",
                    color: "#38bdf8",
                    border: "1px solid #0284c7",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                  }}
                >
                  Port 3000 Gátt
                </span>
                <span
                  style={{
                    background: "#1e293b",
                    color: "#4ade80",
                    border: "1px solid #22c55e",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                  }}
                >
                  100% Einangrað (Air-Gapped)
                </span>
              </div>
              <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "2px" }}>
                {activeCase
                  ? `Virkt mál í greiningu: ${activeCase.title} (${activeCase.case_number}) • Tengt við staðbundið Ollama mál- og vigralíkan án gagnaútflæðis`
                  : "Staðbundið Ollama mál- og vigralíkan án gagnaútflæðis • Vafraviðmót fyrir lögfræðinga"}
              </div>
            </div>
          </div>

          {/* Modal Header Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              id="btn-close-open-webui-modal"
              onClick={onClose}
              title="Loka viðmóti"
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

        {/* Modal Body */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <OpenWebUIView
            activeCase={activeCase}
            caseDocs={caseDocs}
            onSaveToCaseDocs={onSaveToCaseDocs}
          />
        </div>
      </div>
    </div>
  );
}
