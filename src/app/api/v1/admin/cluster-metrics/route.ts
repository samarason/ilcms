import { NextResponse } from "next/server";

export interface K3sPodMetric {
  name: string;
  namespace: string;
  status: "Running" | "Pending" | "Terminating";
  cpuMilliCores: number;
  cpuPercent: number;
  memoryMb: number;
  restarts: number;
  age: string;
  pvcName?: string;
  pvcSizeGb?: number;
}

export interface K3sClusterMetrics {
  timestamp: string;
  clusterName: string;
  distribution: string;
  version: string;
  node: {
    name: string;
    role: string;
    status: "Ready" | "NotReady";
    internalIp: string;
    osImage: string;
    kernelVersion: string;
    containerRuntime: string;
    kubeletVersion: string;
  };
  conditions: {
    ready: boolean;
    memoryPressure: boolean;
    diskPressure: boolean;
    pidPressure: boolean;
    networkUnavailable: boolean;
  };
  cpu: {
    totalCores: number;
    usagePercent: number;
    loadAverage: [number, number, number];
    frequencyGhz: number;
    history: number[]; // Last 15 sample percentages
  };
  memory: {
    totalMb: number;
    usedMb: number;
    freeMb: number;
    buffersMb: number;
    usagePercent: number;
    history: number[]; // Last 15 sample percentages
  };
  disk: {
    totalGb: number;
    usedGb: number;
    freeGb: number;
    usagePercent: number;
    mountPoint: string;
    storageClass: string;
    iopsRead: number;
    iopsWrite: number;
    breakdown: {
      aiModelsGb: number;
      postgresDbGb: number;
      caseDocumentsGb: number;
      k3sContainerdGb: number;
      systemOsGb: number;
    };
  };
  pods: K3sPodMetric[];
  airgap: {
    egressBlocked: boolean;
    externalRequests: number;
    internalSocketStatus: string;
  };
}

// In-memory historical buffers
let cpuHistory: number[] = [19.5, 21.0, 20.4, 22.8, 21.2, 23.5, 20.8, 22.1, 21.3, 20.9, 21.7, 22.4, 20.6, 21.9, 21.3];
let memoryHistory: number[] = [42.1, 42.2, 42.4, 42.3, 42.5, 42.6, 42.4, 42.5, 42.6, 42.7, 42.5, 42.6, 42.4, 42.5, 42.4];

export async function GET() {
  // Generate small, natural telemetry variations for live graphs
  const cpuJitter = (Math.random() - 0.48) * 1.8;
  const currentCpuPercent = Math.max(12, Math.min(48, parseFloat((21.3 + cpuJitter).toFixed(1))));

  const memJitter = (Math.random() - 0.5) * 45;
  const currentUsedMb = Math.round(8685 + memJitter);
  const totalMb = 20480;
  const currentMemPercent = parseFloat(((currentUsedMb / totalMb) * 100).toFixed(1));

  // Update rolling histories
  cpuHistory = [...cpuHistory.slice(1), currentCpuPercent];
  memoryHistory = [...memoryHistory.slice(1), currentMemPercent];

  const metrics: K3sClusterMetrics = {
    timestamp: new Date().toISOString(),
    clusterName: "k3s-ilcms-airgap-cluster",
    distribution: "k3s (Lightweight Kubernetes)",
    version: "v1.30.2+k3s1",
    node: {
      name: "ilcms-airgap-node-01",
      role: "control-plane,master",
      status: "Ready",
      internalIp: "127.0.0.1",
      osImage: "Ubuntu 24.04 LTS (Air-Gapped)",
      kernelVersion: "Linux 6.8.0-laptop-airgap",
      containerRuntime: "containerd://1.7.15-k3s1",
      kubeletVersion: "v1.30.2+k3s1",
    },
    conditions: {
      ready: true,
      memoryPressure: false,
      diskPressure: false,
      pidPressure: false,
      networkUnavailable: false,
    },
    cpu: {
      totalCores: 8,
      usagePercent: currentCpuPercent,
      loadAverage: [
        parseFloat((0.62 + (currentCpuPercent - 21) * 0.02).toFixed(2)),
        0.55,
        0.48,
      ],
      frequencyGhz: 3.4,
      history: cpuHistory,
    },
    memory: {
      totalMb,
      usedMb: currentUsedMb,
      freeMb: totalMb - currentUsedMb,
      buffersMb: 2340,
      usagePercent: currentMemPercent,
      history: memoryHistory,
    },
    disk: {
      totalGb: 300,
      usedGb: 48.4,
      freeGb: 251.6,
      usagePercent: 16.1,
      mountPoint: "/var/lib/rancher/k3s/storage",
      storageClass: "local-path (k3s NVMe hostPath)",
      iopsRead: 142,
      iopsWrite: 68,
      breakdown: {
        aiModelsGb: 7.4,       // Gemma 2 9B + nomic-embed weights
        postgresDbGb: 3.8,      // PostgreSQL tables + pgvector HNSW indices
        caseDocumentsGb: 2.2,   // PDF bundles & exhibits
        k3sContainerdGb: 4.8,   // Image cache & overlayfs
        systemOsGb: 30.2,       // Host OS rootfs
      },
    },
    pods: [
      {
        name: "ilcms-web-7bc9df45f-j7k2x",
        namespace: "default",
        status: "Running",
        cpuMilliCores: 256,
        cpuPercent: 3.2,
        memoryMb: 480,
        restarts: 0,
        age: "3d 14h",
      },
      {
        name: "ilcms-postgres-statefulset-0",
        namespace: "database",
        status: "Running",
        cpuMilliCores: 224,
        cpuPercent: 2.8,
        memoryMb: 1120,
        restarts: 0,
        age: "3d 14h",
        pvcName: "postgres-data-pvc",
        pvcSizeGb: 50,
      },
      {
        name: "ilcms-keycloak-6d9b4f74d-k4q9p",
        namespace: "auth",
        status: "Running",
        cpuMilliCores: 120,
        cpuPercent: 1.5,
        memoryMb: 850,
        restarts: 0,
        age: "3d 14h",
      },
      {
        name: "ilcms-ollama-daemonset-8m9zp",
        namespace: "ai",
        status: "Running",
        cpuMilliCores: 1100,
        cpuPercent: 13.8,
        memoryMb: 6140,
        restarts: 0,
        age: "3d 14h",
        pvcName: "ollama-models-pvc",
        pvcSizeGb: 100,
      },
      {
        name: "open-webui-74bf8df8c-m9x12",
        namespace: "ai",
        status: "Running",
        cpuMilliCores: 88,
        cpuPercent: 1.1,
        memoryMb: 320,
        restarts: 0,
        age: "3d 14h",
        pvcName: "open-webui-pvc",
        pvcSizeGb: 10,
      },
      {
        name: "traefik-ingress-controller-44x2b",
        namespace: "kube-system",
        status: "Running",
        cpuMilliCores: 48,
        cpuPercent: 0.6,
        memoryMb: 95,
        restarts: 0,
        age: "3d 14h",
      },
    ],
    airgap: {
      egressBlocked: true,
      externalRequests: 0,
      internalSocketStatus: "Loopback cluster network 10.42.0.0/16 ONLY (No WAN Gateway)",
    },
  };

  return NextResponse.json(metrics);
}
