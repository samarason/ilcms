"use client";

import React, { useState, useMemo } from "react";
import {
  CaseItem,
  TimeEntryItem,
  ExpenseItem,
  TASK_CATEGORY_LABELS,
  EXPENSE_TYPE_LABELS,
  InvoiceLineItem,
} from "@/lib/store";

interface InvoiceGeneratorModalProps {
  activeCase: CaseItem;
  timeEntries: TimeEntryItem[];
  expenses: ExpenseItem[];
  availableRetainerBalance: number;
  onClose: () => void;
  onInvoiceCreated: () => void;
}

export function InvoiceGeneratorModal({
  activeCase,
  timeEntries,
  expenses,
  availableRetainerBalance,
  onClose,
  onInvoiceCreated,
}: InvoiceGeneratorModalProps) {
  // Client Details
  const defaultClientName = useMemo(() => {
    if (!activeCase?.title) return "Umbjóðandi";
    return activeCase.title.split(" gegn ")[0] || "Umbjóðandi";
  }, [activeCase?.title]);

  const [clientName, setClientName] = useState(defaultClientName);
  const [clientKennitala, setClientKennitala] = useState(
    activeCase?.id === "case-01" ? "520412-0890" : activeCase?.id === "case-02" ? "140582-3929" : ""
  );
  const [clientAddress, setClientAddress] = useState(
    activeCase?.id === "case-01" ? "Skútuvogi 12, 104 Reykjavík" : ""
  );

  // Law firm / Attorney details
  const [attorneyName, setAttorneyName] = useState("Guðrún Sigurðardóttir hrl.");

  // Dates
  const todayStr = new Date().toISOString().split("T")[0];
  const [issueDate, setIssueDate] = useState(todayStr);

  const defaultDueDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  }, []);
  const [dueDate, setDueDate] = useState(defaultDueDate);

  const defaultPenaltyDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  }, []);
  const [penaltyDate, setPenaltyDate] = useState(defaultPenaltyDate);

  // Unbilled filter: by default, select only unbilled and billable items
  const unbilledTimes = useMemo(() => {
    return timeEntries.filter((t) => t.status === "unbilled" && t.is_billable);
  }, [timeEntries]);

  const unbilledExpenses = useMemo(() => {
    return expenses.filter((e) => e.status === "unbilled");
  }, [expenses]);

  const [selectedTimeIds, setSelectedTimeIds] = useState<string[]>(() =>
    unbilledTimes.map((t) => t.id)
  );
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(() =>
    unbilledExpenses.map((e) => e.id)
  );

  // Retainer Deduction Toggle & Amount
  const [applyRetainer, setApplyRetainer] = useState(availableRetainerBalance > 0);
  const [retainerAmount, setRetainerAmount] = useState<number>(availableRetainerBalance);

  // Notes
  const [invoiceNotes, setInvoiceNotes] = useState(
    "Greiðist inn á reikning lögmannsstofu. Vinsamlegast tilgreinið reikningsnúmer sem skýringu."
  );

  // Status option
  const [invoiceStatus, setInvoiceStatus] = useState<"issued" | "draft">("issued");

  // Loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Construct active line items
  const activeLineItems: InvoiceLineItem[] = useMemo(() => {
    const items: InvoiceLineItem[] = [];

    // Selected Time Entries
    for (const id of selectedTimeIds) {
      const t = timeEntries.find((item) => item.id === id);
      if (!t) continue;
      const hours = t.duration_minutes / 60;
      const exVat = Math.round(hours * t.hourly_rate);
      const vat = Math.round(exVat * 0.24);
      const cat = TASK_CATEGORY_LABELS[t.task_category] || t.task_category;

      items.push({
        id: `t-${t.id}`,
        type: "time",
        ref_id: t.id,
        description: `${cat}: ${t.description} (${t.user_name})`,
        quantity: hours,
        unit_price: t.hourly_rate,
        vat_rate: 0.24,
        amount_ex_vat: exVat,
        vat_amount: vat,
        total_inc_vat: exVat + vat,
      });
    }

    // Selected Expenses
    for (const id of selectedExpenseIds) {
      const e = expenses.find((item) => item.id === id);
      if (!e) continue;
      const vat = e.vat_amount || 0;
      const expType = EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type;

      items.push({
        id: `e-${e.id}`,
        type: "expense",
        ref_id: e.id,
        description: `${expType}: ${e.title}${e.receipt_doc_title ? ` [Fskj.: ${e.receipt_doc_title}]` : ""}`,
        quantity: 1,
        unit_price: e.amount,
        vat_rate: e.vat_rate,
        amount_ex_vat: e.amount,
        vat_amount: vat,
        total_inc_vat: e.amount + vat,
      });
    }

    return items;
  }, [selectedTimeIds, selectedExpenseIds, timeEntries, expenses]);

  // Calculations
  const subtotalExVat = useMemo(
    () => activeLineItems.reduce((sum, item) => sum + item.amount_ex_vat, 0),
    [activeLineItems]
  );
  const totalVat = useMemo(
    () => activeLineItems.reduce((sum, item) => sum + item.vat_amount, 0),
    [activeLineItems]
  );
  const totalIncVat = subtotalExVat + totalVat;

  // Actual retainer deduction applied
  const actualRetainerDeducted = useMemo(() => {
    if (!applyRetainer) return 0;
    const clamped = Math.min(retainerAmount, availableRetainerBalance, totalIncVat);
    return Math.max(0, clamped);
  }, [applyRetainer, retainerAmount, availableRetainerBalance, totalIncVat]);

  const finalAmountDue = Math.max(0, totalIncVat - actualRetainerDeducted);

  // Toggle selection
  const toggleTimeItem = (id: string) => {
    setSelectedTimeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpenseItem = (id: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Submit invoice creation
  const handleCreateInvoice = async () => {
    if (activeLineItems.length === 0) {
      setErrorMsg("Vinsamlegast veldu að minnsta kosti einn tíma- eða kostnaðarlið.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/v1/cases/${activeCase.id}/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_name: clientName,
          client_kennitala: clientKennitala || undefined,
          client_address: clientAddress || undefined,
          attorney_name: attorneyName,
          issue_date: issueDate,
          due_date: dueDate,
          penalty_date: penaltyDate,
          status: invoiceStatus,
          time_ids: selectedTimeIds,
          expense_ids: selectedExpenseIds,
          retainer_deducted: actualRetainerDeducted,
          notes: invoiceNotes,
        }),
      });

      if (res.ok) {
        onInvoiceCreated();
        onClose();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Ekki tókst að búa til reikning.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Villa kom upp: " + err?.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(2px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          background: "#fff",
          width: "100%",
          maxWidth: "960px",
          height: "92vh",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            background: "#0f172a",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.2rem" }}>🧾</span>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Nýr reikningur — Reikningagerð og ráðstöfun tryggingafjár
              </h3>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "3px" }}>
              Mál nr. <strong>{activeCase?.case_number}</strong>: {activeCase?.title}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.4rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "18px", background: "#f8fafc" }}>
          {errorMsg && (
            <div
              style={{
                background: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                padding: "10px 14px",
                fontSize: "0.85rem",
              }}
            >
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Section 1: Client & Invoice Metadata */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              padding: "16px",
            }}
          >
            <h4 style={{ margin: "0 0 12px 0", fontSize: "0.9rem", color: "#0f172a", fontWeight: 700 }}>
              👤 Upplýsingar um kaupanda (umbjóðanda) og gjalddaga
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1.5fr",
                gap: "12px",
                marginBottom: "12px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                  Nafn greiðanda / umbjóðanda
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                  Kennitala greiðanda
                </label>
                <input
                  type="text"
                  placeholder="000000-0000"
                  value={clientKennitala}
                  onChange={(e) => setClientKennitala(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                  Heimilisfang
                </label>
                <input
                  type="text"
                  placeholder="Gata, póstnúmer, staður"
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                  Útgáfudagur
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                  Gjalddagi (14 d.)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                  Eindagi (30 d.)
                </label>
                <input
                  type="date"
                  value={penaltyDate}
                  onChange={(e) => setPenaltyDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                  Tegund útgáfu
                </label>
                <select
                  value={invoiceStatus}
                  onChange={(e) => setInvoiceStatus(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                >
                  <option value="issued">Gefa út strax (Útgefinn)</option>
                  <option value="draft">Vista sem drög (Óútgefinn)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Line Items Selection */}
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
              <div>
                <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#0f172a", fontWeight: 700 }}>
                  📋 Óreikningsfærðir liðir til innheimtu ({selectedTimeIds.length} tímar, {selectedExpenseIds.length} gjöld)
                </h4>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Hakaðu við liði sem eiga að koma á þennan reikning
                </div>
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTimeIds(unbilledTimes.map((t) => t.id));
                    setSelectedExpenseIds(unbilledExpenses.map((e) => e.id));
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Velja allt óreikningsfært
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTimeIds([]);
                    setSelectedExpenseIds([]);
                  }}
                  style={{
                    padding: "4px 8px",
                    fontSize: "0.75rem",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "1px solid #cbd5e1",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Afvelja allt
                </button>
              </div>
            </div>

            {/* Time entries list */}
            <div style={{ maxHeight: "200px", overflowY: "auto", borderBottom: "1px solid #f1f5f9" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ padding: "6px 10px", width: "36px", textAlign: "center" }}></th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Dags.</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Starfsmaður</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Verkþáttur & Lýsing</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Klst.</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Án VSK</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>M. 24% VSK</th>
                  </tr>
                </thead>
                <tbody>
                  {unbilledTimes.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>
                        Engar óreikningsfærðar vinnustundir fundust.
                      </td>
                    </tr>
                  ) : (
                    unbilledTimes.map((item) => {
                      const isSelected = selectedTimeIds.includes(item.id);
                      const hours = item.duration_minutes / 60;
                      const exVat = Math.round(hours * item.hourly_rate);
                      const incVat = Math.round(exVat * 1.24);
                      const cat = TASK_CATEGORY_LABELS[item.task_category] || item.task_category;

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isSelected ? "#fff" : "#f8fafc",
                            opacity: isSelected ? 1 : 0.6,
                          }}
                        >
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleTimeItem(item.id)}
                            />
                          </td>
                          <td style={{ padding: "6px 10px", color: "#475569" }}>{item.date}</td>
                          <td style={{ padding: "6px 10px", fontWeight: 500 }}>{item.user_name}</td>
                          <td style={{ padding: "6px 10px", color: "#1e293b" }}>
                            <span style={{ fontSize: "0.7rem", color: "#1d4ed8", marginRight: "4px" }}>
                              [{cat}]
                            </span>
                            {item.description}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600 }}>{hours.toFixed(1)}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: "#475569" }}>{exVat.toLocaleString("is-IS")} kr.</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: isSelected ? "#2563eb" : "#94a3b8" }}>
                            {incVat.toLocaleString("is-IS")} kr.
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Expenses list */}
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ background: "#fafafa", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ padding: "6px 10px", width: "36px", textAlign: "center" }}></th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Dags.</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Tegund útgjalda</th>
                    <th style={{ padding: "6px 10px", textAlign: "left" }}>Lýsing & Fylgiskjal</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Án VSK</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>VSK</th>
                    <th style={{ padding: "6px 10px", textAlign: "right" }}>Alls m. VSK</th>
                  </tr>
                </thead>
                <tbody>
                  {unbilledExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>
                        Enginn óreikningsfærður útlagður kostnaður fannst.
                      </td>
                    </tr>
                  ) : (
                    unbilledExpenses.map((exp) => {
                      const isSelected = selectedExpenseIds.includes(exp.id);
                      const total = exp.amount + (exp.vat_amount || 0);
                      const expType = EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type;

                      return (
                        <tr
                          key={exp.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: isSelected ? "#fff" : "#f8fafc",
                            opacity: isSelected ? 1 : 0.6,
                          }}
                        >
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleExpenseItem(exp.id)}
                            />
                          </td>
                          <td style={{ padding: "6px 10px", color: "#475569" }}>{exp.incurred_date}</td>
                          <td style={{ padding: "6px 10px", fontWeight: 500 }}>{expType}</td>
                          <td style={{ padding: "6px 10px", color: "#1e293b" }}>
                            {exp.title}
                            {exp.receipt_doc_title && (
                              <span style={{ fontSize: "0.7rem", color: "#0284c7", marginLeft: "4px" }}>
                                [Fskj.: {exp.receipt_doc_title}]
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: "#475569" }}>{exp.amount.toLocaleString("is-IS")} kr.</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", color: "#64748b" }}>{exp.vat_amount ? `${exp.vat_amount.toLocaleString("is-IS")} kr.` : "0 kr."}</td>
                          <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: isSelected ? "#d97706" : "#94a3b8" }}>
                            {total.toLocaleString("is-IS")} kr.
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Retainer Deduction & Financial Settlement */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              padding: "16px",
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: "20px",
            }}
          >
            {/* Retainer / Client Trust application */}
            <div
              style={{
                background: availableRetainerBalance > 0 ? "#f0fdf4" : "#f8fafc",
                border: availableRetainerBalance > 0 ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                borderRadius: "6px",
                padding: "14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534" }}>
                  🏦 Vörslufé / Tryggingafé umbjóðanda
                </span>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    background: availableRetainerBalance > 0 ? "#dcfce7" : "#e2e8f0",
                    color: availableRetainerBalance > 0 ? "#15803d" : "#64748b",
                    padding: "2px 8px",
                    borderRadius: "10px",
                  }}
                >
                  Innistæða: kr. {availableRetainerBalance.toLocaleString("is-IS")}
                </span>
              </div>

              {availableRetainerBalance > 0 ? (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", marginBottom: "8px" }}>
                    <input
                      type="checkbox"
                      checked={applyRetainer}
                      onChange={(e) => {
                        setApplyRetainer(e.target.checked);
                        if (e.target.checked && retainerAmount === 0) {
                          setRetainerAmount(Math.min(availableRetainerBalance, totalIncVat));
                        }
                      }}
                    />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                      Ráðstafa mótteknu tryggingafé á móti reikningi
                    </span>
                  </label>

                  {applyRetainer && (
                    <div style={{ marginTop: "10px", padding: "8px 10px", background: "#fff", borderRadius: "5px", border: "1px solid #cbd5e1" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                        <label style={{ fontSize: "0.78rem", color: "#475569" }}>
                          Fjárhæð til frádráttar (kr.):
                        </label>
                        <input
                          type="number"
                          value={retainerAmount}
                          onChange={(e) => setRetainerAmount(Number(e.target.value) || 0)}
                          style={{
                            width: "120px",
                            padding: "4px 8px",
                            border: "1px solid #94a3b8",
                            borderRadius: "4px",
                            fontSize: "0.82rem",
                            textAlign: "right",
                            fontWeight: 700,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "4px" }}>
                        Hámark: kr. {Math.min(availableRetainerBalance, totalIncVat).toLocaleString("is-IS")}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Engin óráðstöfuð innistæða er skráð á vörslufjárreikning þessa máls.
                </div>
              )}
            </div>

            {/* Financial Summary Box */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                fontSize: "0.85rem",
                justifyContent: "center",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>Samtals án VSK:</span>
                <strong style={{ color: "#1e293b" }}>kr. {subtotalExVat.toLocaleString("is-IS")}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                <span>24% Virðisaukaskattur:</span>
                <strong style={{ color: "#1e293b" }}>kr. {totalVat.toLocaleString("is-IS")}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#1e293b", fontWeight: 700, borderTop: "1px solid #cbd5e1", paddingTop: "6px" }}>
                <span>Heildarfjárhæð m. VSK:</span>
                <span>kr. {totalIncVat.toLocaleString("is-IS")}</span>
              </div>

              {actualRetainerDeducted > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d", fontWeight: 600 }}>
                  <span>Frádráttur tryggingafjár:</span>
                  <span>- kr. {actualRetainerDeducted.toLocaleString("is-IS")}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  borderTop: "2px solid #0f172a",
                  paddingTop: "6px",
                  marginTop: "2px",
                }}
              >
                <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>
                  TIL GREIÐSLU:
                </span>
                <span style={{ fontSize: "1.25rem", fontWeight: 800, color: "#2563eb" }}>
                  kr. {finalAmountDue.toLocaleString("is-IS")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            padding: "14px 24px",
            background: "#fff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              background: "#fff",
              color: "#64748b",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Hætta við
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleCreateInvoice}
              disabled={isSubmitting || activeLineItems.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "8px 20px",
                borderRadius: "6px",
                fontSize: "0.88rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
              }}
            >
              <span>🧾</span>
              <span>
                {isSubmitting
                  ? "Útbý reikning..."
                  : invoiceStatus === "draft"
                  ? "Vista sem drög"
                  : "Gefa út reikning"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
