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

---

## 3. Installation & Run Modes

- **Turnkey One-Step Installer:**
  ```bash
  chmod +x install.sh
  ./install.sh
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
