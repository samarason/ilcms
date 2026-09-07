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

  const [chatMessages, setChatMessages] = useState<any[]>([
    { sender: "ai", text: "Góðan dag. Ég get svarað spurningum út frá gögnum málsins með tilvísunum í málsskjöl." }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [askingAi, setAskingAi] = useState(false);

  const fetchCases = async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/v1/cases", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCases(data);
        if (data.length > 0 && !selectedCaseId) setSelectedCaseId(data[0].id);
      }
    } catch (e) { console.error(e); }
  };

  const fetchDocs = async (cid: string) => {
    if (!token || !cid) return;
    try {
      const res = await fetch(`/api/v1/cases/${cid}/documents`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDocs(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchCases(); }, [token]);
  useEffect(() => { if (selectedCaseId) fetchDocs(selectedCaseId); }, [selectedCaseId, token]);

  const activeCase = cases.find((c) => c.id === selectedCaseId);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    const res = await fetch("/api/v1/cases", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, description: newDesc, priority: "NORMAL" })
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
      body: fd
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
        body: JSON.stringify({ case_id: selectedCaseId, message: query })
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((p) => [...p, { sender: "ai", text: data.answer, citations: data.citations }]);
      }
    } catch {
      setChatMessages((p) => [...p, { sender: "ai", text: "Villa við samskipti við gervigreind." }]);
    }
    setAskingAi(false);
  };

  const filteredCases = cases.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.case_number.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#f8fafc" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "#0f172a", color: "#fff" }}>
        <strong>ILCMS Málastjórnunarkerfi</strong>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span>{user?.email || "lawyer@ilcms.is"}</span>
          <button onClick={handleLogout} style={{ padding: "6px 12px", background: "#334155", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Útskrá</button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 380px", flex: 1, overflow: "hidden" }}>
        {/* Pane 1: Cases */}
        <section style={{ borderRight: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <h3 style={{ margin: 0 }}>Málaskrá</h3>
              <button onClick={() => setShowNewCase(true)} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer" }}>+ Nýtt mál</button>
            </div>
            <input type="text" placeholder="Leita í málum..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", padding: "6px", boxSizing: "border-box" }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {filteredCases.map(c => (
              <div key={c.id} onClick={() => setSelectedCaseId(c.id)} style={{ padding: "10px", borderRadius: "6px", cursor: "pointer", background: selectedCaseId === c.id ? "#eff6ff" : "#fff", border: selectedCaseId === c.id ? "1px solid #3b82f6" : "1px solid #f1f5f9", marginBottom: "4px" }}>
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{c.case_number}</div>
                <div style={{ fontWeight: "bold" }}>{c.title}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Pane 2: Case Details & Docs */}
        <section style={{ padding: "24px", overflowY: "auto" }}>
          {activeCase ? (
            <div>
              <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "16px" }}>
                <h2>{activeCase.case_number}: {activeCase.title}</h2>
                <p>{activeCase.description}</p>
              </div>
              <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px dashed #cbd5e1", marginBottom: "16px" }}>
                <form onSubmit={handleUploadDoc} style={{ display: "flex", gap: "10px" }}>
                  <input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                  <button type="submit" disabled={!uploadFile || uploading} style={{ background: "#0f172a", color: "#fff", padding: "6px 12px", border: "none", borderRadius: "4px" }}>{uploading ? "Hleð..." : "Hlaða upp skjali"}</button>
                </form>
              </div>
              <div style={{ background: "#fff", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h3>Málsskjöl ({docs.length})</h3>
                {docs.map(d => (
                  <div key={d.id} style={{ padding: "8px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between" }}>
                    <span>{d.title}</span>
                    <span style={{ fontSize: "0.8rem", color: "#16a34a" }}>{d.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <div>Veldu mál úr vinstri dálki.</div>}
        </section>

        {/* Pane 3: AI Legal Assistant */}
        <section style={{ borderLeft: "1px solid #e2e8f0", background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #e2e8f0", fontWeight: "bold" }}>Lögfræðiaðstoð AI</div>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {chatMessages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.sender === "user" ? "flex-end" : "flex-start", background: m.sender === "user" ? "#2563eb" : "#f1f5f9", color: m.sender === "user" ? "#fff" : "#000", padding: "8px 12px", borderRadius: "6px", maxWidth: "80%" }}>
                {m.text}
              </div>
            ))}
          </div>
          <form onSubmit={handleSendChat} style={{ padding: "12px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "8px" }}>
            <input type="text" placeholder="Spyrja um gögn málsins..." value={chatInput} onChange={e => setChatInput(e.target.value)} style={{ flex: 1, padding: "6px" }} />
            <button type="submit" style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", padding: "6px 12px" }}>Senda</button>
          </form>
        </section>
      </div>

      {showNewCase && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", padding: "20px", borderRadius: "8px", width: "350px" }}>
            <h3>Stofna nýtt mál</h3>
            <form onSubmit={handleCreateCase} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <input type="text" placeholder="Titill máls" value={newTitle} onChange={e => setNewTitle(e.target.value)} required style={{ padding: "6px" }} />
              <textarea placeholder="Lýsing" value={newDesc} onChange={e => setNewDesc(e.target.value)} style={{ padding: "6px" }} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button type="button" onClick={() => setShowNewCase(false)}>Hætta við</button>
                <button type="submit" style={{ background: "#2563eb", color: "#fff" }}>Stofna</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
