"use client";

import React, { useState, useEffect } from "react";

interface OpenWebUIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenWebUIModal({ isOpen, onClose }: OpenWebUIModalProps) {
  const [activeTab, setActiveTab] = useState<"launch" | "docker" | "k8s" | "features">("launch");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [airgapStatus, setAirgapStatus] = useState<any>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setCheckingStatus(true);
    fetch("/api/v1/system/airgap-status")
      .then((res) => res.json())
      .then((data) => setAirgapStatus(data))
      .catch((err) => console.error("Could not fetch airgap status:", err))
      .finally(() => setCheckingStatus(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2500);
    }
  };

  const handleOpenBrowser = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          width: "740px",
          maxWidth: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(135deg, #0f172a, #1e293b)",
            color: "#ffffff",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #059669, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
              }}
            >
              💬
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#f8fafc" }}>
                  Open WebUI — Vafraspjall & Skjalagreining
                </h3>
                <span
                  style={{
                    background: "#065f46",
                    color: "#6ee7b7",
                    border: "1px solid #059669",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                  }}
                >
                  100% Air-Gapped
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                Vafraviðmót tengt staðbundnu Ollama mál- og vigralíkani án skýtenginga
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#334155",
              border: "none",
              color: "#cbd5e1",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            padding: "0 24px",
            gap: "8px",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("launch")}
            style={{
              padding: "10px 14px",
              border: "none",
              borderBottom: activeTab === "launch" ? "2px solid #059669" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "launch" ? "#065f46" : "#64748b",
              fontWeight: activeTab === "launch" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🚀</span> Opna í Vafra
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("docker")}
            style={{
              padding: "10px 14px",
              border: "none",
              borderBottom: activeTab === "docker" ? "2px solid #059669" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "docker" ? "#065f46" : "#64748b",
              fontWeight: activeTab === "docker" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>🐳</span> Docker Uppsetning
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("k8s")}
            style={{
              padding: "10px 14px",
              border: "none",
              borderBottom: activeTab === "k8s" ? "2px solid #059669" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "k8s" ? "#065f46" : "#64748b",
              fontWeight: activeTab === "k8s" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>☸️</span> Kubernetes / K3s
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("features")}
            style={{
              padding: "10px 14px",
              border: "none",
              borderBottom: activeTab === "features" ? "2px solid #059669" : "2px solid transparent",
              background: "transparent",
              color: activeTab === "features" ? "#065f46" : "#64748b",
              fontWeight: activeTab === "features" ? 700 : 500,
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>⚖️</span> Eiginleikar fyrir Lögfræðinga
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {activeTab === "launch" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Status Box */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                }}
              >
                <div style={{ fontSize: "1.5rem" }}>🛡️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#14532d" }}>
                      Staðbundið Air-Gapped Gervigreindarviðmót
                    </h4>
                    <span
                      style={{
                        background: "#dcfce7",
                        color: "#15803d",
                        padding: "1px 8px",
                        borderRadius: "10px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                      }}
                    >
                      Virkt
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#166534", lineHeight: 1.5 }}>
                    Open WebUI tengist beint við staðbundið Ollama mál- og vigralíkan á fartölvunni. Engar fyrirspurnir eða málsskjöl fara út á almenna netið.
                  </p>
                  <div
                    style={{
                      marginTop: "10px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                      fontSize: "0.75rem",
                      color: "#15803d",
                    }}
                  >
                    <div>• <strong>Mállíkan:</strong> {airgapStatus?.model || "gemma2:9b"}</div>
                    <div>• <strong>Innra Ollama hlið:</strong> http://ollama:11434</div>
                    <div>• <strong>Persónuvernd:</strong> Lög nr. 90/2018 (Zero Egress)</div>
                    <div>• <strong>Auðkenning:</strong> Sjálfgefið opið á vinnustöð / Keycloak OIDC</div>
                  </div>
                </div>
              </div>

              {/* Direct Access Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {/* Docker Compose Access */}
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "1.2rem" }}>🐳</span>
                      <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>Docker Compose Aðgangur</strong>
                    </div>
                    <p style={{ margin: "0 0 12px 0", fontSize: "0.8rem", color: "#64748b" }}>
                      Staðbundið vafraviðmót á porti 3080 þegar keyrt er með Docker.
                    </p>
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "8px 10px",
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                        color: "#0f172a",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>http://localhost:3080</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("http://localhost:3080", "docker-url")}
                        style={{
                          background: "#e2e8f0",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          color: "#334155",
                        }}
                      >
                        {copiedText === "docker-url" ? "Afritað!" : "Afrita"}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenBrowser("http://localhost:3080")}
                    style={{
                      marginTop: "14px",
                      padding: "8px 14px",
                      background: "#059669",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <span>Opna http://localhost:3080</span>
                    <span>↗</span>
                  </button>
                </div>

                {/* Kubernetes / K3s Access */}
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "1.2rem" }}>☸️</span>
                      <strong style={{ fontSize: "0.92rem", color: "#0f172a" }}>Kubernetes (K3s) Ingress</strong>
                    </div>
                    <p style={{ margin: "0 0 12px 0", fontSize: "0.8rem", color: "#64748b" }}>
                      Tengt í gegnum Traefik Ingress á léninu chat.ilcms.local.
                    </p>
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "6px",
                        padding: "8px 10px",
                        fontSize: "0.82rem",
                        fontFamily: "monospace",
                        color: "#0f172a",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>http://chat.ilcms.local</span>
                      <button
                        type="button"
                        onClick={() => handleCopy("http://chat.ilcms.local", "k8s-url")}
                        style={{
                          background: "#e2e8f0",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          color: "#334155",
                        }}
                      >
                        {copiedText === "k8s-url" ? "Afritað!" : "Afrita"}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenBrowser("http://chat.ilcms.local")}
                    style={{
                      marginTop: "14px",
                      padding: "8px 14px",
                      background: "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <span>Opna http://chat.ilcms.local</span>
                    <span>↗</span>
                  </button>
                </div>
              </div>

              {/* Quick Instructions */}
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "14px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.8rem",
                  color: "#475569",
                }}
              >
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "6px" }}>
                  💡 Leiðbeiningar um fyrstu tengingu:
                </strong>
                <ol style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <li>Ef Open WebUI er ræst með <code>docker compose up -d</code> er það sjálfkrafa tilbúið á <code>http://localhost:3080</code>.</li>
                  <li>Ollama líkanið (<code>gemma2:9b</code>) er sjálfgefið tengt og valið í fellilistanum efst.</li>
                  <li>Notendur geta dregið og sleppt gögnum (PDF, Word) beint inn í gluggann til greiningar án þess að gögn fari út á internetið.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === "docker" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.5 }}>
                Docker Compose uppsetningin inniheldur <code>open-webui</code> þjónustuna sem er tengd við bæði <code>ilcms_net</code> og hið einangraða <code>ilcms_ai_isolated_net</code> (þar sem Ollama er einangrað).
              </div>

              {/* Compose Snippet */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569" }}>docker-compose.yml skilgreining:</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        `open-webui:\n  image: ghcr.io/open-webui/open-webui:main\n  container_name: ilcms-open-webui\n  ports:\n    - "127.0.0.1:3080:8080"\n  environment:\n    - OLLAMA_BASE_URL=http://ollama:11434\n    - WEBUI_AUTH=false\n  networks:\n    - ilcms_net\n    - ilcms_ai_isolated_net`,
                        "compose-snip"
                      )
                    }
                    style={{
                      fontSize: "0.72rem",
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "4px",
                      padding: "2px 8px",
                      cursor: "pointer",
                    }}
                  >
                    {copiedText === "compose-snip" ? "Afritað!" : "Afrita sniðmát"}
                  </button>
                </div>
                <pre
                  style={{
                    background: "#0f172a",
                    color: "#f8fafc",
                    padding: "14px",
                    borderRadius: "8px",
                    fontSize: "0.76rem",
                    overflowX: "auto",
                    margin: 0,
                    fontFamily: "monospace",
                  }}
                >
{`  # Open WebUI (100% Air-Gapped Browser Interface for Ollama)
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: ilcms-open-webui
    restart: unless-stopped
    ports:
      - "127.0.0.1:3080:8080"
    networks:
      - ilcms_net
      - ilcms_ai_isolated_net
    depends_on:
      - ollama
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEBUI_NAME=ILCMS Legal AI (Open WebUI)
      - WEBUI_AUTH=false
      - DATA_DIR=/app/backend/data
      - DEFAULT_MODELS=gemma2:9b
      - ENV=prod
    volumes:
      - open_webui_data:/app/backend/data`}
                </pre>
              </div>

              {/* Startup Command */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "12px",
                  fontSize: "0.8rem",
                }}
              >
                <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                  Ræsa alla samstæðuna í Docker:
                </div>
                <div
                  style={{
                    background: "#1e293b",
                    color: "#38bdf8",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>docker compose up -d open-webui ollama</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("docker compose up -d open-webui ollama", "cmd-docker")}
                    style={{
                      background: "#334155",
                      border: "none",
                      color: "#f8fafc",
                      borderRadius: "3px",
                      padding: "2px 6px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                  >
                    {copiedText === "cmd-docker" ? "Afritað!" : "Afrita"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "k8s" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.5 }}>
                Í Kubernetes (K3s) er Open WebUI skilgreint sem <code>Deployment</code> og <code>Service</code> í <code>ilcms</code> nafnarýminu, tengt við <code>ollama.ilcms.svc.cluster.local:11434</code> og beint út með Traefik Ingress.
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "14px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.8rem",
                  color: "#475569",
                }}
              >
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "6px" }}>
                  1. /etc/hosts stilling fyrir staðbundið Traefik Ingress:
                </strong>
                <div
                  style={{
                    background: "#0f172a",
                    color: "#a7f3d0",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>127.0.0.1 ilcms.local auth.ilcms.local chat.ilcms.local</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("127.0.0.1 ilcms.local auth.ilcms.local chat.ilcms.local", "hosts-entry")
                    }
                    style={{
                      background: "#1e293b",
                      border: "none",
                      color: "#f8fafc",
                      borderRadius: "3px",
                      padding: "2px 6px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                  >
                    {copiedText === "hosts-entry" ? "Afritað!" : "Afrita"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "14px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.8rem",
                  color: "#475569",
                }}
              >
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "6px" }}>
                  2. Virkja með Kustomize eða kubectl:
                </strong>
                <div
                  style={{
                    background: "#0f172a",
                    color: "#38bdf8",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>kubectl apply -k deploy/k8s/</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("kubectl apply -k deploy/k8s/", "k8s-apply")}
                    style={{
                      background: "#1e293b",
                      border: "none",
                      color: "#f8fafc",
                      borderRadius: "3px",
                      padding: "2px 6px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                  >
                    {copiedText === "k8s-apply" ? "Afritað!" : "Afrita"}
                  </button>
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "8px",
                  padding: "14px",
                  border: "1px solid #e2e8f0",
                  fontSize: "0.8rem",
                  color: "#475569",
                }}
              >
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "6px" }}>
                  3. Beinn port-forward aðgangur án Ingress:
                </strong>
                <div
                  style={{
                    background: "#0f172a",
                    color: "#fcd34d",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontFamily: "monospace",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>kubectl port-forward svc/open-webui -n ilcms 3080:8080</span>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy("kubectl port-forward svc/open-webui -n ilcms 3080:8080", "k8s-forward")
                    }
                    style={{
                      background: "#1e293b",
                      border: "none",
                      color: "#f8fafc",
                      borderRadius: "3px",
                      padding: "2px 6px",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                  >
                    {copiedText === "k8s-forward" ? "Afritað!" : "Afrita"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "features" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>📄 Drag & Drop Málsskjöl & Dómar</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
                  Lögmenn geta dregið heilu dómsskjölin (PDF, DOCX, TXT) beint inn í spjallgluggann í Open WebUI. Kerfið býr sjálfkrafa til staðbundna vigra (embeddings) og svarar með beinum tilvitnunum í blaðsíður og greinar.
                </p>
              </div>

              <div
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>🔒 Trúnaðarskylda & Persónuverndarlög</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
                  Fullkomin einangrun tryggir að engin gögn fara til stórfyrirtækja (OpenAI, Google eða Anthropic). Fullnægir ströngustu kröfum Lögmannafélags Íslands og reglugerðar Evrópusambandsins (GDPR).
                </p>
              </div>

              <div
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>🔑 Keycloak Single Sign-On (Valfrjálst)</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
                  Open WebUI styður OpenID Connect (OIDC). Hægt er að tengja það við innbyggða Keycloak miðlarann (<code>ilcms</code> realm) svo lögmenn skrái sig inn með sömu aðgangsorðum og í ILCMS.
                </p>
              </div>

              <div
                style={{
                  padding: "12px",
                  background: "#f8fafc",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>⚖️ Íslenskt Lögfræðimálfar</strong>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#475569", lineHeight: 1.5 }}>
                  Þegar fínstillt íslenskt mállíkan (eins og Gemma 2 9B eða Miðeind Allra-Handa) er ræst í Ollama skilur og beitir Open WebUI íslensku lögfræðilegu hugtakaneti og réttarfarshugtökum.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
            Hýst staðbundið á <code>http://localhost:3080</code> eða <code>http://chat.ilcms.local</code>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={() => handleOpenBrowser("http://localhost:3080")}
              style={{
                padding: "6px 14px",
                background: "#059669",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span>Opna Open WebUI</span>
              <span>↗</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "6px 14px",
                background: "#e2e8f0",
                color: "#334155",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.8rem",
                fontWeight: 500,
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
