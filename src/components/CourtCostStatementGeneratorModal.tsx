"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CaseItem, TimeEntryItem, ExpenseItem, TASK_CATEGORY_LABELS, EXPENSE_TYPE_LABELS } from "@/lib/store";
import { calculateCostSummary, formatCourtCostStatementText } from "@/lib/costStatement";
import { generateCourtCostDocxBlob, CourtCostStatementOptions } from "@/lib/courtCostDocxGenerator";

interface CourtCostStatementGeneratorModalProps {
  activeCase: CaseItem;
  timeEntries: TimeEntryItem[];
  expenses: ExpenseItem[];
  onClose: () => void;
  onDocumentCreated?: () => void;
}

const ICELANDIC_COURTS = [
  "Héraðsdómur Reykjavíkur",
  "Héraðsdómur Reykjaness",
  "Héraðsdómur Vesturlands",
  "Héraðsdómur Vestfjarða",
  "Héraðsdómur Norðurlands vestra",
  "Héraðsdómur Norðurlands eystra",
  "Héraðsdómur Austurlands",
  "Héraðsdómur Suðurlands",
  "Landsréttur",
  "Hæstiréttur Íslands",
];

export function CourtCostStatementGeneratorModal({
  activeCase,
  timeEntries,
  expenses,
  onClose,
  onDocumentCreated,
}: CourtCostStatementGeneratorModalProps) {
  // Court & Case Config
  const [courtName, setCourtName] = useState("Héraðsdómur Reykjavíkur");
  const [judgeName, setJudgeName] = useState("");
  const [attorneyName, setAttorneyName] = useState("Guðrún Sigurðardóttir");
  const [attorneyTitle, setAttorneyTitle] = useState("hrl.");
  const [lawFirm, setLawFirm] = useState("Lögmenn Lækjargötu slf.");

  // Parties
  const defaultParty = useMemo(() => {
    if (!activeCase?.title) return "Stefnandi";
    const parts = activeCase.title.split(" gegn ");
    return parts[0] || "Stefnandi";
  }, [activeCase?.title]);

  const defaultOpponent = useMemo(() => {
    if (!activeCase?.title) return "Stefndi";
    const parts = activeCase.title.split(" gegn ");
    return parts[1] || "Stefndi";
  }, [activeCase?.title]);

  const [partyName, setPartyName] = useState(defaultParty);
  const [partyRole, setPartyRole] = useState("Stefnandi");
  const [opposingParty, setOpposingParty] = useState(defaultOpponent);

  // Statutory Tax & Interest Settings
  const [clientVatDeductible, setClientVatDeductible] = useState(false);
  const [includeInterestClaim, setIncludeInterestClaim] = useState(true);
  const [customInterestText, setCustomInterestText] = useState(
    "Þess er krafist að gagnaðili verði dæmdur til að greiða málskostnað þennan með dráttarvöxtum samkvæmt 1. mgr. 6. gr. laga nr. 38/2001 um vexti og verðtryggingu frá þeim degi sem liðinn er mánuður frá uppkvaðningu dóms til greiðsludags."
  );
  const [additionalRemarks, setAdditionalRemarks] = useState("");

  // Item Selection (by default all billable time entries & all expenses selected)
  const [selectedTimeIds, setSelectedTimeIds] = useState<string[]>(() =>
    timeEntries.filter((t) => t.is_billable).map((t) => t.id)
  );
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>(() =>
    expenses.map((e) => e.id)
  );

  // Active view tab: "preview" (formal court exhibit layout) vs "entries" (selection table) vs "text" (raw text)
  const [viewTab, setViewTab] = useState<"preview" | "entries" | "text">("preview");

  // Status & Feedback
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isSavingDoc, setIsSavingDoc] = useState(false);
  const [savedSuccessMsg, setSavedSuccessMsg] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Derived filtered items
  const activeTimeEntries = useMemo(() => {
    return timeEntries.filter((t) => selectedTimeIds.includes(t.id));
  }, [timeEntries, selectedTimeIds]);

  const activeExpenses = useMemo(() => {
    return expenses.filter((e) => selectedExpenseIds.includes(e.id));
  }, [expenses, selectedExpenseIds]);

  // Real-time Summary
  const summary = useMemo(() => {
    return calculateCostSummary(activeTimeEntries, activeExpenses);
  }, [activeTimeEntries, activeExpenses]);

  // Grand Total based on VAT deduction status
  const finalLegalFee = clientVatDeductible ? summary.legalFeeExVat : summary.legalFeeIncVat;
  const finalExpenses = clientVatDeductible
    ? summary.courtFees + summary.otherExpensesExVat
    : summary.totalExpensesIncVat;
  const grandTotal = finalLegalFee + finalExpenses;

  // Formatted Text
  const formattedText = useMemo(() => {
    return formatCourtCostStatementText(activeCase, activeTimeEntries, activeExpenses, {
      courtName,
      judgeName: judgeName || undefined,
      partyName,
      partyRole,
      attorneyName: `${attorneyName}${attorneyTitle ? ` ${attorneyTitle}` : ""}`,
      clientVatDeductible,
      includeInterestClaim,
      interestText: customInterestText,
      additionalRemarks: additionalRemarks || undefined,
    });
  }, [
    activeCase,
    activeTimeEntries,
    activeExpenses,
    courtName,
    judgeName,
    partyName,
    partyRole,
    attorneyName,
    attorneyTitle,
    clientVatDeductible,
    includeInterestClaim,
    customInterestText,
    additionalRemarks,
  ]);

  // Toggle single time item
  const toggleTimeItem = (id: string) => {
    setSelectedTimeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle single expense item
  const toggleExpenseItem = (id: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Select all / Deselect all
  const handleSelectAllTime = () => {
    setSelectedTimeIds(timeEntries.map((t) => t.id));
  };
  const handleSelectBillableOnlyTime = () => {
    setSelectedTimeIds(timeEntries.filter((t) => t.is_billable).map((t) => t.id));
  };
  const handleDeselectAllTime = () => {
    setSelectedTimeIds([]);
  };

  // Export to Word (.docx)
  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      const options: CourtCostStatementOptions = {
        courtName,
        judgeName: judgeName || undefined,
        attorneyName,
        attorneyTitle,
        lawFirm,
        partyName,
        partyRole,
        opposingPartyName: opposingParty,
        clientVatDeductible,
        includeInterestClaim,
        interestText: customInterestText,
        additionalRemarks: additionalRemarks || undefined,
        selectedTimeEntryIds: selectedTimeIds,
        selectedExpenseIds: selectedExpenseIds,
      };

      const blob = await generateCourtCostDocxBlob(
        activeCase,
        timeEntries,
        expenses,
        options
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sanitizedCaseNo = activeCase.case_number.replace(/[^a-zA-Z0-9_-]/g, "_");
      a.download = `Malkostnadaryfirlit_${sanitizedCaseNo}_${new Date().toISOString().split("T")[0]}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error generating docx:", err);
      alert("Gat ekki útbúið Word skjal: " + err?.message);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Print / Save as PDF
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Vinsamlegast leyfðu sprettiglugga (popups) til að prenta eða vista sem PDF.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Málskostnaðaryfirlit - ${activeCase.case_number}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 20mm 20mm 20mm 20mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111827;
              font-size: 11pt;
              line-height: 1.4;
              margin: 0;
              padding: 10px;
            }
            .header-title {
              text-align: center;
              font-size: 15pt;
              font-weight: bold;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .header-sub {
              text-align: center;
              font-size: 10pt;
              color: #4b5563;
              font-style: italic;
              margin-bottom: 24px;
            }
            .meta-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .meta-table td {
              padding: 4px 6px;
              vertical-align: top;
            }
            .meta-table td.label {
              font-weight: bold;
              width: 25%;
              color: #374151;
            }
            .section-heading {
              font-size: 12pt;
              font-weight: bold;
              border-bottom: 1.5px solid #111827;
              padding-bottom: 4px;
              margin-top: 22px;
              margin-bottom: 10px;
              color: #111827;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 14px;
            }
            .data-table th {
              background-color: #f3f4f6;
              font-weight: bold;
              text-align: left;
              padding: 6px 8px;
              border-bottom: 1px solid #d1d5db;
              font-size: 9.5pt;
            }
            .data-table td {
              padding: 5px 8px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 9.5pt;
              vertical-align: top;
            }
            .text-right {
              text-align: right;
            }
            .summary-box {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              margin-bottom: 15px;
            }
            .summary-box td {
              padding: 6px 10px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 10.5pt;
            }
            .grand-total {
              font-weight: bold;
              font-size: 12pt;
              background-color: #f0fdf4;
              border-top: 2px solid #16a34a !important;
              border-bottom: 2px solid #16a34a !important;
              color: #15803d;
            }
            .legal-text {
              font-size: 9.5pt;
              color: #374151;
              line-height: 1.5;
              margin: 12px 0;
            }
            .signature {
              margin-top: 35px;
              page-break-inside: avoid;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-title">Málskostnaðaryfirlit fyrir ${courtName.toUpperCase()}</div>
          <div class="header-sub">(Lagt fram skv. 130. gr. laga nr. 91/1991 um meðferð einkamála)</div>

          <table class="meta-table">
            <tr><td class="label">Dómstóll:</td><td>${courtName}</td></tr>
            ${judgeName ? `<tr><td class="label">Dómari:</td><td>${judgeName}</td></tr>` : ""}
            <tr><td class="label">Málsnúmer:</td><td><strong>${activeCase.case_number}</strong></td></tr>
            <tr><td class="label">Málsaðilar:</td><td>${activeCase.title}</td></tr>
            <tr><td class="label">Aðili:</td><td>${partyName} (${partyRole})</td></tr>
            <tr><td class="label">Málflytjandi:</td><td>${attorneyName} ${attorneyTitle} (${lawFirm})</td></tr>
            <tr><td class="label">Dagsetning:</td><td>${new Date().toLocaleDateString("is-IS", { year: "numeric", month: "long", day: "numeric" })}</td></tr>
          </table>

          <div class="section-heading">I. Sundurliðun á lögmannsþóknun (vinnustundir)</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 15%;">Dags.</th>
                <th style="width: 20%;">Verkþáttur</th>
                <th style="width: 45%;">Lýsing</th>
                <th class="text-right" style="width: 10%;">Klst.</th>
                <th class="text-right" style="width: 10%;">Án VSK</th>
              </tr>
            </thead>
            <tbody>
              ${
                activeTimeEntries.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: #6b7280;">Engir tímaliðir valdir.</td></tr>`
                  : activeTimeEntries
                      .map((t) => {
                        const hrs = t.duration_minutes / 60;
                        const fee = Math.round(hrs * t.hourly_rate);
                        const cat = TASK_CATEGORY_LABELS[t.task_category] || t.task_category;
                        return `
                          <tr>
                            <td>${t.date}</td>
                            <td>${cat}</td>
                            <td>${t.description} <em>(${t.user_name})</em></td>
                            <td class="text-right">${hrs.toFixed(1)}</td>
                            <td class="text-right">${fee.toLocaleString("is-IS")} kr.</td>
                          </tr>
                        `;
                      })
                      .join("")
              }
            </tbody>
          </table>
          <div style="font-size: 9.5pt; color: #374151; margin-bottom: 12px;">
            Samtals unnar stundir: <strong>${summary.billableHours.toLocaleString("is-IS")} klst.</strong> | 
            Þóknun án VSK: <strong>kr. ${summary.legalFeeExVat.toLocaleString("is-IS")}</strong> | 
            24% VSK: <strong>kr. ${summary.legalFeeVat.toLocaleString("is-IS")}</strong> | 
            Þóknun m. VSK: <strong>kr. ${summary.legalFeeIncVat.toLocaleString("is-IS")}</strong>
          </div>

          <div class="section-heading">II. Útlagður kostnaður og dómgjöld</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 15%;">Dags.</th>
                <th style="width: 25%;">Tegund</th>
                <th style="width: 40%;">Lýsing</th>
                <th class="text-right" style="width: 20%;">Fjárhæð m. VSK</th>
              </tr>
            </thead>
            <tbody>
              ${
                activeExpenses.length === 0
                  ? `<tr><td colspan="4" style="text-align: center; color: #6b7280;">Enginn útlagður kostnaður valinn.</td></tr>`
                  : activeExpenses
                      .map((e) => {
                        const totalAmount = e.amount + (e.vat_amount || 0);
                        const expType = EXPENSE_TYPE_LABELS[e.expense_type] || e.expense_type;
                        return `
                          <tr>
                            <td>${e.incurred_date}</td>
                            <td>${expType}</td>
                            <td>${e.title}${e.receipt_doc_title ? ` <em>[Fskj.: ${e.receipt_doc_title}]</em>` : ""}</td>
                            <td class="text-right">${totalAmount.toLocaleString("is-IS")} kr.</td>
                          </tr>
                        `;
                      })
                      .join("")
              }
            </tbody>
          </table>

          <div class="section-heading">III. Heildarkrafa um málskostnað</div>
          <table class="summary-box">
            <tr>
              <td><strong>1. Lögmannsþóknun málflytjanda ${clientVatDeductible ? "(án VSK skv. innskattsrétti)" : "(með 24% VSK)"}:</strong></td>
              <td class="text-right"><strong>kr. ${finalLegalFee.toLocaleString("is-IS")}</strong></td>
            </tr>
            <tr>
              <td><strong>2. Útlagður kostnaður og dómgjöld samtals ${clientVatDeductible ? "(án VSK)" : ""}:</strong></td>
              <td class="text-right"><strong>kr. ${finalExpenses.toLocaleString("is-IS")}</strong></td>
            </tr>
            <tr class="grand-total">
              <td>HEILDARKRAFA UM MÁLSKOSTNAÐ:</td>
              <td class="text-right">kr. ${grandTotal.toLocaleString("is-IS")}</td>
            </tr>
          </table>

          <div class="legal-text">
            <strong>Virðisaukaskattsstaða:</strong> 
            ${
              clientVatDeductible
                ? "Umbjóðandi er virðisaukaskattsskyldur lögaðili sem nýtir fullan innskattsrétt samkvæmt 16. gr. laga nr. 50/1988 um virðisaukaskatt. Málskostnaðarkrafa er því sett fram án virðisaukaskatts."
                : "Umbjóðandi hefur ekki innskattsrétt vegna virðisaukaskatts og fellur skatturinn á hann sem endanlegur kostnaður. Krafa er því lögð fram að meðtöldum 24% VSK í samræmi við lög nr. 50/1988."
            }
          </div>

          ${
            includeInterestClaim
              ? `<div class="legal-text"><strong>Dráttarvextir:</strong> ${customInterestText}</div>`
              : ""
          }

          ${
            additionalRemarks
              ? `<div class="legal-text"><strong>Athugasemdir málflytjanda:</strong> ${additionalRemarks}</div>`
              : ""
          }

          <div class="signature">
            <p>Virðingarfyllst,</p>
            <p style="margin-top: 30px;">_________________________________________</p>
            <p style="margin: 2px 0;"><strong>${attorneyName} ${attorneyTitle}</strong></p>
            <p style="margin: 2px 0; color: #4b5563;">f.h. ${partyName}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Copy statement text
  const handleCopyText = () => {
    navigator.clipboard.writeText(formattedText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2200);
  };

  // Save to Dossier
  const handleSaveToDossier = async () => {
    setIsSavingDoc(true);
    setSavedSuccessMsg("");
    try {
      const res = await fetch(`/api/v1/cases/${activeCase.id}/cost-statement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attorney: `${attorneyName}${attorneyTitle ? ` ${attorneyTitle}` : ""}`,
          party: partyName,
          court: courtName,
          judge: judgeName || undefined,
          partyRole,
          clientVatDeductible,
          includeInterestClaim,
          additionalRemarks: additionalRemarks || undefined,
          timeIds: selectedTimeIds,
          expIds: selectedExpenseIds,
        }),
      });

      if (res.ok) {
        setSavedSuccessMsg("✅ Málskostnaðaryfirlitið hefur verið vistað sem dómsskjal í málasafn!");
        if (onDocumentCreated) {
          onDocumentCreated();
        }
      } else {
        const data = await res.json();
        alert("Villa við vistun: " + (data.error || res.statusText));
      }
    } catch (err: any) {
      console.error(err);
      alert("Villa: " + err?.message);
    } finally {
      setIsSavingDoc(false);
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
          maxWidth: "1050px",
          height: "94vh",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "16px 24px",
            background: "#0f172a",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.2rem" }}>⚖️</span>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Málskostnaðaryfirlit — 130. gr. laga nr. 91/1991
              </h3>
              <span
                style={{
                  fontSize: "0.72rem",
                  background: "#1e3a8a",
                  color: "#bfdbfe",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  fontWeight: 600,
                }}
              >
                Fylgiskjal dómstóls
              </span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "4px" }}>
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
              padding: "4px 8px",
              borderRadius: "4px",
            }}
            title="Loka"
          >
            ✕
          </button>
        </div>

        {/* Configuration Bar: Two Rows of Judicial Controls */}
        <div
          style={{
            padding: "14px 20px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            fontSize: "0.82rem",
          }}
        >
          {/* Row 1: Court, Judge, Attorney, Firm */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
              gap: "10px",
              alignItems: "flex-end",
            }}
          >
            <div>
              <label style={{ display: "block", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                Dómstóll
              </label>
              <select
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "5px",
                  background: "#fff",
                  fontSize: "0.82rem",
                }}
              >
                {ICELANDIC_COURTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                Dómari (valfrjálst)
              </label>
              <input
                type="text"
                placeholder="t.d. Stefán Már Stefánsson"
                value={judgeName}
                onChange={(e) => setJudgeName(e.target.value)}
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
              <label style={{ display: "block", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                Málflytjandi & Titill
              </label>
              <div style={{ display: "flex", gap: "4px" }}>
                <input
                  type="text"
                  value={attorneyName}
                  onChange={(e) => setAttorneyName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                  }}
                />
                <select
                  value={attorneyTitle}
                  onChange={(e) => setAttorneyTitle(e.target.value)}
                  style={{
                    width: "70px",
                    padding: "6px 4px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    background: "#fff",
                  }}
                >
                  <option value="hrl.">hrl.</option>
                  <option value="llm.">llm.</option>
                  <option value="hdl.">hdl.</option>
                  <option value="lögm.">lögm.</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                Lögmannsstofa
              </label>
              <input
                type="text"
                value={lawFirm}
                onChange={(e) => setLawFirm(e.target.value)}
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
          </div>

          {/* Row 2: Party Role, VAT Deduction status, Interest option */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1.6fr 1fr",
              gap: "10px",
              alignItems: "center",
              background: "#f1f5f9",
              padding: "8px 12px",
              borderRadius: "6px",
            }}
          >
            {/* Party & Role */}
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ color: "#475569", fontWeight: 600, whiteSpace: "nowrap" }}>Aðili:</span>
              <input
                type="text"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                style={{
                  flex: 1,
                  padding: "5px 8px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  background: "#fff",
                }}
              />
              <select
                value={partyRole}
                onChange={(e) => setPartyRole(e.target.value)}
                style={{
                  padding: "5px 6px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "4px",
                  fontSize: "0.8rem",
                  background: "#fff",
                }}
              >
                <option value="Stefnandi">Stefnandi</option>
                <option value="Stefndi">Stefndi</option>
                <option value="Sóknaraðili">Sóknaraðili</option>
                <option value="Varnaraðili">Varnaraðili</option>
              </select>
            </div>

            {/* VAT Mode Radio */}
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <span style={{ color: "#475569", fontWeight: 600, whiteSpace: "nowrap" }}>VSK staða:</span>
              <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="vatMode"
                  checked={!clientVatDeductible}
                  onChange={() => setClientVatDeductible(false)}
                />
                <span style={{ fontWeight: !clientVatDeductible ? 600 : 400, color: "#1e293b" }}>
                  Með 24% VSK
                </span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="vatMode"
                  checked={clientVatDeductible}
                  onChange={() => setClientVatDeductible(true)}
                />
                <span
                  style={{
                    fontWeight: clientVatDeductible ? 600 : 400,
                    color: clientVatDeductible ? "#1d4ed8" : "#475569",
                  }}
                  title="Félög/lögaðilar sem nýta innskattsrétt skv. 16. gr. l. nr. 50/1988"
                >
                  Án VSK (innskattsréttur)
                </span>
              </label>
            </div>

            {/* Statutory Interest Checkbox */}
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeInterestClaim}
                onChange={(e) => setIncludeInterestClaim(e.target.checked)}
              />
              <span style={{ color: "#334155", fontWeight: 500 }}>
                Dráttarvextir (1. mgr. 6. gr. l. 38/2001)
              </span>
            </label>
          </div>
        </div>

        {/* View Switcher & Selection Summary Ribbon */}
        <div
          style={{
            padding: "8px 20px",
            background: "#fff",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Navigation Tabs */}
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              onClick={() => setViewTab("preview")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: viewTab === "preview" ? "#2563eb" : "#f1f5f9",
                color: viewTab === "preview" ? "#fff" : "#475569",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📄</span>
              <span>Dómsyfirferð (A4 sýn)</span>
            </button>

            <button
              onClick={() => setViewTab("entries")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: viewTab === "entries" ? "#2563eb" : "#f1f5f9",
                color: viewTab === "entries" ? "#fff" : "#475569",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>☑️</span>
              <span>
                Liðaval ({selectedTimeIds.length}/{timeEntries.length} tímar, {selectedExpenseIds.length}/{expenses.length} gjöld)
              </span>
            </button>

            <button
              onClick={() => setViewTab("text")}
              style={{
                padding: "6px 14px",
                borderRadius: "6px",
                border: "none",
                background: viewTab === "text" ? "#2563eb" : "#f1f5f9",
                color: viewTab === "text" ? "#fff" : "#475569",
                fontWeight: 600,
                fontSize: "0.82rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>📝</span>
              <span>Textasnið / Dómstólagátt</span>
            </button>
          </div>

          {/* Real-time Claim Metric */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Unnar stundir: <strong>{summary.billableHours} klst.</strong>
            </div>
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "4px 12px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>Heildarkrafa:</span>
              <span style={{ fontSize: "0.98rem", fontWeight: 800, color: "#15803d" }}>
                kr. {grandTotal.toLocaleString("is-IS")}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#166534" }}>
                ({clientVatDeductible ? "án VSK" : "m. VSK"})
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: "auto", background: "#f8fafc", padding: "20px" }}>
          {/* TAB 1: FORMAL COURT EXHIBIT PREVIEW (A4 Page Look) */}
          {viewTab === "preview" && (
            <div
              style={{
                maxWidth: "800px",
                margin: "0 auto",
                background: "#fff",
                padding: "40px 48px",
                borderRadius: "4px",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.05)",
                border: "1px solid #e2e8f0",
                fontFamily: "Calibri, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                color: "#0f172a",
                lineHeight: 1.45,
              }}
            >
              {/* Exhibit Header */}
              <div style={{ textAlign: "center", marginBottom: "28px" }}>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "1.35rem", fontWeight: 700, letterSpacing: "0.02em" }}>
                  MÁLSKOSTNAÐARYFIRLIT FYRIR {courtName.toUpperCase()}
                </h2>
                <div style={{ fontSize: "0.85rem", color: "#64748b", fontStyle: "italic" }}>
                  (Lagt fram skv. 130. gr. laga nr. 91/1991 um meðferð einkamála)
                </div>
              </div>

              {/* Case Metadata Box */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "12px 16px",
                  background: "#fafafa",
                  marginBottom: "24px",
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  rowGap: "6px",
                  fontSize: "0.88rem",
                }}
              >
                <div style={{ fontWeight: 600, color: "#475569" }}>Dómstóll:</div>
                <div>{courtName}</div>

                {judgeName && (
                  <>
                    <div style={{ fontWeight: 600, color: "#475569" }}>Dómari:</div>
                    <div>{judgeName}</div>
                  </>
                )}

                <div style={{ fontWeight: 600, color: "#475569" }}>Málsnúmer:</div>
                <div><strong>{activeCase?.case_number}</strong></div>

                <div style={{ fontWeight: 600, color: "#475569" }}>Málsaðilar:</div>
                <div>{activeCase?.title}</div>

                <div style={{ fontWeight: 600, color: "#475569" }}>Aðili:</div>
                <div>{partyName} ({partyRole})</div>

                <div style={{ fontWeight: 600, color: "#475569" }}>Málflytjandi:</div>
                <div>
                  {attorneyName} {attorneyTitle} {lawFirm ? `(${lawFirm})` : ""}
                </div>

                <div style={{ fontWeight: 600, color: "#475569" }}>Dagsetning:</div>
                <div>{new Date().toLocaleDateString("is-IS", { year: "numeric", month: "long", day: "numeric" })}</div>
              </div>

              {/* Section I: Legal Fees & Hours */}
              <div style={{ marginBottom: "26px" }}>
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "1rem",
                    fontWeight: 700,
                    borderBottom: "1.5px solid #0f172a",
                    paddingBottom: "4px",
                  }}
                >
                  I. Sundurliðun á lögmannsþóknun (vinnustundir)
                </h4>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "10px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left", width: "15%" }}>Dags.</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", width: "22%" }}>Verkþáttur</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Lýsing á störfum</th>
                      <th style={{ padding: "6px 10px", textAlign: "right", width: "12%" }}>Klst.</th>
                      <th style={{ padding: "6px 10px", textAlign: "right", width: "18%" }}>Fjárhæð án VSK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTimeEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
                          Engir tímaliðir valdir í málskostnaðarkröfu.
                        </td>
                      </tr>
                    ) : (
                      activeTimeEntries.map((t) => {
                        const hrs = t.duration_minutes / 60;
                        const fee = Math.round(hrs * t.hourly_rate);
                        const cat = TASK_CATEGORY_LABELS[t.task_category] || t.task_category;
                        return (
                          <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 10px", color: "#475569", whiteSpace: "nowrap" }}>{t.date}</td>
                            <td style={{ padding: "6px 10px", color: "#1e293b", fontWeight: 500 }}>{cat}</td>
                            <td style={{ padding: "6px 10px", color: "#334155" }}>
                              {t.description}
                              <span style={{ fontSize: "0.75rem", color: "#64748b", marginLeft: "4px" }}>
                                ({t.user_name})
                              </span>
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>
                              {hrs.toFixed(1)}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "right", color: "#2563eb", fontWeight: 600 }}>
                              {fee.toLocaleString("is-IS")} kr.
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Subtotals */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "10px 14px",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Samtals unnar stundir málflytjanda:</span>
                    <strong>{summary.billableHours.toLocaleString("is-IS")} klst.</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Lögmannsþóknun alls án VSK:</span>
                    <strong>kr. {summary.legalFeeExVat.toLocaleString("is-IS")}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Virðisaukaskattur (24% VSK):</span>
                    <span>kr. {summary.legalFeeVat.toLocaleString("is-IS")}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: "4px" }}>
                    <span style={{ fontWeight: 600 }}>Lögmannsþóknun samtals m. VSK:</span>
                    <strong style={{ color: "#2563eb" }}>kr. {summary.legalFeeIncVat.toLocaleString("is-IS")}</strong>
                  </div>
                </div>
              </div>

              {/* Section II: Out of Pocket Expenses & Court Fees */}
              <div style={{ marginBottom: "26px" }}>
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "1rem",
                    fontWeight: 700,
                    borderBottom: "1.5px solid #0f172a",
                    paddingBottom: "4px",
                  }}
                >
                  II. Útlagður kostnaður og dómgjöld
                </h4>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", marginBottom: "10px" }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "6px 10px", textAlign: "left", width: "15%" }}>Dags.</th>
                      <th style={{ padding: "6px 10px", textAlign: "left", width: "25%" }}>Tegund gjalds</th>
                      <th style={{ padding: "6px 10px", textAlign: "left" }}>Skýring / Fylgiskjal</th>
                      <th style={{ padding: "6px 10px", textAlign: "right", width: "20%" }}>Fjárhæð m. VSK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ padding: "20px", textAlign: "center", color: "#94a3b8" }}>
                          Enginn útlagður kostnaður skráður eða valinn.
                        </td>
                      </tr>
                    ) : (
                      activeExpenses.map((exp) => {
                        const expType = EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type;
                        const total = exp.amount + (exp.vat_amount || 0);
                        return (
                          <tr key={exp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 10px", color: "#475569", whiteSpace: "nowrap" }}>{exp.incurred_date}</td>
                            <td style={{ padding: "6px 10px", color: "#1e293b" }}>{expType}</td>
                            <td style={{ padding: "6px 10px", color: "#334155" }}>
                              {exp.title}
                              {exp.receipt_doc_title && (
                                <span style={{ fontSize: "0.75rem", color: "#0284c7", marginLeft: "6px" }}>
                                  (Fskj.: {exp.receipt_doc_title})
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 600, color: "#d97706" }}>
                              {total.toLocaleString("is-IS")} kr.
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {/* Expenses Subtotal */}
                <div
                  style={{
                    background: "#f8fafc",
                    padding: "8px 14px",
                    borderRadius: "4px",
                    fontSize: "0.85rem",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>Dómgjöld og útlagður kostnaður samtals:</span>
                  <strong>kr. {finalExpenses.toLocaleString("is-IS")}</strong>
                </div>
              </div>

              {/* Section III: Grand Total Claim */}
              <div style={{ marginBottom: "26px" }}>
                <h4
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "1rem",
                    fontWeight: 700,
                    borderBottom: "1.5px solid #0f172a",
                    paddingBottom: "4px",
                  }}
                >
                  III. Heildarkrafa um málskostnað
                </h4>

                <div
                  style={{
                    border: "2px solid #16a34a",
                    borderRadius: "6px",
                    background: "#f0fdf4",
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>
                      1. Lögmannsþóknun málflytjanda {clientVatDeductible ? "(án VSK, sbr. innskattsrétt)" : "m. 24% VSK"}:
                    </span>
                    <strong>kr. {finalLegalFee.toLocaleString("is-IS")}</strong>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span>
                      2. Dómgjöld og útlagður kostnaður samtals {clientVatDeductible ? "(án VSK)" : ""}:
                    </span>
                    <strong>kr. {finalExpenses.toLocaleString("is-IS")}</strong>
                  </div>

                  <div
                    style={{
                      borderTop: "2px dashed #86efac",
                      paddingTop: "8px",
                      marginTop: "4px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#15803d" }}>
                        HEILDARKRAFA UM MÁLSKOSTNAÐ:
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#166534" }}>
                        Krafa lögð fram skv. 1. og 2. mgr. 130. gr. laga nr. 91/1991
                      </div>
                    </div>
                    <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#15803d" }}>
                      kr. {grandTotal.toLocaleString("is-IS")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statutory Notes: VAT and Default Interest */}
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "#334155",
                  lineHeight: 1.55,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: "16px",
                  marginBottom: "30px",
                }}
              >
                <div>
                  <strong>Virðisaukaskattsstaða: </strong>
                  {clientVatDeductible ? (
                    <span>
                      Umbjóðandi er virðisaukaskattsskyldur aðili sem nýtir fullan innskattsrétt skv. 16. gr. laga nr. 50/1988 um virðisaukaskatt. Málskostnaðarkrafa er því lögð fram án virðisaukaskatts.
                    </span>
                  ) : (
                    <span>
                      Umbjóðandi hefur ekki rétt til færslu innskatts vegna virðisaukaskatts og fellur skatturinn á hann sem endanlegur kostnaður. Krafa er því lögð fram að meðtöldum 24% virðisaukaskatti skv. lögum nr. 50/1988.
                    </span>
                  )}
                </div>

                {includeInterestClaim && (
                  <div>
                    <strong>Dráttarvextir: </strong>
                    <span>{customInterestText}</span>
                  </div>
                )}

                {additionalRemarks && (
                  <div>
                    <strong>Athugasemdir málflytjanda: </strong>
                    <span>{additionalRemarks}</span>
                  </div>
                )}
              </div>

              {/* Formal Signature Section */}
              <div style={{ marginTop: "36px" }}>
                <div style={{ fontSize: "0.9rem", color: "#475569" }}>Virðingarfyllst,</div>
                <div style={{ marginTop: "40px", borderBottom: "1px solid #94a3b8", width: "260px" }} />
                <div style={{ marginTop: "6px", fontWeight: 700, fontSize: "0.95rem" }}>
                  {attorneyName} {attorneyTitle}
                </div>
                <div style={{ fontSize: "0.82rem", color: "#64748b" }}>f.h. {partyName}</div>
                {lawFirm && <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{lawFirm}</div>}
              </div>
            </div>
          )}

          {/* TAB 2: ITEM SELECTION & COST ADJUSTMENT TABLE */}
          {viewTab === "entries" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Time Selection Card */}
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
                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>
                      🕒 Tímaeiningar í málskostnaðaryfirliti
                    </h4>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      Hakaðu við þá liði sem leggja á fram fyrir dómara
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={handleSelectAllTime}
                      style={{ padding: "4px 10px", fontSize: "0.75rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Velja alla
                    </button>
                    <button
                      onClick={handleSelectBillableOnlyTime}
                      style={{ padding: "4px 10px", fontSize: "0.75rem", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", borderRadius: "4px", cursor: "pointer", fontWeight: 600 }}
                    >
                      Aðeins gjaldgenga
                    </button>
                    <button
                      onClick={handleDeselectAllTime}
                      style={{ padding: "4px 10px", fontSize: "0.75rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Afvelja alla
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "#fafafa", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <th style={{ padding: "8px 12px", width: "40px", textAlign: "center" }}>Á yfirliti</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Dags.</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Starfsmaður</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Verkþáttur</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Lýsing á verki</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Klst.</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Gjald</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Fjárhæð án VSK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map((item) => {
                        const isSelected = selectedTimeIds.includes(item.id);
                        const hours = item.duration_minutes / 60;
                        const fee = Math.round(hours * item.hourly_rate);
                        return (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: isSelected ? "#fff" : "#f8fafc",
                              opacity: isSelected ? 1 : 0.65,
                            }}
                          >
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleTimeItem(item.id)}
                              />
                            </td>
                            <td style={{ padding: "8px 12px", color: "#475569" }}>{item.date}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 500, color: "#1e293b" }}>{item.user_name}</td>
                            <td style={{ padding: "8px 12px" }}>
                              <span style={{ fontSize: "0.72rem", background: "#eff6ff", color: "#1d4ed8", padding: "1px 6px", borderRadius: "3px" }}>
                                {TASK_CATEGORY_LABELS[item.task_category] || item.task_category}
                              </span>
                            </td>
                            <td style={{ padding: "8px 12px", color: "#334155" }}>
                              {item.description}
                              {!item.is_billable && (
                                <span style={{ marginLeft: "4px", fontSize: "0.7rem", color: "#94a3b8" }}>(Ógjaldgengt)</span>
                              )}
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600 }}>{hours.toFixed(1)}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{item.hourly_rate.toLocaleString("is-IS")} kr.</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: isSelected ? "#2563eb" : "#94a3b8" }}>
                              {fee.toLocaleString("is-IS")} kr.
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expense Selection Card */}
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
                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0f172a" }}>
                      🧾 Útlagður kostnaður & dómgjöld
                    </h4>
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                      Dómgjöld, stefnubirtingar, sérfræðingar og útgjöld
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => setSelectedExpenseIds(expenses.map((e) => e.id))}
                      style={{ padding: "4px 10px", fontSize: "0.75rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Velja alla
                    </button>
                    <button
                      onClick={() => setSelectedExpenseIds([])}
                      style={{ padding: "4px 10px", fontSize: "0.75rem", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Afvelja alla
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "#fafafa", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <th style={{ padding: "8px 12px", width: "40px", textAlign: "center" }}>Á yfirliti</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Dags.</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Tegund</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Heiti og fylgiskjal</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Án VSK</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>VSK</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Alls m. VSK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map((exp) => {
                        const isSelected = selectedExpenseIds.includes(exp.id);
                        const expType = EXPENSE_TYPE_LABELS[exp.expense_type] || exp.expense_type;
                        const total = exp.amount + (exp.vat_amount || 0);
                        return (
                          <tr
                            key={exp.id}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: isSelected ? "#fff" : "#f8fafc",
                              opacity: isSelected ? 1 : 0.65,
                            }}
                          >
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleExpenseItem(exp.id)}
                              />
                            </td>
                            <td style={{ padding: "8px 12px", color: "#475569" }}>{exp.incurred_date}</td>
                            <td style={{ padding: "8px 12px", color: "#1e293b", fontWeight: 500 }}>{expType}</td>
                            <td style={{ padding: "8px 12px", color: "#334155" }}>
                              {exp.title}
                              {exp.receipt_doc_title && (
                                <span style={{ marginLeft: "4px", fontSize: "0.72rem", color: "#0284c7" }}>
                                  [Fskj.: {exp.receipt_doc_title}]
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{exp.amount.toLocaleString("is-IS")} kr.</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{exp.vat_amount ? `${exp.vat_amount.toLocaleString("is-IS")} kr.` : "0 kr."}</td>
                            <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 600, color: isSelected ? "#d97706" : "#94a3b8" }}>
                              {total.toLocaleString("is-IS")} kr.
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Remarks Form */}
              <div
                style={{
                  background: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  padding: "16px",
                }}
              >
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", marginBottom: "4px" }}>
                  Sérstakur rökstuðningur eða athugasemdir málflytjanda
                </label>
                <textarea
                  placeholder="t.d. Málið var óvenju umfangsmikið hvað varðar gagnaöflun og mat dómkvaddra matsmanna. Málflutningur tók tvöfalt lengri tíma en áætlað var..."
                  rows={3}
                  value={additionalRemarks}
                  onChange={(e) => setAdditionalRemarks(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "5px",
                    fontSize: "0.82rem",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
          )}

          {/* TAB 3: MONOSPACE TEXT PREVIEW */}
          {viewTab === "text" && (
            <div style={{ maxWidth: "850px", margin: "0 auto" }}>
              <pre
                style={{
                  background: "#fff",
                  padding: "24px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontFamily: "Courier New, Courier, monospace",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                  color: "#0f172a",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {formattedText}
              </pre>
            </div>
          )}
        </div>

        {/* Feedback Message */}
        {savedSuccessMsg && (
          <div
            style={{
              background: "#dcfce7",
              color: "#15803d",
              padding: "10px 24px",
              fontSize: "0.85rem",
              fontWeight: 600,
              borderTop: "1px solid #bbf7d0",
            }}
          >
            {savedSuccessMsg}
          </div>
        )}

        {/* Action Buttons Footer */}
        <div
          style={{
            padding: "14px 24px",
            background: "#fff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          {/* Left Actions: Exporting Word, Printing PDF, Copying */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(37,99,235,0.2)",
              }}
            >
              <span>📄</span>
              <span>{isExportingDocx ? "Útbý Word skjal..." : "Sækja Word (.docx)"}</span>
            </button>

            <button
              onClick={handlePrint}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#f1f5f9",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <span>🖨️</span>
              <span>Prenta / Vista sem PDF</span>
            </button>

            <button
              onClick={handleCopyText}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#f1f5f9",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                padding: "8px 14px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <span>📋</span>
              <span>{copySuccess ? "Afritað!" : "Afrita texta"}</span>
            </button>
          </div>

          {/* Right Actions: Save to Case Dossier, Close */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={handleSaveToDossier}
              disabled={isSavingDoc}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "8px 18px",
                borderRadius: "6px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(22,163,74,0.2)",
              }}
            >
              <span>📑</span>
              <span>{isSavingDoc ? "Vistar í málasafn..." : "Vista sem dómsskjal í málasafn"}</span>
            </button>

            <button
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
              Loka
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
