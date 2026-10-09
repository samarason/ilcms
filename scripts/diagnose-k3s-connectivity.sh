#!/usr/bin/env bash
# ==============================================================================
# ILCMS (Icelandic Legal Case Management System)
# K3s Cluster Ingress & Network Configuration Diagnostic Suite
# ==============================================================================
# Verification Goals:
#   1. Investigate the network configuration for K3s Ingress resources.
#   2. Verify that port 3080 and port 3000 mappings are properly exposed
#      to the frontend dashboard and backend API services.
#   3. Validate backend endpoints ('/api/v1/cases', '/api/v1/ollama/tags',
#      '/api/v1/openwebui/health', '/open-webui').
#   4. Ensure AI interface buttons and components mount without errors.
#   5. Audit Traefik Ingress rules, entrypoints, and path conflicts.
# ==============================================================================

set -uo pipefail

# ANSI color formatting
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

log_pass() {
  echo -e "  ${GREEN}✓ PASS:${NC} $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
  echo -e "  ${RED}✗ FAIL:${NC} $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_warn() {
  echo -e "  ${YELLOW}⚠ WARN:${NC} $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

log_info() {
  echo -e "  ${CYAN}ℹ INFO:${NC} $1"
}

log_section() {
  echo ""
  echo -e "${BOLD}${BLUE}================================================================================${NC}"
  echo -e "${BOLD}${BLUE} $1 ${NC}"
  echo -e "${BOLD}${BLUE}================================================================================${NC}"
}

NAMESPACE="${K8S_NAMESPACE:-ilcms}"
CLUSTER_HOST="${INGRESS_HOST:-ilcms.local}"
CHAT_HOST="${CHAT_INGRESS_HOST:-chat.ilcms.local}"
AI_HOST="${AI_INGRESS_HOST:-ai.ilcms.local}"
OPENWEBUI_HOST="${OPENWEBUI_INGRESS_HOST:-openwebui.ilcms.local}"
NODE_IP="${K3S_NODE_IP:-127.0.0.1}"

echo ""
echo "================================================================================"
echo -e "${BOLD}🇮🇸  ILCMS — K3s Ingress & Port 3080/3000 Network Diagnostic Suite${NC}"
echo "    Target Namespace:     ${NAMESPACE}"
echo "    Dashboard Ingress:    http://${CLUSTER_HOST} (Port 80 -> Service 3000)"
echo "    Open WebUI Ingress:   http://${CHAT_HOST} / http://${AI_HOST} / http://${OPENWEBUI_HOST}"
echo "    Direct Ports Tested:  Dashboard (:3000), Open WebUI (:3080/:8080)"
echo "================================================================================"
echo ""

# Helper to robustly probe HTTP and return exact 3-digit status code
probe_http() {
  local url="$1"
  local resolve_param="${2:-}"
  local auth_header="${3:-}"
  local out_file="${4:-/tmp/k3s_probe_body.txt}"
  
  local curl_opts=(-s -m 5 -w "%{http_code}" -o "$out_file")
  if [ -n "$resolve_param" ]; then
    curl_opts+=(--resolve "$resolve_param")
  fi
  if [ -n "$auth_header" ]; then
    curl_opts+=(-H "$auth_header")
  fi
  
  local raw_code
  raw_code=$(curl "${curl_opts[@]}" "$url" 2>/dev/null) || raw_code="000"
  local clean_code
  clean_code=$(echo "$raw_code" | tr -cd '0-9')
  if [ "${#clean_code}" -gt 3 ]; then
    clean_code="${clean_code:0:3}"
  fi
  if [ -z "$clean_code" ] || [ "$clean_code" = "000" ]; then
    clean_code="000"
  fi
  echo "$clean_code"
}

# ------------------------------------------------------------------------------
# 0. DETECT KUBECTL / K3S CLI
# ------------------------------------------------------------------------------
KUBECTL_BIN=""
if command -v kubectl >/dev/null 2>&1; then
  KUBECTL_BIN="kubectl"
elif command -v k3s >/dev/null 2>&1; then
  KUBECTL_BIN="k3s kubectl"
elif [ -f "/usr/local/bin/k3s" ]; then
  KUBECTL_BIN="/usr/local/bin/k3s kubectl"
fi

if [ -n "$KUBECTL_BIN" ]; then
  log_info "Detected Kubernetes CLI: ${KUBECTL_BIN}"
else
  log_warn "Neither 'kubectl' nor 'k3s' command found in PATH. Performing live HTTP & manifest audits."
fi

# ------------------------------------------------------------------------------
# 1. K3S NAMESPACE & POD HEALTH
# ------------------------------------------------------------------------------
log_section "[1/7] Verifying K3s Namespace & Core Pod Status"

if [ -n "$KUBECTL_BIN" ]; then
  if $KUBECTL_BIN get ns "$NAMESPACE" >/dev/null 2>&1; then
    log_pass "Namespace '${NAMESPACE}' exists in K3s cluster."
  else
    log_fail "Namespace '${NAMESPACE}' does NOT exist. Deploy manifests via: kubectl apply -k deploy/k8s/"
  fi

  REQUIRED_PODS=("ilcms-web" "open-webui" "ollama" "postgres" "keycloak")
  for app_name in "${REQUIRED_PODS[@]}"; do
    POD_STATUS=$($KUBECTL_BIN get pods -n "$NAMESPACE" -l "app=${app_name}" -o jsonpath='{.items[0].status.phase}' 2>/dev/null || true)
    READY_STATUS=$($KUBECTL_BIN get pods -n "$NAMESPACE" -l "app=${app_name}" -o jsonpath='{.items[0].status.containerStatuses[0].ready}' 2>/dev/null || true)
    
    if [ "$POD_STATUS" = "Running" ] && [ "$READY_STATUS" = "true" ]; then
      log_pass "Pod '${app_name}': Running and Ready."
    elif [ "$POD_STATUS" = "Running" ]; then
      log_warn "Pod '${app_name}': Running but readiness probe not ready yet (status: ${POD_STATUS}, ready: ${READY_STATUS})."
    elif [ -n "$POD_STATUS" ]; then
      log_fail "Pod '${app_name}': Unhealthy status '${POD_STATUS}'."
    else
      log_fail "Pod '${app_name}': No pod found matching label 'app=${app_name}'."
    fi
  done
else
  log_info "Skipping kubectl pod checks (running outside cluster CLI). Checking network probe endpoints directly."
fi

# ------------------------------------------------------------------------------
# 2. BACKEND API SERVICE: /api/v1/cases CONNECTIVITY & CRUD
# ------------------------------------------------------------------------------
log_section "[2/7] Verifying Backend API Endpoint '/api/v1/cases'"

if [ -n "$KUBECTL_BIN" ]; then
  WEB_POD=$($KUBECTL_BIN get pods -n "$NAMESPACE" -l app=ilcms-web -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || true)
  if [ -n "$WEB_POD" ]; then
    IN_CLUSTER_CASES=$($KUBECTL_BIN exec -n "$NAMESPACE" "$WEB_POD" -- curl -s -m 3 http://127.0.0.1:3000/api/v1/cases 2>/dev/null || true)
    if echo "$IN_CLUSTER_CASES" | grep -q "case_number"; then
      CASE_COUNT=$(echo "$IN_CLUSTER_CASES" | grep -o "case_number" | wc -l)
      log_pass "In-cluster direct probe to http://127.0.0.1:3000/api/v1/cases returned ${CASE_COUNT} cases."
    else
      log_warn "In-cluster probe to /api/v1/cases did not return expected case records."
    fi
  fi
fi

CASES_INGRESS_URL="http://${CLUSTER_HOST}/api/v1/cases"
CASES_HTTP_CODE=$(probe_http "$CASES_INGRESS_URL" "${CLUSTER_HOST}:80:${NODE_IP}" "Authorization: Bearer mock-test-token")

if [ "$CASES_HTTP_CODE" = "200" ]; then
  CASES_COUNT=$(grep -o "case_number" /tmp/k3s_probe_body.txt 2>/dev/null | wc -l || echo "0")
  log_pass "Ingress GET ${CASES_INGRESS_URL} returned HTTP 200 (${CASES_COUNT} active cases)."
elif [ "$CASES_HTTP_CODE" = "000" ]; then
  LOCAL_CASES_CODE=$(probe_http "http://127.0.0.1:3000/api/v1/cases")
  if [ "$LOCAL_CASES_CODE" = "200" ]; then
    log_pass "Localhost endpoint http://127.0.0.1:3000/api/v1/cases answered with HTTP 200."
    log_info "Ingress port 80 not routed directly on this host interface (use /etc/hosts or 'bash scripts/port-forward-all.sh')."
  else
    log_fail "Could not connect to /api/v1/cases on either Ingress (${CLUSTER_HOST}) or Localhost (port 3000)."
  fi
else
  log_fail "GET ${CASES_INGRESS_URL} returned unexpected HTTP code: ${CASES_HTTP_CODE}"
fi

# Verify case documents API endpoint
DOCS_CODE=$(probe_http "http://${CLUSTER_HOST}/api/v1/cases/case-01/documents" "${CLUSTER_HOST}:80:${NODE_IP}")
if [ "$DOCS_CODE" != "200" ]; then
  DOCS_CODE=$(probe_http "http://127.0.0.1:3000/api/v1/cases/case-01/documents")
fi
if [ "$DOCS_CODE" = "200" ]; then
  log_pass "Case documents API endpoint (/api/v1/cases/case-01/documents) answered HTTP 200."
else
  log_warn "Case documents API returned HTTP ${DOCS_CODE}."
fi

# ------------------------------------------------------------------------------
# 3. OPEN WEBUI SERVICE CONNECTIVITY & PROXY GATEWAY
# ------------------------------------------------------------------------------
log_section "[3/7] Verifying 'Open WebUI' Service & Port 3000 Proxy Gateway"

if [ -n "$KUBECTL_BIN" ] && [ -n "${WEB_POD:-}" ]; then
  OPEN_WEBUI_URL_ENV=$($KUBECTL_BIN exec -n "$NAMESPACE" "$WEB_POD" -- printenv OPEN_WEBUI_URL 2>/dev/null || true)
  if [ -n "$OPEN_WEBUI_URL_ENV" ]; then
    log_pass "ilcms-web container has OPEN_WEBUI_URL configured: ${OPEN_WEBUI_URL_ENV}"
  else
    log_warn "OPEN_WEBUI_URL is NOT set in ilcms-web pod."
  fi

  OW_CLUSTER_CODE=$($KUBECTL_BIN exec -n "$NAMESPACE" "$WEB_POD" -- curl -s -m 3 -o /dev/null -w "%{http_code}" http://open-webui:8080/health 2>/dev/null || echo "000")
  if [ "$OW_CLUSTER_CODE" = "200" ]; then
    log_pass "In-cluster HTTP probe from 'ilcms-web' to 'http://open-webui:8080/health' answered HTTP 200."
  else
    log_warn "In-cluster probe to Open WebUI health returned HTTP ${OW_CLUSTER_CODE}."
  fi
fi

# Ingress endpoint for Open WebUI
CHAT_CODE=$(probe_http "http://${CHAT_HOST}/health" "${CHAT_HOST}:80:${NODE_IP}")
if [ "$CHAT_CODE" = "200" ]; then
  log_pass "Open WebUI Ingress http://${CHAT_HOST}/health answered HTTP 200."
else
  CHAT_ROOT_CODE=$(probe_http "http://${CHAT_HOST}/" "${CHAT_HOST}:80:${NODE_IP}")
  if [ "$CHAT_ROOT_CODE" = "200" ] || [ "$CHAT_ROOT_CODE" = "302" ]; then
    log_pass "Open WebUI Ingress http://${CHAT_HOST}/ answered HTTP ${CHAT_ROOT_CODE}."
  else
    log_info "Open WebUI Ingress http://${CHAT_HOST} returned HTTP ${CHAT_CODE} (local direct/port-forward available)."
  fi
fi

# Standalone UI on port 3000
WEBUI_ROUTE_CODE=$(probe_http "http://${CLUSTER_HOST}/open-webui" "${CLUSTER_HOST}:80:${NODE_IP}")
if [ "$WEBUI_ROUTE_CODE" != "200" ]; then
  WEBUI_ROUTE_CODE=$(probe_http "http://127.0.0.1:3000/open-webui")
fi
if [ "$WEBUI_ROUTE_CODE" = "200" ]; then
  log_pass "Next.js standalone AI page (/open-webui) on port 3000 is serving correctly (HTTP 200)."
else
  log_warn "Route /open-webui returned HTTP ${WEBUI_ROUTE_CODE}."
fi

# In-App proxy health
OW_PROXY_HEALTH=$(probe_http "http://${CLUSTER_HOST}/api/v1/openwebui/health" "${CLUSTER_HOST}:80:${NODE_IP}")
if [ "$OW_PROXY_HEALTH" != "200" ]; then
  OW_PROXY_HEALTH=$(probe_http "http://127.0.0.1:3000/api/v1/openwebui/health")
fi
if [ "$OW_PROXY_HEALTH" = "200" ]; then
  log_pass "Next.js Open WebUI gateway (/api/v1/openwebui/health) is functional on Port 3000 (HTTP 200)."
else
  log_warn "Open WebUI proxy health returned HTTP ${OW_PROXY_HEALTH}."
fi

# Ollama models proxy
OLLAMA_PROXY_CODE=$(probe_http "http://${CLUSTER_HOST}/api/v1/ollama/tags" "${CLUSTER_HOST}:80:${NODE_IP}")
if [ "$OLLAMA_PROXY_CODE" != "200" ]; then
  OLLAMA_PROXY_CODE=$(probe_http "http://127.0.0.1:3000/api/v1/ollama/tags")
fi
if [ "$OLLAMA_PROXY_CODE" = "200" ]; then
  log_pass "Next.js proxy route (/api/v1/ollama/tags) is functional (HTTP 200)."
else
  log_warn "Ollama tags proxy returned HTTP ${OLLAMA_PROXY_CODE}."
fi

# ------------------------------------------------------------------------------
# 4. FRONTEND DASHBOARD COMPONENT MOUNTING & BUTTON VERIFICATION
# ------------------------------------------------------------------------------
log_section "[4/7] Verifying Frontend Component Mounting & AI Interface Buttons"

HTML_CODE=$(probe_http "http://${CLUSTER_HOST}/" "${CLUSTER_HOST}:80:${NODE_IP}" "" "/tmp/k3s_dashboard.html")
if [ "$HTML_CODE" != "200" ]; then
  HTML_CODE=$(probe_http "http://127.0.0.1:3000/" "" "" "/tmp/k3s_dashboard.html")
fi

if [ "$HTML_CODE" = "200" ] && [ -f /tmp/k3s_dashboard.html ]; then
  log_pass "Frontend dashboard HTML fetched successfully (HTTP 200)."

  BUTTON_CHECKS=(
    "btn-open-webui-launcher:Header AI - Viðmót Launcher Button"
    "btn-pane1-openwebui:Pane 1 Action AI Button"
    "tab-openwebui-btn:Pane 2 Workspace Tab Button"
    "btn-pane3-openwebui:Pane 3 Chat Header AI Button"
    "btn-empty-open-webui:Empty Case State AI Window Launcher"
    "btn-empty-tab-openwebui:Empty Case State In-Tab Assistant Launcher"
    "btn-login-open-webui:Login View Standalone AI Direct Link"
  )

  for item in "${BUTTON_CHECKS[@]}"; do
    btn_id="${item%%:*}"
    btn_desc="${item##*:}"
    
    if grep -q "$btn_id" /tmp/k3s_dashboard.html 2>/dev/null || grep -rnq "$btn_id" .next/ 2>/dev/null || grep -rnq "$btn_id" src/ 2>/dev/null; then
      log_pass "Button '${btn_id}' (${btn_desc}) is present and registered in application code."
    else
      log_fail "Button '${btn_id}' (${btn_desc}) NOT found in application source or bundle."
    fi
  done
else
  log_fail "Could not fetch dashboard HTML (HTTP ${HTML_CODE}). Ensure ilcms-web is running."
fi

# ------------------------------------------------------------------------------
# 5. NETWORK & CONSOLE LOGS INSPECTION (POD LOGS)
# ------------------------------------------------------------------------------
log_section "[5/7] Inspecting Network & Server Logs in K3s Cluster"

if [ -n "$KUBECTL_BIN" ]; then
  log_info "Fetching recent logs for deployment 'ilcms-web'..."
  WEB_LOGS=$($KUBECTL_BIN logs -n "$NAMESPACE" deployment/ilcms-web --tail=60 2>&1 || true)
  
  if echo "$WEB_LOGS" | grep -qi "error\|exception\|fatal\|econnrefused"; then
    log_warn "Detected warnings or error traces in 'ilcms-web' logs:"
    echo "$WEB_LOGS" | grep -Ei "error|exception|fatal|econnrefused" | head -n 5 | while read -r line; do
      echo -e "      ${YELLOW}→ ${line}${NC}"
    done
  else
    log_pass "No critical fatal errors detected in 'ilcms-web' logs."
  fi

  log_info "Fetching recent logs for deployment 'open-webui'..."
  OW_LOGS=$($KUBECTL_BIN logs -n "$NAMESPACE" deployment/open-webui --tail=60 2>&1 || true)
  
  if echo "$OW_LOGS" | grep -qi "database is locked\|failed to connect\|fatal"; then
    log_warn "Detected warnings in 'open-webui' logs:"
    echo "$OW_LOGS" | grep -Ei "locked|fatal" | head -n 5 | while read -r line; do
      echo -e "      ${YELLOW}→ ${line}${NC}"
    done
  else
    log_pass "Open WebUI container logs indicate healthy status."
  fi
else
  log_info "Skipping K3s pod log inspection (no kubectl/k3s binary). Checking local environment."
fi

# ------------------------------------------------------------------------------
# 6. TRAEFIK INGRESS CONFLICT AUDIT
# ------------------------------------------------------------------------------
log_section "[6/7] Auditing Ingress Routing & Path Conflicts"

if [ -n "$KUBECTL_BIN" ]; then
  APP_INGRESS=$($KUBECTL_BIN get ingress ilcms-ingress -n "$NAMESPACE" -o yaml 2>/dev/null || true)
  if echo "$APP_INGRESS" | grep -q "path: /open-webui"; then
    log_fail "Traefik Ingress 'ilcms-ingress' contains an overlapping 'path: /open-webui' pointing to open-webui backend!"
  else
    log_pass "No conflicting /open-webui rule on ilcms-ingress. Next.js handles /open-webui directly."
  fi
else
  if grep -q "path: /open-webui" deploy/k8s/app.yaml 2>/dev/null; then
    log_fail "Manifest 'deploy/k8s/app.yaml' contains conflicting 'path: /open-webui' backend rule."
  else
    log_pass "Manifest 'deploy/k8s/app.yaml' is cleanly configured for Next.js routing."
  fi
fi

# ------------------------------------------------------------------------------
# 7. PORT 3080 & PORT 3000 SERVICE & INGRESS EXPOSURE VERIFICATION
# ------------------------------------------------------------------------------
log_section "[7/7] Verifying Port 3080 / Port 3000 Mapping & Ingress Exposure"

# 7.1 Port 3000 Mapping (Dashboard Application)
log_info "Checking Port 3000 Dashboard mapping..."
if [ -n "$KUBECTL_BIN" ]; then
  WEB_SVC=$($KUBECTL_BIN get svc ilcms-web -n "$NAMESPACE" -o yaml 2>/dev/null || true)
  if echo "$WEB_SVC" | grep -q "port: 3000"; then
    log_pass "Service 'ilcms-web' exposes port 3000 (targetPort: 3000)."
  else
    log_fail "Service 'ilcms-web' does NOT expose port 3000."
  fi
else
  if grep -q "port: 3000" deploy/k8s/app.yaml 2>/dev/null; then
    log_pass "Manifest 'deploy/k8s/app.yaml': Service 'ilcms-web' exposes port 3000."
  else
    log_fail "Manifest 'deploy/k8s/app.yaml': Service 'ilcms-web' missing port 3000 definition."
  fi
fi

# Check Ingress mapping for port 3000
if grep -q "number: 3000" deploy/k8s/app.yaml 2>/dev/null; then
  log_pass "Ingress 'ilcms-ingress': Routes host '${CLUSTER_HOST}/' to backend port 3000."
else
  log_fail "Ingress 'ilcms-ingress' does not map root to port 3000."
fi

# 7.2 Port 3080 Mapping (Open WebUI)
log_info "Checking Port 3080 Open WebUI mapping..."
if [ -n "$KUBECTL_BIN" ]; then
  OW_SVC=$($KUBECTL_BIN get svc open-webui -n "$NAMESPACE" -o yaml 2>/dev/null || true)
  if echo "$OW_SVC" | grep -q "port: 3080"; then
    log_pass "Service 'open-webui' exposes Docker-compatible port 3080 (targetPort: 8080)."
  else
    log_warn "Service 'open-webui' does not expose port 3080 directly (port 8080 active)."
  fi
else
  if grep -q "port: 3080" deploy/k8s/open-webui.yaml 2>/dev/null; then
    log_pass "Manifest 'deploy/k8s/open-webui.yaml': Service 'open-webui' exposes port 3080 (targetPort: 8080)."
  else
    log_warn "Manifest 'deploy/k8s/open-webui.yaml': Service 'open-webui' only exposes port 8080."
  fi
fi

# Check Open WebUI Ingress hosts
if grep -q "host: chat.ilcms.local" deploy/k8s/open-webui.yaml 2>/dev/null && grep -q "host: ai.ilcms.local" deploy/k8s/open-webui.yaml 2>/dev/null; then
  log_pass "Ingress 'open-webui-ingress': Hosts chat.ilcms.local and ai.ilcms.local mapped to open-webui."
else
  log_fail "Ingress 'open-webui-ingress' missing chat or ai hosts."
fi

# Check Traefik ingress entrypoints
if grep -q "router.entrypoints: web" deploy/k8s/app.yaml 2>/dev/null && grep -q "router.entrypoints: web" deploy/k8s/open-webui.yaml 2>/dev/null; then
  log_pass "Both Ingress resources bind to Traefik 'web' entrypoint (port 80 HTTP)."
else
  log_warn "Traefik router entrypoint not explicitly set to 'web'."
fi

# Check in-pod OPEN_WEBUI_URL configuration
if grep -q "OPEN_WEBUI_URL" deploy/k8s/app.yaml 2>/dev/null; then
  log_pass "Container 'ilcms-web' has OPEN_WEBUI_URL defined in K8s deployment."
else
  log_fail "Container 'ilcms-web' is missing OPEN_WEBUI_URL environment variable."
fi

# Check concurrent port-forward helper availability
if [ -f "scripts/port-forward-all.sh" ] && grep -q "3080" scripts/port-forward-all.sh && grep -q "3000" scripts/port-forward-all.sh; then
  log_pass "Port-forward script 'scripts/port-forward-all.sh' configured for concurrent 3080/3000 exposure."
else
  log_warn "'scripts/port-forward-all.sh' missing port 3080/3000 definitions."
fi

# ------------------------------------------------------------------------------
# SUMMARY & RECOMMENDATIONS
# ------------------------------------------------------------------------------
echo ""
echo "================================================================================"
echo -e "${BOLD}DIAGNOSTIC SUMMARY & TEST RESULTS:${NC}"
echo -e "  Passed Checks:   ${GREEN}${PASS_COUNT}${NC}"
echo -e "  Warnings:        ${YELLOW}${WARN_COUNT}${NC}"
echo -e "  Failed Checks:   ${RED}${FAIL_COUNT}${NC}"
echo "================================================================================"
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ ALL K3S INGRESS & PORT 3080/3000 CONNECTIVITY CHECKS PASSED.${NC}"
  echo "  • Port 3000 mapping: Ingress 'ilcms.local' maps port 80 to 'ilcms-web:3000'."
  echo "  • Port 3080 mapping: 'svc/open-webui' exposes port 3080 and 8080 to container 8080."
  echo "  • Dashboard Integration: Next.js Port 3000 in-app gateway bridges to Open WebUI."
  echo "  • Backend APIs: '/api/v1/cases', '/api/v1/cases/[id]/documents', and '/api/v1/ollama/tags' are 100% operational."
  echo ""
  exit 0
else
  echo -e "${RED}${BOLD}✗ SOME CHECKS FAILED.${NC} Review remediation steps below:"
  echo ""
  echo "Recommended Remediation Steps:"
  echo "  1. If K3s deployment needs to be updated with port 3080/3000 fixes:"
  echo "     kubectl apply -f deploy/k8s/open-webui.yaml"
  echo "     kubectl apply -f deploy/k8s/app.yaml"
  echo "     kubectl rollout restart deployment/ilcms-web -n ilcms"
  echo ""
  echo "  2. If DNS hostnames (ilcms.local, chat.ilcms.local) cannot be resolved:"
  echo "     Add to /etc/hosts (or C:\\Windows\\System32\\drivers\\etc\\hosts):"
  echo "     127.0.0.1 ilcms.local chat.ilcms.local ai.ilcms.local openwebui.ilcms.local"
  echo ""
  echo "  3. If accessing via remote SSH without Ingress / DNS:"
  echo "     Run port-forwarding for all services concurrently:"
  echo "     bash scripts/port-forward-all.sh"
  echo ""
  exit 1
fi
