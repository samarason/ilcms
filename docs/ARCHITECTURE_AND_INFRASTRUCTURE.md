# ILCMS - Technical Architecture & Infrastructure Specification

**Document Identifier:** `ILCMS-DOC-002`  
**Version:** `1.0.0-BASELINE`  
**Status:** Approved Baseline  

---

## 1. System Topology
* **Frontend:** Next.js 14, React 18, TypeScript (`ilcms.local/`).
* **API:** FastAPI, asyncpg, Python 3.11 (`ilcms.local/api/*`).
* **Auth:** Keycloak 24.0 (Quarkus) (`auth.ilcms.local/`).
* **Database:** PostgreSQL 16 Alpine.
* **Ingress:** Traefik on K3s Kubernetes.

---

## 2. Security & Networking Configuration
* **Plain HTTP Profile:** Keycloak operates with `sslRequired=NONE` and `KC_PROXY_HEADERS=xforwarded` behind Traefik to allow development and internal LAN usage without SSL termination failures.
* **Direct Image Streaming:** Docker images are streamed directly into the K3s containerd namespace via:
  `docker save <image> | sudo k3s ctr images import -`
* **Test Credentials:**
  * Application URL: `http://ilcms.local/`
  * Default User: `lawyer@ilcms.is`
  * Default Password: `password123`
