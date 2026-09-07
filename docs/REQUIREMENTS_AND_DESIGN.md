# ILCMS - Functional Requirements & Design Document

**Document Identifier:** `ILCMS-DOC-001`  
**Version:** `1.0.0-BASELINE`  
**Status:** Approved Baseline  

---

## 1. Executive Summary & Purpose
The Icelandic Legal Case Management System (ILCMS / Málastjórnunarkerfi) is a domain-specific, multi-tenant legal workspace engineered for legal professionals and law firms.

### Core Problems Addressed
* **Fragmented Matter Workflows:** Legal proceedings require coordinating evidence, case summaries, court filings, and deadlines across unlinked directories.
* **Information Retrieval Bottlenecks:** Attorneys spend billable time cross-referencing contract exhibits and court transcripts.
* **Sovereignty & Security:** Legal materials contain privileged attorney-client communication. Cloud-dependent public AI tools present compliance and confidentiality risks.

---

## 2. Functional Requirements

### 2.1 Authentication & Tenant Isolation
* **FR-AUTH-01:** All dashboard access requires authentication via Keycloak OIDC.
* **FR-AUTH-02:** User accounts map to a specific tenant (`organization_id`). Users from Organization A cannot view matters belonging to Organization B.
* **FR-AUTH-03:** Local identity providers support standard flow and direct access grants for automation.

### 2.2 Matter Management (Málaskrá)
* **FR-CASE-01:** Users can list all matters belonging to their organization, ordered by creation date.
* **FR-CASE-02:** Users can create matters specifying `title`, `description`, and `priority` (`LOW`, `NORMAL`, `HIGH`, `URGENT`).
* **FR-CASE-03:** The system generates human-readable reference codes (e.g., `M-XXXX/2026`).
* **FR-CASE-04:** Real-time client-side search filtering across matters.

### 2.3 Document Management & AI
* **FR-DOC-01:** Matter-centric document storage supporting PDF uploads.
* **FR-AI-01:** Contextual legal chat assistant bound to the active matter scope.
* **FR-AI-02:** Mandatory citations with source keys and excerpts on all AI responses.

---

## 3. UI/UX Architecture: 3-Pane Workspace
* **Pane 1 (Málaskrá):** Case search, case filtering, and matter creation modal.
* **Pane 2 (Mál & Gögn):** Active matter metadata, PDF document upload, and document list.
* **Pane 3 (Lögfræðiaðstoð AI):** RAG legal assistant with contextual citation display.
