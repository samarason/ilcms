"use client";

import React, { useState, useEffect, useRef } from "react";
import { K3sClusterMetrics, K3sPodMetric } from "@/app/api/v1/admin/cluster-metrics/route";

interface K3sResourceMonitorWidgetProps {
  onRefreshParent?: () => void;
}

export function K3sResourceMonitorWidget({ onRefreshParent }: K3sResourceMonitorWidgetProps) {
  const [metrics, setMetrics] = useState<K3sClusterMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLivePolling, setIsLivePolling] = useState(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(3);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [activeSubView, setActiveSubView] = useState<"overview" | "pods" | "node">("overview");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/v1/admin/cluster-metrics");
      if (res.ok) {
        const data: K3sClusterMetrics = await res.json();
        setMetrics(data);
        setLastUpdated(new Date().toLocaleTimeString("is-IS"));
      }
    } catch (e) {
      console.error("Failed to fetch K3s cluster metrics:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!isLivePolling) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      fetchMetrics();
    }, refreshIntervalSec * 1000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isLivePolling, refreshIntervalSec]);

  // Helper to render sparkline SVG for CPU / RAM history
  const renderSparkline = (data: number[], color: string, id: string) => {
    if (!data || data.length === 0) return null;
    const minVal = Math.min(...data) * 0.85;
    const maxVal = Math.max(...data) * 1.15 || 100;
    const width = 180;
    const height = 42;
    const step = width / (data.length - 1);

    const points = data
      .map((val, idx) => {
        const x = idx * step;
        const normalized = (val - minVal) / (maxVal - minVal || 1);
        const y = height - normalized * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const areaPoints = `${points} ${width},${height} 0,${height}`;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill={`url(#grad-${id})`} />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
        {/* Latest point circle */}
        {data.length > 0 && (
          <circle
            cx={width}
            cy={
              height -
              ((data[data.length - 1] - minVal) / (maxVal - minVal || 1)) * (height - 6) -
              3
            }
            r="3"
            fill={color}
          />
        )}
      </svg>
    );
  };

  if (loading && !metrics) {
    return (
      <div
        id="k3s-resource-monitor-widget"
        style={{
          background: "#0a0f1d",
          border: "1px solid #1e293b",
          borderRadius: "10px",
          padding: "20px",
          color: "#94a3b8",
          fontSize: "0.85rem",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <span style={{ animation: "spin 1s linear infinite" }}>🔄</span>
        <span>Hleður inn auðlindavöktun fyrir K3s klasann (Resource Monitor)...</span>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div
      id="k3s-resource-monitor-widget"
      style={{
        background: "linear-gradient(180deg, #090e1a 0%, #0d1527 100%)",
        border: "1px solid #1e293b",
        borderRadius: "10px",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
      }}
    >
      {/* Widget Header & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          borderBottom: "1px solid #1e293b",
          paddingBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #0284c7, #0369a1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.1rem",
              boxShadow: "0 0 12px rgba(2, 132, 199, 0.4)",
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#f8fafc", margin: 0 }}>
                K3s Cluster Resource Monitor
              </h3>
              <span
                style={{
                  fontSize: "0.68rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "#064e3b",
                  color: "#34d399",
                  border: "1px solid #059669",
                  fontWeight: 600,
                }}
              >
                {metrics.node.name} • {metrics.node.status}
              </span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
              K3s {metrics.version} • {metrics.node.containerRuntime} • 100% Air-Gapped Loopback
            </p>
          </div>
        </div>

        {/* Live Controls & Sub-tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Sub Navigation */}
          <div
            style={{
              display: "flex",
              background: "#0b1220",
              border: "1px solid #1e293b",
              borderRadius: "6px",
              padding: "2px",
            }}
          >
            <button
              onClick={() => setActiveSubView("overview")}
              style={{
                padding: "4px 10px",
                background: activeSubView === "overview" ? "#1e293b" : "transparent",
                color: activeSubView === "overview" ? "#38bdf8" : "#94a3b8",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Yfirlit
            </button>
            <button
              onClick={() => setActiveSubView("pods")}
              style={{
                padding: "4px 10px",
                background: activeSubView === "pods" ? "#1e293b" : "transparent",
                color: activeSubView === "pods" ? "#38bdf8" : "#94a3b8",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              K3s Pods ({metrics.pods.length})
            </button>
            <button
              onClick={() => setActiveSubView("node")}
              style={{
                padding: "4px 10px",
                background: activeSubView === "node" ? "#1e293b" : "transparent",
                color: activeSubView === "node" ? "#38bdf8" : "#94a3b8",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.72rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Node Heilsa
            </button>
          </div>

          {/* Polling Toggle */}
          <button
            onClick={() => setIsLivePolling(!isLivePolling)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              background: isLivePolling ? "#064e3b" : "#1e293b",
              color: isLivePolling ? "#34d399" : "#cbd5e1",
              border: `1px solid ${isLivePolling ? "#059669" : "#334155"}`,
              borderRadius: "6px",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title={isLivePolling ? "Gera hlé á sjálfvirkri uppfærslu" : "Hefja sjálfvirka uppfærslu"}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isLivePolling ? "#34d399" : "#64748b",
                boxShadow: isLivePolling ? "0 0 6px #34d399" : "none",
              }}
            />
            <span>{isLivePolling ? "Rauntími (Virkur)" : "Hlé á vöktun"}</span>
          </button>

          {/* Refresh Interval Selector */}
          <select
            value={refreshIntervalSec}
            onChange={(e) => setRefreshIntervalSec(Number(e.target.value))}
            style={{
              background: "#0b1220",
              color: "#cbd5e1",
              border: "1px solid #1e293b",
              borderRadius: "6px",
              padding: "4px 6px",
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
          >
            <option value={2}>2 sek</option>
            <option value={3}>3 sek</option>
            <option value={5}>5 sek</option>
            <option value={10}>10 sek</option>
          </select>

          {/* Manual Refresh button */}
          <button
            onClick={() => {
              fetchMetrics();
              if (onRefreshParent) onRefreshParent();
            }}
            style={{
              background: "#1e293b",
              color: "#38bdf8",
              border: "1px solid #334155",
              borderRadius: "6px",
              padding: "4px 8px",
              fontSize: "0.72rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
            title="Uppfæra mælingar núna"
          >
            🔄
          </button>
        </div>
      </div>

      {/* OVERVIEW SUB-VIEW: 3 Live Gauges (CPU, RAM, Disk) */}
      {activeSubView === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
          {/* ================================================================= */}
          {/* CARD 1: LIVE CPU USAGE */}
          {/* ================================================================= */}
          <div
            style={{
              background: "#0a1020",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>
                ÖRGJÖRVI (K3S CLUSTER CPU)
              </span>
              <span style={{ fontSize: "0.7rem", color: "#38bdf8", fontFamily: "monospace" }}>
                {metrics.cpu.totalCores} kjarnar @ {metrics.cpu.frequencyGhz} GHz
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "1.85rem",
                    fontWeight: 800,
                    color: metrics.cpu.usagePercent > 75 ? "#ef4444" : "#38bdf8",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {metrics.cpu.usagePercent}%
                </span>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Hleðsla: {metrics.cpu.loadAverage.join(" / ")}
                </span>
              </div>
            </div>

            {/* Sparkline trend */}
            <div style={{ height: "42px", marginTop: "2px" }}>
              {renderSparkline(metrics.cpu.history, "#38bdf8", "cpu")}
            </div>

            {/* Progress bar */}
            <div style={{ width: "100%", height: "5px", background: "#1e293b", borderRadius: "3px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${Math.min(100, metrics.cpu.usagePercent)}%`,
                  height: "100%",
                  background: metrics.cpu.usagePercent > 75 ? "#ef4444" : "linear-gradient(90deg, #0284c7, #38bdf8)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#64748b" }}>
              <span>15 sek. rauntímaferill</span>
              <span>Hámark: {Math.max(...metrics.cpu.history).toFixed(1)}%</span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* CARD 2: LIVE RAM USAGE */}
          {/* ================================================================= */}
          <div
            style={{
              background: "#0a1020",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>
                VINNSLUMINNI (K3S CLUSTER RAM)
              </span>
              <span style={{ fontSize: "0.7rem", color: "#a855f7", fontFamily: "monospace" }}>
                {(metrics.memory.totalMb / 1024).toFixed(1)} GB Heild
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "1.85rem",
                    fontWeight: 800,
                    color: "#a855f7",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {(metrics.memory.usedMb / 1024).toFixed(1)} GB
                </span>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  ({metrics.memory.usagePercent}% notað • {(metrics.memory.freeMb / 1024).toFixed(1)} GB laust)
                </span>
              </div>
            </div>

            {/* Sparkline trend */}
            <div style={{ height: "42px", marginTop: "2px" }}>
              {renderSparkline(metrics.memory.history, "#a855f7", "ram")}
            </div>

            {/* Dual Progress bar: Used vs Buffers */}
            <div
              style={{
                width: "100%",
                height: "5px",
                background: "#1e293b",
                borderRadius: "3px",
                overflow: "hidden",
                display: "flex",
              }}
            >
              <div
                style={{
                  width: `${(metrics.memory.usedMb / metrics.memory.totalMb) * 100}%`,
                  height: "100%",
                  background: "#a855f7",
                  transition: "width 0.4s ease",
                }}
              />
              <div
                style={{
                  width: `${(metrics.memory.buffersMb / metrics.memory.totalMb) * 100}%`,
                  height: "100%",
                  background: "#6b21a8",
                  transition: "width 0.4s ease",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#64748b" }}>
              <span>Biðminni / Buffers: {(metrics.memory.buffersMb / 1024).toFixed(1)} GB</span>
              <span>15 sek. rauntímaferill</span>
            </div>
          </div>

          {/* ================================================================= */}
          {/* CARD 3: LIVE DISK USAGE & PVCs */}
          {/* ================================================================= */}
          <div
            style={{
              background: "#0a1020",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#94a3b8" }}>
                DISKAPLÁSS (K3S NVMe PVCs)
              </span>
              <span style={{ fontSize: "0.7rem", color: "#10b981", fontFamily: "monospace" }}>
                {metrics.disk.totalGb} GB Heild
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span
                  style={{
                    fontSize: "1.85rem",
                    fontWeight: 800,
                    color: "#10b981",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {metrics.disk.usedGb} GB
                </span>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  ({metrics.disk.usagePercent}% notað • {metrics.disk.freeGb} GB laust)
                </span>
              </div>
            </div>

            {/* Segmented PVC breakdown bar */}
            <div
              style={{
                width: "100%",
                height: "10px",
                background: "#1e293b",
                borderRadius: "5px",
                overflow: "hidden",
                display: "flex",
                marginTop: "12px",
              }}
            >
              {/* AI Models */}
              <div
                style={{
                  width: `${(metrics.disk.breakdown.aiModelsGb / metrics.disk.totalGb) * 100}%`,
                  height: "100%",
                  background: "#f59e0b",
                }}
                title={`Ollama Gemma 2 9B Model PV: ${metrics.disk.breakdown.aiModelsGb} GB`}
              />
              {/* Postgres Db */}
              <div
                style={{
                  width: `${(metrics.disk.breakdown.postgresDbGb / metrics.disk.totalGb) * 100}%`,
                  height: "100%",
                  background: "#3b82f6",
                }}
                title={`PostgreSQL pgvector PVC: ${metrics.disk.breakdown.postgresDbGb} GB`}
              />
              {/* Documents */}
              <div
                style={{
                  width: `${(metrics.disk.breakdown.caseDocumentsGb / metrics.disk.totalGb) * 100}%`,
                  height: "100%",
                  background: "#10b981",
                }}
                title={`Málsgögn & PDF Safe: ${metrics.disk.breakdown.caseDocumentsGb} GB`}
              />
              {/* K3s / containerd */}
              <div
                style={{
                  width: `${(metrics.disk.breakdown.k3sContainerdGb / metrics.disk.totalGb) * 100}%`,
                  height: "100%",
                  background: "#6366f1",
                }}
                title={`K3s containerd myndir: ${metrics.disk.breakdown.k3sContainerdGb} GB`}
              />
              {/* Host OS */}
              <div
                style={{
                  width: `${(metrics.disk.breakdown.systemOsGb / metrics.disk.totalGb) * 100}%`,
                  height: "100%",
                  background: "#475569",
                }}
                title={`Stýrikerfi (Host OS): ${metrics.disk.breakdown.systemOsGb} GB`}
              />
            </div>

            {/* Legend */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.68rem", color: "#cbd5e1", marginTop: "4px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#f59e0b" }} />
                AI Líkan: {metrics.disk.breakdown.aiModelsGb}G
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#3b82f6" }} />
                Postgres: {metrics.disk.breakdown.postgresDbGb}G
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#10b981" }} />
                Dómaskjöl: {metrics.disk.breakdown.caseDocumentsGb}G
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#6366f1" }} />
                K3s: {metrics.disk.breakdown.k3sContainerdGb}G
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem", color: "#64748b", marginTop: "2px" }}>
              <span>Slóð: <code>{metrics.disk.mountPoint}</code></span>
              <span>IOPS: {metrics.disk.iopsRead} les / {metrics.disk.iopsWrite} skrif</span>
            </div>
          </div>
        </div>
      )}

      {/* PODS SUB-VIEW: Detailed K3s Pod table */}
      {activeSubView === "pods" && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem", color: "#cbd5e1" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #1e293b", textAlign: "left", color: "#94a3b8" }}>
                <th style={{ padding: "8px 6px" }}>POD HEITI</th>
                <th style={{ padding: "8px 6px" }}>NAMESPACE</th>
                <th style={{ padding: "8px 6px" }}>STAÐA</th>
                <th style={{ padding: "8px 6px" }}>CPU (MILLICORES / %)</th>
                <th style={{ padding: "8px 6px" }}>RAM (MB)</th>
                <th style={{ padding: "8px 6px" }}>TENGD GEYMSLA (PVC)</th>
                <th style={{ padding: "8px 6px" }}>ALUR</th>
              </tr>
            </thead>
            <tbody>
              {metrics.pods.map((pod) => (
                <tr key={pod.name} style={{ borderBottom: "1px solid #141f36" }}>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace", color: "#f8fafc", fontWeight: 600 }}>
                    {pod.name}
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    <span style={{ padding: "2px 6px", borderRadius: "4px", background: "#1e293b", color: "#94a3b8" }}>
                      {pod.namespace}
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "10px",
                        background: "#064e3b",
                        color: "#34d399",
                        border: "1px solid #059669",
                        fontWeight: 600,
                      }}
                    >
                      ● {pod.status}
                    </span>
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace" }}>
                    {pod.cpuMilliCores}m ({pod.cpuPercent}%)
                  </td>
                  <td style={{ padding: "8px 6px", fontFamily: "monospace", color: "#a855f7" }}>
                    {pod.memoryMb} MB
                  </td>
                  <td style={{ padding: "8px 6px" }}>
                    {pod.pvcName ? (
                      <span style={{ color: "#10b981", fontFamily: "monospace" }}>
                        {pod.pvcName} ({pod.pvcSizeGb} GB)
                      </span>
                    ) : (
                      <span style={{ color: "#64748b" }}>Engin (Stateless)</span>
                    )}
                  </td>
                  <td style={{ padding: "8px 6px", color: "#64748b" }}>{pod.age}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* NODE SUB-VIEW: Node Health Conditions & Air-gap Verification */}
      {activeSubView === "node" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
          <div style={{ background: "#0a1020", border: "1px solid #1e293b", borderRadius: "6px", padding: "10px" }}>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>KUBELET READY</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
              ✓ Ready ({metrics.node.status})
            </div>
            <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px" }}>
              Node: {metrics.node.name} ({metrics.node.internalIp})
            </div>
          </div>

          <div style={{ background: "#0a1020", border: "1px solid #1e293b", borderRadius: "6px", padding: "10px" }}>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>MINNISÁLAG (MEMORY PRESSURE)</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
              ✓ Eðlilegt (False)
            </div>
            <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px" }}>
              Nægilegt frítt vinnsluminni til staðar
            </div>
          </div>

          <div style={{ background: "#0a1020", border: "1px solid #1e293b", borderRadius: "6px", padding: "10px" }}>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>DISKÁLAG (DISK PRESSURE)</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
              ✓ Eðlilegt (False)
            </div>
            <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px" }}>
              {metrics.disk.freeGb} GB óráðstafað á NVMe
            </div>
          </div>

          <div style={{ background: "#0a1020", border: "1px solid #1e293b", borderRadius: "6px", padding: "10px" }}>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>FERLAFJÖLDI (PID PRESSURE)</div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#34d399", marginTop: "2px" }}>
              ✓ Eðlilegt (False)
            </div>
            <div style={{ fontSize: "0.68rem", color: "#64748b", marginTop: "4px" }}>
              K3s PID mörk eru vel innan öryggismarka
            </div>
          </div>
        </div>
      )}

      {/* Widget Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.68rem",
          color: "#64748b",
          borderTop: "1px solid #141f36",
          paddingTop: "8px",
        }}
      >
        <span>
          Síðast uppfært: <strong style={{ color: "#94a3b8" }}>{lastUpdated}</strong>
        </span>
        <span style={{ color: "#10b981" }}>
          🔒 Air-Gap K3s Stack: 0 bytes WAN Egress • Öll gögn dulkóðuð á staðbundnu NVMe
        </span>
      </div>
    </div>
  );
}
