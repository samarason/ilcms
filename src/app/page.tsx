"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { LoginView } from "@/components/LoginView";
import { BillingManagementTab } from "@/components/BillingManagementTab";
import { LegalCompareModal } from "@/components/LegalCompareModal";
import { LegalDraftingView } from "@/components/LegalDraftingView";
import { AdminConsoleModal } from "@/components/AdminConsoleModal";
import { ExampleDocsPickerModal } from "@/components/ExampleDocsPickerModal";
import { PRE_SEEDED_STATUTES } from "@/lib/legal-knowledge";
import { evaluateCaseDeadlineUrgency, getDeadlineHoursRemaining } from "@/lib/deadline-urgency";

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
  const [showExamplePicker, setShowExamplePicker] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [showInfraModal, setShowInfraModal] = useState(false);
  const [showAdminConsoleModal, setShowAdminConsoleModal] = useState(false);

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

  // New states for Statutory Deadline Engine, Court Bundle, Precedents, and Billing
  const [activeTab, setActiveTab] = useState<"docs" | "deadlines" | "bundle" | "law" | "drafting" | "billing">("docs");
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [allDeadlines, setAllDeadlines] = useState<any[]>([]);
  const [urgentFilterOnly, setUrgentFilterOnly] = useState<boolean>(false);
  const [prioritizeUrgent, setPrioritizeUrgent] = useState<boolean>(true);

  // Global Billing Stopwatch State
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const handleStartTimer = () => setIsTimerRunning(true);
  const handleStopTimer = () => setIsTimerRunning(false);
  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(0);
  };
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

  // Legal Precedent & Statute Compare state
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareSelectedItems, setCompareSelectedItems] = useState<
    Array<{ id: string; type: "precedent" | "statute"; label: string }>
  >([]);

  const isItemInCompare = (type: "precedent" | "statute", id: string) => {
    return compareSelectedItems.some((item) => item.type === type && item.id === id);
  };

  const handleToggleCompareItem = (type: "precedent" | "statute", id: string, label: string) => {
    setCompareSelectedItems((prev) => {
      const exists = prev.some((item) => item.type === type && item.id === id);
      if (exists) {
        return prev.filter((item) => !(item.type === type && item.id === id));
      }
      if (prev.length >= 2) {
        const updated = [prev[1], { id, type, label }];
        setShowCompareModal(true);
        return updated;
      }
      const updated = [...prev, { id, type, label }];
      if (updated.length === 2) {
        setShowCompareModal(true);
      }
      return updated;
    });
  };

  // Document Reader state
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docSearchQuery, setDocSearchQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [docCopied, setDocCopied] = useState(false);
  const [docViewMode, setDocViewMode] = useState<"text" | "pdf" | "formatted">("text");

  // Document Versioning & Revision states
  const [viewingVersion, setViewingVersion] = useState<any | null>(null);
  const [versionHistoryDoc, setVersionHistoryDoc] = useState<any | null>(null);
  const [uploadRevisionDoc, setUploadRevisionDoc] = useState<any | null>(null);
  const [revisionFile, setRevisionFile] = useState<File | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [revisionAuthor, setRevisionAuthor] = useState("");
  const [uploadingRevision, setUploadingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState("");
  const [versionActionNotice, setVersionActionNotice] = useState("");
  const [diffDoc, setDiffDoc] = useState<{ doc: any; vA: any; vB: any } | null>(null);

  // Active document data: viewing historical version or current active document
  const activeDocData = viewingVersion || selectedDoc;

  // Display text: handles standard text, extracted PDF text, extracted DOCX text, and gracefully decodes legacy raw PDF/DOCX streams
  const displayDocContent = useMemo(() => {
    if (!activeDocData?.content) return "";
    const raw = activeDocData.content;
    if (raw.trim().startsWith("%PDF-")) {
      // If raw PDF bytes or PostScript text streams reached the client
      const lines: string[] = [];
      const tjRegex = /\(((?:\\.|[^()\\])*)\)\s*(?:Tj|['"])/g;
      let m: RegExpExecArray | null;
      while ((m = tjRegex.exec(raw)) !== null) {
        const decoded = m[1]
          .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\");
        if (decoded.trim()) lines.push(decoded);
      }
      if (lines.length > 0) return lines.join("\n");
      return "[PDF skjal móttekið í málasafn. Notaðu 'Upprunalegt PDF' hnappinn hér að ofan til að skoða skjalið í heild sinni.]";
    }
    if (
      raw.startsWith("PK\x03\x04") ||
      raw.startsWith("PK") ||
      raw.includes("[Content_Types].xml") ||
      raw.includes("word/document.xml")
    ) {
      // If raw DOCX bytes / zip string reached the client, extract <w:t> tags
      const wtMatches = raw.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi);
      if (wtMatches && wtMatches.length > 0) {
        const text = wtMatches
          .map((tag) => {
            const match = tag.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/i);
            return match ? match[1] : "";
          })
          .join("")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
        if (text) return text;
      }
      return "[Word skjal (.docx) móttekið í rafræna dómaskjalaskrá. Skjalið er aðgengilegt og texti þess er vistaður.]";
    }
    return raw;
  }, [activeDocData?.content]);

  // Compute total matches and search terms for document reader search
  const docSearchResults = useMemo(() => {
    if (!displayDocContent || !docSearchQuery.trim()) {
      return { total: 0, terms: [] as string[], regex: null as RegExp | null };
    }
    const cleanQuery = docSearchQuery.trim();
    const rawTerms = cleanQuery.split(/\s+/).filter(Boolean);
    const terms = rawTerms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    if (terms.length === 0) return { total: 0, terms: [] as string[], regex: null };

    try {
      const regex = new RegExp(`(${terms.join("|")})`, "gi");
      const matches = displayDocContent.match(regex);
      return {
        total: matches ? matches.length : 0,
        terms,
        regex,
      };
    } catch {
      return { total: 0, terms: [] as string[], regex: null };
    }
  }, [displayDocContent, docSearchQuery]);

  const totalDocMatches = docSearchResults.total;

  // Reset match index when query or document changes
  useEffect(() => {
    setActiveMatchIndex(0);
  }, [docSearchQuery, selectedDoc?.id]);

  // Scroll active match into view smoothly
  useEffect(() => {
    if (docSearchQuery.trim() && totalDocMatches > 0) {
      const el = document.getElementById(`doc-highlight-match-${activeMatchIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeMatchIndex, docSearchQuery, totalDocMatches]);

  const handleNextDocMatch = () => {
    if (totalDocMatches <= 1) return;
    setActiveMatchIndex((prev) => (prev + 1) % totalDocMatches);
  };

  const handlePrevDocMatch = () => {
    if (totalDocMatches <= 1) return;
    setActiveMatchIndex((prev) => (prev - 1 + totalDocMatches) % totalDocMatches);
  };

  // Document Notes ("Athugasemdir") state
  const [activeNoteDoc, setActiveNoteDoc] = useState<any | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");
  const [savingNote, setSavingNote] = useState<boolean>(false);
  const [noteSaveStatus, setNoteSaveStatus] = useState<string>("");

  const fetchAllDeadlines = async () => {
    try {
      const res = await fetch("/api/v1/deadlines");
      if (res.ok) {
        setAllDeadlines(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDeadlines = async (cid: string) => {
    if (!cid) return;
    try {
      const res = await fetch(`/api/v1/deadlines?case_id=${cid}`);
      if (res.ok) {
        setDeadlines(await res.json());
      }
      fetchAllDeadlines();
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
    fetchAllDeadlines();
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

  const handleExamplePickerSuccess = async (targetCaseId: string, newCaseCreated?: boolean) => {
    await fetchCases();
    setSelectedCaseId(targetCaseId);
    await fetchDocs(targetCaseId);
    setActiveTab("docs");
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

  const handleOpenUploadRevision = (doc: any) => {
    setUploadRevisionDoc(doc);
    setRevisionFile(null);
    setRevisionNote("");
    setRevisionAuthor(user?.name || "Guðrún Sigurðardóttir hrl.");
    setRevisionError("");
  };

  const handleOpenVersionHistory = (doc: any) => {
    setVersionHistoryDoc(doc);
    setVersionActionNotice("");
  };

  const handleUploadRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadRevisionDoc || !selectedCaseId) return;
    setUploadingRevision(true);
    setRevisionError("");

    try {
      const fd = new FormData();
      if (revisionFile) {
        fd.append("file", revisionFile);
      }
      const currentVer = uploadRevisionDoc.version || uploadRevisionDoc.versions?.length || 1;
      fd.append("change_summary", revisionNote.trim() || `Endurskoðuð útgáfa v${currentVer + 1}`);
      fd.append("author", revisionAuthor.trim() || user?.name || "Guðrún Sigurðardóttir hrl.");

      const res = await fetch(
        `/api/v1/cases/${selectedCaseId}/documents/${uploadRevisionDoc.id}/versions`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        }
      );

      if (res.ok) {
        const data = await res.json();
        setDocs((prevDocs) =>
          prevDocs.map((d) => (d.id === uploadRevisionDoc.id ? data.doc : d))
        );
        if (selectedDoc && selectedDoc.id === uploadRevisionDoc.id) {
          setSelectedDoc(data.doc);
          setViewingVersion(null);
        }
        if (versionHistoryDoc && versionHistoryDoc.id === uploadRevisionDoc.id) {
          setVersionHistoryDoc(data.doc);
        }
        setUploadRevisionDoc(null);
        setRevisionFile(null);
        setRevisionNote("");
        setVersionActionNotice(`✓ Ný útgáfa v${data.doc.version} var skráð með góðum árangri!`);
        setTimeout(() => setVersionActionNotice(""), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setRevisionError(errData.error || "Villa kom upp við að hlaða upp nýrri útgáfu.");
      }
    } catch {
      setRevisionError("Villa í nettengingu.");
    } finally {
      setUploadingRevision(false);
    }
  };

  const handleRestoreVersion = async (doc: any, ver: any) => {
    if (!selectedCaseId || !doc || !ver) return;
    try {
      const res = await fetch(
        `/api/v1/cases/${selectedCaseId}/documents/${doc.id}/restore`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            version_number: ver.version_number,
            author: user?.name || "Guðrún Sigurðardóttir hrl.",
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setDocs((prevDocs) =>
          prevDocs.map((d) => (d.id === doc.id ? data.doc : d))
        );
        if (selectedDoc && selectedDoc.id === doc.id) {
          setSelectedDoc(data.doc);
          setViewingVersion(null);
        }
        if (versionHistoryDoc && versionHistoryDoc.id === doc.id) {
          setVersionHistoryDoc(data.doc);
        }
        setVersionActionNotice(`✓ Útgáfa v${ver.version_number} var endurheimt sem ný virk útgáfa (v${data.doc.version})!`);
        setTimeout(() => setVersionActionNotice(""), 4000);
      }
    } catch (err) {
      console.error("Error restoring version:", err);
    }
  };

  const handleDownloadVersion = (ver: any) => {
    if (!ver) return;
    const verNum = ver.version_number || ver.version || 1;
    if (ver.pdf_data_url) {
      const a = document.createElement("a");
      a.href = ver.pdf_data_url;
      a.download = ver.title?.endsWith(".pdf") ? ver.title : `${ver.title || "skjal"}_v${verNum}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (ver.docx_data_url) {
      const a = document.createElement("a");
      a.href = ver.docx_data_url;
      a.download = ver.title?.endsWith(".docx") ? ver.title : `${ver.title || "skjal"}_v${verNum}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const isDocx = ver.is_docx || ver.title?.toLowerCase().endsWith(".docx");
      const blob = new Blob([ver.content || ""], { type: isDocx ? "application/msword" : "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = ver.title || `skjal_v${verNum}.${isDocx ? "docx" : "txt"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
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

  const casesWithUrgency = useMemo(() => {
    return cases.map((c) => {
      const urgency = evaluateCaseDeadlineUrgency(c.id, allDeadlines);
      return { ...c, urgency };
    });
  }, [cases, allDeadlines]);

  const urgentCasesCount = useMemo(() => {
    return casesWithUrgency.filter((c) => c.urgency.isUrgent48h).length;
  }, [casesWithUrgency]);

  const filteredCases = useMemo(() => {
    let list = casesWithUrgency.filter(
      (c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.case_number.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (urgentFilterOnly) {
      list = list.filter((c) => c.urgency.isUrgent48h);
    }

    if (prioritizeUrgent) {
      // Sort cases with urgent deadlines within 48h to the top, ordered by fewest hours remaining
      list = [...list].sort((a, b) => {
        if (a.urgency.isUrgent48h && !b.urgency.isUrgent48h) return -1;
        if (!a.urgency.isUrgent48h && b.urgency.isUrgent48h) return 1;
        if (a.urgency.isUrgent48h && b.urgency.isUrgent48h) {
          return a.urgency.hoursRemaining - b.urgency.hoursRemaining;
        }
        return 0;
      });
    }

    return list;
  }, [casesWithUrgency, searchQuery, urgentFilterOnly, prioritizeUrgent]);

  if (!user || !auth?.isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div
      id="ilcms-main-window"
      className="scrollable-window"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        width: "100%",
        minWidth: "1024px",
        overflowX: "auto",
        overflowY: "auto",
        background: "#f8fafc",
      }}
    >
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
          {/* Kerfisstjóraviðmót - Aðeins sýnilegt fyrir notanda admin@ilcms.is */}
          {(user?.email === "admin@ilcms.is" || user?.role === "ADMIN") && (
            <button
              id="btn-admin-console"
              onClick={() => setShowAdminConsoleModal(true)}
              style={{
                padding: "4px 12px",
                background: "linear-gradient(135deg, #1e3a8a, #0284c7)",
                color: "#ffffff",
                border: "1px solid #38bdf8",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.76rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 10px rgba(56, 189, 248, 0.3)",
              }}
              title="Opna Kerfisstjóraviðmót (Aðeins fyrir notanda admin@ilcms.is)"
            >
              <span>🛡️</span>
              <span>Kerfisstjórn</span>
            </button>
          )}
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
      <div
        id="ilcms-workspace-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "300px minmax(400px, 1fr) 400px",
          gridTemplateRows: "minmax(0, 1fr)",
          flex: 1,
          minHeight: "560px",
          height: "calc(100vh - 54px)",
          maxHeight: "calc(100vh - 54px)",
          minWidth: "1050px",
          overflow: "hidden",
        }}
      >
        {/* Pane 1: Cases List */}
        <section
          id="pane-1-cases"
          style={{
            borderRight: "1px solid #e2e8f0",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            maxHeight: "100%",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <h3 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>Málaskrá</h3>
                <span
                  style={{
                    fontSize: "0.7rem",
                    background: "#f1f5f9",
                    color: "#475569",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontWeight: 600,
                  }}
                >
                  {cases.length}
                </span>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  id="btn-new-case"
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
                <button
                  id="btn-open-examples-modal"
                  type="button"
                  onClick={() => setShowExamplePicker(true)}
                  title="Sækja dæmaskjöl úr /examples og setja inn í mál"
                  style={{
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span>📁</span>
                  <span>Dæmaskjöl</span>
                </button>
              </div>
            </div>

            {/* Urgent Deadlines (<48h) Filter & Prioritize Toggles */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <button
                id="btn-filter-all-cases"
                type="button"
                onClick={() => setUrgentFilterOnly(false)}
                style={{
                  flex: 1,
                  padding: "5px 6px",
                  borderRadius: "4px",
                  fontSize: "0.74rem",
                  fontWeight: !urgentFilterOnly ? 700 : 500,
                  background: !urgentFilterOnly ? "#2563eb" : "#f1f5f9",
                  color: !urgentFilterOnly ? "#ffffff" : "#475569",
                  border: !urgentFilterOnly ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                  cursor: "pointer",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                Öll mál ({cases.length})
              </button>
              <button
                id="btn-filter-urgent-deadlines"
                type="button"
                onClick={() => setUrgentFilterOnly(true)}
                style={{
                  flex: 1.3,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "5px 6px",
                  borderRadius: "4px",
                  fontSize: "0.74rem",
                  fontWeight: urgentFilterOnly ? 700 : 600,
                  background: urgentFilterOnly
                    ? "#dc2626"
                    : urgentCasesCount > 0
                    ? "#fee2e2"
                    : "#f8fafc",
                  color: urgentFilterOnly
                    ? "#ffffff"
                    : urgentCasesCount > 0
                    ? "#b91c1c"
                    : "#64748b",
                  border: urgentFilterOnly
                    ? "1px solid #b91c1c"
                    : urgentCasesCount > 0
                    ? "1px solid #fca5a5"
                    : "1px solid #cbd5e1",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span>🚨</span>
                <span>Innan 48 klst</span>
                <span
                  style={{
                    background: urgentFilterOnly
                      ? "#ffffff"
                      : urgentCasesCount > 0
                      ? "#dc2626"
                      : "#94a3b8",
                    color: urgentFilterOnly ? "#dc2626" : "#ffffff",
                    padding: "1px 5px",
                    borderRadius: "8px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                  }}
                >
                  {urgentCasesCount}
                </span>
              </button>
            </div>

            {/* Quick Priority Sorting Toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "0.72rem",
                  color: "#475569",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={prioritizeUrgent}
                  onChange={(e) => setPrioritizeUrgent(e.target.checked)}
                  style={{ cursor: "pointer", accentColor: "#dc2626" }}
                />
                <span>Forgangsraða aðkallandi frestum efst</span>
              </label>
              {urgentCasesCount > 0 && (
                <span style={{ fontSize: "0.68rem", color: "#dc2626", fontWeight: 600 }}>
                  {urgentCasesCount} mál krefjast aðgerða
                </span>
              )}
            </div>

            {urgentFilterOnly && (
              <div
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  marginBottom: "8px",
                  fontSize: "0.72rem",
                  color: "#991b1b",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>Sýnir eingöngu mál með fresti &lt; 48 klst</span>
                <button
                  type="button"
                  onClick={() => setUrgentFilterOnly(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#b91c1c",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Afvirkja
                </button>
              </div>
            )}

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
          {/* Cases Tree List */}
          <div
            id="cases-tree-pane"
            className="scrollable-pane scrollable-tree"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "scroll",
              overflowX: "auto",
              padding: "8px",
            }}
          >
            {filteredCases.length === 0 ? (
              <div style={{ textAlign: "center", padding: "20px 10px", color: "#94a3b8", fontSize: "0.82rem" }}>
                {urgentFilterOnly
                  ? "Engin mál með lögboðna fresti innan næstu 48 klst."
                  : "Engin mál fundust sem passa við leit."}
              </div>
            ) : (
              filteredCases.map((c) => {
                const isSelected = selectedCaseId === c.id;
                const { urgency } = c;
                const hasAlert = urgency.isUrgent48h;

                return (
                  <div
                    key={c.id}
                    id={`case-card-${c.id}`}
                    onClick={() => setSelectedCaseId(c.id)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      background: isSelected
                        ? "#eff6ff"
                        : hasAlert
                        ? urgency.urgencyLevel === "critical"
                          ? "#fff8f8"
                          : "#fffdf5"
                        : "#fff",
                      borderTop: isSelected
                        ? "1px solid #3b82f6"
                        : hasAlert
                        ? urgency.urgencyLevel === "critical"
                          ? "1px solid #fecaca"
                          : "1px solid #fde68a"
                        : "1px solid #e2e8f0",
                      borderRight: isSelected
                        ? "1px solid #3b82f6"
                        : hasAlert
                        ? urgency.urgencyLevel === "critical"
                          ? "1px solid #fecaca"
                          : "1px solid #fde68a"
                        : "1px solid #e2e8f0",
                      borderBottom: isSelected
                        ? "1px solid #3b82f6"
                        : hasAlert
                        ? urgency.urgencyLevel === "critical"
                          ? "1px solid #fecaca"
                          : "1px solid #fde68a"
                        : "1px solid #e2e8f0",
                      borderLeft: hasAlert
                        ? urgency.urgencyLevel === "critical"
                          ? "4px solid #dc2626"
                          : "4px solid #d97706"
                        : isSelected
                        ? "4px solid #2563eb"
                        : "1px solid #e2e8f0",
                      marginBottom: "8px",
                      boxShadow: isSelected
                        ? "0 1px 3px rgba(59,130,246,0.15)"
                        : hasAlert
                        ? "0 1px 2px rgba(0,0,0,0.05)"
                        : "0 1px 2px rgba(0,0,0,0.02)",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb" }}>{c.case_number}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {hasAlert && (
                          <span
                            id={`badge-urgent-deadline-${c.id}`}
                            title={`${urgency.closestDeadline?.name} (${urgency.closestDeadline?.target_date}) - ${urgency.closestDeadline?.statutory_reference}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: "10px",
                              background: urgency.badgeColor.bg,
                              color: urgency.badgeColor.text,
                              border: `1px solid ${urgency.badgeColor.border}`,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span>{urgency.badgeColor.icon}</span>
                            <span>{urgency.badgeText}</span>
                          </span>
                        )}
                        <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 500 }}>{c.status}</span>
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#0f172a", marginBottom: "3px", lineHeight: 1.3 }}>
                      {c.title}
                    </div>

                    {/* Urgent Deadline Sub-Strip if within 48 hours */}
                    {hasAlert && urgency.closestDeadline && (
                      <div
                        id={`urgent-strip-${c.id}`}
                        style={{
                          margin: "5px 0",
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background: urgency.urgencyLevel === "critical" ? "#fee2e2" : "#fef3c7",
                          border: urgency.urgencyLevel === "critical" ? "1px solid #fca5a5" : "1px solid #fde68a",
                          fontSize: "0.72rem",
                          color: urgency.urgencyLevel === "critical" ? "#991b1b" : "#92400e",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "6px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", overflow: "hidden" }}>
                          <span style={{ fontWeight: 700, flexShrink: 0 }}>🚨 Frestur:</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {urgency.closestDeadline.name}
                          </span>
                        </div>
                        <span style={{ fontWeight: 700, flexShrink: 0, fontSize: "0.7rem" }}>
                          {urgency.closestDeadline.target_date}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        fontSize: "0.74rem",
                        color: "#64748b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginTop: hasAlert ? "2px" : "0",
                      }}
                    >
                      {c.description}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Pane 2: Case Details, Deadlines, Court Bundle & Precedents */}
        <section
          id="pane-2-detail"
          className="scrollable-pane"
          style={{
            padding: "20px",
            overflowY: "scroll",
            overflowX: "auto",
            height: "100%",
            maxHeight: "100%",
            minHeight: 0,
            minWidth: 0,
            background: "#f8fafc",
          }}
        >
          {activeCase ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Urgent Deadline Alert Banner (<48 hours) */}
              {(() => {
                const activeCaseUrgency = evaluateCaseDeadlineUrgency(activeCase.id, allDeadlines);
                if (!activeCaseUrgency.isUrgent48h || !activeCaseUrgency.closestDeadline) return null;
                const dl = activeCaseUrgency.closestDeadline;
                const isCrit = activeCaseUrgency.urgencyLevel === "critical";

                return (
                  <div
                    id={`active-case-urgent-alert-${activeCase.id}`}
                    style={{
                      background: isCrit ? "#fef2f2" : "#fffbeb",
                      borderTop: isCrit ? "1px solid #f87171" : "1px solid #fcd34d",
                      borderRight: isCrit ? "1px solid #f87171" : "1px solid #fcd34d",
                      borderBottom: isCrit ? "1px solid #f87171" : "1px solid #fcd34d",
                      borderLeft: isCrit ? "5px solid #dc2626" : "5px solid #d97706",
                      borderRadius: "6px",
                      padding: "12px 16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "1.3rem" }}>{isCrit ? "🚨" : "⚠️"}</span>
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: "0.86rem",
                            color: isCrit ? "#991b1b" : "#92400e",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>Aðkallandi lögboðinn frestur innan 48 klukkustunda!</span>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              background: isCrit ? "#fee2e2" : "#fef3c7",
                              color: isCrit ? "#b91c1c" : "#b45309",
                              border: isCrit ? "1px solid #fca5a5" : "1px solid #fcd34d",
                            }}
                          >
                            {activeCaseUrgency.badgeText}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.78rem", color: isCrit ? "#b91c1c" : "#b45309", marginTop: "3px" }}>
                          <strong>{dl.name}</strong> • Gjalddagi: <strong>{dl.target_date}</strong> (
                          {activeCaseUrgency.hoursRemaining <= 0
                            ? "Útrunnið!"
                            : `${Math.round(activeCaseUrgency.hoursRemaining)} klst eftir`}
                          ) • Lagastoð: <em>{dl.statutory_reference}</em>
                        </div>
                      </div>
                    </div>
                    <button
                      id="btn-jump-to-urgent-deadline"
                      type="button"
                      onClick={() => setActiveTab("deadlines")}
                      style={{
                        background: isCrit ? "#dc2626" : "#d97706",
                        color: "#fff",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span>Skoða í frestaskrá</span>
                      <span>➔</span>
                    </button>
                  </div>
                );
              })()}

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
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    {/* Header Quick Stopwatch */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        background: isTimerRunning ? "#eff6ff" : "#f1f5f9",
                        border: isTimerRunning ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                        padding: "2px 8px",
                        borderRadius: "6px",
                      }}
                    >
                      <span style={{ fontSize: "0.78rem" }}>⏱️</span>
                      <span style={{ fontSize: "0.78rem", fontFamily: "monospace", fontWeight: 700, color: isTimerRunning ? "#1d4ed8" : "#475569" }}>
                        {Math.floor(timerSeconds / 60).toString().padStart(2, "0")}:{(timerSeconds % 60).toString().padStart(2, "0")}
                      </span>
                      {!isTimerRunning ? (
                        <button
                          onClick={handleStartTimer}
                          style={{
                            background: "#16a34a",
                            color: "#fff",
                            border: "none",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                          title="Ræsa tímatöku"
                        >
                          ▶ Ræsa
                        </button>
                      ) : (
                        <button
                          onClick={handleStopTimer}
                          style={{
                            background: "#dc2626",
                            color: "#fff",
                            border: "none",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                          title="Stöðva tímatöku"
                        >
                          ⏸ Stöðva
                        </button>
                      )}
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
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => setActiveTab("docs")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "docs" ? "#eff6ff" : "transparent",
                    color: activeTab === "docs" ? "#2563eb" : "#64748b",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
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
                  id="tab-btn-deadlines"
                  onClick={() => setActiveTab("deadlines")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "deadlines" ? "#eff6ff" : "transparent",
                    color: activeTab === "deadlines" ? "#2563eb" : "#64748b",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: activeTab === "deadlines" ? "2px solid #2563eb" : "2px solid transparent",
                    fontWeight: activeTab === "deadlines" ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  ⏱️ Frestir & Reiknivél
                  {(() => {
                    const urgency = evaluateCaseDeadlineUrgency(activeCase.id, allDeadlines);
                    if (urgency.isUrgent48h) {
                      return (
                        <span
                          id="badge-tab-urgent"
                          style={{
                            fontSize: "0.68rem",
                            background: urgency.urgencyLevel === "critical" ? "#fee2e2" : "#fef3c7",
                            color: urgency.urgencyLevel === "critical" ? "#b91c1c" : "#92400e",
                            border: `1px solid ${urgency.urgencyLevel === "critical" ? "#fca5a5" : "#fcd34d"}`,
                            padding: "1px 6px",
                            borderRadius: "10px",
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "2px",
                          }}
                        >
                          <span>{urgency.urgencyLevel === "critical" ? "🚨" : "⚠️"}</span>
                          <span>&lt; 48 klst</span>
                        </span>
                      );
                    }
                    if (deadlines.length > 0) {
                      return (
                        <span style={{ fontSize: "0.7rem", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: "10px" }}>
                          {deadlines.length}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </button>
                <button
                  onClick={() => setActiveTab("bundle")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "bundle" ? "#eff6ff" : "transparent",
                    color: activeTab === "bundle" ? "#2563eb" : "#64748b",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
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
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
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
                <button
                  id="tab-drafting-btn"
                  onClick={() => setActiveTab("drafting")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "drafting" ? "#eff6ff" : "transparent",
                    color: activeTab === "drafting" ? "#2563eb" : "#64748b",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: activeTab === "drafting" ? "2px solid #2563eb" : "2px solid transparent",
                    fontWeight: activeTab === "drafting" ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  ✍️ Sjálfvirk skjalagerð
                  <span
                    style={{
                      fontSize: "0.68rem",
                      background: activeTab === "drafting" ? "#2563eb" : "#dbeafe",
                      color: activeTab === "drafting" ? "#ffffff" : "#1e40af",
                      padding: "1px 6px",
                      borderRadius: "10px",
                      fontWeight: 700,
                    }}
                  >
                    Mynda drög
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("billing")}
                  style={{
                    padding: "8px 14px",
                    background: activeTab === "billing" ? "#eff6ff" : "transparent",
                    color: activeTab === "billing" ? "#2563eb" : "#64748b",
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom: activeTab === "billing" ? "2px solid #2563eb" : "2px solid transparent",
                    fontWeight: activeTab === "billing" ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  💰 Tímar & Málskostnaður (130. gr.)
                  {isTimerRunning && (
                    <span style={{ fontSize: "0.68rem", background: "#ef4444", color: "#fff", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                      Í GANGI
                    </span>
                  )}
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
                      style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}
                    >
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.txt"
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
                          fontWeight: 500,
                        }}
                      >
                        {uploading ? "Hleð..." : "Hlaða upp skjali í málasafn"}
                      </button>
                      <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                        Styður Word (.docx), PDF og textaskjöl
                      </span>
                      <button
                        type="button"
                        id="btn-fetch-examples-doc"
                        onClick={() => setShowExamplePicker(true)}
                        title="Sækja dæmaskjöl úr /examples (Sérfræðiskýrsla, samningur, stefna, tölvupóstar...)"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#f0fdf4",
                          color: "#166534",
                          border: "1px solid #bbf7d0",
                          borderRadius: "4px",
                          padding: "6px 12px",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <span>📁</span>
                        <span>Sækja dæmaskjöl (/examples)</span>
                      </button>
                      <button
                        type="button"
                        id="btn-draft-from-docs"
                        onClick={() => setActiveTab("drafting")}
                        style={{
                          marginLeft: "auto",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          border: "1px solid #bfdbfe",
                          borderRadius: "4px",
                          padding: "6px 12px",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <span>✍️</span>
                        <span>Mynda drög að stefnu/greinargerð</span>
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
                      <div
                        id="documents-tree-container"
                        className="scrollable-tree"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          maxHeight: "680px",
                          overflowY: "auto",
                          overflowX: "auto",
                          paddingRight: "4px",
                        }}
                      >
                        {versionActionNotice && (
                          <div
                            style={{
                              background: "#f0fdf4",
                              border: "1px solid #86efac",
                              color: "#166534",
                              padding: "10px 14px",
                              borderRadius: "6px",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <span>{versionActionNotice}</span>
                          </div>
                        )}
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
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#1e293b" }}>
                                    📄 {d.title}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      background: (d.version || (d.versions?.length || 1)) > 1 ? "#eff6ff" : "#f1f5f9",
                                      color: (d.version || (d.versions?.length || 1)) > 1 ? "#1d4ed8" : "#475569",
                                      border: `1px solid ${(d.version || (d.versions?.length || 1)) > 1 ? "#bfdbfe" : "#e2e8f0"}`,
                                      padding: "1px 6px",
                                      borderRadius: "4px",
                                      fontWeight: 700,
                                      whiteSpace: "nowrap",
                                    }}
                                    title={`Útgáfa ${d.version || (d.versions?.length || 1)}${(d.versions?.length || 1) > 1 ? ` (${d.versions?.length} útgáfur skráðar)` : ""}`}
                                  >
                                    v{d.version || (d.versions?.length || 1)}
                                    {(d.versions?.length || 1) > 1 && (
                                      <span style={{ marginLeft: "3px", fontSize: "0.65rem", opacity: 0.85 }}>({d.versions?.length} útg.)</span>
                                    )}
                                  </span>
                                </div>
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

                              {/* Version history button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenVersionHistory(d);
                                }}
                                title="Skoða allar útgáfur og breytingasögu þessa málsskjals"
                                style={{
                                  background: (d.versions?.length || 1) > 1 ? "#eff6ff" : "#f8fafc",
                                  color: (d.versions?.length || 1) > 1 ? "#1e40af" : "#475569",
                                  border: `1px solid ${(d.versions?.length || 1) > 1 ? "#bfdbfe" : "#cbd5e1"}`,
                                  borderRadius: "5px",
                                  padding: "6px 11px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#dbeafe";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = (d.versions?.length || 1) > 1 ? "#eff6ff" : "#f8fafc";
                                }}
                              >
                                <span>🕒</span> Útgáfusaga {d.versions?.length && d.versions.length > 1 ? `(${d.versions.length})` : ""}
                              </button>

                              {/* Upload new revision button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenUploadRevision(d);
                                }}
                                title="Hlaða upp nýrri útgáfu af þessu skjali (t.d. endurskoðuð stefna, viðbótargögn)"
                                style={{
                                  background: "#f0fdf4",
                                  color: "#166534",
                                  border: "1px solid #bbf7d0",
                                  borderRadius: "5px",
                                  padding: "6px 11px",
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "all 0.15s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#dcfce7";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "#f0fdf4";
                                }}
                              >
                                <span>⬆️</span> Ný útgáfa
                              </button>

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

                      <div
                        id="calc-deadlines-tree-container"
                        className="scrollable-tree"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          maxHeight: "380px",
                          overflowY: "auto",
                          overflowX: "auto",
                          paddingRight: "4px",
                        }}
                      >
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
                      <div
                        id="deadlines-tree-container"
                        className="scrollable-tree"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          maxHeight: "520px",
                          overflowY: "auto",
                          overflowX: "auto",
                          paddingRight: "4px",
                        }}
                      >
                        {deadlines.map((d: any) => {
                          const hours = getDeadlineHoursRemaining(d.target_date);
                          const isOverdue = hours < 0;
                          const isUnder24 = hours >= 0 && hours <= 24;
                          const isUnder48 = hours > 24 && hours <= 48;
                          const isUrgent48 = isOverdue || isUnder24 || isUnder48;
                          const isCrit = isOverdue || isUnder24;

                          return (
                            <div
                              key={d.id}
                              id={`case-deadline-item-${d.id}`}
                              style={{
                                padding: "12px 14px",
                                borderRadius: "6px",
                                background: isCrit ? "#fef2f2" : isUnder48 ? "#fffbeb" : "#f8fafc",
                                borderTop: isCrit ? "1px solid #fca5a5" : isUnder48 ? "1px solid #fde68a" : "1px solid #e2e8f0",
                                borderRight: isCrit ? "1px solid #fca5a5" : isUnder48 ? "1px solid #fde68a" : "1px solid #e2e8f0",
                                borderBottom: isCrit ? "1px solid #fca5a5" : isUnder48 ? "1px solid #fde68a" : "1px solid #e2e8f0",
                                borderLeft: isCrit ? "4px solid #dc2626" : isUnder48 ? "4px solid #d97706" : "1px solid #e2e8f0",
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "#0f172a" }}>
                                    {d.name}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      padding: "2px 6px",
                                      borderRadius: "4px",
                                      background: isCrit ? "#fee2e2" : isUnder48 ? "#fef3c7" : "#e0f2fe",
                                      color: isCrit ? "#b91c1c" : isUnder48 ? "#b45309" : "#0369a1",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {d.statutory_reference}
                                  </span>
                                  {isUrgent48 && (
                                    <span
                                      style={{
                                        fontSize: "0.68rem",
                                        padding: "1px 6px",
                                        borderRadius: "10px",
                                        fontWeight: 700,
                                        background: isCrit ? "#fee2e2" : "#fef3c7",
                                        color: isCrit ? "#991b1b" : "#92400e",
                                        border: isCrit ? "1px solid #fca5a5" : "1px solid #fcd34d",
                                      }}
                                    >
                                      {isOverdue
                                        ? "🚨 Útrunnið!"
                                        : isUnder24
                                        ? `🚨 Innan 24 klst (${Math.max(1, Math.round(hours))} klst)`
                                        : `⚠️ Innan 48 klst (${Math.round(hours)} klst)`}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                                  {d.description}
                                </div>
                              </div>
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    fontSize: "0.95rem",
                                    color: isCrit ? "#dc2626" : isUnder48 ? "#d97706" : "#0f172a",
                                  }}
                                >
                                  {d.target_date}
                                </div>
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    background: isCrit ? "#ef4444" : isUnder48 ? "#f59e0b" : "#10b981",
                                    color: "#fff",
                                    fontWeight: 600,
                                    display: "inline-block",
                                    marginTop: "2px",
                                  }}
                                >
                                  {isOverdue
                                    ? "Útrunnið"
                                    : isCrit
                                    ? "Aðkallandi (<24h)"
                                    : isUnder48
                                    ? "Aðkallandi (<48h)"
                                    : "Í gildi"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
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
                    <div
                      id="bundle-exhibits-tree-container"
                      className="scrollable-tree"
                      style={{
                        maxHeight: "580px",
                        overflowY: "auto",
                        overflowX: "auto",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                      }}
                    >
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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
                          Laga- og dómasafn í pgvector
                        </h3>
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          Forsendur og fordæmi Hæstaréttar og Landsréttar innbyggð í staðbundna vigragrunninn
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <button
                          id="btn-compare-precedents-statutes"
                          type="button"
                          onClick={() => setShowCompareModal(true)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: compareSelectedItems.length > 0 ? "#1d4ed8" : "#2563eb",
                            color: "#ffffff",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            border: "1px solid #1e40af",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          }}
                        >
                          <span>⚖️</span>
                          <span>Bera saman (Compare)</span>
                          {compareSelectedItems.length > 0 && (
                            <span
                              style={{
                                background: "#ffffff",
                                color: "#1d4ed8",
                                padding: "1px 6px",
                                borderRadius: "10px",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                              }}
                            >
                              {compareSelectedItems.length}/2 valin
                            </span>
                          )}
                        </button>
                        <button
                          id="btn-draft-from-law"
                          type="button"
                          onClick={() => setActiveTab("drafting")}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "#16a34a",
                            color: "#ffffff",
                            padding: "6px 14px",
                            borderRadius: "6px",
                            border: "1px solid #15803d",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
                          }}
                        >
                          <span>✍️</span>
                          <span>Mynda drög</span>
                        </button>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            background: "#f1f5f9",
                            color: "#334155",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid #cbd5e1",
                          }}
                        >
                          nomic-embed-text (768d)
                        </span>
                      </div>
                    </div>

                    {/* Comparison Selection Banner */}
                    {compareSelectedItems.length > 0 && (
                      <div
                        id="compare-selection-banner"
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "6px",
                          padding: "8px 12px",
                          marginBottom: "14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "0.82rem",
                          color: "#1e40af",
                          flexWrap: "wrap",
                          gap: "8px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700 }}>Valið til samanburðar ({compareSelectedItems.length}/2):</span>
                          {compareSelectedItems.map((item, idx) => (
                            <span
                              key={idx}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #93c5fd",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                fontWeight: 600,
                                fontSize: "0.76rem",
                              }}
                            >
                              {item.type === "precedent" ? "⚖️" : "📜"} {item.label}
                            </span>
                          ))}
                          {compareSelectedItems.length === 1 && (
                            <span style={{ color: "#3b82f6", fontStyle: "italic", fontSize: "0.76rem" }}>
                              (Veldu annan lið til viðbótar til að opna samanburð)
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => setShowCompareModal(true)}
                            style={{
                              background: "#2563eb",
                              color: "#fff",
                              border: "none",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "0.76rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Opna samanburð ➔
                          </button>
                          <button
                            type="button"
                            onClick={() => setCompareSelectedItems([])}
                            style={{
                              background: "transparent",
                              color: "#64748b",
                              border: "none",
                              fontSize: "0.76rem",
                              cursor: "pointer",
                              textDecoration: "underline",
                            }}
                          >
                            Hreinsa val
                          </button>
                        </div>
                      </div>
                    )}

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
                      <div
                        id="precedents-tree-container"
                        className="scrollable-tree"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          maxHeight: "480px",
                          overflowY: "auto",
                          overflowX: "auto",
                          paddingRight: "4px",
                        }}
                      >
                        {precedents.map((p: any) => (
                          <div
                            key={p.id}
                            style={{
                              padding: "12px 14px",
                              background: isItemInCompare("precedent", p.id) ? "#eff6ff" : "#f8fafc",
                              borderRadius: "6px",
                              border: isItemInCompare("precedent", p.id) ? "1px solid #93c5fd" : "1px solid #e2e8f0",
                              transition: "all 0.15s ease",
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
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <button
                                  id={`btn-compare-p-${p.id}`}
                                  type="button"
                                  onClick={() => handleToggleCompareItem("precedent", p.id, p.case_reference)}
                                  style={{
                                    background: isItemInCompare("precedent", p.id) ? "#dbeafe" : "#f1f5f9",
                                    border: isItemInCompare("precedent", p.id) ? "1px solid #3b82f6" : "1px solid #cbd5e1",
                                    color: isItemInCompare("precedent", p.id) ? "#1d4ed8" : "#334155",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <span>{isItemInCompare("precedent", p.id) ? "✓" : "⚖️"}</span>
                                  {isItemInCompare("precedent", p.id) ? "Valið í samanburð" : "Bera saman"}
                                </button>
                                <button
                                  type="button"
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
                      <div
                        id="statutes-tree-container"
                        className="scrollable-tree"
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                          maxHeight: "480px",
                          overflowY: "auto",
                          overflowX: "auto",
                          paddingRight: "4px",
                        }}
                      >
                        {statutes.map((s: any) => (
                          <div
                            key={s.id}
                            style={{
                              padding: "12px 14px",
                              background: isItemInCompare("statute", s.id) ? "#dcfce7" : "#f0fdf4",
                              borderRadius: "6px",
                              border: isItemInCompare("statute", s.id) ? "1px solid #4ade80" : "1px solid #bbf7d0",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                              <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#15803d" }}>
                                {s.act_name} {s.act_number} — {s.article} ({s.title})
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <button
                                  id={`btn-compare-s-${s.id}`}
                                  type="button"
                                  onClick={() => handleToggleCompareItem("statute", s.id, `${s.article} ${s.title}`)}
                                  style={{
                                    background: isItemInCompare("statute", s.id) ? "#dcfce7" : "#fff",
                                    border: isItemInCompare("statute", s.id) ? "1px solid #22c55e" : "1px solid #86efac",
                                    color: isItemInCompare("statute", s.id) ? "#15803d" : "#166534",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                    fontWeight: 500,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <span>{isItemInCompare("statute", s.id) ? "✓" : "⚖️"}</span>
                                  {isItemInCompare("statute", s.id) ? "Valið í samanburð" : "Bera saman"}
                                </button>
                                <button
                                  type="button"
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

              {/* TAB: SJÁLFVIRK SKJALAGERÐ (MYNDA DRÖG) */}
              {activeTab === "drafting" && (
                <LegalDraftingView
                  activeCase={activeCase}
                  caseDocs={docs}
                  statutes={PRE_SEEDED_STATUTES}
                  precedents={precedents}
                  preSelectedStatuteIds={compareSelectedItems.filter((i) => i.type === "statute").map((i) => i.id)}
                  preSelectedPrecedentIds={compareSelectedItems.filter((i) => i.type === "precedent").map((i) => i.id)}
                  onDocumentSaved={() => {
                    if (selectedCaseId) {
                      fetchDocs(selectedCaseId);
                    }
                  }}
                />
              )}

              {/* TAB 5: BILLING & COURT COST STATEMENT (130. gr. eml.) */}
              {activeTab === "billing" && (
                <BillingManagementTab
                  activeCase={activeCase}
                  onDocumentCreated={() => {
                    if (selectedCaseId) {
                      fetchDocs(selectedCaseId);
                    }
                  }}
                  timerSeconds={timerSeconds}
                  isTimerRunning={isTimerRunning}
                  onStartTimer={handleStartTimer}
                  onStopTimer={handleStopTimer}
                  onResetTimer={handleResetTimer}
                />
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
          id="pane-3-chat"
          style={{
            borderLeft: "1px solid #e2e8f0",
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            maxHeight: "100%",
            minHeight: 0,
            minWidth: 0,
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
            id="pane-3-chat-messages"
            className="scrollable-pane scrollable-tree"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "scroll",
              overflowX: "auto",
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

              <div
                style={{
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px dashed #cbd5e1",
                  textAlign: "center",
                }}
              >
                <button
                  type="button"
                  id="btn-switch-to-examples"
                  onClick={() => {
                    setShowNewCase(false);
                    setShowExamplePicker(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    background: "#f0fdf4",
                    color: "#166534",
                    border: "1px solid #bbf7d0",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span>📁</span>
                  <span>Eða stofna mál með dæmaskjölum úr /examples</span>
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
                  🛡️ 100% Air-Gapped Gervigreind & Innviðayfirlit
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                  Eins-skrefs uppsetning á fartölvu (<code>./install.sh</code>) • 100% einangruð lögfræðigervigreind án gagnaútflæðis
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
              {/* One-Step Installation Card */}
              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>🚀 Eins-Skrefs Uppsetning (One-Step Local Install)</strong>
                  <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    ./install.sh
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
                  Uppsetningarkerfið setur upp ILCMS og einangraða staðbundna Ollama gervigreind á fartölvunni í einu skrefi. Öll ónotuð skriftuvirki voru fjarlægð.
                </div>
                <div style={{ marginTop: "8px", fontSize: "0.78rem", background: "#ffffff", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                  <div>• <strong>Skipun á fartölvu:</strong> <code>chmod +x install.sh && ./install.sh</code></div>
                  <div>• <strong>Valmöguleikar:</strong> Styður bæði sjálfstætt Node.js keyrsluumhverfi og Docker Compose (<code>./install.sh --docker</code>).</div>
                  <div>• <strong>Trúnaðaröryggi:</strong> AI einingin er bundin við staðbundið <code>127.0.0.1</code> lykkjuviðmót með núll útflæði.</div>
                </div>
              </div>

              {/* Service 1: Icelandic Gemma 2 LLM - 100% Air-Gapped */}
              <div style={{ padding: "12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.92rem", color: "#1e3a8a" }}>🇮🇸 100% Air-Gapped Lögfræðimállíkan (Ollama)</strong>
                  <span style={{ fontSize: "0.72rem", background: "#dbeafe", color: "#1d4ed8", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    100% Staðbundið / Núll Útflæði
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#1e40af", lineHeight: 1.5 }}>
                  Sérhæft íslenskt mállíkan byggt á <strong>Gemma 2 9B Instruct / Miðeind Allra-Handa</strong>. Öll málsskjöl, stefnur, greinargerðir og viðkvæm gögn skjólstæðinga eru unnin 100% án nettengingar eða skýtenginga.
                </div>
                <div style={{ marginTop: "8px", fontSize: "0.78rem", background: "#ffffff", padding: "8px", borderRadius: "4px", border: "1px solid #bfdbfe" }}>
                  <div>• <strong>Mállíkan:</strong> <code>gemma2:9b-instruct-q4_K_M</code> (ca. 5.4 GB staðbundið)</div>
                  <div>• <strong>Vigurlíkan (Embeddings):</strong> <code>nomic-embed-text</code> (768 víddir fyrir staðbundið pgvector)</div>
                  <div>• <strong>Trúnaðarskylda:</strong> Uppfyllir 90/2018 (persónuvernd) og siðareglur Lögmannafélags Íslands um lögmannstrúnað.</div>
                  <div>• <strong>Vinnsluminni:</strong> 6GB – 8GB RAM á fartölvu</div>
                </div>
              </div>

              {/* Service 2: Keycloak OIDC */}
              <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>🔑 Keycloak 24 OIDC Auðkenningarkerfi</strong>
                  <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    OIDC / OAuth2
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
                  Keycloak þjónusta með eigin gagnagrunni (<code>keycloak_db</code>) í PostgreSQL fyrir hlutverkastýringu (lögmenn, dómarar, kerfisstjórar).
                </div>
                <div style={{ marginTop: "8px", fontSize: "0.78rem", background: "#ffffff", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}>
                  <div>• <strong>Keycloak Realm:</strong> <code>ilcms</code> | <strong>Client ID:</strong> <code>ilcms-web</code></div>
                  <div>• <strong>Kerfisstjóri:</strong> <code>admin</code> / <code>admin_secret_ilcms</code></div>
                  <div>• <strong>Prófunarnotandi (Lögmaður):</strong> <code>lawyer@ilcms.is</code> / <code>ilcms_password_2026</code></div>
                </div>
              </div>

              {/* Service 3: PostgreSQL with pgvector */}
              <div style={{ padding: "12px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "0.92rem", color: "#14532d" }}>🗄️ PostgreSQL 16 + pgvector HNSW</strong>
                  <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                    pgvector
                  </span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#166534", lineHeight: 1.5 }}>
                  Geymir málaskrárgögn (<code>ilcms_db</code>) og auðkenningargögn Keycloak (<code>keycloak_db</code>). Hraðvirk HNSW vigurleit (vector_cosine_ops) fyrir staðbundna RAG skjalaleit.
                </div>
              </div>

              {/* Hardware RAM Budget Summary */}
              <div style={{ padding: "12px", background: "#fafafa", borderRadius: "8px", border: "1px solid #e5e5e5" }}>
                <strong style={{ fontSize: "0.88rem", color: "#171717" }}>📊 Vinnsluminnisbókhald á Fartölvu (16GB – 20GB):</strong>
                <div style={{ marginTop: "6px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "0.78rem", color: "#525252" }}>
                  <div>• Air-Gapped LLM (Gemma 2 9B): <strong>~7 GB</strong></div>
                  <div>• Keycloak OIDC: <strong>~0.8 GB</strong></div>
                  <div>• PostgreSQL & pgvector: <strong>~1.5 GB</strong></div>
                  <div>• ILCMS Vefkerfi: <strong>~0.8 GB</strong></div>
                  <div>• Stýrikerfi / Varasæti: <strong>~6-8 GB FREE</strong></div>
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

      {/* Kerfisstjóraviðmót (Admin Console Modal) */}
      <AdminConsoleModal
        isOpen={showAdminConsoleModal}
        onClose={() => setShowAdminConsoleModal(false)}
        currentUser={user}
      />

      {/* Dæmaskjöl modal (/examples) */}
      <ExampleDocsPickerModal
        isOpen={showExamplePicker}
        onClose={() => setShowExamplePicker(false)}
        currentCaseId={selectedCaseId}
        cases={cases}
        onSuccess={handleExamplePickerSuccess}
      />

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
            overflowY: "auto",
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
              maxHeight: "92vh",
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
                  <div style={{ fontWeight: 700, fontSize: "0.98rem", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span>{activeDocData.title}</span>
                    <span style={{ background: "#2563eb", color: "#fff", fontSize: "0.68rem", padding: "2px 6px", borderRadius: "3px" }}>
                      {activeDocData.doc_type}
                    </span>
                    <span
                      style={{
                        background: viewingVersion ? "#d97706" : "#2563eb",
                        color: "#fff",
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        fontWeight: 700,
                      }}
                      title={viewingVersion ? `Skoðar sögulega útgáfu v${viewingVersion.version_number}` : `Núverandi virk útgáfa v${selectedDoc.version || 1}`}
                    >
                      v{viewingVersion ? viewingVersion.version_number : (selectedDoc.version || 1)}
                      {viewingVersion && " (SÖGULEG)"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                    Dómaskjal í máli {activeCase?.case_number} • {activeDocData.page_count} blaðsíður •{" "}
                    {viewingVersion
                      ? `Útgáfa skráð ${new Date(viewingVersion.created_at).toLocaleDateString("is-IS")} af ${viewingVersion.author || "höfundi"}`
                      : `Skráð ${selectedDoc.filing_date || selectedDoc.created_at?.split("T")[0]}`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {/* View Mode Toggle for PDFs */}
                {(activeDocData.is_pdf || activeDocData.pdf_data_url || activeDocData.title?.toLowerCase().endsWith(".pdf")) && (
                  <div style={{ display: "flex", background: "#1e293b", padding: "2px", borderRadius: "5px", border: "1px solid #475569" }}>
                    <button
                      type="button"
                      onClick={() => setDocViewMode("text")}
                      style={{
                        background: docViewMode === "text" ? "#2563eb" : "transparent",
                        color: "#fff",
                        border: "none",
                        borderRadius: "3px",
                        padding: "4px 8px",
                        fontSize: "0.72rem",
                        fontWeight: docViewMode === "text" ? 600 : 400,
                        cursor: "pointer",
                      }}
                      title="Skoða útdreginn texta með leitarorðaáherslu"
                    >
                      📜 Textasýn
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocViewMode("pdf")}
                      style={{
                        background: docViewMode === "pdf" ? "#2563eb" : "transparent",
                        color: "#fff",
                        border: "none",
                        borderRadius: "3px",
                        padding: "4px 8px",
                        fontSize: "0.72rem",
                        fontWeight: docViewMode === "pdf" ? 600 : 400,
                        cursor: "pointer",
                      }}
                      title="Skoða skjalið í upprunalegum PDF lesara"
                    >
                      📄 PDF skoðari
                    </button>
                  </div>
                )}

                {/* View Mode Toggle for Word DOCX */}
                {(activeDocData.is_docx || activeDocData.docx_data_url || activeDocData.title?.toLowerCase().endsWith(".docx")) && (
                  <div style={{ display: "flex", background: "#1e293b", padding: "2px", borderRadius: "5px", border: "1px solid #475569" }}>
                    <button
                      type="button"
                      onClick={() => setDocViewMode("text")}
                      style={{
                        background: docViewMode === "text" ? "#2563eb" : "transparent",
                        color: "#fff",
                        border: "none",
                        borderRadius: "3px",
                        padding: "4px 8px",
                        fontSize: "0.72rem",
                        fontWeight: docViewMode === "text" ? 600 : 400,
                        cursor: "pointer",
                      }}
                      title="Skoða texta með leitarorðaáherslu og tölfræði"
                    >
                      📜 Textasýn
                    </button>
                    {activeDocData.html_content && (
                      <button
                        type="button"
                        onClick={() => setDocViewMode("formatted")}
                        style={{
                          background: docViewMode === "formatted" ? "#2563eb" : "transparent",
                          color: "#fff",
                          border: "none",
                          borderRadius: "3px",
                          padding: "4px 8px",
                          fontSize: "0.72rem",
                          fontWeight: docViewMode === "formatted" ? 600 : 400,
                          cursor: "pointer",
                        }}
                        title="Skoða skjalið með upprunalegu sniði (Word HTML)"
                      >
                        📑 Word form
                      </button>
                    )}
                  </div>
                )}

                {/* Direct PDF Download / Open Link */}
                {activeDocData.pdf_data_url && (
                  <a
                    href={activeDocData.pdf_data_url}
                    download={activeDocData.title?.endsWith(".pdf") ? activeDocData.title : `${activeDocData.title || "skjal"}_v${activeDocData.version_number || selectedDoc.version || 1}.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Sækja eða opna upprunalega PDF skjalið"
                    style={{
                      background: "#334155",
                      color: "#e2e8f0",
                      border: "1px solid #475569",
                      borderRadius: "4px",
                      padding: "5px 9px",
                      fontSize: "0.74rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ⬇️ Sækja PDF
                  </a>
                )}

                {/* Direct DOCX Download */}
                {(activeDocData.docx_data_url || activeDocData.is_docx || activeDocData.title?.toLowerCase().endsWith(".docx")) && (
                  <button
                    type="button"
                    onClick={() => handleDownloadVersion(activeDocData)}
                    title="Sækja upprunalega Word (.docx) skjalið"
                    style={{
                      background: "#1e3a8a",
                      color: "#dbeafe",
                      border: "1px solid #3b82f6",
                      borderRadius: "4px",
                      padding: "5px 9px",
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    ⬇️ Sækja DOCX
                  </button>
                )}

                {/* Version History Button from Reader */}
                <button
                  type="button"
                  onClick={() => handleOpenVersionHistory(selectedDoc)}
                  title="Skoða allar útgáfur og endurheimta fyrri útgáfu"
                  style={{
                    background: "#1e293b",
                    color: "#93c5fd",
                    border: "1px solid #3b82f6",
                    borderRadius: "4px",
                    padding: "5px 9px",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  🕒 Útgáfur ({selectedDoc.versions?.length || 1})
                </button>

                {/* Upload Revision Button from Reader */}
                <button
                  type="button"
                  onClick={() => handleOpenUploadRevision(selectedDoc)}
                  title="Hlaða upp nýrri endurskoðaðri útgáfu af þessu skjali"
                  style={{
                    background: "#065f46",
                    color: "#a7f3d0",
                    border: "1px solid #059669",
                    borderRadius: "4px",
                    padding: "5px 9px",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  ⬆️ Ný útgáfa
                </button>

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
                    if (displayDocContent) {
                      navigator.clipboard.writeText(displayDocContent);
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
                  onClick={() => {
                    setSelectedDoc(null);
                    setViewingVersion(null);
                  }}
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

            {/* Warning / Indicator Banner when viewing historical version */}
            {viewingVersion && (
              <div
                style={{
                  background: "#fffbeb",
                  borderBottom: "1px solid #fde68a",
                  padding: "10px 18px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.82rem",
                  color: "#92400e",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "1.2rem" }}>📜</span>
                  <div>
                    <strong>Þú ert að skoða sögulega útgáfu v{viewingVersion.version_number}</strong>
                    {" "}(Skráð {new Date(viewingVersion.created_at).toLocaleString("is-IS")} af {viewingVersion.author || "höfundi"}).
                    {viewingVersion.change_summary && (
                      <span style={{ display: "block", fontSize: "0.76rem", color: "#b45309", marginTop: "2px" }}>
                        Breytingalýsing: <em>"{viewingVersion.change_summary}"</em>
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => handleRestoreVersion(selectedDoc, viewingVersion)}
                    style={{
                      background: "#d97706",
                      color: "#fff",
                      border: "none",
                      padding: "5px 12px",
                      borderRadius: "5px",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      boxShadow: "0 1px 2px rgba(217,119,6,0.25)",
                    }}
                  >
                    🔄 Endurheimta sem virka útgáfu
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingVersion(null)}
                    style={{
                      background: "#fff",
                      color: "#92400e",
                      border: "1px solid #f59e0b",
                      padding: "5px 12px",
                      borderRadius: "5px",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Aftur í virka útgáfu (v{selectedDoc.version || 1})
                  </button>
                </div>
              </div>
            )}

            {docViewMode === "pdf" ? (
              <div style={{ flex: 1, minHeight: "550px", height: "70vh", background: "#1e293b", display: "flex", flexDirection: "column" }}>
                {activeDocData.pdf_data_url ? (
                  <iframe
                    src={`${activeDocData.pdf_data_url}#toolbar=1`}
                    title={activeDocData.title}
                    style={{ width: "100%", height: "100%", minHeight: "550px", border: "none", flex: 1 }}
                  />
                ) : (
                  <div style={{ padding: "60px 20px", textAlign: "center", color: "#e2e8f0", margin: "auto" }}>
                    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📄</div>
                    <div style={{ fontWeight: 600, fontSize: "1.05rem", color: "#f8fafc" }}>PDF texti er tiltækur í textasýn</div>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "8px", maxWidth: "460px", margin: "8px auto 0", lineHeight: 1.5 }}>
                      Skjalið var móttekið og texti þess greindur. Öll gögn og lykilatriði eru leitarbær með áherslulitum í textasýn.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDocViewMode("text")}
                      style={{ marginTop: "16px", background: "#2563eb", color: "#fff", border: "none", padding: "8px 18px", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 500 }}
                    >
                      Opna textasýn & leitarorð
                    </button>
                  </div>
                )}
              </div>
            ) : docViewMode === "formatted" && activeDocData.html_content ? (
              <div
                style={{
                  flex: 1,
                  minHeight: "550px",
                  maxHeight: "75vh",
                  overflowY: "auto",
                  background: "#f1f5f9",
                  padding: "24px 20px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "860px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                    fontSize: "0.76rem",
                    color: "#64748b",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "1rem" }}>📑</span>
                    <strong>Word DOCX Sniðmátssýn</strong> • {activeDocData.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDocViewMode("text")}
                    style={{
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      padding: "4px 8px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                      color: "#1e293b",
                    }}
                  >
                    Skipta í textasýn með leitarvél 🔍
                  </button>
                </div>
                <div
                  style={{
                    background: "#ffffff",
                    width: "100%",
                    maxWidth: "860px",
                    minHeight: "650px",
                    padding: "44px 52px",
                    borderRadius: "4px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
                    color: "#1e293b",
                    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
                    lineHeight: 1.65,
                    fontSize: "0.95rem",
                  }}
                  className="prose max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: activeDocData.html_content }}
                />
              </div>
            ) : (
              <>
                {/* Search & Metadata Ribbon */}
            <div
              style={{
                padding: "10px 18px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                {/* Search input with live counter and nav buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "280px" }}>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <span style={{ position: "absolute", left: "10px", fontSize: "0.85rem", color: "#64748b" }}>🔍</span>
                    <input
                      id="input-doc-search"
                      type="text"
                      placeholder="Leita að orði eða hugtaki í skjalinu (t.d. kröfur, galli, frestur)..."
                      value={docSearchQuery}
                      onChange={(e) => setDocSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (e.shiftKey) {
                            handlePrevDocMatch();
                          } else {
                            handleNextDocMatch();
                          }
                        } else if (e.key === "Escape") {
                          setDocSearchQuery("");
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "6px 30px 6px 32px",
                        fontSize: "0.84rem",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        outline: "none",
                        background: "#ffffff",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      }}
                    />
                    {docSearchQuery && (
                      <button
                        onClick={() => setDocSearchQuery("")}
                        title="Hreinsa leit"
                        style={{
                          position: "absolute",
                          right: "8px",
                          background: "transparent",
                          border: "none",
                          color: "#94a3b8",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          padding: "2px",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Match counter & Navigation */}
                  {docSearchQuery.trim() && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {totalDocMatches > 0 ? (
                        <>
                          <span
                            style={{
                              background: "#dbeafe",
                              color: "#1e40af",
                              border: "1px solid #bfdbfe",
                              padding: "4px 8px",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {activeMatchIndex + 1} af {totalDocMatches}
                          </span>
                          <div style={{ display: "flex", gap: "2px" }}>
                            <button
                              id="btn-doc-search-prev"
                              onClick={handlePrevDocMatch}
                              title="Fyrri niðurstaða (Shift+Enter)"
                              disabled={totalDocMatches <= 1}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                padding: "4px 7px",
                                fontSize: "0.75rem",
                                cursor: totalDocMatches > 1 ? "pointer" : "default",
                                opacity: totalDocMatches > 1 ? 1 : 0.5,
                                color: "#334155",
                                fontWeight: 600,
                              }}
                            >
                              ▲
                            </button>
                            <button
                              id="btn-doc-search-next"
                              onClick={handleNextDocMatch}
                              title="Næsta niðurstaða (Enter)"
                              disabled={totalDocMatches <= 1}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "4px",
                                padding: "4px 7px",
                                fontSize: "0.75rem",
                                cursor: totalDocMatches > 1 ? "pointer" : "default",
                                opacity: totalDocMatches > 1 ? 1 : 0.5,
                                color: "#334155",
                                fontWeight: 600,
                              }}
                            >
                              ▼
                            </button>
                          </div>
                        </>
                      ) : (
                        <span
                          style={{
                            background: "#fee2e2",
                            color: "#991b1b",
                            border: "1px solid #fecaca",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                          }}
                        >
                          Engin samsvörun
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ fontSize: "0.74rem", color: "#64748b", display: "flex", gap: "10px" }}>
                  <span>Höfundur: <strong>{selectedDoc.author || "Málsaðili"}</strong></span>
                  <span>Staða: <strong style={{ color: "#16a34a" }}>{selectedDoc.status}</strong></span>
                  <span>RAG Vigrað: <strong>pgvector 768d</strong></span>
                </div>
              </div>

              {/* Quick Keyword Highlights */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Lykilhugtök í málsskjölum:</span>
                {[
                  { label: "Kröfur", query: "Kröfur" },
                  { label: "Galli / Rakaskemmdir", query: "galli" },
                  { label: "Frestir", query: "frest" },
                  { label: "Bætur / Fjárhæð", query: "kr." },
                  { label: "Matsgerð", query: "mats" },
                  { label: "Sönnunargögn", query: "sönnun" },
                ].map((item) => {
                  const isActive = docSearchQuery.toLowerCase() === item.query.toLowerCase();
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setDocSearchQuery(isActive ? "" : item.query)}
                      style={{
                        background: isActive ? "#2563eb" : "#ffffff",
                        color: isActive ? "#ffffff" : "#475569",
                        border: isActive ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
                        borderRadius: "12px",
                        padding: "2px 8px",
                        fontSize: "0.72rem",
                        fontWeight: isActive ? 600 : 500,
                        cursor: "pointer",
                        transition: "all 0.1s ease",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                      title={`Draga fram „${item.query}“ í skjalinu`}
                    >
                      <span>🔍</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
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
                  docSearchQuery.trim() && docSearchResults.regex && totalDocMatches > 0 ? (
                    (() => {
                      const text = selectedDoc.content;
                      const parts = text.split(docSearchResults.regex);
                      const testRegex = new RegExp(`^(${docSearchResults.terms.join("|")})$`, "i");
                      let matchIdx = -1;

                      return (
                        <div>
                          {parts.map((part: string, idx: number) => {
                            if (testRegex.test(part)) {
                              matchIdx++;
                              const currentIdx = matchIdx;
                              const isActive = currentIdx === activeMatchIndex;
                              return (
                                <mark
                                  id={`doc-highlight-match-${currentIdx}`}
                                  key={idx}
                                  style={{
                                    background: isActive ? "#ea580c" : "#fef08a",
                                    color: isActive ? "#ffffff" : "#713f12",
                                    fontWeight: isActive ? 700 : 600,
                                    padding: isActive ? "2px 5px" : "1px 3px",
                                    borderRadius: "3px",
                                    borderBottom: isActive ? "2px solid #9a3412" : "1.5px solid #eab308",
                                    boxShadow: isActive
                                      ? "0 0 0 2px #fdba74, 0 2px 5px rgba(234, 88, 12, 0.4)"
                                      : "none",
                                    transition: "background 0.15s ease, color 0.15s ease",
                                    display: "inline-block",
                                  }}
                                  title={`Samsvörun ${currentIdx + 1} af ${totalDocMatches} (Enter fyrir næsta)`}
                                >
                                  {part}
                                </mark>
                              );
                            }
                            return <span key={idx}>{part}</span>;
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    displayDocContent
                  )
                ) : (
                  <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontFamily: "sans-serif" }}>
                    📄 Ekkert textainnihald fannst fyrir þetta skjal.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

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

      {/* VERSION HISTORY MODAL */}
      {versionHistoryDoc && (
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
            zIndex: 9992,
            padding: "16px",
          }}
          onClick={() => setVersionHistoryDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
              border: "1px solid #cbd5e1",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
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
                <span style={{ fontSize: "1.3rem" }}>🕒</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    Útgáfusaga málsskjals
                    <span style={{ background: "#2563eb", color: "#fff", fontSize: "0.68rem", padding: "2px 8px", borderRadius: "4px" }}>
                      {versionHistoryDoc.doc_type}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                    {versionHistoryDoc.title} • {activeCase?.case_number}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenUploadRevision(versionHistoryDoc);
                  }}
                  style={{
                    background: "#059669",
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
                  }}
                >
                  <span>⬆️</span> Ný útgáfa
                </button>
                <button
                  type="button"
                  onClick={() => setVersionHistoryDoc(null)}
                  style={{
                    background: "transparent",
                    color: "#94a3b8",
                    border: "none",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: "4px 8px",
                  }}
                  title="Loka"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notice if any */}
            {versionActionNotice && (
              <div style={{ background: "#f0fdf4", borderBottom: "1px solid #bbf7d0", color: "#166534", padding: "10px 20px", fontSize: "0.82rem", fontWeight: 600 }}>
                {versionActionNotice}
              </div>
            )}

            {/* Summary info bar */}
            <div
              style={{
                padding: "12px 20px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
                fontSize: "0.78rem",
                color: "#475569",
              }}
            >
              <div>
                Núverandi virk útgáfa:{" "}
                <strong style={{ color: "#1e293b" }}>v{versionHistoryDoc.version || (versionHistoryDoc.versions?.length || 1)}</strong>
              </div>
              <div>
                Heildarfjöldi skráðra útgáfa:{" "}
                <strong style={{ color: "#1e293b" }}>{versionHistoryDoc.versions?.length || 1}</strong>
              </div>
              <div>
                Fyrst lagt fram:{" "}
                <strong style={{ color: "#1e293b" }}>{new Date(versionHistoryDoc.created_at).toLocaleDateString("is-IS")}</strong>
              </div>
            </div>

            {/* Versions List */}
            <div style={{ padding: "20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
              {(() => {
                const currentVerNum = versionHistoryDoc.version || (versionHistoryDoc.versions?.length || 1);
                const versionsList = [...(versionHistoryDoc.versions || [])].sort((a: any, b: any) => b.version_number - a.version_number);

                if (versionsList.length === 0) {
                  return (
                    <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8" }}>
                      Engin útgáfusaga skráð fyrir þetta skjal.
                    </div>
                  );
                }

                return versionsList.map((v: any) => {
                  const isActive = v.version_number === currentVerNum;
                  return (
                    <div
                      key={v.id || v.version_number}
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        border: `1px solid ${isActive ? "#86efac" : "#e2e8f0"}`,
                        background: isActive ? "#f0fdf4" : "#ffffff",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        boxShadow: isActive ? "0 2px 4px rgba(22,101,52,0.06)" : "0 1px 2px rgba(0,0,0,0.03)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <span
                            style={{
                              background: isActive ? "#15803d" : "#475569",
                              color: "#fff",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                            }}
                          >
                            v{v.version_number}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>{v.title || versionHistoryDoc.title}</span>
                              {isActive && (
                                <span
                                  style={{
                                    background: "#dcfce7",
                                    color: "#15803d",
                                    border: "1px solid #86efac",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                  }}
                                >
                                  NÚVERANDI VIRK ÚTGÁFA
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                              Skráð: <strong>{new Date(v.created_at).toLocaleString("is-IS")}</strong> • Höfundur: <em>{v.author || "Óþekktur"}</em>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons for this version */}
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          {/* View in Document Reader */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDoc(versionHistoryDoc);
                              setViewingVersion(isActive ? null : v);
                              setDocSearchQuery("");
                              setVersionHistoryDoc(null);
                            }}
                            title="Opna og lesa þessa útgáfu í dómaskjalalesara"
                            style={{
                              background: "#2563eb",
                              color: "#fff",
                              border: "none",
                              borderRadius: "5px",
                              padding: "6px 12px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            👁️ Skoða
                          </button>

                          {/* Download this version */}
                          <button
                            type="button"
                            onClick={() => handleDownloadVersion(v)}
                            title="Sækja eintak af þessari útgáfu"
                            style={{
                              background: "#f1f5f9",
                              color: "#334155",
                              border: "1px solid #cbd5e1",
                              borderRadius: "5px",
                              padding: "6px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            📥 Sækja
                          </button>

                          {/* Compare with current version */}
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                const currentDocActiveVersion = versionsList.find((item: any) => item.version_number === currentVerNum) || {
                                  version_number: currentVerNum,
                                  title: versionHistoryDoc.title,
                                  content: versionHistoryDoc.content,
                                  created_at: versionHistoryDoc.updated_at || versionHistoryDoc.created_at,
                                  author: versionHistoryDoc.author,
                                  change_summary: "Núverandi virk útgáfa",
                                  page_count: versionHistoryDoc.page_count,
                                };
                                setDiffDoc({
                                  doc: versionHistoryDoc,
                                  vA: v,
                                  vB: currentDocActiveVersion,
                                });
                              }}
                              title="Bera saman þessa útgáfu við núverandi virka útgáfu"
                              style={{
                                background: "#f8fafc",
                                color: "#475569",
                                border: "1px solid #cbd5e1",
                                borderRadius: "5px",
                                padding: "6px 10px",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              ⚖️ Bera saman
                            </button>
                          )}

                          {/* Restore as active if historical */}
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => handleRestoreVersion(versionHistoryDoc, v)}
                              title="Endurheimta þessa útgáfu sem nýjustu virka útgáfu málsskjalsins"
                              style={{
                                background: "#fff7ed",
                                color: "#c2410c",
                                border: "1px solid #fdba74",
                                borderRadius: "5px",
                                padding: "6px 12px",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              🔄 Endurheimta
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Change Note and File Details */}
                      <div
                        style={{
                          background: isActive ? "#ffffff" : "#f8fafc",
                          borderRadius: "6px",
                          border: `1px solid ${isActive ? "#dcfce7" : "#e2e8f0"}`,
                          padding: "8px 12px",
                          fontSize: "0.78rem",
                          color: "#334155",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <span style={{ fontWeight: 600, color: "#64748b" }}>Breyting:</span>
                          <span style={{ fontStyle: "italic", color: "#1e293b" }}>
                            "{v.change_summary || "Upphafleg útgáfa málsskjals"}"
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "16px", marginTop: "6px", fontSize: "0.72rem", color: "#64748b" }}>
                          <span>Fjöldi blaðsíðna: <strong>{v.page_count}</strong></span>
                          <span>Tegund: <strong>{v.is_pdf ? "PDF skjal" : v.is_docx || v.title?.toLowerCase().endsWith(".docx") ? "Word skjal (.docx)" : "Textaskjal"}</strong></span>
                          {v.file_size && <span>Stærð: <strong>{Math.round(v.file_size / 1024)} KB</strong></span>}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "14px 20px",
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "0.76rem",
                color: "#64748b",
              }}
            >
              <div>Allar breytingar eru skráðar í dómabók með fullum réttaráhrifum.</div>
              <button
                type="button"
                onClick={() => setVersionHistoryDoc(null)}
                style={{
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  padding: "6px 16px",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Loka glugga
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPLOAD REVISION MODAL */}
      {uploadRevisionDoc && (
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
            zIndex: 9993,
            padding: "16px",
          }}
          onClick={() => setUploadRevisionDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "580px",
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
                padding: "16px 20px",
                background: "#0f172a",
                color: "#fff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #334155",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>⬆️ Hlaða upp nýrri útgáfu</span>
                  <span
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      fontSize: "0.68rem",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontWeight: 700,
                    }}
                  >
                    Verður v{(uploadRevisionDoc.version || (uploadRevisionDoc.versions?.length || 1)) + 1}
                  </span>
                </div>
                <div style={{ fontSize: "0.76rem", color: "#94a3b8", marginTop: "2px" }}>
                  {uploadRevisionDoc.title}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadRevisionDoc(null)}
                style={{
                  background: "transparent",
                  color: "#94a3b8",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "4px 8px",
                }}
                title="Loka"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUploadRevisionSubmit}>
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* File picker */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                    Veldu endurskoðaða skrá (PDF eða textaskjal)
                  </label>
                  <div
                    style={{
                      border: "2px dashed #cbd5e1",
                      borderRadius: "8px",
                      padding: "20px",
                      textAlign: "center",
                      background: revisionFile ? "#f0fdf4" : "#f8fafc",
                      borderColor: revisionFile ? "#86efac" : "#cbd5e1",
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      document.getElementById("revision-file-input")?.click();
                    }}
                  >
                    <input
                      id="revision-file-input"
                      type="file"
                      accept=".pdf,.txt,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setRevisionFile(e.target.files[0]);
                        }
                      }}
                    />
                    {revisionFile ? (
                      <div>
                        <div style={{ fontSize: "1.6rem" }}>📄</div>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#15803d", marginTop: "4px" }}>
                          {revisionFile.name}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "2px" }}>
                          {Math.round(revisionFile.size / 1024)} KB • {revisionFile.type || "Skjal"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#2563eb", marginTop: "8px", textDecoration: "underline" }}>
                          Smelltu til að velja aðra skrá
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: "1.6rem", color: "#64748b" }}>📁</div>
                        <div style={{ fontWeight: 600, fontSize: "0.86rem", color: "#334155", marginTop: "4px" }}>
                          Smelltu eða dragðu nýja skrá hingað
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginTop: "2px" }}>
                          Styður PDF, TXT, DOCX skjöl
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Change note / lýsing */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                    Breytingalýsing / Athugasemd við útgáfu (fært í dómabók)
                  </label>
                  <textarea
                    rows={3}
                    value={revisionNote}
                    onChange={(e) => setRevisionNote(e.target.value)}
                    placeholder="T.d. Lagaðar innsláttarvillur í kröfugerð, nýjum málsástæðum bætt við, endurútreikningur vaxta..."
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.82rem",
                      fontFamily: "inherit",
                      lineHeight: 1.4,
                      outline: "none",
                    }}
                  />
                </div>

                {/* Author */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", marginBottom: "6px" }}>
                    Lögmaður / Höfundur útgáfu
                  </label>
                  <input
                    type="text"
                    value={revisionAuthor}
                    onChange={(e) => setRevisionAuthor(e.target.value)}
                    placeholder="Nafn lögmanns eða málflytjanda"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.82rem",
                      fontFamily: "inherit",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Error message */}
                {revisionError && (
                  <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "8px 12px", borderRadius: "6px", fontSize: "0.8rem" }}>
                    {revisionError}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "14px 20px",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <button
                  type="button"
                  onClick={() => setUploadRevisionDoc(null)}
                  disabled={uploadingRevision}
                  style={{
                    background: "#fff",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    padding: "6px 14px",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Hætta við
                </button>
                <button
                  type="submit"
                  disabled={uploadingRevision || (!revisionFile && !revisionNote.trim())}
                  style={{
                    background: "#16a34a",
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
                    boxShadow: "0 1px 2px rgba(22,163,74,0.25)",
                    opacity: uploadingRevision ? 0.7 : 1,
                  }}
                >
                  {uploadingRevision ? "Hleður upp og greinir..." : `Virkja útgáfu v${(uploadRevisionDoc.version || (uploadRevisionDoc.versions?.length || 1)) + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VERSION COMPARISON / DIFF MODAL */}
      {diffDoc && (
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
            zIndex: 9994,
            padding: "16px",
          }}
          onClick={() => setDiffDoc(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "920px",
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
                <span style={{ fontSize: "1.3rem" }}>⚖️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                    Samanburður á útgáfum: v{diffDoc.vA.version_number} vs v{diffDoc.vB.version_number}
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
                    {diffDoc.doc.title}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDiffDoc(null)}
                style={{
                  background: "transparent",
                  color: "#94a3b8",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "4px 8px",
                }}
                title="Loka"
              >
                ✕
              </button>
            </div>

            {/* Comparison Overview Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                borderBottom: "1px solid #e2e8f0",
                background: "#f8fafc",
              }}
            >
              <div style={{ padding: "14px 20px", borderRight: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ background: "#475569", color: "#fff", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>
                    v{diffDoc.vA.version_number}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>Fyrri útgáfa</span>
                </div>
                <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "4px" }}>
                  Dagsetning: {new Date(diffDoc.vA.created_at).toLocaleString("is-IS")} • Höfundur: {diffDoc.vA.author || "Óþekktur"}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#334155", marginTop: "4px", fontStyle: "italic" }}>
                  "{diffDoc.vA.change_summary || "Upphafleg útgáfa"}"
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>
                  Lengd: {diffDoc.vA.content ? diffDoc.vA.content.split(/\s+/).filter(Boolean).length : 0} orð ({diffDoc.vA.page_count || 1} bls.)
                </div>
              </div>

              <div style={{ padding: "14px 20px", background: "#f0fdf4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ background: "#15803d", color: "#fff", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 700 }}>
                    v{diffDoc.vB.version_number}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: "0.88rem", color: "#15803d" }}>Virka útgáfan</span>
                </div>
                <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "4px" }}>
                  Dagsetning: {new Date(diffDoc.vB.created_at).toLocaleString("is-IS")} • Höfundur: {diffDoc.vB.author || "Óþekktur"}
                </div>
                <div style={{ fontSize: "0.76rem", color: "#334155", marginTop: "4px", fontStyle: "italic" }}>
                  "{diffDoc.vB.change_summary || "Núverandi útgáfa"}"
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "4px" }}>
                  Lengd: {diffDoc.vB.content ? diffDoc.vB.content.split(/\s+/).filter(Boolean).length : 0} orð ({diffDoc.vB.page_count || 1} bls.)
                </div>
              </div>
            </div>

            {/* Side-by-side text preview */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", flex: 1, overflowY: "auto", minHeight: "360px" }}>
              <div style={{ padding: "16px 20px", borderRight: "1px solid #e2e8f0", background: "#fafafa", fontSize: "0.82rem", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                {diffDoc.vA.content || "[Enginn texti í þessari útgáfu]"}
              </div>
              <div style={{ padding: "16px 20px", background: "#ffffff", fontSize: "0.82rem", lineHeight: 1.6, whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                {diffDoc.vB.content || "[Enginn texti í þessari útgáfu]"}
              </div>
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
              <button
                type="button"
                onClick={() => {
                  handleRestoreVersion(diffDoc.doc, diffDoc.vA);
                  setDiffDoc(null);
                }}
                style={{
                  background: "#fff7ed",
                  color: "#c2410c",
                  border: "1px solid #fdba74",
                  borderRadius: "5px",
                  padding: "6px 14px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔄 Endurheimta v{diffDoc.vA.version_number} sem virka útgáfu
              </button>
              <button
                type="button"
                onClick={() => setDiffDoc(null)}
                style={{
                  background: "#0f172a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "5px",
                  padding: "6px 16px",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Loka samanburði
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Legal Precedents & Statutes Comparison Modal */}
      {showCompareModal && (
        <LegalCompareModal
          isOpen={showCompareModal}
          onClose={() => setShowCompareModal(false)}
          precedents={precedents}
          statutes={statutes}
          initialItemAId={compareSelectedItems[0]?.id || null}
          initialItemAType={compareSelectedItems[0]?.type || undefined}
          initialItemBId={compareSelectedItems[1]?.id || null}
          initialItemBType={compareSelectedItems[1]?.type || undefined}
        />
      )}
    </div>
  );
}
