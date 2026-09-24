"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TimeEntryItem,
  ExpenseItem,
  TimeTaskCategory,
  ExpenseType,
  TASK_CATEGORY_LABELS,
  EXPENSE_TYPE_LABELS,
  InvoiceItem,
  RetainerTransactionItem,
} from "@/lib/store";
import { CostStatementSummary } from "@/lib/costStatement";
import { CourtCostStatementGeneratorModal } from "@/components/CourtCostStatementGeneratorModal";
import { InvoiceGeneratorModal } from "@/components/InvoiceGeneratorModal";
import { InvoiceViewerModal } from "@/components/InvoiceViewerModal";
import { RetainerManagementModal } from "@/components/RetainerManagementModal";

interface BillingManagementTabProps {
  activeCase: any;
  onDocumentCreated?: () => void;
  timerSeconds: number;
  isTimerRunning: boolean;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onResetTimer: () => void;
}

export function BillingManagementTab({
  activeCase,
  onDocumentCreated,
  timerSeconds,
  isTimerRunning,
  onStartTimer,
  onStopTimer,
  onResetTimer,
}: BillingManagementTabProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntryItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [retainerTransactions, setRetainerTransactions] = useState<RetainerTransactionItem[]>([]);
  const [retainerBalance, setRetainerBalance] = useState({
    total_deposited: 0,
    total_deducted: 0,
    total_refunded: 0,
    current_balance: 0,
  });

  const [summary, setSummary] = useState<CostStatementSummary | null>(null);
  const [loading, setLoading] = useState(false);

  // Sub-navigation tab
  const [activeSubTab, setActiveSubTab] = useState<"time_expenses" | "invoices" | "retainers">(
    "time_expenses"
  );

  // Form toggles and Modals
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showInvoiceGenerator, setShowInvoiceGenerator] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [showRetainerModal, setShowRetainerModal] = useState(false);

  // Time Entry Form State
  const [timeDate, setTimeDate] = useState(new Date().toISOString().split("T")[0]);
  const [timeMinutes, setTimeMinutes] = useState<number>(60);
  const [timeRate, setTimeRate] = useState<number>(36000);
  const [timeCategory, setTimeCategory] = useState<TimeTaskCategory>("pleading");
  const [timeDesc, setTimeDesc] = useState("");
  const [timeUserName, setTimeUserName] = useState("Guðrún Sigurðardóttir hrl.");
  const [timeUserRole, setTimeUserRole] = useState("Málflytjandi / Partner");
  const [timeBillable, setTimeBillable] = useState(true);
  const [submittingTime, setSubmittingTime] = useState(false);

  // Expense Form State
  const [expType, setExpType] = useState<ExpenseType>("court_fee");
  const [expTitle, setExpTitle] = useState("");
  const [expAmount, setExpAmount] = useState<number>(26000);
  const [expVatRate, setExpVatRate] = useState<number>(0);
  const [expDate, setExpDate] = useState(new Date().toISOString().split("T")[0]);
  const [expReceipt, setExpReceipt] = useState("");
  const [submittingExp, setSubmittingExp] = useState(false);

  // Fetch billing data whenever activeCase changes
  const fetchBillingData = async () => {
    if (!activeCase?.id) return;
    setLoading(true);
    try {
      const [resTime, resExp, resInvoices, resRetainers] = await Promise.all([
        fetch(`/api/v1/cases/${activeCase.id}/time-entries`),
        fetch(`/api/v1/cases/${activeCase.id}/expenses`),
        fetch(`/api/v1/cases/${activeCase.id}/invoices`),
        fetch(`/api/v1/cases/${activeCase.id}/retainers`),
      ]);

      if (resTime.ok) {
        const timeData = await resTime.json();
        setTimeEntries(timeData.time_entries || []);
        if (timeData.summary) {
          setSummary(timeData.summary);
        }
      }

      if (resExp.ok) {
        const expData = await resExp.json();
        setExpenses(expData.expenses || []);
      }

      if (resInvoices.ok) {
        const invData = await resInvoices.json();
        setInvoices(invData.invoices || []);
      }

      if (resRetainers.ok) {
        const retData = await resRetainers.json();
        setRetainerTransactions(retData.transactions || []);
        if (retData.balance) {
          setRetainerBalance(retData.balance);
        }
      }
    } catch (err) {
      console.error("Error fetching billing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [activeCase?.id]);

  // Update VAT rate default when expense type changes
  const handleExpTypeChange = (t: ExpenseType) => {
    setExpType(t);
    if (t === "court_fee") {
      setExpVatRate(0);
      setExpAmount(26000); // Standard civil court summons registration fee
      if (!expTitle) setExpTitle("Dómgjald vegna útgáfu stefnu (l. nr. 88/1991)");
    } else if (t === "service_fee") {
      setExpVatRate(0.24);
      setExpAmount(14500);
      if (!expTitle) setExpTitle("Stefnubirting á gagnaðila (Stefnuvottar)");
    } else {
      setExpVatRate(0.24);
    }
  };

  // Convert running timer to log form
  const handleConvertTimerToLog = () => {
    if (timerSeconds > 0) {
      // Round to nearest 5 minutes, minimum 15 mins
      const mins = Math.max(15, Math.ceil(timerSeconds / 300) * 5);
      setTimeMinutes(mins);
      onStopTimer();
    }
    setShowTimeForm(true);
  };

  // Submit Time Entry
  const handleSubmitTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeDesc.trim() || !activeCase?.id) return;
    setSubmittingTime(true);
    try {
      const res = await fetch(`/api/v1/cases/${activeCase.id}/time-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: timeDate,
          duration_minutes: Number(timeMinutes),
          hourly_rate: Number(timeRate),
          task_category: timeCategory,
          description: timeDesc,
          user_name: timeUserName,
          user_role: timeUserRole,
          is_billable: timeBillable,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTimeDesc("");
        setShowTimeForm(false);
        onResetTimer();
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingTime(false);
    }
  };

  // Delete Time Entry
  const handleDeleteTime = async (entryId: string) => {
    if (!confirm("Ertu viss um að vilja eyða þessari tímabókun?")) return;
    try {
      const res = await fetch(
        `/api/v1/cases/${activeCase.id}/time-entries?entryId=${entryId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit Expense
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expTitle.trim() || !activeCase?.id) return;
    setSubmittingExp(true);
    try {
      const res = await fetch(`/api/v1/cases/${activeCase.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expense_type: expType,
          title: expTitle,
          amount: Number(expAmount),
          vat_rate: Number(expVatRate),
          incurred_date: expDate,
          receipt_doc_title: expReceipt,
        }),
      });
      if (res.ok) {
        setExpTitle("");
        setExpReceipt("");
        setShowExpenseForm(false);
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingExp(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Ertu viss um að vilja eyða þessum kostnaðarlið?")) return;
    try {
      const res = await fetch(
        `/api/v1/cases/${activeCase.id}/expenses?expenseId=${expenseId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        fetchBillingData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Cost Statement Generator Modal
  const handleOpenCostStatement = () => {
    setShowStatementModal(true);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    if (h > 0) {
      return `${h}:${remM.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Banner: Financial Overview / KPIs */}
      <div
        style={{
          background: "#fff",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>
                Fjármál, tímaskráning & málskostnaður
              </h3>
              <span
                style={{
                  fontSize: "0.72rem",
                  background: "#dbeafe",
                  color: "#1e40af",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontWeight: 600,
                }}
              >
                130. gr. laga nr. 91/1991
              </span>
            </div>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Lögmannsþóknun, vinnustundir og útlagður kostnaður vegna málsins{" "}
              <strong>{activeCase?.case_number}</strong>
            </p>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => setShowInvoiceGenerator(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(5,150,105,0.2)",
              }}
            >
              <span>🧾</span>
              <span>Nýr reikningur</span>
            </button>

            <button
              onClick={() => setShowRetainerModal(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#4338ca",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(67,56,202,0.2)",
              }}
            >
              <span>🏦</span>
              <span>Tryggingafé</span>
            </button>

            <button
              onClick={handleOpenCostStatement}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "8px 14px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
              }}
            >
              <span>⚖️</span>
              <span>Málskostnaðaryfirlit</span>
            </button>
          </div>
        </div>

        {/* 6 Financial Metric Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "12px",
          }}
        >
          <div
            style={{
              background: "#f8fafc",
              padding: "12px 14px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
              Gjaldgengur tími
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginTop: "2px" }}>
              {summary ? `${summary.billableHours} klst.` : "0.0 klst."}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
              Alls skráð: {summary?.totalHours || 0} klst. ({timeEntries.length} færslur)
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              padding: "12px 14px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
              Lögmannsþóknun án VSK
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#2563eb", marginTop: "2px" }}>
              {summary ? `${summary.legalFeeExVat.toLocaleString("is-IS")} kr.` : "0 kr."}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
              VSK (24%): kr. {summary?.legalFeeVat.toLocaleString("is-IS") || 0}
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              padding: "12px 14px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
              Útlagður kostnaður & gjöld
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#d97706", marginTop: "2px" }}>
              {summary ? `${summary.totalExpensesIncVat.toLocaleString("is-IS")} kr.` : "0 kr."}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "2px" }}>
              Dómgjöld: kr. {summary?.courtFees.toLocaleString("is-IS") || 0} ({expenses.length} liðir)
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              padding: "12px 14px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>
              Krafa 130. gr. eml.
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#15803d", marginTop: "2px" }}>
              {summary ? `${summary.grandTotalClaim.toLocaleString("is-IS")} kr.` : "0 kr."}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#166534", marginTop: "2px" }}>
              Heildarkrafa málskostnaðar
            </div>
          </div>

          <div
            style={{
              background: retainerBalance.current_balance > 0 ? "#f0fdf4" : "#f8fafc",
              padding: "12px 14px",
              borderRadius: "6px",
              border: retainerBalance.current_balance > 0 ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: retainerBalance.current_balance > 0 ? "#15803d" : "#64748b", fontWeight: 600 }}>
              Óráðstafað tryggingafé
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: retainerBalance.current_balance > 0 ? "#15803d" : "#475569", marginTop: "2px" }}>
              kr. {retainerBalance.current_balance.toLocaleString("is-IS")}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
              Móttekið samtals: kr. {retainerBalance.total_deposited.toLocaleString("is-IS")}
            </div>
          </div>

          <div
            style={{
              background: "#f8fafc",
              padding: "12px 14px",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>
              Útgefnir reikningar
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
              kr. {invoices.reduce((acc, i) => acc + i.total_inc_vat, 0).toLocaleString("is-IS")}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
              {invoices.length} reikningar ({invoices.filter((i) => i.status === "paid").length} greiddir)
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "2px solid #e2e8f0",
          paddingBottom: "8px",
        }}
      >
        <button
          onClick={() => setActiveSubTab("time_expenses")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: activeSubTab === "time_expenses" ? "#1e293b" : "#f1f5f9",
            color: activeSubTab === "time_expenses" ? "#fff" : "#475569",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span>⏱️</span>
          <span>Tímaskráning & Útgjöld</span>
          <span
            style={{
              fontSize: "0.72rem",
              background: activeSubTab === "time_expenses" ? "rgba(255,255,255,0.2)" : "#cbd5e1",
              padding: "1px 6px",
              borderRadius: "10px",
            }}
          >
            {timeEntries.length + expenses.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("invoices")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: activeSubTab === "invoices" ? "#1e293b" : "#f1f5f9",
            color: activeSubTab === "invoices" ? "#fff" : "#475569",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span>🧾</span>
          <span>Reikningar & Innheimta</span>
          <span
            style={{
              fontSize: "0.72rem",
              background: activeSubTab === "invoices" ? "rgba(255,255,255,0.2)" : "#cbd5e1",
              padding: "1px 6px",
              borderRadius: "10px",
            }}
          >
            {invoices.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab("retainers")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            background: activeSubTab === "retainers" ? "#1e293b" : "#f1f5f9",
            color: activeSubTab === "retainers" ? "#fff" : "#475569",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <span>🏦</span>
          <span>Tryggingafé & Vörslureikningur</span>
          <span
            style={{
              fontSize: "0.72rem",
              background: activeSubTab === "retainers" ? "rgba(255,255,255,0.2)" : "#cbd5e1",
              padding: "1px 6px",
              borderRadius: "10px",
            }}
          >
            kr. {retainerBalance.current_balance.toLocaleString("is-IS")}
          </span>
        </button>
      </div>

      {activeSubTab === "time_expenses" && (
        <>

      {/* Live Interactive Stopwatch & Active Tracking Bar */}
      <div
        style={{
          background: isTimerRunning ? "#eff6ff" : "#f8fafc",
          border: isTimerRunning ? "1.5px solid #3b82f6" : "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "14px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: isTimerRunning ? "#2563eb" : "#e2e8f0",
              color: isTimerRunning ? "#fff" : "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
            }}
          >
            ⏱️
          </div>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.03em" }}>
              Bein tímataka / Skeiðklukka lögmanns
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color: isTimerRunning ? "#1d4ed8" : "#334155",
                }}
              >
                {formatSeconds(timerSeconds)}
              </span>
              {isTimerRunning && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#2563eb",
                    animation: "pulse 1.5s infinite",
                    fontWeight: 600,
                  }}
                >
                  ● Í vinnslu ({activeCase?.case_number})
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {!isTimerRunning ? (
            <button
              onClick={onStartTimer}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: "5px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>▶</span> Ræsa tímatöku
            </button>
          ) : (
            <button
              onClick={onStopTimer}
              style={{
                background: "#dc2626",
                color: "#fff",
                border: "none",
                padding: "8px 14px",
                borderRadius: "5px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>⏸</span> Stöðva tímatöku
            </button>
          )}

          {timerSeconds > 0 && (
            <>
              <button
                onClick={handleConvertTimerToLog}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  padding: "8px 14px",
                  borderRadius: "5px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Bóka tíma ({Math.max(15, Math.ceil(timerSeconds / 300) * 5)} mín)
              </button>
              <button
                onClick={onResetTimer}
                style={{
                  background: "#fff",
                  color: "#64748b",
                  border: "1px solid #cbd5e1",
                  padding: "8px 12px",
                  borderRadius: "5px",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                Núllstilla
              </button>
            </>
          )}
        </div>
      </div>

      {/* SECTION 1: TIME ENTRIES TABLE */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fcfcfd",
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: "1rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🕒 Skráðir vinnutímar</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "#e2e8f0",
                  color: "#334155",
                  padding: "1px 7px",
                  borderRadius: "10px",
                }}
              >
                {timeEntries.length}
              </span>
            </h4>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
              Sundurliðuð verkefni, viðtöl, gagnaöflun og málflutningur
            </div>
          </div>

          <button
            onClick={() => setShowTimeForm(!showTimeForm)}
            style={{
              background: showTimeForm ? "#f1f5f9" : "#0284c7",
              color: showTimeForm ? "#334155" : "#fff",
              border: showTimeForm ? "1px solid #cbd5e1" : "none",
              padding: "7px 14px",
              borderRadius: "5px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{showTimeForm ? "✕ Loka formi" : "+ Skrá nýjan tíma"}</span>
          </button>
        </div>

        {/* TIME FORM ACCORDION */}
        {showTimeForm && (
          <form
            onSubmit={handleSubmitTime}
            style={{
              padding: "18px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>
              Nýr vinnuliður fyrir {activeCase?.case_number}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Dagsetning verks
                </label>
                <input
                  type="date"
                  value={timeDate}
                  onChange={(e) => setTimeDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Lengd (mínútur)
                </label>
                <div style={{ display: "flex", gap: "4px" }}>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    value={timeMinutes}
                    onChange={(e) => setTimeMinutes(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      boxSizing: "border-box",
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setTimeMinutes((prev) => prev + 15)}
                    style={{ padding: "0 8px", background: "#e2e8f0", border: "none", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
                  >
                    +15m
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeMinutes((prev) => prev + 60)}
                    style={{ padding: "0 8px", background: "#e2e8f0", border: "none", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
                  >
                    +1h
                  </button>
                </div>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                  = {(timeMinutes / 60).toFixed(2)} klst.
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Tímagjald (kr./klst)
                </label>
                <input
                  type="number"
                  step="500"
                  value={timeRate}
                  onChange={(e) => setTimeRate(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Tegund / Verkþáttur
                </label>
                <select
                  value={timeCategory}
                  onChange={(e) => setTimeCategory(e.target.value as TimeTaskCategory)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                    background: "#fff",
                  }}
                >
                  <option value="pleading">Stefnu- og greinargerðarsmíð</option>
                  <option value="discovery">Gagnaöflun og skjalaskoðun</option>
                  <option value="hearing">Dómþing og málflutningur</option>
                  <option value="consultation">Viðtöl við umbjóðanda/vitni</option>
                  <option value="correspondence">Samskipti við dóm/gagnaðila</option>
                  <option value="research">Lagarannsóknir og fordæmi</option>
                  <option value="other">Önnur lögfræðistörf</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Lýsing á lögfræðistörfum (kemur fram í málskostnaðaryfirliti)
                </label>
                <input
                  type="text"
                  placeholder="t.d. Samning stefnu, yfirferð gagna og fundur með aðila..."
                  value={timeDesc}
                  onChange={(e) => setTimeDesc(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Starfsmaður
                </label>
                <input
                  type="text"
                  value={timeUserName}
                  onChange={(e) => setTimeUserName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", color: "#334155", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={timeBillable}
                  onChange={(e) => setTimeBillable(e.target.checked)}
                />
                <span>Gjaldgengur liður í málskostnaðarkröfu (billable)</span>
              </label>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowTimeForm(false)}
                  style={{
                    padding: "7px 14px",
                    background: "#fff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Hætta við
                </button>
                <button
                  type="submit"
                  disabled={submittingTime}
                  style={{
                    padding: "7px 18px",
                    background: "#0284c7",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {submittingTime ? "Vistar..." : "Vista tímafærslu"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TIME TABLE */}
        <div
          id="billing-time-entries-tree"
          className="scrollable-tree"
          style={{ overflowX: "auto", overflowY: "auto", maxHeight: "480px" }}
        >
          {timeEntries.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "0.88rem" }}>
              Engar tímafærslur hafa verið skráðar á þetta mál enn sem komið er.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Dags.</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Starfsmaður</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Flokkur</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Lýsing á verki</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Tími</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Tímagjald</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Fjárhæð án VSK</th>
                  <th style={{ padding: "10px 14px", textAlign: "center" }}>Aðgerð</th>
                </tr>
              </thead>
              <tbody>
                {timeEntries.map((item) => {
                  const hours = item.duration_minutes / 60;
                  const fee = Math.round(hours * item.hourly_rate);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: item.is_billable ? "#fff" : "#fafafa",
                      }}
                    >
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#334155" }}>
                        {item.date}
                      </td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#1e293b", fontWeight: 500 }}>
                        {item.user_name}
                      </td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontWeight: 500,
                          }}
                        >
                          {TASK_CATEGORY_LABELS[item.task_category] || item.task_category}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569", maxWidth: "300px" }}>
                        {item.description}
                        {!item.is_billable && (
                          <span style={{ marginLeft: "6px", fontSize: "0.7rem", color: "#94a3b8", fontStyle: "italic" }}>
                            (Ógjaldgengt)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>
                        {hours.toFixed(1)} klst.
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#64748b", whiteSpace: "nowrap" }}>
                        {item.hourly_rate.toLocaleString("is-IS")} kr.
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#2563eb", whiteSpace: "nowrap" }}>
                        {item.is_billable ? `${fee.toLocaleString("is-IS")} kr.` : "0 kr."}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteTime(item.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                          title="Eyða færslu"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SECTION 2: EXPENSES & COURT FEES TABLE */}
      <div
        style={{
          background: "#fff",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#fcfcfd",
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: "1rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🧾 Útlagður kostnaður & dómgjöld</span>
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "#e2e8f0",
                  color: "#334155",
                  padding: "1px 7px",
                  borderRadius: "10px",
                }}
              >
                {expenses.length}
              </span>
            </h4>
            <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "2px" }}>
              Dómgjöld (l. nr. 88/1991), birtingargjöld, matsgerðir og önnur útlögð gjöld
            </div>
          </div>

          <button
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            style={{
              background: showExpenseForm ? "#f1f5f9" : "#d97706",
              color: showExpenseForm ? "#334155" : "#fff",
              border: showExpenseForm ? "1px solid #cbd5e1" : "none",
              padding: "7px 14px",
              borderRadius: "5px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{showExpenseForm ? "✕ Loka formi" : "+ Skrá útlagðan kostnað"}</span>
          </button>
        </div>

        {/* EXPENSE FORM ACCORDION */}
        {showExpenseForm && (
          <form
            onSubmit={handleSubmitExpense}
            style={{
              padding: "18px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>
              Nýr útlagður kostnaður vegna {activeCase?.case_number}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Tegund útlags
                </label>
                <select
                  value={expType}
                  onChange={(e) => handleExpTypeChange(e.target.value as ExpenseType)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                    background: "#fff",
                  }}
                >
                  <option value="court_fee">Dómgjöld (l. nr. 88/1991 - 0% VSK)</option>
                  <option value="service_fee">Stefnubirtingarkostnaður (24% VSK)</option>
                  <option value="expert_appraisal">Matsgerðir / Sérfræðingar (24% VSK)</option>
                  <option value="travel">Ferðakostnaður</option>
                  <option value="other">Ýmis útlagður kostnaður</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Dagsetning
                </label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Fjárhæð án VSK (kr.)
                </label>
                <input
                  type="number"
                  step="100"
                  value={expAmount}
                  onChange={(e) => setExpAmount(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  VSK hlutfall
                </label>
                <select
                  value={expVatRate}
                  onChange={(e) => setExpVatRate(Number(e.target.value))}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                    background: "#fff",
                  }}
                >
                  <option value={0}>0% (Lögbundin dómgjöld)</option>
                  <option value={0.24}>24% (Almennt þjónustugjald)</option>
                  <option value={0.11}>11% (Gisting/ferðir)</option>
                </select>
                <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                  VSK: kr. {Math.round(expAmount * expVatRate).toLocaleString("is-IS")}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Lýsing á kostnaðarlið
                </label>
                <input
                  type="text"
                  placeholder="t.d. Dómgjald vegna útgáfu stefnu, reikningur stefnuvotta..."
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "#475569", marginBottom: "4px", fontWeight: 500 }}>
                  Fylgiskjal / Kvittun (heiti eða skjal)
                </label>
                <input
                  type="text"
                  placeholder="t.d. Kvittun Héraðsdóms.pdf"
                  value={expReceipt}
                  onChange={(e) => setExpReceipt(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => setShowExpenseForm(false)}
                style={{
                  padding: "7px 14px",
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                Hætta við
              </button>
              <button
                type="submit"
                disabled={submittingExp}
                style={{
                  padding: "7px 18px",
                  background: "#d97706",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {submittingExp ? "Vistar..." : "Vista kostnaðarlið"}
              </button>
            </div>
          </form>
        )}

        {/* EXPENSES TABLE */}
        <div
          id="billing-expenses-tree"
          className="scrollable-tree"
          style={{ overflowX: "auto", overflowY: "auto", maxHeight: "480px" }}
        >
          {expenses.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "0.88rem" }}>
              Enginn útlagður kostnaður skráður.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Dags.</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Tegund</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600 }}>Lýsing og fylgigagn</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Án VSK</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>VSK</th>
                  <th style={{ padding: "10px 14px", fontWeight: 600, textAlign: "right" }}>Samtals</th>
                  <th style={{ padding: "10px 14px", textAlign: "center" }}>Aðgerð</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const total = exp.amount + (exp.vat_amount || 0);
                  return (
                    <tr key={exp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#334155" }}>
                        {exp.incurred_date}
                      </td>
                      <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            background: exp.expense_type === "court_fee" ? "#ecfdf5" : "#fef3c7",
                            color: exp.expense_type === "court_fee" ? "#065f46" : "#92400e",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontWeight: 500,
                          }}
                        >
                          {EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", color: "#1e293b" }}>
                        <div>{exp.title}</div>
                        {exp.receipt_doc_title && (
                          <div style={{ fontSize: "0.72rem", color: "#0284c7", marginTop: "2px" }}>
                            📎 {exp.receipt_doc_title}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#64748b", whiteSpace: "nowrap" }}>
                        {exp.amount.toLocaleString("is-IS")} kr.
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "#64748b", whiteSpace: "nowrap" }}>
                        {exp.vat_amount ? `${exp.vat_amount.toLocaleString("is-IS")} kr.` : "0 kr."}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#d97706", whiteSpace: "nowrap" }}>
                        {total.toLocaleString("is-IS")} kr.
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "center" }}>
                        <button
                          onClick={() => handleDeleteExpense(exp.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "0.85rem",
                          }}
                          title="Eyða kostnaðarlið"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      </>
      )}

      {/* SUB-TAB 2: REIKNINGAR & INNHEIMTA */}
      {activeSubTab === "invoices" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "#fff",
              padding: "16px 20px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a", fontWeight: 700 }}>
                🧾 Útgefnir reikningar og innheimta
              </h3>
              <p style={{ margin: "3px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                Reikningar gefnir út á hendur umbjóðanda með lögboðnum VSK og ráðstöfun tryggingafjár.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowInvoiceGenerator(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#059669",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 1px 2px rgba(5,150,105,0.2)",
                }}
              >
                <span>➕</span>
                <span>Nýr reikningur</span>
              </button>
            </div>
          </div>

          {/* Invoices List Table */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            {invoices.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>🧾</span>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#1e293b" }}>
                  Engir reikningar hafa verið búnir til fyrir þetta mál.
                </div>
                <div style={{ fontSize: "0.82rem", marginTop: "4px", color: "#94a3b8" }}>
                  Smelltu á „Nýr reikningur“ til að sækja óreikningsfærða tíma og útgjöld.
                </div>
                <button
                  onClick={() => setShowInvoiceGenerator(true)}
                  style={{
                    marginTop: "16px",
                    background: "#059669",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 18px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Búa til fyrsta reikninginn
                </button>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Reikningsnr.</th>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Útgáfudagur</th>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Gjalddagi</th>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Greiðandi</th>
                    <th style={{ textAlign: "right", padding: "10px 14px" }}>Án VSK</th>
                    <th style={{ textAlign: "right", padding: "10px 14px" }}>M. VSK</th>
                    <th style={{ textAlign: "right", padding: "10px 14px" }}>Tryggingafé</th>
                    <th style={{ textAlign: "right", padding: "10px 14px" }}>Til greiðslu</th>
                    <th style={{ textAlign: "center", padding: "10px 14px" }}>Staða</th>
                    <th style={{ textAlign: "center", padding: "10px 14px" }}>Aðgerðir</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const isPaid = inv.status === "paid";
                    const isCancelled = inv.status === "cancelled";
                    const isDraft = inv.status === "draft";

                    return (
                      <tr
                        key={inv.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: isCancelled ? "#f8fafc" : "#fff",
                          opacity: isCancelled ? 0.65 : 1,
                        }}
                      >
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#1e3a8a" }}>
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#1d4ed8",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              cursor: "pointer",
                              textDecoration: "underline",
                              padding: 0,
                            }}
                          >
                            {inv.invoice_number}
                          </button>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{inv.issue_date}</td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{inv.due_date}</td>
                        <td style={{ padding: "10px 14px", color: "#0f172a", fontWeight: 500 }}>
                          {inv.client_name}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: "#64748b" }}>
                          kr. {inv.subtotal_ex_vat.toLocaleString("is-IS")}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
                          kr. {inv.total_inc_vat.toLocaleString("is-IS")}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", color: inv.retainer_deducted > 0 ? "#15803d" : "#94a3b8" }}>
                          {inv.retainer_deducted > 0 ? `- kr. ${inv.retainer_deducted.toLocaleString("is-IS")}` : "0 kr."}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: isPaid ? "#15803d" : "#2563eb" }}>
                          kr. {inv.final_amount_due.toLocaleString("is-IS")}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: isPaid ? "#dcfce7" : isCancelled ? "#f1f5f9" : isDraft ? "#fef3c7" : "#eff6ff",
                              color: isPaid ? "#15803d" : isCancelled ? "#64748b" : isDraft ? "#b45309" : "#1d4ed8",
                              border: `1px solid ${isPaid ? "#bbf7d0" : isCancelled ? "#cbd5e1" : isDraft ? "#fde68a" : "#bfdbfe"}`,
                            }}
                          >
                            {isPaid ? "GREIDDUR" : isCancelled ? "NIÐURFELDUR" : isDraft ? "DRÖG" : "ÚTGEFINN"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            style={{
                              padding: "4px 10px",
                              background: "#f1f5f9",
                              color: "#1e293b",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Skoða / Prenta
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: TRYGGINGAFÉ & VÖRSLUREIKNINGUR */}
      {activeSubTab === "retainers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Trust Account Legal Callout */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.2rem" }}>🏛️</span>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#166534", fontWeight: 700 }}>
                  Vörslufjárreikningur skjólstæðings (Tryggingafé)
                </h4>
                <span style={{ fontSize: "0.72rem", background: "#dcfce7", color: "#15803d", padding: "1px 6px", borderRadius: "10px", fontWeight: 600 }}>
                  Reglur LMFÍ um fjárreiður lögmanna
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#15803d" }}>
                Innborgun er varðveitt á sérgreindum vörslureikningi lögmannsstofunnar uns henni er lögmætlega ráðstafað á móti útgefnum reikningi eða hún endurgreidd.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowRetainerModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#166534",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>➕</span>
                <span>Skrá innborgun / færslu</span>
              </button>
            </div>
          </div>

          {/* Retainer Metric Highlights */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            <div style={{ background: "#fff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Móttekið samtals</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#166534", marginTop: "2px" }}>
                kr. {retainerBalance.total_deposited.toLocaleString("is-IS")}
              </div>
            </div>

            <div style={{ background: "#fff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Ráðstafað á reikninga</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#1d4ed8", marginTop: "2px" }}>
                kr. {retainerBalance.total_deducted.toLocaleString("is-IS")}
              </div>
            </div>

            <div style={{ background: "#fff", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>Endurgreitt</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#64748b", marginTop: "2px" }}>
                kr. {retainerBalance.total_refunded.toLocaleString("is-IS")}
              </div>
            </div>

            <div style={{ background: "#f0fdf4", padding: "14px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
              <div style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: 700 }}>Óráðstafað tryggingafé</div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#15803d", marginTop: "2px" }}>
                kr. {retainerBalance.current_balance.toLocaleString("is-IS")}
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "0.88rem", color: "#0f172a", fontWeight: 700 }}>
                📜 Færslubók vörslufjárreiknings ({retainerTransactions.length} hreyfingar)
              </h4>
            </div>

            {retainerTransactions.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
                Engar færslur hafa verið skráðar á tryggingafé þessa máls.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1.5px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Dags.</th>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Tegund</th>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Tilvísun & Skýring</th>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Tengdur reikningur</th>
                    <th style={{ textAlign: "left", padding: "10px 14px" }}>Greiðslumáti</th>
                    <th style={{ textAlign: "right", padding: "10px 14px" }}>Fjárhæð</th>
                  </tr>
                </thead>
                <tbody>
                  {retainerTransactions.map((tx) => {
                    const isDeposit = tx.type === "deposit";
                    const isDeduction = tx.type === "deduction";
                    return (
                      <tr key={tx.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>{tx.date}</td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "4px",
                              background: isDeposit ? "#dcfce7" : isDeduction ? "#eff6ff" : "#fee2e2",
                              color: isDeposit ? "#15803d" : isDeduction ? "#1d4ed8" : "#b91c1c",
                            }}
                          >
                            {isDeposit ? "Innborgun" : isDeduction ? "Ráðstöfun" : "Endurgreiðsla"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#1e293b" }}>
                          <div>{tx.reference}</div>
                          {tx.notes && <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{tx.notes}</div>}
                        </td>
                        <td style={{ padding: "10px 14px", color: "#1e3a8a", fontWeight: 500 }}>
                          {tx.invoice_number ? tx.invoice_number : "—"}
                        </td>
                        <td style={{ padding: "10px 14px", color: "#64748b" }}>
                          {tx.payment_method === "bank_transfer"
                            ? "Millifærsla"
                            : tx.payment_method === "credit_card"
                            ? "Kort"
                            : tx.payment_method === "cash"
                            ? "Reiðufé"
                            : "Annað"}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "10px 14px",
                            fontWeight: 700,
                            color: isDeposit ? "#166534" : "#dc2626",
                          }}
                        >
                          {isDeposit ? "+" : "-"} kr. {tx.amount.toLocaleString("is-IS")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* COURT COST STATEMENT GENERATOR MODAL (130. gr. eml.) */}
      {showStatementModal && (
        <CourtCostStatementGeneratorModal
          activeCase={activeCase}
          timeEntries={timeEntries}
          expenses={expenses}
          onClose={() => setShowStatementModal(false)}
          onDocumentCreated={() => {
            if (onDocumentCreated) onDocumentCreated();
            fetchBillingData();
          }}
        />
      )}

      {/* INVOICE GENERATOR MODAL */}
      {showInvoiceGenerator && (
        <InvoiceGeneratorModal
          activeCase={activeCase}
          timeEntries={timeEntries}
          expenses={expenses}
          availableRetainerBalance={retainerBalance.current_balance}
          onClose={() => setShowInvoiceGenerator(false)}
          onInvoiceCreated={() => {
            fetchBillingData();
            if (onDocumentCreated) onDocumentCreated();
            setActiveSubTab("invoices");
          }}
        />
      )}

      {/* INVOICE VIEWER & PRINT MODAL */}
      {selectedInvoice && (
        <InvoiceViewerModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onInvoiceUpdated={() => {
            fetchBillingData();
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* RETAINER MANAGEMENT MODAL */}
      {showRetainerModal && (
        <RetainerManagementModal
          activeCase={activeCase}
          transactions={retainerTransactions}
          balance={retainerBalance}
          onClose={() => setShowRetainerModal(false)}
          onRetainerUpdated={() => {
            fetchBillingData();
          }}
        />
      )}
    </div>
  );
}
