"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";

export default function Dashboard() {
  const auth = useAuth() as any;
  const token = auth?.token;
  const user = auth?.user;
  const handleLogout = () => {
    if (typeof auth?.logout === "function") auth.logout();
    else window.location.href = "/";
  };

  const [cases, setCases] = useState<any[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [docs, setDocs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewCase, setShowNewCase] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [showInfraModal, setShowInfraModal] = useState(false);

  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      sender: "ai",
      text: "Góðan dag. Ég er staðbundinn lögfræðiaðstoðarmaður (Air-Gapped). Ég get greint og svarað spurningum út frá málsskjölum með beinum tilvísunum.",
      inference_source: "local_airgap_cache",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [askingAi, setAskingAi] = useState(false);

  // New states for Statutory Deadline Engine, Court Bundle, and Precedents
  const [activeTab, setActiveTab] = useState<"docs" | "deadlines" | "bundle" | "law">("docs");
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [serviceDate, setServiceDate] = useState("2026-09-08");
  const [defendantLocation, setDefendantLocation] = useState<"same_district" | "other_district" | "europe" | "outside_europe">("other_district");
  const [grantDefenseWeeks, setGrantDefenseWeeks] = useState(3);
  const [courtName, setCourtName] = useState("Héraðsdómur Reykjavíkur");
  const [calcResult, setCalcResult] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);
  const [savingDeadlines, setSavingDeadlines] = useState(false);

  const [courtBundle, setCourtBundle] = useState<any>(null);
  const [bundleText, setBundleText] = useState("");
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [statutes, setStatutes] = useState<any[]>([]);
  const [precedents, setPrecedents] = useState<any[]>([]);
  const [lawSearchQuery, setLawSearchQuery] = useState("");

  const fetchDeadlines = async (cid: string) => {
    if (!cid) return;
    try {
      const res = await fetch(`/api/v1/deadlines?case_id=${cid}`);
      if (res.ok) {
        setDeadlines(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCourtBundle = async (cid: string) => {
    if (!cid) return;
    setLoadingBundle(true);
    try {
      const res = await fetch(`/api/v1/court-bundle?case_id=${cid}`);
      if (res.ok) {
        const data = await res.json();
        setCourtBundle(data.bundle);
        setBundleText(data.formattedText);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingBundle(false);
  };

  const fetchPrecedents = async (q?: string) => {
    try {
      const url = q ? `/api/v1/precedents?q=${encodeURIComponent(q)}` : "/api/v1/precedents";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setStatutes(data.statutes || []);
        setPrecedents(data.precedents || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCalculateDeadlines = async () => {
    setCalculating(true);
    try {
      const res = await fetch("/api/v1/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate",
          calculation_input: {
            serviceDate,
            defendantLocation,
            courtName,
            grantDefenseWeeks: Number(grantDefenseWeeks),
          },
        }),
      });
      if (res.ok) {
        setCalcResult(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setCalculating(false);
  };

  const handleSaveDeadlinesToCase = async () => {
    if (!selectedCaseId || !calcResult?.deadlines) return;
    setSavingDeadlines(true);
    try {
      const res = await fetch("/api/v1/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_to_case",
          case_id: selectedCaseId,
          deadlines: calcResult.deadlines,
        }),
      });
      if (res.ok) {
        fetchDeadlines(selectedCaseId);
      }
    } catch (e) {
      console.error(e);
    }
    setSavingDeadlines(false);
  };

  const handleDownloadDomaskjalaskra = () => {
    if (!selectedCaseId) return;
    window.location.href = `/api/v1/court-bundle?case_id=${selectedCaseId}&format=text`;
  };

  const handleCopyBundleText = () => {
    if (bundleText) {
      navigator.clipboard.writeText(bundleText);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleAskAboutPrecedent = (topic: string) => {
    setChatInput(`Gætirðu útskýrt hvernig ${topic} tengist málinu okkar og hvaða kröfur leiðir af því?`);
  };

  const fetchCases = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/v1/cases", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
        if (data.length > 0 && !selectedCaseId) setSelectedCaseId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocs = async (cid: string) => {
    if (!token || !cid) return;
    try {
      const res = await fetch(`/api/v1/cases/${cid}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDocs(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSystemStatus = async () => {
    try {
      const res = await fetch("/api/v1/system/airgap-status");
      if (res.ok) setSystemStatus(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCases();
    fetchSystemStatus();
    fetchPrecedents();
  }, [token]);

  useEffect(() => {
    if (selectedCaseId) {
      fetchDocs(selectedCaseId);
      fetchDeadlines(selectedCaseId);
      fetchCourtBundle(selectedCaseId);
    }
  }, [selectedCaseId, token]);

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const res = await fetch("/api/v1/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc, priority: "NORMAL" }),
    });
    if (res.ok) {
      setShowNewCase(false);
      setNewTitle("");
      setNewDesc("");
      fetchCases();
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedCaseId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", uploadFile);
    fd.append("title", uploadFile.name);
    const res = await fetch(`/api/v1/cases/${selectedCaseId}/documents`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    if (res.ok) {
      setUploadFile(null);
      fetchDocs(selectedCaseId);
    }
    setUploading(false);
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || askingAi) return;
    const query = chatInput;
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: query }]);
    setAskingAi(true);
    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: selectedCaseId, message: query }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((p) => [
          ...p,
          {
            sender: "ai",
            text: data.answer,
            citations: data.citations,
            model: data.model,
            inference_source: data.inference_source,
          },
        ]);
      }
    } catch {
      setChatMessages((p) => [
        ...p,
        { sender: "ai", text: "Villa við samskipti við staðbundna gervigreind." },
      ]);
    }
    setAskingAi(false);
  };

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          background: "#09101d",
          color: "#fff",
          borderBottom: "1px solid #1e293b",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <strong style={{ fontSize: "1.05rem", letterSpacing: "0.01em" }}>
            ILCMS Málastjórnunarkerfi
          </strong>
          <span
            style={{
              fontSize: "0.72rem",
              background: "#064e3b",
              color: "#34d399",
              padding: "3px 8px",
              borderRadius: "12px",
              border: "1px solid #059669",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontWeight: 500,
            }}
          >
            🛡️ Air-Gapped K3s (Linux Laptop • 20GB RAM)
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              background: systemStatus?.keycloak?.connected ? "#065f46" : "#1e293b",
              color: systemStatus?.keycloak?.connected ? "#6ee7b7" : "#a7f3d0",
              padding: "3px 8px",
              borderRadius: "12px",
              border: "1px solid #047857",
            }}
            title="On-premises Keycloak OIDC container in K3s"
          >
            🔑 Keycloak OIDC: {systemStatus?.keycloak?.connected ? "Virkt" : "Tengt"} (ilcms)
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              background: "#1e3a8a",
              color: "#bfdbfe",
              padding: "3px 8px",
              borderRadius: "12px",
              border: "1px solid #2563eb",
            }}
            title="Dedicated Icelandic Legal LLM"
          >
            🇮🇸 Ollama: Gemma 2 9B (Íslenskt)
          </span>
          <span
            style={{
              fontSize: "0.72rem",
              background: "#1e293b",
              color: "#a7f3d0",
              padding: "3px 8px",
              borderRadius: "12px",
              border: "1px solid #334155",
            }}
          >
            pgvector: Virkt
          </span>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Keycloak Persona Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Innskráður:</span>
            <select
              value={user?.email === "judge@ilcms.is" ? "judge" : user?.email === "paralegal@ilcms.is" ? "paralegal" : "lawyer"}
              onChange={(e) => auth?.switchUser && auth.switchUser(e.target.value as any)}
              style={{
                background: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: "4px",
                padding: "3px 8px",
                fontSize: "0.78rem",
                cursor: "pointer",
              }}
            >
              <option value="lawyer">Guðrún Sigurðardóttir hrl. (Lögmaður)</option>
              <option value="judge">Jón Þórðarson (Dómari)</option>
              <option value="paralegal">Ásta Einarsdóttir (Aðstoðarmaður)</option>
            </select>
          </div>
          <button
            onClick={() => setShowInfraModal(true)}
            style={{
              padding: "4px 8px",
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid #0284c7",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            ⚙️ Innviðir
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "4px 8px",
              background: "#334155",
              color: "#cbd5e1",
              border: "1px solid #475569",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.75rem",
            }}
          >
            Útskrá
          </button>
        </div>
      </header>

      {/* Main 3-Pane Workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 400px", flex: 1, overflow: "hidden" }}>
        {/* Pane 1: Cases List */}
        <section
          style={{
            borderRight: "1px solid #e2e8f0",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "14px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>Málaskrá</h3>
              <button
                onClick={() => setShowNewCase(true)}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                + Nýtt mál
              </button>
            </div>
            <input
              type="text"
              placeholder="Leita í málum..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontSize: "0.85rem",
                boxSizing: "border-box",
              }}
            />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {filteredCases.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                style={{
                  padding: "10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  background: selectedCaseId === c.id ? "#eff6ff" : "#fff",
                  border: selectedCaseId === c.id ? "1px solid #3b82f6" : "1px solid #f1f5f9",
                  marginBottom: "6px",
                  boxShadow: selectedCaseId === c.id ? "0 1px 2px rgba(59,130,246,0.1)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#2563eb" }}>{c.case_number}</span>
                  <span style={{ fontSize: "0.7rem", color: "#64748b" }}>{c.status}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#1e293b", marginBottom: "3px" }}>
                  {c.title}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#64748b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.description}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pane 2: Case Details, Deadlines, Court Bundle & Precedents */}
        <section style={{ padding: "20px", overflowY: "auto", background: "#f8fafc" }}>
          {activeCase ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Active Case Header */}
              <div
                style={{
                  background: "#fff",
                  padding: "18px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        background: "#e0f2fe",
                        color: "#0369a1",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {activeCase.case_number}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                      Staða: <strong>{activeCase.status}</strong>
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: activeCase.priority === "HIGH" ? "#dc2626" : "#475569",
                      fontWeight: 600,
                    }}
                  >
                    Forgangur: {activeCase.priority}
                  </span>
                </div>
                <h2 style={{ margin: "4px 0 8px 0", fontSize: "1.25rem", color: "#0f172a" }}>
                  {activeCase.title}
                </h2>
                <p style={{ margin: 0, color: "#475569", fontSize: "0.9rem", lineHeight: 1.5 }}>
                  {activeCase.description}
                </p>
              </div>

              {/* Navigation Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  borderBottom: "2px solid #e2e8f0",
                  background: "#fff",
                  padding: "6px 12px 0 12px",
                  borderRadius: "8px 8px 0 0",
                }}
              >
                <button
                  onClick={() => setActiveTab("docs")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "docs" ? "#eff6ff" : "transparent",
                    color: activeTab === "docs" ? "#2563eb" : "#64748b",
                    border: "none",
                    borderBottom: activeTab === "docs" ? "2px solid #2563eb" : "2px solid transparent",
                    fontWeight: activeTab === "docs" ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  📄 Málsskjöl ({docs.length})
                </button>
                <button
                  onClick={() => setActiveTab("deadlines")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "deadlines" ? "#eff6ff" : "transparent",
                    color: activeTab === "deadlines" ? "#2563eb" : "#64748b",
                    border: "none",
                    borderBottom: activeTab === "deadlines" ? "2px solid #2563eb" : "2px solid transparent",
                    fontWeight: activeTab === "deadlines" ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  ⏱️ Frestareiknivél (80. gr.)
                  {deadlines.length > 0 && (
                    <span style={{ fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "10px" }}>
                      {deadlines.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("bundle")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "bundle" ? "#eff6ff" : "transparent",
                    color: activeTab === "bundle" ? "#2563eb" : "#64748b",
                    border: "none",
                    borderBottom: activeTab === "bundle" ? "2px solid #2563eb" : "2px solid transparent",
                    fontWeight: activeTab === "bundle" ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  📜 Málsgagnasafn & Skjalaskrá
                </button>
                <button
                  onClick={() => setActiveTab("law")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "law" ? "#eff6ff" : "transparent",
                    color: activeTab === "law" ? "#2563eb" : "#64748b",
                    border: "none",
                    borderBottom: activeTab === "law" ? "2px solid #2563eb" : "2px solid transparent",
                    fontWeight: activeTab === "law" ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  ⚖️ Laga- og dómasafn
                </button>
              </div>

              {/* TAB 1: DOCUMENTS */}
              {activeTab === "docs" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Upload Document */}
                  <div
                    style={{
                      background: "#fff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px dashed #94a3b8",
                    }}
                  >
                    <form
                      onSubmit={handleUploadDoc}
                      style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}
                    >
                      <input
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        style={{ fontSize: "0.85rem" }}
                      />
                      <button
                        type="submit"
                        disabled={!uploadFile || uploading}
                        style={{
                          background: "#0f172a",
                          color: "#fff",
                          padding: "6px 14px",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                        }}
                      >
                        {uploading ? "Hleð..." : "Hlaða upp skjali í málasafn"}
                      </button>
                    </form>
                  </div>

                  {/* Documents List */}
                  <div
                    style={{
                      background: "#fff",
                      padding: "16px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>
                        Málsskjöl ({docs.length})
                      </h3>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Vigruð í pgvector (768d) fyrir RAG
                      </span>
                    </div>
                    {docs.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Engin skjöl skráð á þetta mál.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {docs.map((d) => (
                          <div
                            key={d.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "6px",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 500, fontSize: "0.88rem", color: "#1e293b" }}>
                                📄 {d.title}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                                {d.doc_type} • {d.page_count} bls.
                              </div>
                            </div>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                background: "#dcfce7",
                                color: "#15803d",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: 600,
                              }}
                            >
                              {d.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: STATUTORY DEADLINE ENGINE */}
              {activeTab === "deadlines" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {/* Engine Calculation Form */}
                  <div
                    style={{
                      background: "#fff",
                      padding: "18px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
                        Lögbundin frestareiknivél fyrir stefnur (Einkamálalög nr. 91/1991)
                      </h3>
                    </div>
                    <p style={{ margin: "0 0 16px 0", fontSize: "0.82rem", color: "#64748b", lineHeight: 1.4 }}>
                      Reiknar lögbundinn stefnufrest skv. 80. gr. laga nr. 91/1991, dómhlé skv. 81. gr., greinargerðarfrest skv. 97. gr., dómsuppkvaðningu skv. 115. gr. og áfrýjunarfrest til Landsréttar skv. 143. gr.
                    </p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                          Birtingardagur stefnu:
                        </label>
                        <input
                          type="date"
                          value={serviceDate}
                          onChange={(e) => setServiceDate(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                          Varnarþing / búseta stefnda:
                        </label>
                        <select
                          value={defendantLocation}
                          onChange={(e) => setDefendantLocation(e.target.value as any)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            background: "#fff",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value="same_district">Í sama dómumdæmi (Lágmark 3 sólarhringar)</option>
                          <option value="other_district">Annars staðar á Íslandi (Lágmark 14 sólarhringar)</option>
                          <option value="europe">Í Evrópu (Lágmark 1 mánuður)</option>
                          <option value="outside_europe">Utan Evrópu (Lágmark 3 mánuðir)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                          Dómstóll (Dómþingstaður):
                        </label>
                        <input
                          type="text"
                          value={courtName}
                          onChange={(e) => setCourtName(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                          Áætlaður greinargerðarfrestur dómara (vikur):
                        </label>
                        <select
                          value={grantDefenseWeeks}
                          onChange={(e) => setGrantDefenseWeeks(Number(e.target.value))}
                          style={{
                            width: "100%",
                            padding: "8px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            fontSize: "0.85rem",
                            background: "#fff",
                            boxSizing: "border-box",
                          }}
                        >
                          <option value={2}>2 vikur (venjulegur stuttur frestur)</option>
                          <option value={3}>3 vikur (staðall skv. 97. gr.)</option>
                          <option value={4}>4 vikur (hámarks almennur frestur)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleCalculateDeadlines}
                      disabled={calculating}
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        padding: "8px 18px",
                        borderRadius: "4px",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                    >
                      {calculating ? "Reikna..." : "⚡ Reikna lögboðna fresti"}
                    </button>
                  </div>

                  {/* Calculated Schedule Card */}
                  {calcResult && (
                    <div
                      style={{
                        background: "#fff",
                        padding: "18px",
                        borderRadius: "8px",
                        border: "1px solid #3b82f6",
                        boxShadow: "0 2px 4px rgba(59,130,246,0.08)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                        <div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Niðurstaða frestareiknivélar:</div>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e3a8a" }}>
                            Fyrsti lögmæti þingfestingardagur: {calcResult.earliestCourtDate}
                          </div>
                        </div>
                        <button
                          onClick={handleSaveDeadlinesToCase}
                          disabled={savingDeadlines}
                          style={{
                            background: "#059669",
                            color: "#fff",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          {savingDeadlines ? "Vistar..." : "💾 Vista fresti á málið"}
                        </button>
                      </div>

                      {calcResult.isCourtRecessAffected && (
                        <div
                          style={{
                            background: "#fef3c7",
                            border: "1px solid #f59e0b",
                            padding: "10px 12px",
                            borderRadius: "6px",
                            fontSize: "0.82rem",
                            color: "#92400e",
                            marginBottom: "14px",
                          }}
                        >
                          ⚠️ <strong>Dómhlé (81. gr.):</strong> {calcResult.courtRecessNote}
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {calcResult.deadlines?.map((dl: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              padding: "8px 12px",
                              background: "#f8fafc",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a" }}>
                                {dl.name}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                                {dl.statutoryReference} • {dl.description}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#2563eb" }}>
                                {dl.targetDate}
                              </span>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                {dl.daysRemaining >= 0 ? `${dl.daysRemaining} dagar eftir` : "Lokið"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Active Case Deadlines Ledger */}
                  <div
                    style={{
                      background: "#fff",
                      padding: "18px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#0f172a" }}>
                      Skráðir lögboðnir frestir í máli {activeCase.case_number} ({deadlines.length})
                    </h3>
                    {deadlines.length === 0 ? (
                      <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                        Engir frestir hafa verið skráðir á þetta mál enn sem komið er. Notaðu reiknivélina að ofan.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {deadlines.map((d: any) => (
                          <div
                            key={d.id}
                            style={{
                              padding: "10px 14px",
                              borderRadius: "6px",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "#0f172a" }}>
                                  {d.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: d.status === "urgent" ? "#fee2e2" : "#e0f2fe",
                                    color: d.status === "urgent" ? "#b91c1c" : "#0369a1",
                                    fontWeight: 600,
                                  }}
                                >
                                  {d.statutory_reference}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                                {d.description}
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                                {d.target_date}
                              </div>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  background: d.status === "urgent" ? "#ef4444" : "#10b981",
                                  color: "#fff",
                                  fontWeight: 500,
                                }}
                              >
                                {d.status === "urgent" ? "Aðkallandi" : "Í gildi"}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: COURT BUNDLE & DÓMASKJALASKRÁ */}
              {activeTab === "bundle" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div
                    style={{
                      background: "#fff",
                      padding: "18px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                      <div>
                        <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem", color: "#0f172a" }}>
                          Málsgagnasafn og Dómaskjalaskrá
                        </h3>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          Útbúið samkvæmt reglum dómstólasýslunnar um frágang málsgagna fyrir héraðsdómi
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          onClick={handleCopyBundleText}
                          style={{
                            padding: "6px 12px",
                            background: "#f1f5f9",
                            color: "#334155",
                            border: "1px solid #cbd5e1",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          {copySuccess ? "✓ Afritað!" : "📋 Afrita skjalaskrá"}
                        </button>
                        <button
                          onClick={handleDownloadDomaskjalaskra}
                          style={{
                            padding: "6px 12px",
                            background: "#2563eb",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          ⬇️ Sækja Dómaskjalaskrá (.txt)
                        </button>
                        <button
                          onClick={() => window.print()}
                          style={{
                            padding: "6px 12px",
                            background: "#0f172a",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            fontWeight: 500,
                          }}
                        >
                          🖨️ Prenta málsgagnasafn
                        </button>
                      </div>
                    </div>

                    {/* Official Court Cover Page */}
                    {courtBundle && (
                      <div
                        style={{
                          background: "#fafafa",
                          border: "2px solid #334155",
                          borderRadius: "6px",
                          padding: "20px",
                          marginBottom: "16px",
                          fontFamily: "serif",
                        }}
                      >
                        <div style={{ textAlign: "center", borderBottom: "1px solid #cbd5e1", paddingBottom: "12px", marginBottom: "14px" }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.05em", color: "#0f172a" }}>
                            {courtBundle.courtName.toUpperCase()}
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "2px" }}>
                            {courtBundle.actionType} • Mál nr. {courtBundle.caseNumber}
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "0.85rem", lineHeight: 1.6 }}>
                          <div>
                            <span style={{ fontWeight: 700, color: "#1e293b" }}>Stefnandi:</span>
                            <div>{courtBundle.plaintiff.name} (kt. {courtBundle.plaintiff.idNumber})</div>
                            <div style={{ color: "#475569" }}>Málflytjandi: {courtBundle.plaintiff.attorney}</div>
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: "#1e293b" }}>Stefndi:</span>
                            <div>{courtBundle.defendant.name} (kt. {courtBundle.defendant.idNumber})</div>
                            <div style={{ color: "#475569" }}>Málflytjandi: {courtBundle.defendant.attorney}</div>
                          </div>
                        </div>

                        <div style={{ marginTop: "14px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1", fontSize: "0.8rem", color: "#64748b", display: "flex", justifyContent: "space-between" }}>
                          <span>Dagsetning frágangs: {courtBundle.compilationDate}</span>
                          <span>Samtals {courtBundle.totalExhibits} málsskjöl • {courtBundle.totalPages} blaðsíður</span>
                        </div>
                      </div>
                    )}

                    {/* Exhibits Table */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1", textAlign: "left" }}>
                            <th style={{ padding: "8px 10px", width: "40px" }}>Nr.</th>
                            <th style={{ padding: "8px 10px" }}>Heiti málsskjals</th>
                            <th style={{ padding: "8px 10px", width: "90px" }}>Dags.</th>
                            <th style={{ padding: "8px 10px", width: "90px" }}>Tegund</th>
                            <th style={{ padding: "8px 10px", width: "100px" }}>Blaðsíður</th>
                            <th style={{ padding: "8px 10px" }}>Sönnunarþýðing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courtBundle?.exhibits?.map((ex: any) => (
                            <tr key={ex.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              <td style={{ padding: "8px 10px", fontWeight: 700, color: "#2563eb" }}>
                                {String(ex.number).padStart(2, "0")}
                              </td>
                              <td style={{ padding: "8px 10px", fontWeight: 500, color: "#0f172a" }}>
                                📄 {ex.title}
                              </td>
                              <td style={{ padding: "8px 10px", color: "#64748b" }}>{ex.date}</td>
                              <td style={{ padding: "8px 10px" }}>
                                <span style={{ background: "#e2e8f0", color: "#334155", padding: "2px 6px", borderRadius: "4px", fontSize: "0.75rem" }}>
                                  {ex.category}
                                </span>
                              </td>
                              <td style={{ padding: "8px 10px", color: "#475569" }}>
                                bls. {ex.startPage}–{ex.endPage}
                              </td>
                              <td style={{ padding: "8px 10px", color: "#64748b", fontStyle: "italic" }}>
                                {ex.relevance}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PRE-SEEDED STATUTES & COURT PRECEDENTS */}
              {activeTab === "law" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div
                    style={{
                      background: "#fff",
                      padding: "18px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
                          Laga- og dómasafn í pgvector
                        </h3>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          Forsendur og fordæmi Hæstaréttar og Landsréttar innbyggð í staðbundna vigragrunninn
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          background: "#f1f5f9",
                          color: "#334155",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          border: "1px solid #cbd5e1",
                        }}
                      >
                        nomic-embed-text (768d)
                      </span>
                    </div>

                    <input
                      type="text"
                      placeholder="Leita í fordæmum og lagagreinum (t.d. '80. gr.', 'myglu', 'Hrd. 120/2021', 'uppsögn')..."
                      value={lawSearchQuery}
                      onChange={(e) => {
                        setLawSearchQuery(e.target.value);
                        fetchPrecedents(e.target.value);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "1px solid #cbd5e1",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        marginBottom: "16px",
                        boxSizing: "border-box",
                      }}
                    />

                    {/* Precedents List */}
                    <div style={{ marginBottom: "20px" }}>
                      <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#1e3a8a", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        ⚖️ Fordæmi Hæstaréttar og Landsréttar ({precedents.length})
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {precedents.map((p: any) => (
                          <div
                            key={p.id}
                            style={{
                              padding: "12px 14px",
                              background: "#f8fafc",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1d4ed8" }}>
                                  {p.case_reference}
                                </span>
                                <span style={{ fontSize: "0.72rem", background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px" }}>
                                  {p.court} ({p.date})
                                </span>
                              </div>
                              <button
                                onClick={() => handleAskAboutPrecedent(p.case_reference)}
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  color: "#2563eb",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                }}
                              >
                                💬 Spyrja AI um þetta
                              </button>
                            </div>
                            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                              {p.parties}
                            </div>
                            <p style={{ margin: "0 0 6px 0", fontSize: "0.82rem", color: "#475569", lineHeight: 1.4 }}>
                              {p.summary}
                            </p>
                            <div style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "6px 8px", borderRadius: "4px", color: "#334155", borderLeft: "3px solid #3b82f6" }}>
                              <strong>Niðurstaða:</strong> {p.key_findings}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Statutes List */}
                    <div>
                      <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem", color: "#065f46", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        📜 Gildandi lagagreinar í vigragrunni ({statutes.length})
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {statutes.map((s: any) => (
                          <div
                            key={s.id}
                            style={{
                              padding: "12px 14px",
                              background: "#f0fdf4",
                              borderRadius: "6px",
                              border: "1px solid #bbf7d0",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#15803d" }}>
                                {s.act_name} {s.act_number} — {s.article} ({s.title})
                              </span>
                              <button
                                onClick={() => handleAskAboutPrecedent(`${s.article} ${s.act_name}`)}
                                style={{
                                  background: "#fff",
                                  border: "1px solid #86efac",
                                  color: "#166534",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  fontWeight: 500,
                                }}
                              >
                                💬 Spyrja AI
                              </button>
                            </div>
                            <p style={{ margin: 0, fontSize: "0.82rem", color: "#166534", lineHeight: 1.45 }}>
                              {s.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              Veldu mál úr vinstri dálki til að skoða gögn og spyrja lögfræðiaðstoðarmann.
            </div>
          )}
        </section>

        {/* Pane 3: Air-Gapped AI Legal Assistant */}
        <section
          style={{
            borderLeft: "1px solid #e2e8f0",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a" }}>
                Lögfræðiaðstoð AI
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Ollama Local RAG • pgvector
              </div>
            </div>
            <span
              style={{
                fontSize: "0.7rem",
                background: "#f1f5f9",
                color: "#334155",
                padding: "2px 6px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
              }}
            >
              100% Einangrað
            </span>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {chatMessages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                  background: m.sender === "user" ? "#2563eb" : "#f8fafc",
                  color: m.sender === "user" ? "#fff" : "#0f172a",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  maxWidth: "88%",
                  border: m.sender === "user" ? "none" : "1px solid #e2e8f0",
                  fontSize: "0.88rem",
                  lineHeight: 1.5,
                }}
              >
                <div>{m.text}</div>
                {m.citations && m.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: "8px",
                      paddingTop: "6px",
                      borderTop: m.sender === "user" ? "1px solid rgba(255,255,255,0.2)" : "1px solid #e2e8f0",
                      fontSize: "0.75rem",
                      color: m.sender === "user" ? "#e0f2fe" : "#475569",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>📌 Tilvísun í málsskjöl:</span>
                    {m.citations.map((c: any, ci: number) => (
                      <div key={ci} style={{ marginTop: "2px", fontStyle: "italic" }}>
                        • {c.citation_key}: {c.excerpt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {askingAi && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#f1f5f9",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  color: "#64748b",
                }}
              >
                Greini málsskjöl með staðbundnu mállíkani...
              </div>
            )}
          </div>

          <form
            onSubmit={handleSendChat}
            style={{
              padding: "12px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              gap: "8px",
              background: "#fff",
            }}
          >
            <input
              type="text"
              placeholder="Spyrja um gögn málsins..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={askingAi}
              style={{
                flex: 1,
                padding: "8px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: "4px",
                fontSize: "0.85rem",
              }}
            />
            <button
              type="submit"
              disabled={askingAi || !chatInput.trim()}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                padding: "8px 14px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              Senda
            </button>
          </form>
        </section>
      </div>

      {/* New Case Modal */}
      {showNewCase && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", width: "400px" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "1.1rem" }}>Stofna nýtt mál</h3>
            <form onSubmit={handleCreateCase} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <input
                type="text"
                placeholder="Titill máls"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.9rem" }}
              />
              <textarea
                placeholder="Lýsing á málsatvikum"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={4}
                style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.9rem" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowNewCase(false)}
                  style={{
                    padding: "6px 12px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Hætta við
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "6px 14px",
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Stofna mál
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Infrastructure & K3s Modal */}
      {showInfraModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            backdropFilter: "blur(2px)",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              padding: "24px",
              borderRadius: "10px",
              width: "650px",
              maxWidth: "95vw",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                  🛡️ Air-Gapped K3s Innviðayfirlit
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Staðbundið prófunarumhverfi (POC) á Linux fartölvu (20GB RAM, 300GB SSD)
                </p>
              </div>
              <button
                onClick={() => setShowInfraModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#64748b",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Service 1: Keycloak OIDC */}
              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>🔑 Keycloak 24 OIDC Auðkenningarkerfi</strong>
                  <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    K3s Pod: keycloak
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
                  Fullbúinn Keycloak gámur keyrir beint í K3s <code>ilcms</code> nafnrýminu með eigin gagnagrunni (<code>keycloak_db</code>) í PostgreSQL.
                </div>
                <div style={{ marginTop: "8px", fontSize: "0.78rem", background: "#ffffff", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                  <div>• <strong>Keycloak Realm:</strong> <code>ilcms</code> | <strong>Client ID:</strong> <code>ilcms-web</code></div>
                  <div>• <strong>Kerfisstjóri:</strong> <code>admin</code> / <code>admin_secret_ilcms</code></div>
                  <div>• <strong>Prófunarnotandi (Lögmaður):</strong> <code>lawyer@ilcms.is</code> / <code>ilcms_password_2026</code></div>
                  <div>• <strong>Vinnsluminni:</strong> 512MB – 1GB RAM (Heap takmörkuð til að hámarka pláss fyrir málgagn)</div>
                </div>
              </div>

              {/* Service 2: Icelandic Gemma 2 LLM */}
              <div style={{ padding: "12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.92rem", color: "#1e3a8a" }}>🇮🇸 Íslenskt Lögfræðimállíkan (Ollama)</strong>
                  <span style={{ fontSize: "0.72rem", background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    K3s StatefulSet: ollama
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#1e40af", lineHeight: 1.5 }}>
                  Notað er sérhæft íslenskt mállíkan byggt á <strong>Gemma 2 9B Instruct / Miðeind Allra-Handa</strong> (SentencePiece með 256k orðaforða, sérsniðið fyrir íslenskar beygingarmyndir og lagatexta).
                </div>
                <div style={{ marginTop: "8px", fontSize: "0.78rem", background: "#ffffff", padding: "8px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                  <div>• <strong>Mállíkan:</strong> <code>gemma2:9b-instruct-q4_K_M</code> (stærð: ca. 5.4 GB)</div>
                  <div>• <strong>Vigurlíkan (Embeddings):</strong> <code>nomic-embed-text</code> (768 víddir fyrir pgvector)</div>
                  <div>• <strong>Kerfisfyrirmæli (Modelfile):</strong> Lagt áherslu á einkamálalög, fasteignakaupalög og Hæstaréttardóma.</div>
                  <div>• <strong>Vinnsluminni:</strong> 6GB – 8GB RAM (StatefulSet með 50GB PVC)</div>
                </div>
              </div>

              {/* Service 3: PostgreSQL with pgvector */}
              <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.92rem", color: "#14532d" }}>🗄️ PostgreSQL 16 + pgvector HNSW</strong>
                  <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    K3s StatefulSet: postgres
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#166534", lineHeight: 1.5 }}>
                  Geymir bæði málaskrárgögn (<code>ilcms_db</code>) og auðkenningargögn Keycloak (<code>keycloak_db</code>). Hraðvirk HNSW vigurleit (vector_cosine_ops) fyrir RAG skjalaleit.
                </div>
                <div style={{ marginTop: "8px", fontSize: "0.78rem", background: "#ffffff", padding: "8px", borderRadius: "4px", border: "1px solid #bbf7d0" }}>
                  <div>• <strong>Gagnasöfn:</strong> <code>ilcms_db</code> (málaskrá og vigrar) og <code>keycloak_db</code> (OIDC)</div>
                  <div>• <strong>Vinnsluminni:</strong> 1GB – 2GB RAM</div>
                </div>
              </div>

              {/* Hardware RAM Budget Summary */}
              <div style={{ padding: "12px", background: "#fafafa", borderRadius: "8px", border: "1px solid #e5e5e5" }}>
                <strong style={{ fontSize: "0.88rem", color: "#171717" }}>📊 Vinnsluminnisbókhald á 20GB Fartölvu:</strong>
                <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.78rem", color: "#525252" }}>
                  <div>• Ollama LLM (Gemma 2 9B): <strong>~7 GB</strong></div>
                  <div>• Keycloak OIDC: <strong>~0.8 GB</strong></div>
                  <div>• PostgreSQL & pgvector: <strong>~1.5 GB</strong></div>
                  <div>• ILCMS Vefkerfi: <strong>~0.8 GB</strong></div>
                  <div>• K3s & Containerd stýring: <strong>~1.0 GB</strong></div>
                  <div style={{ color: "#16a34a", fontWeight: 600 }}>• Ónotað varasæti / Linux OS: <strong>~8.9 GB</strong></div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                onClick={() => setShowInfraModal(false)}
                style={{
                  padding: "6px 16px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                Loka yfirliti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
