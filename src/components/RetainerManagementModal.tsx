"use client";

import React, { useState } from "react";
import { CaseItem, RetainerTransactionItem, PaymentMethod } from "@/lib/store";

interface RetainerManagementModalProps {
  activeCase: CaseItem;
  transactions: RetainerTransactionItem[];
  balance: {
    total_deposited: number;
    total_deducted: number;
    total_refunded: number;
    current_balance: number;
  };
  onClose: () => void;
  onRetainerUpdated: () => void;
}

export function RetainerManagementModal({
  activeCase,
  transactions,
  balance,
  onClose,
  onRetainerUpdated,
}: RetainerManagementModalProps) {
  const [activeAction, setActiveAction] = useState<"deposit" | "refund" | null>("deposit");

  // Form state
  const [amount, setAmount] = useState<number>(100000);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setErrorMsg("Vinsamlegast sláðu inn löglega fjárhæð.");
      return;
    }

    if (activeAction === "refund" && amount > balance.current_balance) {
      setErrorMsg(
        `Endurgreiðsla getur ekki verið hærri en óráðstafað tryggingafé (kr. ${balance.current_balance.toLocaleString(
          "is-IS"
        )}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/v1/cases/${activeCase.id}/retainers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeAction,
          amount,
          date,
          payment_method: method,
          reference:
            reference ||
            (activeAction === "deposit"
              ? "Innborgun á vörslureikning"
              : "Endurgreiðsla til umbjóðanda"),
          notes,
        }),
      });

      if (res.ok) {
        setSuccessMsg(
          activeAction === "deposit"
            ? "Innborgun tryggingafjár var skráð!"
            : "Endurgreiðsla var skráð!"
        );
        onRetainerUpdated();
        setReference("");
        setNotes("");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Gat ekki skráð færslu.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Villa: " + err?.message);
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
          maxWidth: "880px",
          maxHeight: "90vh",
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
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>🏦</span>
              <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                Tryggingafé & Vörslufjárreikningur
              </h3>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: "3px" }}>
              Mál {activeCase?.case_number}: {activeCase?.title}
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

        {/* Balance Metric Highlights */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            padding: "16px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
              Samtals innborgun
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#166534", marginTop: "2px" }}>
              kr. {balance.total_deposited.toLocaleString("is-IS")}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
              Ráðstafað á reikninga
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e3a8a", marginTop: "2px" }}>
              kr. {balance.total_deducted.toLocaleString("is-IS")}
            </div>
          </div>

          <div
            style={{
              background: "#fff",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
              Endurgreitt
            </div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#64748b", marginTop: "2px" }}>
              kr. {balance.total_refunded.toLocaleString("is-IS")}
            </div>
          </div>

          <div
            style={{
              background: "#f0fdf4",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "1px solid #bbf7d0",
            }}
          >
            <div style={{ fontSize: "0.72rem", color: "#15803d", fontWeight: 700 }}>
              Óráðstafað tryggingafé
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#15803d", marginTop: "2px" }}>
              kr. {balance.current_balance.toLocaleString("is-IS")}
            </div>
          </div>
        </div>

        {/* Action Bar & Forms */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <button
              onClick={() => setActiveAction("deposit")}
              style={{
                padding: "6px 14px",
                borderRadius: "5px",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: "none",
                background: activeAction === "deposit" ? "#166534" : "#f1f5f9",
                color: activeAction === "deposit" ? "#fff" : "#475569",
                cursor: "pointer",
              }}
            >
              ➕ Skrá innborgun á vörslureikning
            </button>
            <button
              onClick={() => setActiveAction("refund")}
              style={{
                padding: "6px 14px",
                borderRadius: "5px",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: "none",
                background: activeAction === "refund" ? "#b91c1c" : "#f1f5f9",
                color: activeAction === "refund" ? "#fff" : "#475569",
                cursor: "pointer",
              }}
            >
              ↩️ Endurgreiða umbjóðanda afgang
            </button>
          </div>

          {errorMsg && (
            <div style={{ background: "#fef2f2", color: "#991b1b", padding: "8px 12px", borderRadius: "5px", fontSize: "0.8rem", marginBottom: "10px" }}>
              ⚠️ {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: "#f0fdf4", color: "#15803d", padding: "8px 12px", borderRadius: "5px", fontSize: "0.8rem", marginBottom: "10px" }}>
              ✅ {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1.5fr auto", gap: "10px", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                Fjárhæð (kr.)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.82rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                Dagsetning
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.82rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                Greiðslumáti
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.82rem", background: "#fff" }}
              >
                <option value="bank_transfer">Millifærsla</option>
                <option value="credit_card">Kortagreiðsla</option>
                <option value="cash">Reiðufé</option>
                <option value="other">Annað</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.72rem", color: "#475569", fontWeight: 600, marginBottom: "3px" }}>
                Tilvísun / Skýring
              </label>
              <input
                type="text"
                placeholder="Bókunarnr., kvittun eða skýring"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "0.82rem" }}
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "7px 16px",
                background: activeAction === "deposit" ? "#166534" : "#b91c1c",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {isSubmitting
                ? "Skráir..."
                : activeAction === "deposit"
                ? "Skrá innborgun"
                : "Skrá endurgreiðslu"}
            </button>
          </form>
        </div>

        {/* Ledger Table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "0.88rem", color: "#0f172a", fontWeight: 700 }}>
            📜 Hreyfingayfirlit vörslufjárreiknings ({transactions.length} færslur)
          </h4>

          {transactions.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
              Engar hreyfingar hafa verið skráðar á tryggingafé þessa máls.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid #e2e8f0", color: "#64748b" }}>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Dags.</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Tegund</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Tilvísun & Skýring</th>
                  <th style={{ textAlign: "left", padding: "8px 10px" }}>Greiðslumáti</th>
                  <th style={{ textAlign: "right", padding: "8px 10px" }}>Fjárhæð</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isDeposit = tx.type === "deposit";
                  const isDeduction = tx.type === "deduction";
                  const isRefund = tx.type === "refund";

                  return (
                    <tr key={tx.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>{tx.date}</td>
                      <td style={{ padding: "8px 10px" }}>
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
                          {isDeposit
                            ? "Innborgun"
                            : isDeduction
                            ? `Ráðstöfun (${tx.invoice_number || "Reikningur"})`
                            : "Endurgreiðsla"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#1e293b" }}>
                        <div>{tx.reference}</div>
                        {tx.notes && (
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{tx.notes}</div>
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#64748b" }}>
                        {tx.payment_method === "bank_transfer"
                          ? "Millifærsla"
                          : tx.payment_method === "credit_card"
                          ? "Kortagreiðsla"
                          : tx.payment_method === "cash"
                          ? "Reiðufé"
                          : "Annað"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          padding: "8px 10px",
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

        {/* Footer */}
        <div
          style={{
            padding: "12px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "7px 16px",
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
  );
}
