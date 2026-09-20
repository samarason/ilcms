# ILCMS - Functional Requirements & Design Document

> *This document was written with the assistance of AI. All code and documentation have been human-reviewed and verified.*

**Document Identifier:** `ILCMS-DOC-001`  
**Version:** `2.0.0-COMPREHENSIVE`  
**Status:** Approved Design Document  

---

## 1. Executive Summary & Purpose

The **Icelandic Legal Case Management System (ILCMS / Málastjórnunarkerfi)** is a domain-specific, high-security legal workspace engineered for Icelandic advocates, law firms, and court practitioners.

### Core Problems Addressed
* **Fragmented Matter Workflows:** Managing civil litigation requires coordinating statutory deadlines, complex evidence bundles, pleadings, and billing records across disparate tools.
* **Complex Procedural Rules:** The Icelandic Civil Procedure Act (*lög um meðferð einkamála nr. 91/1991*) imposes strict statutory deadlines (service, defense, expedited proceedings, expert appraisals). Missing a deadline can result in default judgment (*útivistardómur*).
* **Court Bundle Compliance:** The Court Administration (*Dómstólasýslan*) Rule No. 1/2020 mandates rigid formatting for court bundles (*málsgagnasöfn*), including formal tables of contents, strict exhibit nomenclature (A-1, B-1), and continuous Bates stamp numbering.
* **Strict Legal Confidentiality:** Public cloud AI models (ChatGPT, Gemini Cloud, Claude) pose severe data protection and legal privilege violations under Icelandic Act No. 77/1998 and GDPR Act No. 90/2018. **ILCMS addresses this by ensuring ONLY the AI subsystem is 100% Air-Gapped and runs locally with zero outbound egress.**

---

## 2. Functional Requirements

### 2.1 Authentication & Tenant Isolation
* **FR-AUTH-01:** System authentication via Keycloak 24 OIDC with role-based access control (Lawyer, Judge, Legal Assistant).
* **FR-AUTH-02:** Strict tenant and matter-level segregation preventing unauthorized cross-matter data disclosure.

### 2.2 Matter Management (Málaskrá)
* **FR-CASE-01:** Comprehensive case registry with docket numbers (e.g. *E-1025/2026*), parties, court jurisdiction, and judge/advocate assignments.
* **FR-CASE-02:** Priority tagging (`LOW`, `NORMAL`, `HIGH`, `URGENT`) and expedited proceeding flagging (*flýtimeðferð skv. XIX. kafla eml.*).
* **FR-CASE-03:** Live case status indicators and real-time client-side search filtering across matters.

### 2.3 Statutory Deadlines & Procedural Engine (Dómsfrestir)
* **FR-PROC-01:** Automatic statutory deadline computation based on Act No. 91/1991:
  - Service of summons (*birtingar- og þingfestingarfrestur*, 80. gr.).
  - Statement of defense deadline (*greinargerðarfrestur*, 96. gr. og 101. gr.).
  - Expedited proceedings timeline (*flýtimeðferðarfrestir*, XIX. kafli).
  - Expert witness nomination (*dómkvaðning matsmanna*, X. kafli).
  - Oral pleadings date (*málflutningur*, 102. gr.).
  - Appeal filing deadline (*áfrýjunarfrestur*, 144. gr. og 154. gr.).
* **FR-PROC-02:** Visual urgency badges: Critical (< 24h), High (< 48h), Upcoming (< 7d).
* **FR-PROC-03:** Export of computed court dates to standard iCalendar (.ics) format.

