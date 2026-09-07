# ILCMS Air-Gapped Proof-of-Concept (POC) Deployment Guide

This guide details how to build, transfer, and run the **Icelandic Legal Case Management System (ILCMS)** on an isolated Linux laptop with **ca. 20GB RAM and 300GB SSD**.

The environment uses:
1. **K3s (Kubernetes)** directly on the laptop as the primary orchestration platform.
2. **Dedicated Icelandic Legal LLM** (`gemma2:9b-instruct-q4_K_M` or Miðeind fine-tunes) served via an **Ollama** StatefulSet with a 50Gi Persistent Volume.
3. **Full On-Premises Keycloak 24 OIDC container** inside the `ilcms` namespace, with pre-configured realms and role-based access control (Lawyers, Judges, Paralegals).
4. **PostgreSQL 16 with pgvector** for document chunk vector embeddings and HNSW semantic search.

---

## 1. Laptop Hardware Resource Budget (20GB RAM / 300GB SSD)

The services are constrained with strict CPU/memory requests and limits so the entire stack runs smoothly without risk of Out-Of-Memory (OOM) killer invocation:

| Service / Component | Container Image | Target RAM (Typical / Limit) | Disk Storage | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Linux OS & K3s Control Plane** | Host & K3s binaries | 1.5 GB / 2.0 GB | ~20 GB | Host kernel, systemd, K3s server & containerd |
| **Ollama StatefulSet (LLM)** | `ollama/ollama:0.5.7` | 6.0 GB / 8.0 GB | ~50 GB (PVC) | Gemma 2 9B (Íslenskt) + `nomic-embed-text` |
| **Keycloak 24 (OIDC Auth)** | `quay.io/keycloak/keycloak:24.0.5` | 0.5 GB / 1.0 GB | ~1 GB | On-premises identity provider, JWT & RBAC |
| **PostgreSQL 16 + pgvector** | `pgvector/pgvector:pg16` | 1.0 GB / 2.0 GB | ~20 GB (PVC) | `ilcms_db` (cases & vectors) + `keycloak_db` |
| **ILCMS Web Application** | `ilcms-web:latest` | 0.5 GB / 1.0 GB | ~2 GB | Next.js 14 Web UI & API routes |
| **Buffer / Linux Page Cache** | — | **~6.0 - 8.0 GB FREE** | ~200 GB FREE | File cache, model context headroom & swap |
| **Total Stack Footprint** | — | **~10.0 - 13.0 GB** | **~93 GB** | **Safely within 20GB RAM and 300GB disk** |

---

## 2. Air-Gapped K3s Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                  AIR-GAPPED LINUX LAPTOP (20GB RAM)                               |
|                                                                                                    |
|   Browser: http://ilcms.local (or http://localhost:3000)                                           |
|       │                                                                                            |
|       ▼                                                                                            |
|  [Traefik Ingress Controller (K3s built-in)]                                                       |
|       ├── path: /                 ──► [ilcms-web:3000] (Next.js 14 App Router)                    |
|       └── path: /realms, /admin   ──► [keycloak:8080] (Keycloak 24 OIDC Server)                    |
|                                            │                                                       |
|       ┌────────────────────────────────────┼──────────────────────────────────┐                    |
|       ▼                                    ▼                                  ▼                    |
|  [PostgreSQL 16 + pgvector]        [Keycloak 24 OIDC]              [Ollama AI StatefulSet]         |
|   - DB 1: ilcms_db (Cases & Docs)   - Realm: 'ilcms'                - Model: Gemma 2 9B (Íslenskt) |
|   - DB 2: keycloak_db (Users/Roles) - Client: 'ilcms-web'           - Embed: nomic-embed-text (768)|
|   - HNSW Cosine Index               - Users: lawyer, judge, admin   - PVC: 50Gi local model cache  |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Dedicated Icelandic Legal Language Model

The user requested a dedicated Icelandic model. In this setup:
- **Base Architecture**: `gemma2:9b-instruct-q4_K_M` (Gemma 2 9B quantized, ~5.4 GB). Gemma 2 utilizes a 256k token SentencePiece tokenizer with native Icelandic vocabulary, developed in collaboration with Miðeind and the Icelandic Language Technology Programme (*Málföng fyrir íslensku*).
- **Alternative / Miðeind Model**: `mideind/allra-handa:7b` (accessible via Ollama or custom GGUF import).
- **Custom Modelfile (`deploy/k8s/Modelfile.icelandic-legal`)**:
  Pre-loaded with instructions specifically prioritizing Icelandic statutory law:
  - *Lög um meðferð einkamála nr. 91/1991*
  - *Lög um fasteignakaup nr. 40/2002*
  - *Skaðabótalög nr. 50/1993*
  - *Samningalög nr. 7/1936*
  - Precedents from Hæstiréttur and Landsréttur.

