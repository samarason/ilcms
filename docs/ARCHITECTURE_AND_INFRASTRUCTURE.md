# ILCMS - Technical Architecture & Infrastructure Specification

> *This document was written with the assistance of AI. All code and documentation have been human-reviewed and verified.*

**Document Identifier:** `ILCMS-DOC-002`  
**Version:** `2.0.0-AIRGAP-LOCAL`  
**Status:** Approved Architecture  

---

## 1. System Topology & Architecture

The **Icelandic Legal Case Management System (ILCMS)** is designed to operate seamlessly on a local laptop environment (16–20GB RAM, 300GB SSD) with the core architectural principle:
> **Only the AI subsystem is 100% Air-Gapped with zero outbound egress.**

```
+-------------------------------------------------------------------------------------------------------+
| LOCAL LAPTOP HOST (Linux / macOS / WSL)                                                               |
|                                                                                                       |
|  +-------------------------------------------------------------------------------------------------+  |
|  | Standard Application Network (Host loopback / Docker Bridge)                                     |  |
|  |                                                                                                 |  |
|  |  [ Web UI & API Layer ]       [ Identity Provider ]       [ Relational & Vector Database ]       |  |
|  |  Next.js 15 App Router         Keycloak 24 (Quarkus)       PostgreSQL 16 Alpine                   |  |
|  |  React 19 + TypeScript         OIDC / OAuth 2.0            pgvector extension (HNSW index)        |  |
|  |  Port: 3000                    Port: 8080                  Port: 5432                             |  |
|  +-------------------------------------------------------------------------------------------------+  |
|                                                  |                                                    |
|                                 (Internal Local Inference via 127.0.0.1)                              |
|                                                  v                                                    |
|  +-------------------------------------------------------------------------------------------------+  |
|  | 100% AIR-GAPPED AI SUBSYSTEM (Zero Outbound Egress / Isolated Bridge `internal: true`)          |  |
|  |                                                                                                 |  |
|  |  [ Ollama LLM Inference Engine ]                                                                |  |
|  |  • Primary Model: Gemma 2 9B (Icelandic Legal Fine-Tune, 256k SentencePiece Tokenizer)          |  |
|  |  • Embedding Model: nomic-embed-text (768-dimensional dense vector embeddings)                  |  |
|  |  • Loopback: 127.0.0.1:11434 (Strict Local Socket / No WAN routing)                             |  |
|  |  • Data Confidentiality: Pleadings, exhibits, and client facts never leave the local device      |  |
|  +-------------------------------------------------------------------------------------------------+  |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. Component Specifications

### 2.1 Web Application & API (`web`)
- **Framework:** Next.js 15 (App Router), React 19, TypeScript.
- **Styling:** Tailwind CSS with high-contrast, accessible legal typography.
- **Port:** 3000 (accessible at `http://localhost:3000`).
- **Core Modules:**
  - Case Registry (*Málaskrá*) with urgency tracking and procedural indicators.
  - Statutory Deadline Engine (*Dómsfrestir skv. lögum nr. 91/1991*).
  - Court Bundle Generator (*Málsgagnasafn skv. reglum dómstólasýslunnar nr. 1/2020*).
  - Legal Drafting Studio (*Stefna, Greinargerð, Kröfugerð*) with version diff.
  - Billable Time & Cost Accounting (*130. gr. eml. málskostnaðarreiknivél*).
  - Example Legal Documents Repository & Import Service (`/api/v1/examples`).
  - System Administration & Cluster Monitoring API (`/api/v1/admin/cluster-metrics`).

### 2.2 100% Air-Gapped AI Subsystem (`ollama`)
- **Engine:** Ollama 0.5.7 container or local daemon.
- **Isolation:** Network bridge configured with `internal: true` or bound exclusively to `127.0.0.1:11434`.
- **Primary LLM:** `gemma2:9b-instruct-q4_K_M` (~5.4 GB quantized model weights), optimized for Icelandic grammar and legal phrasing.
- **Vector Embeddings:** `nomic-embed-text` (768 dimensions) powering RAG semantic search over submitted court exhibits.
- **Resource Limits:** 6–8 GB RAM allocation, 4–6 CPU threads.

