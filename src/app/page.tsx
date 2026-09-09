"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { LoginView } from "@/components/LoginView";

export default function Dashboard() {
  const auth = useAuth() as any;
  const token = auth?.token;
  const user = auth?.user;
  const handleLogout = () => {
    if (typeof auth?.logout === "function") {
      auth.logout();
    }
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
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as questions and answers grow
  useEffect(() => {
    if (!userHasScrolledUp) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, askingAi]);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isUp = scrollHeight - scrollTop - clientHeight > 60;
    setUserHasScrolledUp(isUp);
  };

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

  // Document Reader state
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [docCopied, setDocCopied] = useState(false);

  // Document Notes ("Athugasemdir") state
  const [activeNoteDoc, setActiveNoteDoc] = useState<any | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");
  const [savingNote, setSavingNote] = useState<boolean>(false);
  const [noteSaveStatus, setNoteSaveStatus] = useState<string>("");

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

  const openNotesModal = (doc: any) => {
    setActiveNoteDoc(doc);
    setNoteInput(doc.notes || "");
    setNoteSaveStatus("");
  };

  const handleSaveNote = async () => {
    if (!activeNoteDoc || !selectedCaseId) return;
    setSavingNote(true);
    setNoteSaveStatus("");
    try {
      const res = await fetch(`/api/v1/cases/${selectedCaseId}/documents`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doc_id: activeNoteDoc.id,
          notes: noteInput,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setDocs((prevDocs) =>
          prevDocs.map((d) =>
            d.id === activeNoteDoc.id
              ? { ...d, notes: data.notes, notes_updated_at: data.notes_updated_at }
              : d
          )
        );
        setActiveNoteDoc((prev: any) => (prev ? { ...prev, notes: data.notes } : null));
        if (selectedDoc && selectedDoc.id === activeNoteDoc.id) {
          setSelectedDoc((prev: any) => (prev ? { ...prev, notes: data.notes } : null));
        }
        setNoteSaveStatus("✓ Athugasemd vistuð!");
        setTimeout(() => {
          setActiveNoteDoc(null);
          setNoteSaveStatus("");
        }, 600);
      } else {
        setNoteSaveStatus("Villa við að vista athugasemd.");
      }
    } catch {
      setNoteSaveStatus("Villa í tengingu.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!activeNoteDoc || !selectedCaseId) return;
    setSavingNote(true);
    setNoteSaveStatus("");
    try {
      const res = await fetch(`/api/v1/cases/${selectedCaseId}/documents`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doc_id: activeNoteDoc.id,
          notes: "",
        }),
      });

      if (res.ok) {
        setDocs((prevDocs) =>
          prevDocs.map((d) =>
            d.id === activeNoteDoc.id
              ? { ...d, notes: "", notes_updated_at: undefined }
              : d
          )
        );
        setActiveNoteDoc((prev: any) => (prev ? { ...prev, notes: "" } : null));
        if (selectedDoc && selectedDoc.id === activeNoteDoc.id) {
          setSelectedDoc((prev: any) => (prev ? { ...prev, notes: "" } : null));
        }
        setNoteInput("");
        setNoteSaveStatus("✓ Athugasemd eytt!");
        setTimeout(() => {
          setActiveNoteDoc(null);
          setNoteSaveStatus("");
        }, 600);
      } else {
        setNoteSaveStatus("Villa við að eyða athugasemd.");
      }
    } catch {
      setNoteSaveStatus("Villa í tengingu.");
    } finally {
      setSavingNote(false);
    }
  };

  const sendQueryToAi = async (queryText: string) => {
    if (!queryText.trim() || askingAi) return;
    setChatInput("");
    setUserHasScrolledUp(false);
    setChatMessages((prev) => [...prev, { sender: "user", text: queryText }]);
    setAskingAi(true);
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
    try {
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: selectedCaseId, message: queryText }),
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
      } else {
        setChatMessages((p) => [
          ...p,
          { sender: "ai", text: "Villa kom upp við úrvinnslu lögfræðiaðstoðar." },
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

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || askingAi) return;
    const query = chatInput;
    sendQueryToAi(query);
  };

  const handleAskAboutPrecedent = (topic: string, type: "precedent" | "statute", title?: string) => {
    const activeCase = cases.find((c) => c.id === selectedCaseId);
    const caseNum = activeCase ? activeCase.case_number : "málinu";
    const promptText =
      type === "precedent"
        ? `Hvernig tengist dómafordæmið ${topic} (${title || ""}) máli ${caseNum} og hvaða þýðingu hefur niðurstaðan fyrir málstað okkar?`
        : `Hvaða þýðingu hefur lagaákvæðið ${topic} (${title || ""}) fyrir mál ${caseNum} og hver eru réttaráhrif þess?`;
    sendQueryToAi(promptText);
  };

  const filteredCases = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || !auth?.isAuthenticated) {
    return <LoginView />;
  }

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
            <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Innskráður:</span>
            <select
              value={user?.role?.toLowerCase() || "lawyer"}
              onChange={(e) => {
                if (auth?.switchUser) auth.switchUser(e.target.value);
                else if (auth?.login) auth.login(e.target.value);
              }}
              style={{
                background: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "0.78rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
              title="Skipta um Keycloak OIDC prófíl"
            >
              <option value="lawyer">⚖️ Guðrún Sigurðardóttir hrl. (Lögmaður)</option>
              <option value="judge">🏛️ Jón Þórðarson (Dómari)</option>
              <option value="paralegal">📋 Ásta Einarsdóttir (Aðstoðarmaður)</option>
              <option value="admin">🛡️ Kerfisstjóri ILCMS (Kerfisstjóri)</option>
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
            id="btn-header-logout"
            onClick={handleLogout}
            style={{
              padding: "4px 10px",
              background: "#334155",
              color: "#f1f5f9",
              border: "1px solid #475569",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#b91c1c";
              e.currentTarget.style.borderColor = "#ef4444";
              e.currentTarget.style.color = "#ffffff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "#334155";
              e.currentTarget.style.borderColor = "#475569";
              e.currentTarget.style.color = "#f1f5f9";
            }}
            title="Útskrá úr ILCMS (Loka Keycloak OIDC setu)"
          >
            <span>🚪</span>
            <span>Útskrá</span>
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
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {docs.map((d) => (
                          <div
                            key={d.id}
                            onClick={() => {
                              setSelectedDoc(d);
                              setDocSearchQuery("");
                              setDocCopied(false);
                            }}
                            style={{
                              padding: "14px 16px",
                              borderRadius: "8px",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = "#93c5fd";
                              e.currentTarget.style.background = "#f0fdf4";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = "#e2e8f0";
                              e.currentTarget.style.background = "#f8fafc";
                            }}
                          >
                            <div style={{ width: "100%", minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", marginBottom: "3px" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#1e293b" }}>
                                  📄 {d.title}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    background: "#e2e8f0",
                                    color: "#475569",
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    fontWeight: 500,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {d.doc_type}
                                </span>
                              </div>
                              <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", gap: "12px", alignItems: "center" }}>
                                <span>Bls.: <strong>{d.page_count}</strong></span>
                                {d.filing_date && <span>Lagt fram: <strong>{d.filing_date}</strong></span>}
                                {d.author && <span>Höfundur: <em>{d.author}</em></span>}
                              </div>
                              {d.summary && (
                                <div style={{ fontSize: "0.76rem", color: "#475569", marginTop: "4px", fontStyle: "italic" }}>
                                  "{d.summary}"
                                </div>
                              )}
                              {d.notes && d.notes.trim().length > 0 && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNotesModal(d);
                                  }}
                                  style={{
                                    marginTop: "6px",
                                    background: "#fffbeb",
                                    border: "1px solid #fde68a",
                                    borderRadius: "6px",
                                    padding: "6px 10px",
                                    fontSize: "0.77rem",
                                    color: "#92400e",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    gap: "6px",
                                    cursor: "pointer",
                                    width: "100%",
                                    maxWidth: "100%",
                                    boxSizing: "border-box",
                                  }}
                                  title="Smelltu til að skoða eða breyta athugasemd"
                                >
                                  <span style={{ fontWeight: 700, fontSize: "0.8rem", whiteSpace: "nowrap", flexShrink: 0 }}>
                                    📝 Athugasemd:
                                  </span>
                                  <span
                                    style={{
                                      fontStyle: "italic",
                                      flex: 1,
                                      minWidth: 0,
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-word",
                                      overflowWrap: "anywhere",
                                      lineHeight: 1.45,
                                    }}
                                  >
                                    {d.notes}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: "#b45309",
                                      fontWeight: 600,
                                      textDecoration: "underline",
                                      whiteSpace: "nowrap",
                                      flexShrink: 0,
                                      alignSelf: "flex-start",
                                      marginTop: "1px",
                                    }}
                                  >
                                    Skoða / Breyta
                                  </span>
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "8px", flexWrap: "wrap", width: "100%", marginTop: "2px" }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDoc(d);
                                  setDocSearchQuery("");
                                  setDocCopied(false);
                                }}
                                style={{
                                  background: "#2563eb",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "5px",
                                  padding: "6px 12px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
                                }}
                              >
                                👁️ Lesa skjal
                              </button>

                              {/* Button next to "Lesa skjal": Athugasemdir button if attached, or option to add notes */}
                              {d.notes && d.notes.trim().length > 0 ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNotesModal(d);
                                  }}
                                  title="Skoða eða breyta athugasemd við málsskjal"
                                  style={{
                                    background: "#fef3c7",
                                    color: "#92400e",
                                    border: "1px solid #f59e0b",
                                    borderRadius: "5px",
                                    padding: "6px 12px",
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "5px",
                                    boxShadow: "0 1px 2px rgba(245,158,11,0.2)",
                                    transition: "all 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#fde68a";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fef3c7";
                                  }}
                                >
                                  <span>📝</span> Athugasemdir
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openNotesModal(d);
                                  }}
                                  title="Bæta við athugasemd við þetta málsskjal"
                                  style={{
                                    background: "#fff",
                                    color: "#475569",
                                    border: "1px dashed #cbd5e1",
                                    borderRadius: "5px",
                                    padding: "6px 10px",
                                    fontSize: "0.78rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    transition: "all 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#f1f5f9";
                                    e.currentTarget.style.borderColor = "#94a3b8";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#fff";
                                    e.currentTarget.style.borderColor = "#cbd5e1";
                                  }}
                                >
                                  <span>+</span> Athugasemd
                                </button>
                              )}

                              <span
                                style={{
                                  fontSize: "0.72rem",
                                  background: "#dcfce7",
                                  color: "#15803d",
                                  padding: "3px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {d.status}
                              </span>
                            </div>
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
                                onClick={() => handleAskAboutPrecedent(p.case_reference, "precedent", p.parties)}
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
                                onClick={() => handleAskAboutPrecedent(`${s.article} laga nr. ${s.act_number}`, "statute", `${s.title} (${s.act_name})`)}
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
            height: "100%",
            minHeight: 0,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Lögfræðiaðstoð AI</span>
                {chatMessages.filter((m) => m.sender === "user").length > 0 && (
                  <span
                    style={{
                      fontSize: "0.68rem",
                      background: "#e2e8f0",
                      color: "#475569",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontWeight: 600,
                    }}
                  >
                    {chatMessages.filter((m) => m.sender === "user").length} spurning{chatMessages.filter((m) => m.sender === "user").length > 1 ? "ar" : ""}
                  </span>
                )}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                Ollama Local RAG • pgvector
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {chatMessages.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setChatMessages([
                      {
                        sender: "ai",
                        text: "Góðan dag. Ég er staðbundinn lögfræðiaðstoðarmaður (Air-Gapped). Ég get greint og svarað spurningum út frá málsskjölum með beinum tilvísunum.",
                        inference_source: "local_airgap_cache",
                      },
                    ]);
                    setUserHasScrolledUp(false);
                  }}
                  title="Hreinsa spjallferil"
                  style={{
                    fontSize: "0.7rem",
                    background: "#f1f5f9",
                    color: "#64748b",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    padding: "3px 7px",
                    cursor: "pointer",
                  }}
                >
                  Hreinsa
                </button>
              )}
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
          </div>

          <div
            ref={chatContainerRef}
            onScroll={handleChatScroll}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              scrollBehavior: "smooth",
            }}
          >
            {chatMessages.length <= 1 && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                  💡 Dæmi um fyrirspurnir í málsskjöl:
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {[
                    "Hverjir eru málsaðilar og dómkröfur?",
                    "Hvað kemur fram í matsgerð dómkvaddra matsmanna?",
                    "Hverjir eru helstu frestir samkvæmt lögum nr. 91/1991?",
                    "Hvaða sönnunargögn liggja fyrir í málinu?",
                  ].map((suggestion, si) => (
                    <button
                      key={si}
                      type="button"
                      onClick={() => {
                        setChatInput(suggestion);
                      }}
                      style={{
                        background: "#fff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: "6px",
                        padding: "5px 8px",
                        fontSize: "0.74rem",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#eff6ff";
                        e.currentTarget.style.borderColor = "#93c5fd";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.borderColor = "#bfdbfe";
                      }}
                    >
                      💬 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                  boxShadow: m.sender === "user" ? "0 1px 2px rgba(37,99,235,0.2)" : "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                {m.sender === "ai" && m.inference_source && (
                  <div style={{ marginTop: "6px", fontSize: "0.7rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                    {m.inference_source === "ollama_airgap" && (
                      <span style={{ background: "#ecfdf5", color: "#047857", padding: "1px 6px", borderRadius: "3px" }}>
                        ⚡ Ollama Air-Gap ({m.model || "gemma2:9b"})
                      </span>
                    )}
                    {m.inference_source === "local_airgap_cache" && (
                      <span style={{ background: "#f1f5f9", color: "#475569", padding: "1px 6px", borderRadius: "3px" }}>
                        🛡️ Staðbundin lögfræðigreining
                      </span>
                    )}
                  </div>
                )}
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
                    {m.citations.map((c: any, ci: number) => {
                      const cleanCitation = (c.citation_key || "")
                        .replace(/\.\.\.$/, "")
                        .replace(/\.pdf$/i, "")
                        .trim()
                        .toLowerCase();
                      const matchedDoc = docs.find((d) => {
                        const cleanTitle = (d.title || "")
                          .replace(/\.pdf$/i, "")
                          .trim()
                          .toLowerCase();
                        return (
                          cleanTitle.includes(cleanCitation) ||
                          cleanCitation.includes(cleanTitle.slice(0, 15)) ||
                          (cleanCitation.length > 5 && cleanTitle.slice(0, 15).includes(cleanCitation.slice(0, 15))) ||
                          (d.doc_type && cleanCitation.includes(d.doc_type.toLowerCase()))
                        );
                      });
                      return (
                        <div key={ci} style={{ marginTop: "4px", fontStyle: "italic", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                          <span>• {c.citation_key}: {c.excerpt}</span>
                          {matchedDoc ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab("docs");
                                setSelectedDoc(matchedDoc);
                                setDocSearchQuery("");
                                setDocCopied(false);
                              }}
                              style={{
                                background: m.sender === "user" ? "rgba(255,255,255,0.2)" : "#eff6ff",
                                color: m.sender === "user" ? "#fff" : "#2563eb",
                                border: "1px solid #bfdbfe",
                                borderRadius: "4px",
                                padding: "2px 8px",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                fontWeight: 600,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                transition: "all 0.15s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#dbeafe";
                                e.currentTarget.style.borderColor = "#60a5fa";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = m.sender === "user" ? "rgba(255,255,255,0.2)" : "#eff6ff";
                                e.currentTarget.style.borderColor = "#bfdbfe";
                              }}
                              title="Opna og lesa skjalið í dómaskjalalesara"
                            >
                              👁️ Lesa ↗
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab("law");
                              }}
                              style={{
                                background: m.sender === "user" ? "rgba(255,255,255,0.2)" : "#f8fafc",
                                color: m.sender === "user" ? "#fff" : "#475569",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                padding: "2px 7px",
                                fontSize: "0.7rem",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                fontWeight: 500,
                              }}
                              title="Skoða í laga- og dómasafni"
                            >
                              ⚖️ Skoða ↗
                            </button>
                          )}
                        </div>
                      );
                    })}
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
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span>⏳</span> Greini málsskjöl með staðbundnu mállíkani...
              </div>
            )}
            <div ref={chatEndRef} style={{ height: "1px", width: "100%" }} />
          </div>

          {/* Floating jump to bottom button */}
          {userHasScrolledUp && (
            <button
              type="button"
              onClick={() => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
                setUserHasScrolledUp(false);
              }}
              style={{
                position: "absolute",
                bottom: "72px",
                right: "18px",
                background: "#0f172a",
                color: "#fff",
                border: "none",
                borderRadius: "20px",
                padding: "6px 14px",
                fontSize: "0.74rem",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
                zIndex: 20,
              }}
            >
              ↓ Fletta til botns
            </button>
          )}

          <form
            onSubmit={handleSendChat}
            style={{
              padding: "12px",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              gap: "8px",
              background: "#fff",
              flexShrink: 0,
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

      {/* ATHUGASEMDIR (DOCUMENT NOTES) MODAL */}
      {activeNoteDoc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => {
            if (!savingNote) {
              setActiveNoteDoc(null);
              setNoteSaveStatus("");
            }
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "620px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              border: "1px solid #cbd5e1",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "16px 20px",
                background: "#0f172a",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.25rem" }}>📝</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                    Athugasemdir við málsskjal
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    Mál nr. {activeCase?.case_number || "Óskráð"} • Einkamálalög nr. 91/1991
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveNoteDoc(null);
                  setNoteSaveStatus("");
                }}
                disabled={savingNote}
                style={{
                  background: "transparent",
                  color: "#94a3b8",
                  border: "none",
                  fontSize: "1.25rem",
                  cursor: "pointer",
                  padding: "4px 8px",
                  lineHeight: 1,
                }}
                title="Loka"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Document Reference Box */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px 14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                    📄 {activeNoteDoc.title}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      background: "#e0e7ff",
                      color: "#3730a3",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      fontWeight: 600,
                    }}
                  >
                    {activeNoteDoc.doc_type}
                  </span>
                </div>
                <div style={{ fontSize: "0.76rem", color: "#64748b", display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <span>Blaðsíðufjöldi: <strong>{activeNoteDoc.page_count} bls.</strong></span>
                  {activeNoteDoc.filing_date && <span>Lagt fram: <strong>{activeNoteDoc.filing_date}</strong></span>}
                  {activeNoteDoc.author && <span>Höfundur: <em>{activeNoteDoc.author}</em></span>}
                  {activeNoteDoc.notes_updated_at && (
                    <span style={{ color: "#92400e" }}>
                      Síðast uppfært: <strong>{new Date(activeNoteDoc.notes_updated_at).toLocaleDateString("is-IS")}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Legal Annotation Chips */}
              <div>
                <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "#64748b", marginBottom: "6px" }}>
                  Flýtival fyrir lögmannsathugasemdir:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {[
                    "Lykilatriði í málflutningi",
                    "Kanna sönnunargildi",
                    "Athuga frest",
                    "Bera saman við fylgiskjöl",
                    "Óska eftir yfirmati",
                  ].map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        const trimmed = noteInput.trim();
                        const prefix = trimmed ? `${trimmed}\n• ` : "• ";
                        setNoteInput(`${prefix}${tag}: `);
                      }}
                      style={{
                        background: "#f1f5f9",
                        color: "#334155",
                        border: "1px solid #cbd5e1",
                        borderRadius: "14px",
                        padding: "3px 10px",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                      }}
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                  Athugasemd við málsskjalið (Notes):
                </label>
                <textarea
                  rows={6}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Skráðu athugasemdir við málsskjalið hér, t.d. greiningu á sönnunargildi, lykilröksemdir fyrir aðalmálflutning eða leiðbeiningar vegna dómtöku..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.86rem",
                    lineHeight: 1.5,
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#64748b" }}>
                  <span>Hvert málsskjal hefur eina tengda athugasemd.</span>
                  <span>{noteInput.length} stafir</span>
                </div>
              </div>

              {/* Feedback status */}
              {noteSaveStatus && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    background: noteSaveStatus.includes("✓") ? "#dcfce7" : "#fee2e2",
                    color: noteSaveStatus.includes("✓") ? "#15803d" : "#b91c1c",
                    border: noteSaveStatus.includes("✓") ? "1px solid #86efac" : "1px solid #fca5a5",
                  }}
                >
                  {noteSaveStatus}
                </div>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 20px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                {activeNoteDoc.notes && (
                  <button
                    type="button"
                    onClick={handleDeleteNote}
                    disabled={savingNote}
                    style={{
                      background: "transparent",
                      color: "#dc2626",
                      border: "1px solid #fca5a5",
                      borderRadius: "5px",
                      padding: "6px 12px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Eyða athugasemd
                  </button>
                )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNoteDoc(null);
                    setNoteSaveStatus("");
                  }}
                  disabled={savingNote}
                  style={{
                    background: "#fff",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    padding: "6px 14px",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Hætta við
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: "5px",
                    padding: "6px 18px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
                  }}
                >
                  {savingNote ? "Vistar..." : "Vista athugasemd"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL / DÓMASKJALALESARI (Global overlay, accessible from anywhere) */}
      {selectedDoc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9990,
            padding: "16px",
          }}
          onClick={() => setSelectedDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "860px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 18px",
                background: "#0f172a",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #334155",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "1.2rem" }}>⚖️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.98rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    {selectedDoc.title}
                    <span style={{ background: "#2563eb", color: "#fff", fontSize: "0.68rem", padding: "2px 6px", borderRadius: "3px" }}>
                      {selectedDoc.doc_type}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                    Dómaskjal í máli {activeCase?.case_number} • {selectedDoc.page_count} blaðsíður • Skráð {selectedDoc.filing_date || selectedDoc.created_at?.split("T")[0]}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => openNotesModal(selectedDoc)}
                  title={selectedDoc.notes ? "Skoða eða breyta athugasemd" : "Bæta við athugasemd"}
                  style={{
                    background: selectedDoc.notes ? "#fef3c7" : "#334155",
                    color: selectedDoc.notes ? "#92400e" : "#fff",
                    border: selectedDoc.notes ? "1px solid #f59e0b" : "1px solid #475569",
                    borderRadius: "4px",
                    padding: "5px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  📝 {selectedDoc.notes ? "Athugasemdir" : "+ Athugasemd"}
                </button>
                <button
                  onClick={() => {
                    if (selectedDoc?.content) {
                      navigator.clipboard.writeText(selectedDoc.content);
                      setDocCopied(true);
                      setTimeout(() => setDocCopied(false), 2000);
                    }
                  }}
                  style={{
                    background: docCopied ? "#16a34a" : "#334155",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    padding: "5px 10px",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                  }}
                >
                  {docCopied ? "✓ Afritað" : "📋 Afrita texta"}
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  style={{
                    background: "transparent",
                    color: "#94a3b8",
                    border: "none",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    padding: "4px 8px",
                    lineHeight: 1,
                  }}
                  title="Loka"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Search & Metadata Ribbon */}
            <div
              style={{
                padding: "10px 18px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "220px" }}>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>🔍</span>
                <input
                  type="text"
                  placeholder="Leita að orði eða hugtaki í skjalinu..."
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "5px 8px",
                    fontSize: "0.82rem",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    outline: "none",
                  }}
                />
                {docSearchQuery && (
                  <button
                    onClick={() => setDocSearchQuery("")}
                    style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "0.8rem" }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", display: "flex", gap: "10px" }}>
                <span>Höfundur: <strong>{selectedDoc.author || "Málsaðili"}</strong></span>
                <span>Staða: <strong style={{ color: "#16a34a" }}>{selectedDoc.status}</strong></span>
                <span>RAG Vigrað: <strong>pgvector 768d</strong></span>
              </div>
            </div>

            {/* Document Content Viewport */}
            <div
              style={{
                padding: "24px 30px",
                overflowY: "auto",
                flex: 1,
                background: "#f1f5f9",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {selectedDoc.notes && selectedDoc.notes.trim().length > 0 && (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "760px",
                    marginBottom: "16px",
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "6px",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "1rem" }}>📝</span>
                      <strong style={{ fontSize: "0.86rem", color: "#92400e" }}>Athugasemd við málsskjal:</strong>
                      {selectedDoc.notes_updated_at && (
                        <span style={{ fontSize: "0.72rem", color: "#b45309" }}>
                          (uppfært {new Date(selectedDoc.notes_updated_at).toLocaleDateString("is-IS")})
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.86rem", color: "#78350f", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {selectedDoc.notes}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNotesModal(selectedDoc)}
                    style={{
                      background: "#fef3c7",
                      color: "#92400e",
                      border: "1px solid #f59e0b",
                      borderRadius: "4px",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Breyta
                  </button>
                </div>
              )}

              <div
                style={{
                  background: "#fff",
                  width: "100%",
                  maxWidth: "760px",
                  padding: "36px 40px",
                  borderRadius: "4px",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
                  border: "1px solid #e2e8f0",
                  fontFamily: "'Times New Roman', Times, serif, Georgia",
                  lineHeight: 1.65,
                  color: "#0f172a",
                  fontSize: "0.95rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {/* Official Court Document Stamp */}
                <div
                  style={{
                    borderBottom: "2px double #0f172a",
                    paddingBottom: "12px",
                    marginBottom: "20px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    fontFamily: "sans-serif",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "#1e293b" }}>
                      Héraðsdómur Reykjavíkur • Málsskjöl
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#2563eb", marginTop: "2px" }}>
                      Mál nr. {activeCase?.case_number}
                    </div>
                  </div>
                  <div
                    style={{
                      border: "1px solid #0f172a",
                      padding: "3px 8px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      textAlign: "center",
                      background: "#f8fafc",
                    }}
                  >
                    Lagt fram í dómþingi<br />
                    {selectedDoc.filing_date || selectedDoc.created_at?.split("T")[0]}
                  </div>
                </div>

                {/* Document Text */}
                {selectedDoc.content ? (
                  docSearchQuery.trim() ? (
                    (() => {
                      const text = selectedDoc.content;
                      const q = docSearchQuery.trim();
                      const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
                      const parts = text.split(regex);
                      return (
                        <div>
                          {parts.map((part: string, i: number) =>
                            regex.test(part) ? (
                              <mark key={i} style={{ background: "#fef08a", color: "#854d0e", padding: "1px 2px", borderRadius: "2px" }}>
                                {part}
                              </mark>
                            ) : (
                              <span key={i}>{part}</span>
                            )
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    selectedDoc.content
                  )
                ) : (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontFamily: "sans-serif" }}>
                    📄 Ekkert textainnihald fannst fyrir þetta skjal.
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "10px 18px",
                background: "#fff",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.76rem",
                color: "#64748b",
              }}
            >
              <div>
                ILCMS Air-Gapped Case Management System • Ótengt innra net
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "6px 14px",
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  fontWeight: 500,
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
