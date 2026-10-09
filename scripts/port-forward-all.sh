#!/usr/bin/env bash
# ==============================================================================
# ILCMS — Forward All Service Ports to Localhost
# ==============================================================================
# Use this script when accessing a remote K3s cluster or VM where only port 3000
# was previously forwarded. This script forwards all ports concurrently:
#   - 3000:  ILCMS Web Application
#   - 3080:  Open WebUI (Browser AI Interface)
#   - 8080:  Keycloak OIDC IAM Server
#   - 11434: Ollama Air-Gapped AI Engine
# ==============================================================================

set -euo pipefail

NAMESPACE="${K8S_NAMESPACE:-ilcms}"

KUBECTL_CMD=""
if command -v kubectl >/dev/null 2>&1; then
  KUBECTL_CMD="kubectl"
elif command -v k3s >/dev/null 2>&1; then
  KUBECTL_CMD="k3s kubectl"
else
  echo "Error: Neither 'kubectl' nor 'k3s' was found."
  exit 1
fi

echo "================================================================================"
echo " 🇮🇸 ILCMS — Forwarding All Ports from Namespace '${NAMESPACE}' to Localhost"
echo "================================================================================"
echo ""

# Trap to kill background port-forwards on Ctrl+C
cleanup() {
  echo ""
  echo "Stopping all port forwards..."
  kill $(jobs -p) 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting port-forwards in background:"
echo "  • Web Application:  http://127.0.0.1:3000"
$KUBECTL_CMD port-forward svc/ilcms-web -n "$NAMESPACE" 3000:3000 >/dev/null 2>&1 &

echo "  • Open WebUI:       http://127.0.0.1:3080 (or inside Web App at :3000/open-webui)"
$KUBECTL_CMD port-forward svc/open-webui -n "$NAMESPACE" 3080:8080 >/dev/null 2>&1 &

echo "  • Keycloak IAM:     http://127.0.0.1:8080 (or via :3000/realms/ilcms)"
$KUBECTL_CMD port-forward svc/keycloak -n "$NAMESPACE" 8080:8080 >/dev/null 2>&1 &

echo "  • Ollama AI:        http://127.0.0.1:11434 (or via :3000/api/v1/ollama/)"
$KUBECTL_CMD port-forward svc/ollama -n "$NAMESPACE" 11434:11434 >/dev/null 2>&1 &

echo ""
echo "✓ All ports are now listening on 127.0.0.1!"
echo "Press Ctrl+C to terminate all port-forwards."
echo ""

wait
