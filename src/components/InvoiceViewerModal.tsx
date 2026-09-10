"use client";

import React, { useState } from "react";
import { InvoiceItem } from "@/lib/store";
import { formatIcelandicInvoiceText } from "@/lib/invoiceUtils";

interface InvoiceViewerModalProps {
  invoice: InvoiceItem;
  onClose: () => void;
  onInvoiceUpdated: () => void;
}

export function InvoiceViewerModal({
  invoice,
  onClose,
  onInvoiceUpdated,
}: InvoiceViewerModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payRef, setPayRef] = useState("Millifærsla - Bókun");

  // Copy plain text formatted invoice
  const handleCopyText = () => {
    const txt = formatIcelandicInvoiceText(invoice);
    navigator.clipboard.writeText(txt);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  // Trigger print
  const handlePrint = () => {
    window.print();
  };

  // Mark invoice as paid
  const handleMarkAsPaid = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/v1/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "paid",
          payment_date: payDate,
          payment_reference: payRef,
        }),
      });
      if (res.ok) {
        onInvoiceUpdated();
        setShowPayDialog(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Cancel invoice (credit note reversal)
  const handleCancelInvoice = async () => {
    if (
      !confirm(
        `Ertu viss um að þú viljir fella niður reikning ${invoice.invoice_number}? Óreikningsfærðar stundir verða bakfærðar og tryggingafé endurheimt á vörslureikning.`
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/v1/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
        }),
      });
      if (res.ok) {
        onInvoiceUpdated();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const statusColors = {
    paid: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0", label: "GREIDDUR" },
    issued: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", label: "ÚTGEFINN" },
    draft: { bg: "#fef3c7", text: "#b45309", border: "#fde68a", label: "DRÖG" },
    cancelled: { bg: "#f1f5f9", text: "#64748b", border: "#cbd5e1", label: "NIÐURFELDUR" },
  };

  const curStatus = statusColors[invoice.status] || statusColors.draft;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.75)",
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
          maxWidth: "850px",
          height: "92vh",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: "14px 20px",
            background: "#0f172a",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "1.2rem" }}>🧾</span>
            <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>
              Reikningur {invoice.invoice_number}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "4px",
                background: curStatus.bg,
                color: curStatus.text,
                border: `1px solid ${curStatus.border}`,
              }}
            >
              {curStatus.label}
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "1.3rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Printable Invoice Page Canvas */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "30px",
            background: "#e2e8f0",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            id="printable-invoice"
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: "740px",
              minHeight: "750px",
              padding: "40px 48px",
              borderRadius: "4px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              color: "#0f172a",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            {/* Header: Firm info & Invoice Title */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "2px solid #0f172a",
                paddingBottom: "18px",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                  {invoice.law_firm_name}
                </h2>
                <div style={{ fontSize: "0.8rem", color: "#475569", lineHeight: 1.4 }}>
                  <div>Kt. {invoice.law_firm_kennitala} | VSK-númer: {invoice.law_firm_vat_no}</div>
                  <div>Bankareikningur: <strong>{invoice.law_firm_bank}</strong></div>
                  <div>Lögmaður: {invoice.attorney_name}</div>
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#1e3a8a", letterSpacing: "0.5px" }}>
                  REIKNINGUR
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                  Nr. {invoice.invoice_number}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                  Samkvæmt l. nr. 50/1988 og reglugerð nr. 505/2001
                </div>
              </div>
            </div>

            {/* Client & Date Information */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.2fr 1fr",
                gap: "24px",
                marginBottom: "24px",
                background: "#f8fafc",
                padding: "14px 18px",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                fontSize: "0.82rem",
              }}
            >
              <div>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", marginBottom: "4px" }}>
                  Greiðandi / Umbjóðandi:
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a" }}>
                  {invoice.client_name}
                </div>
                {invoice.client_kennitala && (
                  <div style={{ color: "#475569" }}>Kt. {invoice.client_kennitala}</div>
                )}
                {invoice.client_address && (
                  <div style={{ color: "#475569" }}>{invoice.client_address}</div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                <div><strong>Mál nr.:</strong> {invoice.case_number}</div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "4px" }}>{invoice.case_title}</div>
                <div><strong>Útgáfudagur:</strong> {invoice.issue_date}</div>
                <div><strong>Gjalddagi:</strong> {invoice.due_date}</div>
                <div><strong>Eindagi:</strong> {invoice.penalty_date}</div>
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ flex: 1, marginBottom: "20px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1.5px solid #0f172a", color: "#0f172a" }}>
                    <th style={{ textAlign: "left", padding: "8px 6px" }}>Lýsing</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", width: "70px" }}>Magn</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", width: "90px" }}>Einingaverð</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", width: "60px" }}>VSK</th>
                    <th style={{ textAlign: "right", padding: "8px 6px", width: "110px" }}>Alls án VSK</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.line_items.map((li, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "8px 6px", color: "#1e293b" }}>{li.description}</td>
                      <td style={{ textAlign: "right", padding: "8px 6px", color: "#475569" }}>
                        {li.type === "time" ? `${li.quantity.toFixed(1)} klst.` : li.quantity}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px", color: "#475569" }}>
                        {li.unit_price.toLocaleString("is-IS")} kr.
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px", color: "#64748b" }}>
                        {li.vat_rate > 0 ? `${(li.vat_rate * 100).toFixed(0)}%` : "0%"}
                      </td>
                      <td style={{ textAlign: "right", padding: "8px 6px", fontWeight: 600, color: "#0f172a" }}>
                        {li.amount_ex_vat.toLocaleString("is-IS")} kr.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals & Retainer Deductions */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "20px",
              }}
            >
              <div style={{ width: "320px", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>Samtals án VSK:</span>
                  <span>kr. {invoice.subtotal_ex_vat.toLocaleString("is-IS")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#475569" }}>
                  <span>24% Virðisaukaskattur:</span>
                  <span>kr. {invoice.total_vat.toLocaleString("is-IS")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#0f172a", fontWeight: 700, borderTop: "1px solid #cbd5e1", paddingTop: "5px" }}>
                  <span>Samtals m. VSK:</span>
                  <span>kr. {invoice.total_inc_vat.toLocaleString("is-IS")}</span>
                </div>

                {invoice.retainer_deducted > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", color: "#15803d", fontWeight: 600 }}>
                    <span>Frádráttur móttekins tryggingafjár:</span>
                    <span>- kr. {invoice.retainer_deducted.toLocaleString("is-IS")}</span>
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
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                    TIL GREIÐSLU:
                  </span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1e3a8a" }}>
                    kr. {invoice.final_amount_due.toLocaleString("is-IS")}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment & Bank Notice */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px dashed #cbd5e1",
                padding: "12px 16px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                color: "#475569",
                lineHeight: 1.4,
              }}
            >
              {invoice.status === "paid" ? (
                <div style={{ color: "#15803d", fontWeight: 600 }}>
                  ✅ KVITTUN FYRIR GREIÐSLU: Reikningur var greiddur þann {invoice.payment_date}. ({invoice.payment_reference})
                </div>
              ) : (
                <div>
                  <strong>Greiðsluupplýsingar:</strong> Greiðist inn á reikning <strong>{invoice.law_firm_bank}</strong>. Vinsamlegast tilgreinið reikningsnúmer <strong>{invoice.invoice_number}</strong> í skýringu millifærslu.
                  Verði reikningur ekki greiddur á eindaga reiknast hæstu lögleyfðir dráttarvextir skv. 1. mgr. 6. gr. laga nr. 38/2001 um vexti og verðtryggingu.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dialog to Record Payment */}
        {showPayDialog && (
          <div
            style={{
              padding: "14px 20px",
              background: "#ecfdf5",
              borderTop: "1px solid #a7f3d0",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#065f46" }}>
              💰 Skrá greiðslu á reikningi:
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", color: "#047857" }}>Greiðsludagur:</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                style={{ padding: "4px 8px", fontSize: "0.8rem", border: "1px solid #6ee7b7", borderRadius: "4px" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", color: "#047857" }}>Tilvísun / Bókun:</label>
              <input
                type="text"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="Millifærsla / Kortanr."
                style={{ padding: "4px 8px", fontSize: "0.8rem", border: "1px solid #6ee7b7", borderRadius: "4px", width: "160px" }}
              />
            </div>
            <button
              onClick={handleMarkAsPaid}
              disabled={isUpdating}
              style={{
                padding: "5px 12px",
                background: "#059669",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isUpdating ? "Skráir..." : "Staðfesta greiðslu"}
            </button>
            <button
              onClick={() => setShowPayDialog(false)}
              style={{
                padding: "5px 10px",
                background: "transparent",
                color: "#065f46",
                border: "1px solid #6ee7b7",
                borderRadius: "4px",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Hætta við
            </button>
          </div>
        )}

        {/* Modal Bottom Bar Actions */}
        <div
          style={{
            padding: "12px 20px",
            background: "#fff",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handlePrint}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "#f1f5f9",
                color: "#1e293b",
                border: "1px solid #cbd5e1",
                padding: "7px 14px",
                borderRadius: "5px",
                fontSize: "0.82rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <span>🖨️</span>
              <span>Prenta / PDF</span>
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
                padding: "7px 14px",
                borderRadius: "5px",
                fontSize: "0.82rem",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              <span>📋</span>
              <span>{copySuccess ? "Afritað!" : "Afrita texta"}</span>
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
              <button
                onClick={() => setShowPayDialog(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#16a34a",
                  color: "#fff",
                  border: "none",
                  padding: "7px 14px",
                  borderRadius: "5px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>💰</span>
                <span>Skrá greiðslu</span>
              </button>
            )}

            {invoice.status !== "cancelled" && (
              <button
                onClick={handleCancelInvoice}
                disabled={isUpdating}
                style={{
                  padding: "7px 12px",
                  background: "#fff",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  borderRadius: "5px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                🚫 Fella niður (Kreditfæra)
              </button>
            )}

            <button
              onClick={onClose}
              style={{
                padding: "7px 14px",
                background: "#fff",
                color: "#475569",
                border: "1px solid #cbd5e1",
                borderRadius: "5px",
                fontSize: "0.82rem",
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
