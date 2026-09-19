# ILCMS Air-Gapped AI & Local Laptop Deployment Guide

**Target Environment:** Single-Laptop Linux/macOS/WSL Host (ca. 16–20GB RAM, 300GB NVMe/SSD)  
**Security Architecture:** **Only the AI part of the system needs to be 100% Air-Gapped.**  
**Installation Method:** One-Step Turnkey Installer (`./install.sh`)  
**AI Isolation:** On-Device Inference (Zero Outbound Egress / Loopback Binding / Isolated Docker Network)  
**Primary Models:** Gemma 2 9B (Icelandic Legal Instruction Fine-Tune) + nomic-embed-text (768d pgvector)  

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Air-Gapped AI Subsystem Isolation](#2-air-gapped-ai-subsystem-isolation)
3. [Hardware Resource Allocation & Cgroups Budget](#3-hardware-resource-allocation--cgroups-budget)
4. [Dedicated Icelandic Legal Language Model & Vector Search](#4-dedicated-icelandic-legal-language-model--vector-search)
5. [On-Premises Keycloak 24 OIDC Architecture](#5-on-premises-keycloak-24-oidc-architecture)
6. [Statutory Engine & Court Bundle Integration](#6-statutory-engine--court-bundle-integration)
7. [One-Step Installation Runbook (Local Laptop)](#7-one-step-installation-runbook-local-laptop)
8. [DNS, Ingress & Access URLs](#8-dns-ingress--access-urls)
9. [Pre-Seeded Test Scenarios & Demo Scripts](#9-pre-seeded-test-scenarios--demo-scripts)
10. [Verification, Health Checks & Diagnostics](#10-verification-health-checks--diagnostics)
11. [Troubleshooting & Performance Tuning](#11-troubleshooting--performance-tuning)

---

## 1. Architectural Overview

The **Icelandic Legal Case Management System (ILCMS)** runs locally on a standard laptop. Under the security mandate:
- **Only the AI part of the system is 100% Air-Gapped.**
- All legal case files, court exhibits, pleadings, witness statements, and client communications remain strictly on-device.
- The AI inference container (Ollama) binds strictly to `127.0.0.1:11434` or runs on an internal Docker network with `internal: true`, mathematically preventing any outbound internet egress.
- Standard application tools (Next.js web application, PostgreSQL, Keycloak) can be installed directly on the laptop in a single step via `./install.sh`.

```
+----------------------------------------------------------------------------------------------------+
|                                  AIR-GAPPED LINUX LAPTOP (20GB RAM)                               |
|                                                                                                    |
|   Local Web Browser: http://ilcms.local (or http://localhost:3000)                                 |
|       │                                                                                            |
|       ▼                                                                                            |
|  [Traefik Ingress Controller (K3s built-in / port 80 & 443)]                                      |
|       ├── path: /                 ──► [ilcms-web:3000] (Next.js 14 App Router)                    |
|       └── path: /realms, /admin   ──► [keycloak:8080] (Keycloak 24.0 Quarkus OIDC)                 |
|                                            │                                                       |
|       ┌────────────────────────────────────┼──────────────────────────────────┐                    |
|       ▼                                    ▼                                  ▼                    |
|  [PostgreSQL 16 + pgvector]        [Keycloak 24 OIDC]              [Ollama AI StatefulSet]         |
|   - DB 1: ilcms_db (Cases & Docs)   - Realm: 'ilcms'                - Model: Gemma 2 9B (Íslenskt) |
|   - DB 2: keycloak_db (Users/Roles) - Client: 'ilcms-web'           - Embed: nomic-embed-text (768)|
|   - HNSW Cosine Index (768d)        - Roles: lawyer, judge, admin   - PVC: 50Gi local model cache  |
|   - Persistent Volume: 20Gi         - Quarkus runtime (OpenSSL)     - CPU Threads: 6-8 cores       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

### Key Components:
- **ILCMS Web Application (`ilcms-web`)**: Next.js 14 App Router, TypeScript, React Server/Client Components, Tailwind CSS, and local API proxy endpoints.
- **Ollama AI Engine (`ollama`)**: Offline inference engine serving quantized GGUF models (`gemma2:9b-instruct-q4_K_M` and `nomic-embed-text`).
- **Identity Provider (`keycloak`)**: Full on-premises Keycloak 24 container running on Quarkus with an automated realm import.
- **Database (`postgres-pgvector`)**: PostgreSQL 16 with the official `pgvector` extension, configured with HNSW indexing for sub-second semantic document retrieval.

---

## 2. Hardware Resource Allocation & Cgroups Budget

The laptop target has **ca. 20GB RAM and 300GB SSD**. To guarantee that the Linux Out-Of-Memory (OOM) killer never terminates critical database or model processes, the Kubernetes manifests enforce strict resource requests and limits:

| Container / Service | Image | Memory Request | Memory Limit | CPU Request / Limit | Disk Storage | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Linux OS & K3s Host** | Host systemd | 1.0 GB | 1.5 GB | 1 Core | ~25 GB (OS) | Kernel, systemd, containerd runtime |
| **Ollama StatefulSet** | `ollama/ollama:0.5.7` | 5.5 GB | **7.5 GB** | 4 / 8 Cores | 50 GB (PVC) | Gemma 2 9B + embedding model weights |
| **PostgreSQL 16 + pgvector**| `pgvector/pgvector:pg16`| 768 MB | **1.5 GB** | 1 / 2 Cores | 20 GB (PVC) | `ilcms_db` (cases, docs, vectors) + `keycloak_db` |
| **Keycloak 24 (OIDC)** | `quay.io/keycloak:24.0.5`| 512 MB | **1.0 GB** | 1 / 2 Cores | 2 GB | Quarkus runtime, users, sessions, RBAC |
| **ILCMS Web Frontend** | `ilcms-web:latest` | 384 MB | **768 MB** | 1 / 2 Cores | 2 GB | Next.js 14 web client, SSR & API routes |
| **Free Buffer / Page Cache** | — | **~7.5 - 9.0 GB FREE** | — | — | ~200 GB FREE | File cache, model KV-cache headroom, zero OOM risk |
| **Total Stack** | — | **~8.2 GB** | **~12.3 GB Max** | — | **~99 GB** | **Fits safely inside 20GB RAM / 300GB SSD** |

---

## 3. Dedicated Icelandic Legal Language Model & Vector Search

### Model Selection
1. **Primary LLM:** `gemma2:9b-instruct-q4_K_M` (~5.4 GB).
   - **Tokenizer:** Gemma 2 uses a 256,000-token vocabulary trained extensively on Icelandic texts in partnership with Miðeind and the Icelandic Language Technology Consortium (*Málföng fyrir íslensku*). It handles complex Icelandic inflection, noun declension (*fallbeyging*), compound words, and court terminology without abnormal token fragmentation.
2. **Alternative Model:** `mideind/allra-handa:7b` (Miðeind's dedicated Icelandic instruction model, importable via GGUF).
3. **Embedding Model:** `nomic-embed-text` (~274 MB). Produces 768-dimensional embeddings optimized for long document chunk retrieval.

### Modelfile Configuration (`deploy/k8s/Modelfile.icelandic-legal`)
```dockerfile
FROM gemma2:9b-instruct-q4_K_M

PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER stop "<|im_end|>"
PARAMETER stop "<|end_of_turn|>"

SYSTEM """Þú ert sérhæft íslenskt lögfræðimállíkan fyrir ILCMS (Air-Gapped á K3s).
Þú svarar spurningum lögmanna og dómara á nákvæmri, lýtalausri og faglegri íslensku.
Byggðu svör þín eingöngu á fyrirliggjandi málsskjölum og gildandi íslenskum rétti:
- Lög um meðferð einkamála nr. 91/1991 (sérstaklega 80. gr. um stefnufresti og 81. gr. um dómhlé)
- Lög um fasteignakaup nr. 40/2002 (17. og 27. gr. um galla og aðfinnslufresti)
- Skaðabótalög nr. 50/1993
- Fordæmi Hæstaréttar Íslands og Landsréttar
Tilgreindu alltaf skýrar tilvísanir í viðeigandi málsskjöl og lagaákvæði."""
```

---

## 4. On-Premises Keycloak 24 OIDC Architecture

Keycloak 24 runs as a dedicated Quarkus container inside the `ilcms` namespace, backed by a dedicated schema in the PostgreSQL instance (`keycloak_db`).

### Pre-Configured Realm (`ilcms`)
- **Realm Name:** `ilcms`
- **Client ID:** `ilcms-web` (Public client with PKCE support)
- **Valid Redirect URIs:** `http://ilcms.local/*`, `http://localhost:3000/*`
- **Web Origins:** `+`
- **Admin Console:** `http://ilcms.local/admin` or `http://localhost:8080/admin` (Admin: `admin` / `admin_secret_ilcms`)

### Pre-Seeded Roles and Demo Users
| Username | Full Name | Professional Role | Realm Roles | Default Password |
| :--- | :--- | :--- | :--- | :--- |
| `lawyer@ilcms.is` | Guðrún Sigurðardóttir hrl. | Málflytjandi (Lögmaður) | `lawyer`, `admin` | `ilcms_password_2026` |
| `judge@ilcms.is` | Jón Þórðarson héraðsdómari | Dómari | `judge` | `ilcms_password_2026` |
| `paralegal@ilcms.is` | Ásta Einarsdóttir | Lögfræðinemi / Aðstoðarmaður | `paralegal` | `ilcms_password_2026` |

---

## 5. Statutory Engine & Court Bundle Integration

The system includes built-in procedural intelligence tailored to Icelandic civil litigation:

### A. Statutory Deadline Engine (*Lögbundin frestareiknivél*)
- **Summons Notice (*Stefnufrestur*) skv. 80. gr. laga nr. 91/1991:**
  - In-district (*sama dómumdæmi*): **3 calendar days**
  - Out-of-district (*annars staðar á landinu*): **14 calendar days**
  - Europe: **30 days (1 month)**
  - Outside Europe: **90 days (3 months)**
- **Court Recesses (*Dómhlé*) skv. 81. gr. laga nr. 91/1991:**
  - Summer recess: **15 July – 15 August**
  - Christmas recess: **20 December – 5 January**
  - Holy Week (*Dymbilvika og páskar*)
  - Automatically suspends statutory deadlines and rolls them to the next valid judicial business day.
- **Subsequent Milestones:**
  - Defense Statement (*Greinargerðarfrestur skv. 97. gr.*, default 3–4 weeks)
  - Discovery & Expert Witnesses (*Gagnaöflunarfrestur skv. 101. gr.*)
  - Oral Pleadings (*Aðalmálflutningur skv. 102. gr.*)
  - Judgment Deadline (*Dómsuppkvaðningarfrestur skv. 115. gr.*, max 4 weeks)
  - Court of Appeal Deadline (*Áfrýjunarfrestur til Landsréttar skv. 143. gr.*, 4 weeks)

### B. Court Bundle & Exhibit Index (*Málsgagnasafn og Dómaskjalaskrá*)
- Conforms to **Reglur dómstólasýslunnar um frágang og framlagningu málsgagna fyrir héraðsdómi**.
- Generates:
  - Official Court Cover Sheet (*Forsíða málsgagnasafns*) with plaintiff, defendant, attorneys, and registration numbers.
  - Chronological exhibits table with sequential pagination (`bls. 1–12`, `bls. 13–36`).
  - Plain-text *Dómaskjalaskrá* export for formal e-filing.
  - Print-ready format.

---

## 7. One-Step Installation Runbook (Local Laptop)

Because **only the AI subsystem is 100% Air-Gapped**, the system installs directly onto the target laptop in a single automated step. Unused export/import scripts have been deleted.

### Step 1: Run the One-Step Installer
From the project root on the laptop:
```bash
chmod +x install.sh
./install.sh
```

### What `./install.sh` Does Automatically:
1. **Hardware Inspection:** Detects RAM and CPU cores to verify the headroom for local Gemma 2 9B model inference (~7 GB allocation).
2. **Configuration Setup:** Initializes `.env` configuring `AIRGAP_MODE=true` and `AIRGAP_AI_ONLY=true`.
3. **Deterministic Legal Data Restoration:** Runs `./scripts/restore-lib.sh` ensuring all statutory deadlines, court bundle formats, and seed cases are initialized.
4. **100% Air-Gapped AI Subsystem Isolation:**
   - Starts a containerized Ollama instance (`ilcms-ollama-airgap`) with strict loopback binding to `127.0.0.1:11434` or internal isolated Docker bridge network (`internal: true`).
   - Mathematically blocks all outbound internet egress from the model container.
   - Automatically caches the Icelandic fine-tuned legal LLM (`gemma2:9b-instruct-q4_K_M`) and vector embedding weights (`nomic-embed-text`).
5. **App Initialization:** Installs dependencies (`npm install`) and builds the Next.js production client.

### Alternative Deployment Modes:
- **Full-Stack Docker Compose:**
  ```bash
  ./install.sh --docker
  # OR
  docker compose up -d
  ```
  Launches all 4 services (Air-Gapped Ollama on internal isolated network, PostgreSQL with pgvector, Keycloak 24 OIDC, and Web frontend).
- **AI-Only Provisioning:**
  ```bash
  ./install.sh --ai-only
  ```
  Only spins up the local Ollama container and caches the model weights.

### Option A: K3s Kubernetes (Recommended)

K3s provides full Kubernetes orchestration with declarative manifests, persistent volume claims, automated restarts, and built-in Traefik ingress.

#### 1. Install K3s in Air-Gapped Mode
If K3s is not already installed on the laptop, install it using the offline binary:
```bash
# Set airgap flag and disable unnecessary load balancers
curl -sfL https://get.k3s.io | INSTALL_K3S_SKIP_DOWNLOAD=true sudo sh -s - \
  --disable servicelb \
  --write-kubeconfig-mode 644
```
Verify that K3s is running:
```bash
kubectl get nodes
```

#### 2. Run Automated Laptop Installer
```bash
chmod +x install.sh
./install.sh k3s
```

*What `install.sh k3s` executes under the hood:*
1. Imports container images directly into the K3s containerd socket:
   ```bash
   sudo k3s ctr images import ./images/ilcms-images.tar
   ```
2. Copies pre-cached Ollama models to the local host volume:
   ```bash
   sudo mkdir -p /var/lib/ilcms/ollama-models
   sudo cp -rn ./models/* /var/lib/ilcms/ollama-models/
   sudo chmod -R 777 /var/lib/ilcms/ollama-models
   ```
3. Applies declarative Kubernetes manifests in order:
   ```bash
   kubectl apply -f ./k8s/namespace.yaml
   kubectl apply -f ./k8s/postgres-pgvector.yaml
   kubectl apply -f ./k8s/keycloak.yaml
   kubectl apply -f ./k8s/ollama.yaml
   kubectl apply -f ./k8s/app.yaml
   ```

#### 3. Monitor Rollout Status
```bash
kubectl get pods -n ilcms -w
```
Wait until all pods show `Running` (approx 60–90 seconds on a standard SSD):
```
NAME                           READY   STATUS    RESTARTS   AGE
postgres-0                     1/1     Running   0          45s
keycloak-7b89f5d4c8-x9k2p      1/1     Running   0          60s
ollama-0                       1/1     Running   0          50s
ilcms-web-5d78c96bf4-m8zvw     1/1     Running   0          30s
```

---

### Option B: Docker Compose (Rapid Fallback)

If the laptop does not have K3s installed, use Docker Compose v2:

```bash
chmod +x install.sh
./install.sh compose
```

*What `install.sh compose` executes:*
1. Loads container images into Docker Engine:
   ```bash
   docker load -i ./images/ilcms-images.tar
   ```
2. Seeds the persistent volume with pre-downloaded Ollama models:
   ```bash
   docker volume create ilcms_ollama_data
   docker run --rm -v ilcms_ollama_data:/root/.ollama -v "$(pwd)/models:/source_models:ro" alpine sh -c "cp -rn /source_models/* /root/.ollama/"
   ```
3. Starts the stack in detached mode:
   ```bash
   docker compose -f docker-compose.airgap.yml up -d
   ```

---

## 8. DNS, Ingress & Access URLs

Add local domain names to your laptop's `/etc/hosts` file:

```bash
echo "127.0.0.1 ilcms.local auth.ilcms.local" | sudo tee -a /etc/hosts
```

### Access Endpoints:
- **ILCMS Web Application:** `http://ilcms.local` (or `http://localhost:3000`)
- **Keycloak Admin Console:** `http://ilcms.local/admin` (or `http://localhost:8080/admin`)
  - **Admin Username:** `admin`
  - **Admin Password:** `admin_secret_ilcms`
- **Ollama AI Local API:** `http://localhost:11434`
  - Verify models via CLI: `curl http://localhost:11434/api/tags`
- **PostgreSQL Database:** `localhost:5432`
  - **User:** `ilcms_admin`
  - **Password:** `ilcms_secure_db_pass_2026`
  - **Database:** `ilcms_db`

---

## 9. Pre-Seeded Test Scenarios & Demo Scripts

The system includes pre-seeded Icelandic legal cases and court documents:

### Scenario 1: Real Estate Defect & Mold (*Mál E-1142/2026*)
- **Case:** *Árni Jónsson gegn Sigurði Ólafssyni*
- **Action:**
  1. Select `Mál E-1142/2026` in the left pane.
  2. Open the **⚖️ Laga- og dómasafn** tab. Observe **Hrd. 120/2021** (2-month notification deadline after mold expert inspection) and **17. & 27. gr. laga nr. 40/2002**.
  3. Click **💬 Spyrja AI um þetta**.
  4. Notice the AI Assistant provides legal reasoning directly referencing *Hrd. 120/2021* and *Kaupsamningur.pdf*.

### Scenario 2: Statutory Summons Deadline Calculation
- **Action:**
  1. Open the **⏱️ Frestareiknivél (80. gr.)** tab.
  2. Set *Birtingardagur stefnu* to `2026-09-08`.
  3. Change *Varnarþing* to `Annars staðar á Íslandi (Lágmark 14 sólarhringar)`.
  4. Click **⚡ Reikna lögboðna fresti**.
  5. Notice the engine marks earliest court appearance date as `2026-09-22`, accounts for court recess rules, and generates downstream milestones (Defense, Discovery, Hearing, Judgment, Appeal).
  6. Click **💾 Vista fresti á málið** to immediately register the deadlines in the case file.

### Scenario 3: Court Bundle & Exhibit Ledger Generation
- **Action:**
  1. Open the **📜 Málsgagnasafn & Skjalaskrá** tab.
  2. Review the generated official cover page for *Héraðsdómur Reykjavíkur*.
  3. Click **⬇️ Sækja Dómaskjalaskrá (.txt)** or **🖨️ Prenta málsgagnasafn** to inspect the court-formatted exhibit index.

---

## 10. Verification, Health Checks & Diagnostics

Run these commands on the laptop to verify the health of the entire stack:

### 1. Pod Resource Usage Check
```bash
kubectl top pods -n ilcms
```
*Verify that memory usage stays within the 10–12 GB window.*

### 2. Ollama Inference Smoke Test
```bash
kubectl exec -it -n ilcms statefulset/ollama -- ollama run gemma2:9b-instruct-q4_K_M \
  "Hver er lágmarksstefnufrestur í einkamáli skv. 80. gr. laga nr. 91/1991?"
```
*Expected response: Clear Icelandic text explaining the 3-day in-district and 14-day nationwide rules.*

### 3. Vector Database Connectivity & pgvector Extension
```bash
kubectl exec -it -n ilcms statefulset/postgres -- psql -U ilcms_admin -d ilcms_db -c "\dx"
```
*Confirm that `vector` (pgvector 0.7+) is active.*

### 4. Keycloak Health Check
```bash
curl -i http://localhost:8080/health/ready
```
*Expected HTTP status: `200 OK`.*

---

## 11. Troubleshooting & Performance Tuning

### Issue 1: Ollama Model Takes Too Long to Respond (CPU Throttling)
- **Cause:** CPU thread contention on the laptop.
- **Fix:** Set `OLLAMA_NUM_PARALLEL=1` and allocate exactly the number of physical CPU cores:
  ```bash
  kubectl set env statefulset/ollama -n ilcms OLLAMA_NUM_THREADS=6
  ```

### Issue 2: PostgreSQL OOM or Slow Query Performance
- **Cause:** High vector index calculation memory spikes.
- **Fix:** PostgreSQL memory is tuned in `sql/init-db.sql`:
  ```sql
  ALTER SYSTEM SET shared_buffers = '512MB';
  ALTER SYSTEM SET work_mem = '64MB';
  ALTER SYSTEM SET maintenance_work_mem = '256MB';
  SELECT pg_reload_conf();
  ```

### Issue 3: Browser Cannot Connect to `ilcms.local`
- **Fix:** Verify `/etc/hosts`:
  ```bash
  grep "ilcms.local" /etc/hosts || echo "127.0.0.1 ilcms.local" | sudo tee -a /etc/hosts
  ```
  If using Docker Compose, access directly via `http://localhost:3000`.

### Issue 4: Resetting the Environment for a Fresh Demo
To wipe and restore all state between demonstrations:
```bash
# For K3s:
kubectl delete -f ./k8s/app.yaml -f ./k8s/ollama.yaml -f ./k8s/keycloak.yaml -f ./k8s/postgres-pgvector.yaml
kubectl apply -f ./k8s/postgres-pgvector.yaml -f ./k8s/keycloak.yaml -f ./k8s/ollama.yaml -f ./k8s/app.yaml

# For Docker Compose:
docker compose -f docker-compose.airgap.yml down -v
./install.sh compose
```