### 2.4 Court Bundle Generator (Málsgagnasafn skv. reglum dómstólasýslunnar nr. 1/2020)
* **FR-BNDL-01:** Automatic generation of formal court cover page (*Forsíða málsgagnasafns*) with court header, docket number, parties, and attorneys.
* **FR-BNDL-02:** Formal Table of Contents (*Efnisyfirlit*) categorizing plaintiff exhibits (A-1, A-2, etc.) and defendant exhibits (B-1, B-2, etc.) with exhibit titles, submission dates, and page spans.
* **FR-BNDL-03:** Continuous Bates stamp pagination (`Bls. X af Y`) rendered in running footers across all documents.
* **FR-BNDL-04:** Multi-volume splitting if the bundle exceeds 300 pages (Bindi I, Bindi II).
* **FR-BNDL-05:** Export to court-ready, printable PDF format.

### 2.5 Legal Drafting Studio & Electronic Law Practice (Skjalagerð)
* **FR-DRAFT-01:** Structured Icelandic legal pleading templates:
  - Stefna í einkamáli (Writ of summons with formal claims and legal basis).
  - Greinargerð stefnda (Statement of defense with dismissal motions and denials).
  - Kröfugerð um málskostnað (Claims for litigation costs).
* **FR-DRAFT-02:** Side-by-side legal document comparison (*Samanburður dómsskjala*) with visual additions/deletions diffing.
* **FR-DRAFT-03:** Export of drafts to Microsoft Word (.docx) and PDF.

### 2.6 Statutory Fee & Cost Tracker (130. gr. eml. Málskostnaðarreiknivél)
* **FR-COST-01:** Built-in billable activity timer categorized by procedural stage (investigation, drafting, negotiation, court appearance).
* **FR-COST-02:** Automatic statutory court fee calculation (*stefnugjald 131. gr.*) based on principal claim amounts.
* **FR-COST-03:** Outlay tracking (process server fees, expert witness costs) with automated 24% VAT calculation.
* **FR-COST-04:** Automated generation of formal itemized cost schedule (*málskostnaðaryfirlit*) ready for court submission.

### 2.7 100% Air-Gapped AI Assistant (Zero Cloud Egress)
* **FR-AI-01:** On-device Icelandic LLM inference using Gemma 2 9B running strictly inside the local host.
* **FR-AI-02:** Zero outbound network traffic: all case documents, pleadings, and queries remain strictly on the local machine.
* **FR-AI-03:** Retrieval-Augmented Generation (RAG) powered by local dense embeddings (`nomic-embed-text`) with mandatory pinpoint citations.
* **FR-AI-04:** Integrated statutory knowledge base covering core Icelandic statutes and landmark court rulings.

### 2.8 Trial Example Documents & Case Ingestion (/examples)
* **FR-EXMP-01 (Example Library Catalog):** Provide a structured repository of authentic Icelandic trial materials under `/examples` (expert surveyor reports, standard construction contracts skv. ÍST 30:2012, civil summonses, attorney correspondence, contract rescissions, and surveyor petitions) indexed via `manifest.json`.
* **FR-EXMP-02 (Interactive Ingestion Modal):** Interactive modal (`ExampleDocsPickerModal`) allowing attorneys to preview complete document text, inspect metadata, download original files, and select files for import.
* **FR-EXMP-03 (Automated Trial Seeding API):** REST API endpoint (`/api/v1/examples`) supporting insertion into active cases or one-click creation of a new trial case pre-populated with selected exhibits and procedural records.

### 2.9 System Administration & Cluster Monitoring (Kerfisstjórn)
* **FR-ADM-01 (Centralized Admin Console):** Dedicated administrative console (`AdminConsoleModal`) restricted to users with the `admin` role for diagnostics, cache management, and user oversight.
* **FR-ADM-02 (Live K3s Resource Monitor):** Real-time telemetry dashboard widget (`K3sResourceMonitorWidget`) tracking CPU load, RAM utilization (container RSS vs host memory buffer), disk volume utilization, and container health (`STAÐA: Ready`) via `/api/v1/admin/cluster-metrics`.
* **FR-ADM-03 (Linguistic & Legal Terminology Standards):** Enforce correct Icelandic legal grammar throughout all tables, headers, and badges (e.g. nominative status indicator "STAÐA").