---

## 4. On-Premises Keycloak OIDC Authentication

The local stack includes a full Keycloak 24 container running directly in K3s:
- **Service Name**: `keycloak:8080`
- **Realm**: `ilcms`
- **Client ID**: `ilcms-web` (Public client with redirect URIs to `http://ilcms.local/*` and `http://localhost:3000/*`)
- **Keycloak Admin Console**: `http://ilcms.local/admin` or `http://localhost:8080/admin`
  - **Username**: `admin`
  - **Password**: `admin_secret_ilcms`
- **Pre-configured Realm Roles & Demo Accounts**:
  - **Lawyer**: `lawyer@ilcms.is` (Guðrún Sigurðardóttir hrl.) | Password: `ilcms_password_2026` | Roles: `lawyer`, `admin`
  - **Judge**: `judge@ilcms.is` (Jón Þórðarson héraðsdómari) | Password: `ilcms_password_2026` | Roles: `judge`
  - **Paralegal**: `paralegal@ilcms.is` (Ásta Einarsdóttir) | Password: `ilcms_password_2026` | Roles: `paralegal`

---

## 5. Preparation on Internet-Connected Machine

On an internet-connected workstation, run the export script to package container images, Ollama models, and manifests:

```bash
cd ilcms
chmod +x scripts/airgap-export-bundle.sh
./scripts/airgap-export-bundle.sh
```

This pulls:
- Container images: `ollama/ollama:0.5.7`, `pgvector/pgvector:pg16`, `quay.io/keycloak/keycloak:24.0.5`, `ilcms-web:latest`.
- Ollama models: `gemma2:9b-instruct-q4_K_M` and `nomic-embed-text`.
- Generates `ilcms-laptop-poc-bundle.tar` (~11-13 GB).

Copy `ilcms-laptop-poc-bundle.tar` onto a clean USB drive.

---

## 6. Installation & Execution on the Air-Gapped Laptop

### Step 1: Transfer & Unpack
On the laptop:
```bash
mkdir -p ~/ilcms-airgap
tar -xvf /media/usb/ilcms-laptop-poc-bundle.tar -C ~/ilcms-airgap
cd ~/ilcms-airgap/ilcms-airgap-bundle
```

### Step 2: Deploy to K3s
Ensure K3s is running on the laptop (`sudo systemctl status k3s`). Then run:

```bash
chmod +x install.sh
./install.sh k3s
```

Or deploy manually with `kubectl`:
```bash
# 1. Import container images into K3s containerd runtime
sudo k3s ctr images import ./images/ilcms-images.tar

# 2. Deploy entire stack into 'ilcms' namespace
kubectl apply -f ./k8s/namespace.yaml
kubectl apply -f ./k8s/postgres-pgvector.yaml
kubectl apply -f ./k8s/keycloak.yaml
kubectl apply -f ./k8s/ollama.yaml
kubectl apply -f ./k8s/app.yaml
```

### Step 3: Configure Local DNS / Hosts
Add `ilcms.local` and `auth.ilcms.local` to `/etc/hosts`:
```bash
echo "127.0.0.1 ilcms.local auth.ilcms.local" | sudo tee -a /etc/hosts
```

---

## 7. Verification & Health Checks

Verify all pods are running in the `ilcms` namespace:
```bash
kubectl get pods -n ilcms
```
Expected output:
```
NAME                           READY   STATUS    RESTARTS   AGE
postgres-0                     1/1     Running   0          2m
keycloak-xxxxxxxxxx-xxxxx      1/1     Running   0          2m
ollama-0                       1/1     Running   0          2m
ilcms-web-xxxxxxxxxx-xxxxx     1/1     Running   0          1m
```

Check resource consumption:
```bash
kubectl top pods -n ilcms
```

Verify Ollama has the Icelandic model loaded:
```bash
kubectl exec -it -n ilcms statefulset/ollama -- ollama list
# Displays: gemma2:9b-instruct-q4_K_M, nomic-embed-text
```

Test inference directly inside the cluster:
```bash
kubectl exec -it -n ilcms statefulset/ollama -- ollama run gemma2:9b-instruct-q4_K_M \
  "Hver er meginreglan um sönnunarbyrði í íslenskum einkamálum skv. lögum nr. 91/1991?"
```

Access the UI at:
- Web App: `http://ilcms.local` (or `http://localhost:3000`)
- Keycloak Admin: `http://ilcms.local/admin` (or `http://localhost:8080/admin`)