### 2.3 Identity & Access Management (`keycloak`)
- **Service:** Keycloak 24 (Quarkus runtime).
- **Database:** Dedicated PostgreSQL database (`keycloak_db`).
- **Pre-configured Realm:** `ilcms` with client `ilcms-web`.
- **Memory Allocation:** 512 MB – 1 GB heap (`JAVA_OPTS_KC_HEAP=-Xms256m -Xmx768m`).

### 2.4 Database & Vector Storage (`postgres`)
- **Service:** PostgreSQL 16 Alpine with `pgvector` extension.
- **Database:** `ilcms_db` for cases, filings, exhibits, time logs, and vector embeddings.
- **Index:** HNSW cosine similarity index for sub-millisecond retrieval of legal citations.

### 2.5 Cluster Metrics & Telemetry Subsystem (`/api/v1/admin/cluster-metrics`)
- **Endpoint:** `GET /api/v1/admin/cluster-metrics`.
- **Data Sources:** Linux kernel `/sys/fs/cgroup`, `/proc/stat`, `/proc/meminfo`, Node.js `os` module, and disk stats (`df`).
- **Telemetry Exposed:**
  - CPU: Active utilization %, core topology, and load averages (1m, 5m, 15m).
  - Memory: Container resident set size (RSS), heap allocated, Ollama model cache footprint, and host system page cache headroom.
  - Disk: Root filesystem and persistent volume claim (PVC) occupancy.
  - Pod Health: Real-time container state (`STAÐA: Ready`, uptime, node IP).

### 2.6 Trial Examples Subsystem (`/examples` & `/api/v1/examples`)
- **Directory Structure:** Top-level `/examples/` mapped to `/public/examples/` for static web asset retrieval.
- **Manifest File:** `manifest.json` indexing file titles, categories, authors, page counts, and summary abstracts.
- **Available Templates:**
  - `01-serfraediskyrsla-fasteignamat.txt`: Expert surveyor inspection on building moisture & facade defects (kr. 35.278.000).
  - `02-samningur-verksamningur.txt`: Construction agreement conforming to ÍST 30:2012.
  - `03-stefna-heradsdomur.txt`: District Court writ of summons with formal statutory claims.
  - `04-tolvupostar-samskipti.txt`: Attorney, contractor, and client communications.
  - `05-greidsluaskorun-riftun.txt`: Payment demand and formal contract cancellation notice.
  - `06-domkvaedning-matsmanna.txt`: Petition for judicial surveyor appointment skv. XII. kafla eml.
- **Import Modes:** Insertion into an existing matter (`insert_to_case`) or automated provisioning of a new trial matter (`create_new_case`).

---

## 3. Installation & Run Modes

- **Turnkey One-Step Installer (Auto-detect):**
  ```bash
  chmod +x install.sh
  ./install.sh
  ```
- **K3s Kubernetes Deployment (Declarative Manifests):**
  ```bash
  ./install.sh --k3s
  # Applies deploy/k8s/ manifests to local K3s cluster in 'ilcms' namespace
  ```
- **Docker Compose Stack:**
  ```bash
  ./install.sh --docker
  # OR: docker compose up -d
  ```
- **Air-Gapped AI Only:**
  ```bash
  ./install.sh --ai-only
  ```

---

## 4. Test Credentials
- **Application URL:** `http://localhost:3000`
- **Default Lawyer Account:** `lawyer@ilcms.is` / `ilcms_password_2026`
- **Keycloak Admin:** `admin` / `admin_secret_ilcms`
- **Air-Gapped AI Endpoint:** `http://127.0.0.1:11434` (Strict Local)
