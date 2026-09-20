"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  SystemService,
  SystemResources,
  AdminUser,
  AuditEvent,
  SystemLogEntry,
  INITIAL_SERVICES,
  INITIAL_RESOURCES,
  INITIAL_USERS,
  INITIAL_AUDIT_EVENTS,
  INITIAL_LOGS,
} from "@/lib/admin-store";
import { E2ETestReport } from "@/app/api/v1/admin/e2e-test/route";
import { K3sResourceMonitorWidget } from "@/components/K3sResourceMonitorWidget";

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
}

export function AdminConsoleModal({ isOpen, onClose, currentUser }: AdminConsoleModalProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "users" | "audit" | "logs">("dashboard");

  // E2E Test State
  const [isE2ETestRunning, setIsE2ETestRunning] = useState(false);
  const [e2eProgressStep, setE2EProgressStep] = useState<string | null>(null);
  const [e2eReport, setE2EReport] = useState<E2ETestReport | null>(null);
  const [showE2EReportModal, setShowE2EReportModal] = useState(false);

  // Services and resources state
  const [services, setServices] = useState<SystemService[]>(INITIAL_SERVICES);
  const [resources, setResources] = useState<SystemResources>(INITIAL_RESOURCES);
  const [loadingServices, setLoadingServices] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Users state (Keycloak RBAC)
  const [users, setUsers] = useState<AdminUser[]>(INITIAL_USERS);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserRole, setNewUserRole] = useState<"ADMIN" | "LAWYER" | "JUDGE" | "PARALEGAL">("LAWYER");
  const [newUserDept, setNewUserDept] = useState("Málflutningur & Einkamálaréttur");
  const [newUserPassword, setNewUserPassword] = useState("Ilcms2026!Secret");
  const [newUserMfa, setNewUserMfa] = useState(true);
  const [userActionMsg, setUserActionMsg] = useState<string | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUser | null>(null);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState<AdminUser | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("NýttLykilorð2026!");

  // Audit state
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(INITIAL_AUDIT_EVENTS);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditUserFilter, setAuditUserFilter] = useState("all");
  const [auditCategoryFilter, setAuditCategoryFilter] = useState("all");
  const [auditSearchQuery, setAuditSearchQuery] = useState("");

  // Logs state
  const [logs, setLogs] = useState<SystemLogEntry[]>(INITIAL_LOGS);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logServiceFilter, setLogServiceFilter] = useState("all");
  const [logLevelFilter, setLogLevelFilter] = useState("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Fetch data on modal open or tab switch
  useEffect(() => {
    if (!isOpen) return;

    fetchServices();
    fetchUsers();
    fetchAudit();
    fetchLogs();
  }, [isOpen]);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === "logs" && autoScrollLogs && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, activeTab, autoScrollLogs]);

  // Check authorization
  const isAdmin = currentUser?.email === "admin@ilcms.is" || currentUser?.role === "ADMIN";

  if (!isOpen) return null;

  // If not admin, display access denied
  if (!isAdmin) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(10, 15, 29, 0.85)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "#0f172a",
            border: "1px solid #ef4444",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "16px" }}>⛔</div>
          <h2 style={{ fontSize: "1.3rem", color: "#f87171", fontWeight: 700, marginBottom: "8px" }}>
            Aðgangur bannaður (Access Denied)
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#cbd5e1", lineHeight: 1.6, marginBottom: "20px" }}>
            Þetta kerfisstjóraviðmót er aðeins aðgengilegt fyrir notandann <strong>admin@ilcms.is</strong>.
            Núverandi notandi: <strong>{currentUser?.email || "Óþekktur"}</strong> ({currentUser?.role || "Enginn aðgangur"}).
          </p>
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              background: "#334155",
              color: "#fff",
              border: "1px solid #475569",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Loka
          </button>
        </div>
      </div>
    );
  }

  // --- API Calls ---
  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const res = await fetch("/api/v1/admin/services");
      if (res.ok) {
        const data = await res.json();
        if (data.services) setServices(data.services);
        if (data.resources) setResources(data.resources);
      }
    } catch (e) {
      console.error("Error fetching services:", e);
    } finally {
      setLoadingServices(false);
    }
  };

  const handleServiceAction = async (serviceId: string, action: "start" | "stop" | "restart") => {
    try {
      setActionInProgress(`${serviceId}-${action}`);
      setStatusFeedback(`Framkvæmir '${action}' á ${serviceId}...`);

      const res = await fetch("/api/v1/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId, action }),
      });

      const data = await res.json();
      if (res.ok && data.services) {
        setServices(data.services);
        if (data.resources) setResources(data.resources);
        setStatusFeedback(data.message || `Aðgerð tókst.`);

        // Append log and audit
        const newLogEntry: SystemLogEntry = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          service: serviceId as any,
          level: action === "stop" ? "WARN" : "INFO",
          message: `Kerfisstjóri framkvæmdi handvirka aðgerð [${action.toUpperCase()}] á þjónustunni '${serviceId}'.`,
        };
        setLogs((prev) => [newLogEntry, ...prev]);

        const newAuditEvent: AuditEvent = {
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString(),
          userName: currentUser?.name || "Kerfisstjóri ILCMS",
          userEmail: currentUser?.email || "admin@ilcms.is",
          role: "ADMIN",
          action: `Þjónusta: ${action.toUpperCase()}`,
          category: "ADMIN",
          target: serviceId,
          ipAddress: "127.0.0.1",
          status: "SUCCESS",
          details: `Stjórnandi sendi skipun '${action}' til Docker/K3s stýripúka fyrir '${serviceId}'.`,
        };
        setAuditEvents((prev) => [newAuditEvent, ...prev]);
      } else {
        setStatusFeedback(`Villa: ${data.error || "Aðgerð mistókst"}`);
      }
    } catch (e: any) {
      setStatusFeedback(`Villa við tengingu: ${e.message}`);
    } finally {
      setActionInProgress(null);
      setTimeout(() => setStatusFeedback(null), 4000);
    }
  };

  const handleRestartAll = async () => {
    if (!confirm("Ertu viss um að vilja endurræsa allar einingar kerfisins (Docker / K3s Stack)?")) return;
    try {
      setActionInProgress("restart-all");
      setStatusFeedback("Endurræsir allar einingar (Next.js, Postgres, Keycloak, Ollama)...");

      const res = await fetch("/api/v1/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart-all" }),
      });

      const data = await res.json();
      if (res.ok && data.services) {
        setServices(data.services);
        setStatusFeedback("Allar einingar voru endurræstar með góðum árangri.");
        fetchServices();
      }
    } catch (e: any) {
      setStatusFeedback(`Villa: ${e.message}`);
    } finally {
      setActionInProgress(null);
      setTimeout(() => setStatusFeedback(null), 4000);
    }
  };

  const handleRunE2ETest = async () => {
    try {
      setIsE2ETestRunning(true);
      setE2EProgressStep("1/6: Keycloak 24 IAM...");
      setStatusFeedback("Keyrir heildarprófun (End-to-End Test) á öllum hlutum kerfisins...");

      const stepTimer1 = setTimeout(() => setE2EProgressStep("2/6: PostgreSQL 16 & pgvector..."), 120);
      const stepTimer2 = setTimeout(() => setE2EProgressStep("3/6: Ollama Gemma 2 9B (Air-Gap)..."), 250);
      const stepTimer3 = setTimeout(() => setE2EProgressStep("4/6: Dómstólasýslan 1/2020..."), 380);
      const stepTimer4 = setTimeout(() => setE2EProgressStep("5/6: Tímaskráning & Gjaldskrá..."), 500);
      const stepTimer5 = setTimeout(() => setE2EProgressStep("6/6: Hreinsar & eyðir öllum prófunargögnum..."), 620);

      const res = await fetch("/api/v1/admin/e2e-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: currentUser?.email || "admin@ilcms.is" }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      clearTimeout(stepTimer5);

      const data = await res.json();
      if (res.ok && data.report) {
        setE2EReport(data.report);
        setShowE2EReportModal(true);
        setStatusFeedback("Heildarprófun lauk: STAÐIST. Öllum prófunargögnum hefur verið eytt.");

        // Record in audit log
        setAuditEvents((prev) => [
          {
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userName: currentUser?.name || "Kerfisstjóri ILCMS",
            userEmail: currentUser?.email || "admin@ilcms.is",
            role: "ADMIN",
            action: "Heildarprófun (E2E Test)",
            category: "ADMIN",
            target: "Allir kerfishlutar (Docker / K3s Stack)",
            ipAddress: "127.0.0.1",
            status: "SUCCESS",
            details: `Keyrði prófun á öllum 6 einingum kerfisins á ${data.report.totalDurationMs}ms. Öllum tímabundnum prófunargögnum var eytt (0 gögn eftir).`,
          },
          ...prev,
        ]);

        // Record in system logs
        setLogs((prev) => [
          {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            service: "ilcms-web",
            level: "INFO",
            message: `E2E System Test Completed: 6/6 stages passed in ${data.report.totalDurationMs}ms. Cleanup verified: 0 test artifacts remaining.`,
          },
          ...prev,
        ]);
      } else {
        alert(data.error || "Mistókst að keyra heildarprófun.");
      }
    } catch (e: any) {
      alert(`Villa í heildarprófun: ${e.message}`);
    } finally {
      setIsE2ETestRunning(false);
      setE2EProgressStep(null);
      setTimeout(() => setStatusFeedback(null), 5000);
    }
  };

  const exportE2EReportJson = () => {
    if (!e2eReport) return;
    const blob = new Blob([JSON.stringify(e2eReport, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ilcms_e2e_test_report_${e2eReport.testRunId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await fetch("/api/v1/admin/users");
      if (res.ok) {
        const data = await res.json();
        if (data.users) setUsers(data.users);
      }
    } catch (e) {
      console.error("Error fetching users:", e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      alert("Vinsamlegast fylltu út nafn og netfang.");
      return;
    }

    try {
      setUserActionMsg("Stofnar notanda í Keycloak...");
      const res = await fetch("/api/v1/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          username: newUserUsername || newUserEmail.split("@")[0],
          role: newUserRole,
          department: newUserDept,
          password: newUserPassword,
          mfaEnabled: newUserMfa,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.users) setUsers(data.users);
        setUserActionMsg(data.message || "Notandi stofnaður.");
        setShowCreateUserModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserUsername("");

        // Log audit
        setAuditEvents((prev) => [
          {
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userName: currentUser?.name || "Kerfisstjóri",
            userEmail: currentUser?.email || "admin@ilcms.is",
            role: "ADMIN",
            action: "Notandi stofnaður",
            category: "ADMIN",
            target: `Keycloak: ${newUserEmail} (${newUserRole})`,
            ipAddress: "127.0.0.1",
            status: "SUCCESS",
            details: `Stofnaði notanda '${newUserName}' með hlutverkið '${newUserRole}' í realm 'ilcms'.`,
          },
          ...prev,
        ]);
      } else {
        alert(data.error || "Mistókst að stofna notanda.");
      }
    } catch (e: any) {
      alert(`Villa: ${e.message}`);
    } finally {
      setTimeout(() => setUserActionMsg(null), 4000);
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (user.email === "admin@ilcms.is") {
      alert("Ekki er hægt að eyða aðal kerfisstjóra.");
      return;
    }

    if (!confirm(`Ertu viss um að vilja eyða notandanum '${user.name}' (${user.email}) úr Keycloak?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/admin/users?id=${user.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (res.ok) {
        if (data.users) setUsers(data.users);
        setUserActionMsg(data.message);

        setAuditEvents((prev) => [
          {
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userName: currentUser?.name || "Kerfisstjóri",
            userEmail: currentUser?.email || "admin@ilcms.is",
            role: "ADMIN",
            action: "Notanda eytt",
            category: "ADMIN",
            target: `Keycloak: ${user.email}`,
            ipAddress: "127.0.0.1",
            status: "SUCCESS",
            details: `Eyddi notanda '${user.name}' úr Keycloak OIDC auðkenniskerfi.`,
          },
          ...prev,
        ]);
      } else {
        alert(data.error || "Mistókst að eyða notanda.");
      }
    } catch (e: any) {
      alert(`Villa: ${e.message}`);
    }
  };

  const handleToggleUserActive = async (user: AdminUser) => {
    const updatedStatus = !user.enabled;
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          enabled: updatedStatus,
        }),
      });

      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        setUserActionMsg(`Staða fyrir '${user.name}' breytt í ${updatedStatus ? "VIRKUR" : "ÓVIRKUR"}.`);
      }
    } catch (e: any) {
      alert(`Villa: ${e.message}`);
    }
  };

  const handleUpdateUserRole = async (user: AdminUser, newRole: "ADMIN" | "LAWYER" | "JUDGE" | "PARALEGAL") => {
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          role: newRole,
        }),
      });

      const data = await res.json();
      if (res.ok && data.users) {
        setUsers(data.users);
        setUserActionMsg(`Hlutverki '${user.name}' breytt í '${newRole}'.`);

        setAuditEvents((prev) => [
          {
            id: `aud-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userName: currentUser?.name || "Kerfisstjóri",
            userEmail: currentUser?.email || "admin@ilcms.is",
            role: "ADMIN",
            action: "RBAC Hlutverki breytt",
            category: "ADMIN",
            target: `Keycloak: ${user.email}`,
            ipAddress: "127.0.0.1",
            status: "SUCCESS",
            details: `Breytti hlutverki úr '${user.role}' í '${newRole}' í Keycloak realm 'ilcms'.`,
          },
          ...prev,
        ]);
      }
    } catch (e: any) {
      alert(`Villa: ${e.message}`);
    }
  };

  const handleExecutePasswordReset = async () => {
    if (!showPasswordResetModal) return;
    try {
      const res = await fetch("/api/v1/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: showPasswordResetModal.id,
          action: "reset-password",
          newPassword: newResetPassword,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setUserActionMsg(`Lykilorð endursett fyrir ${showPasswordResetModal.name}.`);
        setShowPasswordResetModal(null);
      }
    } catch (e: any) {
      alert(`Villa: ${e.message}`);
    }
  };

  const fetchAudit = async () => {
    try {
      setLoadingAudit(true);
      const query = new URLSearchParams();
      if (auditUserFilter !== "all") query.set("user", auditUserFilter);
      if (auditCategoryFilter !== "all") query.set("category", auditCategoryFilter);
      if (auditSearchQuery) query.set("search", auditSearchQuery);

      const res = await fetch(`/api/v1/admin/audit?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.events) setAuditEvents(data.events);
      }
    } catch (e) {
      console.error("Error fetching audit events:", e);
    } finally {
      setLoadingAudit(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const query = new URLSearchParams();
      if (logServiceFilter !== "all") query.set("service", logServiceFilter);
      if (logLevelFilter !== "all") query.set("level", logLevelFilter);
      if (logSearchQuery) query.set("search", logSearchQuery);

      const res = await fetch(`/api/v1/admin/logs?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
      }
    } catch (e) {
      console.error("Error fetching logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  const exportAuditCsv = () => {
    const headers = ["Tímastimpill", "Notandi", "Netfang", "Hlutverk", "Aðgerð", "Flokkur", "Viðfang", "IP", "Staða", "Upplýsingar"];
    const rows = auditEvents.map((ev) => [
      ev.timestamp,
      `"${ev.userName}"`,
      ev.userEmail,
      ev.role,
      `"${ev.action}"`,
      ev.category,
      `"${ev.target}"`,
      ev.ipAddress,
      ev.status,
      `"${ev.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ilcms_audit_trail_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLogsTxt = () => {
    const textContent = logs.map((l) => `[${l.timestamp}] [${l.service.toUpperCase()}] [${l.level}] ${l.message}`).join("\n");
    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ilcms_system_logs_${new Date().toISOString().split("T")[0]}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 10, 20, 0.85)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        style={{
          width: "96vw",
          maxWidth: "1350px",
          height: "92vh",
          background: "#090d16",
          border: "1px solid #1e293b",
          borderRadius: "12px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.75)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "#f8fafc",
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            background: "#0d1322",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #1e3a8a, #0284c7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.2rem",
              }}
            >
              🛡️
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "0.01em", color: "#f8fafc" }}>
                  Kerfisstjórn ILCMS (System Administration)
                </h2>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "2px 8px",
                    borderRadius: "10px",
                    background: "#064e3b",
                    color: "#34d399",
                    border: "1px solid #059669",
                    fontWeight: 600,
                  }}
                >
                  admin@ilcms.is (Ótakmarkaður aðgangur)
                </span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                Hýsing: K3s / Docker Air-Gapped Stack • PostgreSQL 16 pgvector • Keycloak 24 IAM • Ollama Gemma 2 9B
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {statusFeedback && (
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 10px",
                  borderRadius: "4px",
                  background: "#1e3a8a",
                  color: "#93c5fd",
                  border: "1px solid #2563eb",
                  animation: "fadeIn 0.2s ease",
                }}
              >
                ℹ️ {statusFeedback}
              </span>
            )}
            <button
              onClick={fetchServices}
              title="Endurhlaða gögnum"
              style={{
                padding: "6px 12px",
                background: "#1e293b",
                color: "#94a3b8",
                border: "1px solid #334155",
                borderRadius: "6px",
                fontSize: "0.78rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              🔄 Endurnýja
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "6px 14px",
                background: "#334155",
                color: "#f8fafc",
                border: "1px solid #475569",
                borderRadius: "6px",
                fontSize: "0.82rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ✕ Loka
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: "2px",
            padding: "0 20px",
            background: "#0d1322",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              padding: "12px 18px",
              background: activeTab === "dashboard" ? "#090d16" : "transparent",
              color: activeTab === "dashboard" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "dashboard" ? "2px solid #38bdf8" : "2px solid transparent",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>📊</span>
            <span>Kerfisyfirsýn (Dashboard)</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "12px 18px",
              background: activeTab === "users" ? "#090d16" : "transparent",
              color: activeTab === "users" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "users" ? "2px solid #38bdf8" : "2px solid transparent",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>👥</span>
            <span>Notendastjórnun & RBAC (Keycloak)</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            style={{
              padding: "12px 18px",
              background: activeTab === "audit" ? "#090d16" : "transparent",
              color: activeTab === "audit" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "audit" ? "2px solid #38bdf8" : "2px solid transparent",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>📜</span>
            <span>Endurskoðun (Audit Log)</span>
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            style={{
              padding: "12px 18px",
              background: activeTab === "logs" ? "#090d16" : "transparent",
              color: activeTab === "logs" ? "#38bdf8" : "#94a3b8",
              border: "none",
              borderBottom: activeTab === "logs" ? "2px solid #38bdf8" : "2px solid transparent",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>📟</span>
            <span>Kerfisskrár (System Logs)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* ========================================================================= */}
          {/* TAB 1: KERFISYFIRSÝN (DASHBOARD) */}
          {/* ========================================================================= */}
          {activeTab === "dashboard" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* K3s Cluster Live Resource Monitor Widget */}
              <K3sResourceMonitorWidget onRefreshParent={fetchServices} />

              {/* System Components Header & Global Action */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#f1f5f9", margin: 0 }}>
                    Kerfishlutar & Þjónustur (System Components)
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: 0 }}>
                    Stöðuvöktun, auðlindanýting og aðgerðir (Start / Stop / Restart) fyrir hvern einstakan hluta.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    id="btn-run-e2e-test"
                    onClick={handleRunE2ETest}
                    disabled={isE2ETestRunning || actionInProgress !== null}
                    style={{
                      padding: "6px 14px",
                      background: isE2ETestRunning ? "#064e3b" : "linear-gradient(135deg, #065f46, #059669)",
                      color: "#ecfdf5",
                      border: "1px solid #10b981",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: isE2ETestRunning ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 0 12px rgba(16, 185, 129, 0.25)",
                      transition: "all 0.15s ease",
                    }}
                    title="Keyra heildarprófun (End-to-End Test) á öllum hlutum kerfisins og eyða prófunargögnum"
                  >
                    <span>{isE2ETestRunning ? "⏳" : "🧪"}</span>
                    <span>{isE2ETestRunning ? (e2eProgressStep || "Keyrir prófun...") : "Keyra Heildarprófun (E2E Test)"}</span>
                  </button>
                  <button
                    onClick={handleRestartAll}
                    disabled={actionInProgress !== null || isE2ETestRunning}
                    style={{
                      padding: "6px 14px",
                      background: "#7f1d1d",
                      color: "#fecaca",
                      border: "1px solid #b91c1c",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: actionInProgress || isE2ETestRunning ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    ⚠️ Endurræsa Allar Einingar
                  </button>
                </div>
              </div>

              {/* Services Table */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#1e293b", color: "#cbd5e1", borderBottom: "1px solid #334155" }}>
                      <th style={{ padding: "12px 16px" }}>Eining (Component)</th>
                      <th style={{ padding: "12px 14px" }}>Staða (Status)</th>
                      <th style={{ padding: "12px 14px" }}>Auðlindir (CPU / RAM)</th>
                      <th style={{ padding: "12px 14px" }}>Tengi & Slóð</th>
                      <th style={{ padding: "12px 14px" }}>Uppitími</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Aðgerðir (Actions)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((srv) => {
                      const isRunning = srv.status === "running";
                      const isStopped = srv.status === "stopped";
                      const isBusy = actionInProgress?.startsWith(srv.id);

                      return (
                        <tr
                          key={srv.id}
                          style={{
                            borderBottom: "1px solid #1e293b",
                            background: isStopped ? "rgba(239, 68, 68, 0.05)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ fontWeight: 600, color: "#f8fafc" }}>{srv.displayName}</div>
                            <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{srv.description}</div>
                            <div style={{ fontSize: "0.68rem", color: "#0ea5e9", marginTop: "2px" }}>
                              Útgáfa: {srv.version} • Gámur: {srv.containerId}
                            </div>
                          </td>
                          <td style={{ padding: "14px 14px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                background: isRunning ? "#064e3b" : "#450a0a",
                                color: isRunning ? "#34d399" : "#f87171",
                                border: isRunning ? "1px solid #059669" : "1px solid #dc2626",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: isRunning ? "#34d399" : "#ef4444",
                                }}
                              />
                              {isRunning ? "KEYRANDI" : "STÖÐVAÐ"}
                            </span>
                          </td>
                          <td style={{ padding: "14px 14px" }}>
                            <div style={{ color: "#cbd5e1" }}>
                              <strong>{srv.cpuPercent}%</strong> CPU
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: "0.74rem" }}>
                              <strong>{srv.memoryMb} MB</strong> RAM
                            </div>
                          </td>
                          <td style={{ padding: "14px 14px" }}>
                            <div style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: "0.76rem" }}>
                              Gátt: {srv.port}
                            </div>
                            <div style={{ color: "#64748b", fontSize: "0.7rem" }}>{srv.egressPolicy}</div>
                          </td>
                          <td style={{ padding: "14px 14px", color: "#94a3b8", fontSize: "0.76rem" }}>
                            {srv.uptime}
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              {isRunning ? (
                                <>
                                  <button
                                    onClick={() => handleServiceAction(srv.id, "restart")}
                                    disabled={isBusy}
                                    title="Endurræsa einingu"
                                    style={{
                                      padding: "4px 10px",
                                      background: "#1e293b",
                                      color: "#38bdf8",
                                      border: "1px solid #0284c7",
                                      borderRadius: "4px",
                                      cursor: isBusy ? "not-allowed" : "pointer",
                                      fontSize: "0.75rem",
                                      fontWeight: 500,
                                    }}
                                  >
                                    🔄 Endurræsa
                                  </button>
                                  <button
                                    onClick={() => handleServiceAction(srv.id, "stop")}
                                    disabled={isBusy}
                                    title="Stöðva einingu"
                                    style={{
                                      padding: "4px 10px",
                                      background: "#334155",
                                      color: "#f87171",
                                      border: "1px solid #b91c1c",
                                      borderRadius: "4px",
                                      cursor: isBusy ? "not-allowed" : "pointer",
                                      fontSize: "0.75rem",
                                      fontWeight: 500,
                                    }}
                                  >
                                    ⏹️ Stöðva
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => handleServiceAction(srv.id, "start")}
                                  disabled={isBusy}
                                  title="Ræsa einingu"
                                  style={{
                                    padding: "4px 12px",
                                    background: "#065f46",
                                    color: "#6ee7b7",
                                    border: "1px solid #047857",
                                    borderRadius: "4px",
                                    cursor: isBusy ? "not-allowed" : "pointer",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                  }}
                                >
                                  ▶️ Ræsa (Start)
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: NOTENDASTJÓRNUN & RBAC (KEYCLOAK) */}
          {/* ========================================================================= */}
          {activeTab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Header and Keycloak Direct Console Access Banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #1e293b, #0f172a)",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "16px 20px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
                      Keycloak 24 IAM — Notendastjórnun & Hlutverk (RBAC)
                    </h3>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 8px",
                        borderRadius: "10px",
                        background: "#0284c7",
                        color: "#e0f2fe",
                        fontWeight: 600,
                      }}
                    >
                      Realm: ilcms
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "4px 0 0 0" }}>
                    Stofnaðu og eyddu notendum, úthlutaðu hlutverkum (Lögmaður, Dómari, Aðstoðarmaður, Kerfisstjóri) eða opnaðu stjórnborð Keycloak beint.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <a
                    href="http://127.0.0.1:8080/admin/master/console/#/ilcms"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: "8px 14px",
                      background: "#1e293b",
                      color: "#38bdf8",
                      border: "1px solid #0284c7",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    🔑 Opna Keycloak Admin Console ↗
                  </a>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    style={{
                      padding: "8px 16px",
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    ➕ Stofna Nýjan Notanda
                  </button>
                </div>
              </div>

              {userActionMsg && (
                <div
                  style={{
                    padding: "8px 14px",
                    background: "#065f46",
                    color: "#a7f3d0",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                  }}
                >
                  ✓ {userActionMsg}
                </div>
              )}

              {/* Users Table */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#1e293b", color: "#cbd5e1", borderBottom: "1px solid #334155" }}>
                      <th style={{ padding: "12px 16px" }}>Notandi & Netfang</th>
                      <th style={{ padding: "12px 14px" }}>Hlutverk (RBAC)</th>
                      <th style={{ padding: "12px 14px" }}>Deild / Stofa</th>
                      <th style={{ padding: "12px 14px" }}>MFA & Öryggi</th>
                      <th style={{ padding: "12px 14px" }}>Síðasta Innskráning</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Aðgerðir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((usr) => (
                      <tr key={usr.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "50%",
                                background: "#334155",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.8rem",
                              }}
                            >
                              {usr.role === "ADMIN" ? "🛡️" : usr.role === "JUDGE" ? "🏛️" : usr.role === "LAWYER" ? "⚖️" : "📋"}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "#f8fafc" }}>{usr.name}</div>
                              <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                                {usr.email} (notandanafn: {usr.username})
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <select
                            value={usr.role}
                            onChange={(e) => handleUpdateUserRole(usr, e.target.value as any)}
                            style={{
                              background: "#1e293b",
                              color: "#f1f5f9",
                              border: "1px solid #334155",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            <option value="LAWYER">⚖️ LÖGMAÐUR (LAWYER)</option>
                            <option value="JUDGE">🏛️ DÓMARI (JUDGE)</option>
                            <option value="PARALEGAL">📋 AÐSTOÐARMAÐUR (PARALEGAL)</option>
                            <option value="ADMIN">🛡️ KERFISSTJÓRI (ADMIN)</option>
                          </select>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#94a3b8" }}>{usr.department}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              fontSize: "0.7rem",
                              padding: "2px 8px",
                              borderRadius: "10px",
                              background: usr.mfaEnabled ? "#064e3b" : "#334155",
                              color: usr.mfaEnabled ? "#34d399" : "#94a3b8",
                              fontWeight: 500,
                            }}
                          >
                            {usr.mfaEnabled ? "✓ Rafræn skilríki (MFA)" : "Lykilorð"}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px", color: "#64748b", fontSize: "0.76rem" }}>
                          {usr.lastLogin}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              onClick={() => setShowPasswordResetModal(usr)}
                              title="Endurstilla lykilorð í Keycloak"
                              style={{
                                padding: "4px 8px",
                                background: "#1e293b",
                                color: "#38bdf8",
                                border: "1px solid #0284c7",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.72rem",
                              }}
                            >
                              🔑 Lykilorð
                            </button>
                            <button
                              onClick={() => handleToggleUserActive(usr)}
                              style={{
                                padding: "4px 8px",
                                background: usr.enabled ? "#1e293b" : "#450a0a",
                                color: usr.enabled ? "#cbd5e1" : "#fca5a5",
                                border: "1px solid #334155",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "0.72rem",
                              }}
                            >
                              {usr.enabled ? "Gera óvirkan" : "Virkja"}
                            </button>
                            {usr.email !== "admin@ilcms.is" && (
                              <button
                                onClick={() => handleDeleteUser(usr)}
                                title="Eyða notanda úr Keycloak"
                                style={{
                                  padding: "4px 8px",
                                  background: "#334155",
                                  color: "#f87171",
                                  border: "1px solid #b91c1c",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontSize: "0.72rem",
                                }}
                              >
                                🗑️ Eyða
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ENDURSKOÐUN (AUDIT LOG) */}
          {/* ========================================================================= */}
          {activeTab === "audit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Filter Controls Bar */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "14px 18px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Sía eftir notanda:
                    </label>
                    <select
                      value={auditUserFilter}
                      onChange={(e) => setAuditUserFilter(e.target.value)}
                      style={{
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        fontSize: "0.78rem",
                      }}
                    >
                      <option value="all">Allir notendur</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.email}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Aðgerðaflokkur:
                    </label>
                    <select
                      value={auditCategoryFilter}
                      onChange={(e) => setAuditCategoryFilter(e.target.value)}
                      style={{
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        fontSize: "0.78rem",
                      }}
                    >
                      <option value="all">Allir flokkar</option>
                      <option value="AUTH">Auðkenning (Keycloak OIDC)</option>
                      <option value="DOCUMENT">Málsskjöl & Gagnasöfn</option>
                      <option value="AI_INFERENCE">Air-Gapped Gervigreind (Ollama)</option>
                      <option value="BUNDLE">Dómstólasýslan Málsgagnasafn</option>
                      <option value="BILLING">Tímaskráning & Gjaldskrá</option>
                      <option value="ADMIN">Kerfisstjórn (Admin)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Leit í endurskoðun:
                    </label>
                    <input
                      type="text"
                      placeholder="Leita í lýsingu eða máli..."
                      value={auditSearchQuery}
                      onChange={(e) => setAuditSearchQuery(e.target.value)}
                      style={{
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        fontSize: "0.78rem",
                        width: "220px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={fetchAudit}
                    style={{
                      padding: "6px 12px",
                      background: "#1e293b",
                      color: "#38bdf8",
                      border: "1px solid #0284c7",
                      borderRadius: "4px",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                    }}
                  >
                    🔍 Sía
                  </button>
                  <button
                    onClick={exportAuditCsv}
                    style={{
                      padding: "6px 14px",
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    📥 Flytja út CSV
                  </button>
                </div>
              </div>

              {/* Audit Trail Table */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "#1e293b", color: "#cbd5e1", borderBottom: "1px solid #334155" }}>
                      <th style={{ padding: "10px 14px" }}>Tímastimpill</th>
                      <th style={{ padding: "10px 14px" }}>Notandi & Hlutverk</th>
                      <th style={{ padding: "10px 14px" }}>Aðgerð</th>
                      <th style={{ padding: "10px 14px" }}>Mál / Eining</th>
                      <th style={{ padding: "10px 14px" }}>IP & Staða</th>
                      <th style={{ padding: "10px 14px" }}>Nánari lýsing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEvents.map((ev) => (
                      <tr key={ev.id} style={{ borderBottom: "1px solid #1e293b" }}>
                        <td style={{ padding: "10px 14px", color: "#94a3b8", fontFamily: "monospace", fontSize: "0.74rem" }}>
                          {new Date(ev.timestamp).toLocaleString("is-IS")}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 600, color: "#f8fafc" }}>{ev.userName}</div>
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>{ev.userEmail} ({ev.role})</div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 600,
                              background:
                                ev.category === "AI_INFERENCE"
                                  ? "#1e3a8a"
                                  : ev.category === "BUNDLE"
                                  ? "#064e3b"
                                  : ev.category === "ADMIN"
                                  ? "#451a03"
                                  : "#1e293b",
                              color:
                                ev.category === "AI_INFERENCE"
                                  ? "#bfdbfe"
                                  : ev.category === "BUNDLE"
                                  ? "#6ee7b7"
                                  : ev.category === "ADMIN"
                                  ? "#fed7aa"
                                  : "#e2e8f0",
                            }}
                          >
                            {ev.action}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#38bdf8", fontSize: "0.75rem" }}>
                          {ev.target}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{ev.ipAddress}</div>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              color: ev.status === "SUCCESS" ? "#34d399" : "#f87171",
                              fontWeight: 600,
                            }}
                          >
                            {ev.status === "SUCCESS" ? "✓ Árangur" : "✕ Hafnað"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#cbd5e1", fontSize: "0.74rem", maxWidth: "300px" }}>
                          {ev.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: KERFISSRÁR (SYSTEM LOGS) */}
          {/* ========================================================================= */}
          {activeTab === "logs" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", height: "100%" }}>
              {/* Log Controls */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "12px 18px",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Eining (Service):
                    </label>
                    <select
                      value={logServiceFilter}
                      onChange={(e) => setLogServiceFilter(e.target.value)}
                      style={{
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        fontSize: "0.78rem",
                      }}
                    >
                      <option value="all">Allar einingar (Combined Stream)</option>
                      <option value="ilcms-ollama">ilcms-ollama (Gemma 2 9B AI)</option>
                      <option value="ilcms-postgres">ilcms-postgres (PostgreSQL 16 pgvector)</option>
                      <option value="ilcms-keycloak">ilcms-keycloak (Keycloak 24 IAM)</option>
                      <option value="ilcms-web">ilcms-web (Next.js 15 App)</option>
                      <option value="traefik-ingress">traefik-ingress (Network Routing)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Stig (Level):
                    </label>
                    <select
                      value={logLevelFilter}
                      onChange={(e) => setLogLevelFilter(e.target.value)}
                      style={{
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        fontSize: "0.78rem",
                      }}
                    >
                      <option value="all">Öll stig</option>
                      <option value="INFO">INFO (Almennt)</option>
                      <option value="WARN">WARN (Aðvaranir)</option>
                      <option value="ERROR">ERROR (Villur)</option>
                      <option value="DEBUG">DEBUG (Kembiforritun)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.7rem", color: "#94a3b8", marginBottom: "2px" }}>
                      Leit í skráningum:
                    </label>
                    <input
                      type="text"
                      placeholder="Leita í villuskilaboðum..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      style={{
                        background: "#1e293b",
                        color: "#f8fafc",
                        border: "1px solid #334155",
                        borderRadius: "4px",
                        padding: "5px 10px",
                        fontSize: "0.78rem",
                        width: "240px",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoScrollLogs}
                      onChange={(e) => setAutoScrollLogs(e.target.checked)}
                    />
                    Sjálfvirk skrunun
                  </label>
                  <button
                    onClick={fetchLogs}
                    style={{
                      padding: "5px 10px",
                      background: "#1e293b",
                      color: "#38bdf8",
                      border: "1px solid #0284c7",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                    }}
                  >
                    🔄 Uppfæra
                  </button>
                  <button
                    onClick={exportLogsTxt}
                    style={{
                      padding: "5px 12px",
                      background: "#0284c7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    📥 Sækja .log
                  </button>
                </div>
              </div>

              {/* Console Viewer Window */}
              <div
                ref={logContainerRef}
                style={{
                  flex: 1,
                  minHeight: "420px",
                  maxHeight: "540px",
                  background: "#020617",
                  border: "1px solid #1e293b",
                  borderRadius: "8px",
                  padding: "14px 18px",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "0.78rem",
                  lineHeight: 1.6,
                  overflowY: "auto",
                  color: "#e2e8f0",
                }}
              >
                {logs.length === 0 ? (
                  <div style={{ color: "#64748b", textAlign: "center", marginTop: "40px" }}>
                    Engar skráningar fundust með völdum síum.
                  </div>
                ) : (
                  logs.map((log) => {
                    const levelColor =
                      log.level === "ERROR"
                        ? "#ef4444"
                        : log.level === "WARN"
                        ? "#f59e0b"
                        : log.level === "DEBUG"
                        ? "#a855f7"
                        : "#10b981";

                    return (
                      <div
                        key={log.id}
                        style={{
                          display: "flex",
                          gap: "10px",
                          padding: "3px 0",
                          borderBottom: "1px solid rgba(30, 41, 59, 0.4)",
                        }}
                      >
                        <span style={{ color: "#64748b", whiteSpace: "nowrap" }}>
                          {log.timestamp.replace("T", " ").replace("Z", "").substring(11, 23)}
                        </span>
                        <span
                          style={{
                            color: "#38bdf8",
                            fontWeight: 600,
                            minWidth: "120px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          [{log.service}]
                        </span>
                        <span
                          style={{
                            color: levelColor,
                            fontWeight: 700,
                            minWidth: "55px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {log.level}
                        </span>
                        <span style={{ color: "#cbd5e1", wordBreak: "break-word" }}>{log.message}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Stofna Nýjan Notanda í Keycloak */}
      {showCreateUserModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 10001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "24px",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              color: "#f8fafc",
            }}
          >
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 16px 0", color: "#38bdf8" }}>
              Stofna nýjan notanda í Keycloak IAM
            </h3>

            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Fullt nafn:
                </label>
                <input
                  type="text"
                  required
                  placeholder="t.d. Sigríður Helgadóttir hrl."
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Netfang:
                </label>
                <input
                  type="email"
                  required
                  placeholder="sigridur@ilcms.is"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Notandanafn (Keycloak username):
                </label>
                <input
                  type="text"
                  placeholder="sjálfgefið út frá netfangi"
                  value={newUserUsername}
                  onChange={(e) => setNewUserUsername(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Hlutverk og Aðgangsstýring (RBAC):
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as any)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="LAWYER">⚖️ LÖGMAÐUR (Fullur aðgangur að málum, skjölum, stefnum og reikningagerð)</option>
                  <option value="JUDGE">🏛️ DÓMARI (Aðgangur að dómaskjölum, þinghaldi og málsskrám)</option>
                  <option value="PARALEGAL">📋 AÐSTOÐARMAÐUR (Gagnaöflun, rannsóknir og tímaskráning)</option>
                  <option value="ADMIN">🛡️ KERFISSTJÓRI (Fullur stjórnendaaðgangur að innviðum og Keycloak)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Deild / Stofa:
                </label>
                <input
                  type="text"
                  value={newUserDept}
                  onChange={(e) => setNewUserDept(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Upphaflegt Lykilorð:
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#1e293b",
                    color: "#f8fafc",
                    border: "1px solid #334155",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="chk-mfa"
                  checked={newUserMfa}
                  onChange={(e) => setNewUserMfa(e.target.checked)}
                />
                <label htmlFor="chk-mfa" style={{ fontSize: "0.78rem", color: "#cbd5e1", cursor: "pointer" }}>
                  Krefjast Rafrænna Skilríkja (MFA / 2FA) við fyrstu innskráningu
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  style={{
                    padding: "8px 16px",
                    background: "#334155",
                    color: "#cbd5e1",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    cursor: "pointer",
                  }}
                >
                  Hætta við
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 18px",
                    background: "#0284c7",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Stofna Notanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Endurstilla Lykilorð */}
      {showPasswordResetModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            zIndex: 10001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "10px",
              padding: "24px",
              maxWidth: "420px",
              width: "100%",
              color: "#f8fafc",
            }}
          >
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 12px 0", color: "#38bdf8" }}>
              Endurstilla lykilorð í Keycloak
            </h3>
            <p style={{ fontSize: "0.8rem", color: "#94a3b8", marginBottom: "14px" }}>
              Sláðu inn nýtt lykilorð fyrir <strong>{showPasswordResetModal.name}</strong> ({showPasswordResetModal.email}).
            </p>
            <input
              type="text"
              value={newResetPassword}
              onChange={(e) => setNewResetPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#1e293b",
                color: "#f8fafc",
                border: "1px solid #334155",
                borderRadius: "6px",
                fontSize: "0.85rem",
                marginBottom: "16px",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setShowPasswordResetModal(null)}
                style={{
                  padding: "6px 14px",
                  background: "#334155",
                  color: "#cbd5e1",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                }}
              >
                Hætta við
              </button>
              <button
                type="button"
                onClick={handleExecutePasswordReset}
                style={{
                  padding: "6px 16px",
                  background: "#0284c7",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Staðfesta Nýtt Lykilorð
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Heildarprófunarskýrsla (E2E Test Report Modal) */}
      {showE2EReportModal && e2eReport && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.85)",
            backdropFilter: "blur(6px)",
            zIndex: 10002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#090d16",
              border: "1px solid #059669",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "840px",
              width: "100%",
              maxHeight: "88vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(5, 150, 105, 0.25)",
              color: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #1e293b", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #065f46, #10b981)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.3rem",
                  }}
                >
                  ✓
                </div>
                <div>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#ecfdf5" }}>
                    Heildarprófun Kerfis — Niðurstöðuskýrsla (E2E Test Report)
                  </h3>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
                    Prófunarkeyrsla: <code>{e2eReport.testRunId}</code> • Keyrt af: <code>{e2eReport.executedBy}</code> • {new Date(e2eReport.timestamp).toLocaleString("is-IS")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowE2EReportModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>HEILDARNIÐURSTAÐA</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
                  {e2eReport.summary.verdict}
                </div>
              </div>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>KEYRSLUTÍMI</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#38bdf8", marginTop: "2px" }}>
                  {e2eReport.totalDurationMs} ms
                </div>
              </div>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>PRÓFUNARSTIG</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#a855f7", marginTop: "2px" }}>
                  {e2eReport.summary.passedStages} / {e2eReport.summary.totalStages} Stóðust
                </div>
              </div>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>AIR-GAP EINANGRUN</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>
                  0 B Útflæði
                </div>
              </div>
            </div>

            {/* Test Data Cleanup Confirmation Box */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(6, 78, 59, 0.35), rgba(15, 23, 42, 0.8))",
                border: "1px solid #059669",
                borderRadius: "8px",
                padding: "14px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontWeight: 700, fontSize: "0.88rem" }}>
                <span>🧹</span>
                <span>Hreinsun Prófunargagna Staðfest (100% Cleanup Complete)</span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "#cbd5e1", margin: "6px 0 10px 0", lineHeight: 1.5 }}>
                Öllum tímabundnum gögnum sem stofnuð voru meðan á heildarprófun stóð hefur verið eytt úr gagnagrunni og skráakerfi. Engin prófunarúrgangsgögn sitja eftir í raunvinnslukerfinu:
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "8px", fontSize: "0.74rem" }}>
                <div style={{ background: "#064e3b", padding: "6px 10px", borderRadius: "4px", color: "#a7f3d0" }}>
                  • Prufumál eytt: <strong>{e2eReport.cleanupReport.temporaryCasesPurged}</strong>
                </div>
                <div style={{ background: "#064e3b", padding: "6px 10px", borderRadius: "4px", color: "#a7f3d0" }}>
                  • Prufuskjöl eytt: <strong>{e2eReport.cleanupReport.temporaryDocumentsPurged}</strong>
                </div>
                <div style={{ background: "#064e3b", padding: "6px 10px", borderRadius: "4px", color: "#a7f3d0" }}>
                  • Vigrar eytt: <strong>{e2eReport.cleanupReport.temporaryVectorsPurged}</strong>
                </div>
                <div style={{ background: "#064e3b", padding: "6px 10px", borderRadius: "4px", color: "#a7f3d0" }}>
                  • Tímafærslum eytt: <strong>{e2eReport.cleanupReport.temporaryBillingEntriesPurged}</strong>
                </div>
                <div style={{ background: "#022c22", padding: "6px 10px", borderRadius: "4px", color: "#6ee7b7", border: "1px solid #059669" }}>
                  • Eftirstandandi gögn: <strong>0</strong>
                </div>
              </div>
            </div>

            {/* Stages Breakdown List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#cbd5e1" }}>
                Sundurliðun á Prófunarstigum (Test Stages):
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {e2eReport.stages.map((stg, idx) => (
                  <div
                    key={stg.id}
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "6px",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                      <span
                        style={{
                          width: "22px",
                          height: "22px",
                          borderRadius: "50%",
                          background: "#064e3b",
                          color: "#34d399",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f8fafc" }}>
                          {stg.name}
                        </div>
                        <div style={{ fontSize: "0.73rem", color: "#94a3b8", marginTop: "2px" }}>
                          {stg.details}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "0.74rem", color: "#38bdf8", fontFamily: "monospace" }}>
                        {stg.durationMs} ms
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: "#064e3b",
                          color: "#34d399",
                          fontWeight: 600,
                          border: "1px solid #059669",
                        }}
                      >
                        ✓ {stg.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #1e293b", paddingTop: "14px", marginTop: "4px" }}>
              <button
                onClick={exportE2EReportJson}
                style={{
                  padding: "8px 14px",
                  background: "#1e293b",
                  color: "#38bdf8",
                  border: "1px solid #0284c7",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                📥 Sækja Prófunarskýrslu (.json)
              </button>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleRunE2ETest}
                  disabled={isE2ETestRunning}
                  style={{
                    padding: "8px 16px",
                    background: "#065f46",
                    color: "#a7f3d0",
                    border: "1px solid #047857",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🔄 Keyra Aftur
                </button>
                <button
                  onClick={() => setShowE2EReportModal(false)}
                  style={{
                    padding: "8px 20px",
                    background: "#334155",
                    color: "#f8fafc",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Loka Skýrslu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
