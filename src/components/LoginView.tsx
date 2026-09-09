"use client";

import React, { useState } from "react";
import { useAuth, DEMO_USERS, User } from "@/lib/auth";

export function LoginView() {
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTestUserLogin = (roleKey: string) => {
    setIsLoading(true);
    setError("");
    setTimeout(() => {
      auth.login(roleKey);
      setIsLoading(false);
    }, 200);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Vinsamlegast sláðu inn notandanafn eða netfang.");
      return;
    }
    setIsLoading(true);
    setError("");
    setTimeout(() => {
      const res = auth.loginWithCredentials(username, password);
      if (!res.success) {
        setError(res.error || "Innskráning mistókst. Athugaðu notandanafn og lykilorð.");
      }
      setIsLoading(false);
    }, 250);
  };

  const testUsersList: { key: string; user: User; desc: string; icon: string }[] = [
    {
      key: "LAWYER",
      user: DEMO_USERS.LAWYER,
      desc: "Fullt aðgengi að stefnum, greinargerðum, málsskjölum og málsvörn.",
      icon: "⚖️",
    },
    {
      key: "JUDGE",
      user: DEMO_USERS.JUDGE,
      desc: "Úrskurðarvald, ákvörðun fresta, þingbókarfærslur og dómsuppkvaðning.",
      icon: "🏛️",
    },
    {
      key: "PARALEGAL",
      user: DEMO_USERS.PARALEGAL,
      desc: "Gagnaöflun, skjalagreining, dómaskjalaskrá og frestaútreikningar.",
      icon: "📋",
    },
    {
      key: "ADMIN",
      user: DEMO_USERS.ADMIN,
      desc: "Stjórnun á K3s klasa, Keycloak OIDC réttindum og vélbúnaðarvöktun.",
      icon: "🛡️",
    },
  ];

  return (
    <div
      id="ilcms-login-container"
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top, #0f172a 0%, #020617 100%)",
        color: "#f8fafc",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 20px",
        fontFamily: "inherit",
      }}
    >
      {/* Top Header Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "840px",
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid #1e293b",
          borderRadius: "12px",
          padding: "24px 28px",
          marginBottom: "24px",
          boxShadow: "0 20px 35px -10px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "1.6rem" }}>⚖️</span>
              <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.01em", color: "#f8fafc" }}>
                ILCMS Málastjórnunarkerfi
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: "0.86rem", color: "#94a3b8" }}>
              Staðbundið, lokað lögfræðikerfi fyrir íslenska dómstóla og lögmannsstofur.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  background: "#064e3b",
                  color: "#34d399",
                  border: "1px solid #059669",
                  padding: "3px 8px",
                  borderRadius: "20px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                🔒 Air-Gapped K3s (Local)
              </span>
              <span
                style={{
                  fontSize: "0.72rem",
                  background: "#1e3a8a",
                  color: "#93c5fd",
                  border: "1px solid #2563eb",
                  padding: "3px 8px",
                  borderRadius: "20px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                🔑 Keycloak OIDC (ilcms-realm)
              </span>
            </div>
            <span style={{ fontSize: "0.7rem", color: "#64748b" }}>ISO 27001 / GDPR / Lög nr. 90/2018</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Test Users on Left, Standard Form on Right */}
      <div
        style={{
          width: "100%",
          maxWidth: "840px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
        }}
      >
        {/* Left Column: Quick Test User Selection */}
        <div
          id="ilcms-test-users-section"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#e2e8f0" }}>
              Prófunarnotendur (Flýtiskráning)
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              Smelltu á prófíl hér að neðan til að skrá inn beint með Keycloak OIDC setu:
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
            {testUsersList.map((item) => (
              <button
                key={item.key}
                id={`btn-login-${item.key.toLowerCase()}`}
                onClick={() => handleTestUserLogin(item.key)}
                disabled={isLoading}
                style={{
                  textAlign: "left",
                  background: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  cursor: isLoading ? "wait" : "pointer",
                  color: "#f8fafc",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#38bdf8";
                  e.currentTarget.style.background = "#243247";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#334155";
                  e.currentTarget.style.background = "#1e293b";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#f8fafc" }}>
                      {item.user.name}
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                      {item.user.email} • <span style={{ color: "#38bdf8" }}>{item.user.title || item.user.role}</span>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.72rem",
                    background: "#0284c7",
                    color: "#ffffff",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Skrá inn →
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Keycloak OIDC Standard Login Form */}
        <div
          id="ilcms-credentials-section"
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid #1e293b",
            borderRadius: "12px",
            padding: "20px 22px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "14px" }}>
            <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#e2e8f0" }}>
              Keycloak Innskráningarform
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
              Sláðu inn notandanafn/netfang eða veldu hlutverk:
            </p>
          </div>

          {error && (
            <div
              style={{
                background: "#7f1d1d",
                border: "1px solid #dc2626",
                borderRadius: "6px",
                padding: "8px 12px",
                fontSize: "0.8rem",
                color: "#fecaca",
                marginBottom: "12px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleCredentialsSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px", fontWeight: 500 }}>
                Notandanafn eða netfang
              </label>
              <input
                id="input-login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="t.d. gudrun@lex.is eða jon.thordarson@heradsdomstolar.is"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#0b1329",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "0.82rem",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "#cbd5e1", marginBottom: "4px", fontWeight: 500 }}>
                Lykilorð
              </label>
              <input
                id="input-login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#0b1329",
                  border: "1px solid #334155",
                  borderRadius: "6px",
                  color: "#f8fafc",
                  fontSize: "0.82rem",
                  boxSizing: "border-box",
                }}
              />
              <span style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px", display: "block" }}>
                Í Air-Gapped prófunarumhverfi eru öll lykilorð samþykkt.
              </span>
            </div>

            <div style={{ marginTop: "auto", paddingTop: "12px" }}>
              <button
                id="btn-login-submit"
                type="submit"
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: isLoading ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                }}
              >
                {isLoading ? "Auðkennir í Keycloak..." : "🔑 Skrá inn í ILCMS"}
              </button>
            </div>
          </form>

          <div
            style={{
              marginTop: "16px",
              padding: "10px",
              background: "#0b1329",
              borderRadius: "6px",
              border: "1px solid #1e293b",
              fontSize: "0.72rem",
              color: "#94a3b8",
              lineHeight: 1.4,
            }}
          >
            🛡️ <strong>Staðbundin dulkóðun:</strong> Notendur eru staðfestir á móti Keycloak OIDC í K3s klasa. Engin gögn fara út fyrir tölvuna.
          </div>
        </div>
      </div>
    </div>
  );
}
