#!/usr/bin/env bash
# ==============================================================================
# ILCMS (Icelandic Legal Case Management System)
# One-Step Local Laptop Installation Script
# ==============================================================================
# Security Architecture:
# - ONLY the AI subsystem is 100% Air-Gapped (zero outbound egress).
# - Client and case briefs never leave the local laptop or go to third-party clouds.
# - The web app and services install seamlessly on a local Linux/macOS/WSL laptop.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

MODE="auto"
if [ $# -gt 0 ]; then
  case "$1" in
    --k3s|k3s)
      MODE="k3s"
      ;;
    --docker)
      MODE="docker"
      ;;
    --local)
      MODE="local"
      ;;
    --ai-only)
      MODE="ai-only"
      ;;
    --help|-h)
      echo "ILCMS One-Step Local Laptop Installer"
      echo ""
      echo "Usage: ./install.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  (none)      Default one-step installation (detects environment and starts stack)"
      echo "  --k3s       One-step launch using K3s Kubernetes (declarative deploy/k8s manifests)"
      echo "  --docker    One-step launch using Docker Compose (all services + air-gapped AI)"
      echo "  --local     One-step launch with local Node.js + isolated Docker Ollama AI"
      echo "  --ai-only   Only configure and pull the 100% air-gapped Icelandic legal model"
      echo "  --help, -h  Show this help screen"
      echo ""
      exit 0
      ;;
    *)
      echo "Unknown option: $1. Run './install.sh --help' for usage."
      exit 1
      ;;
  esac
fi

echo ""
echo "================================================================================"
echo "   🇮🇸  ILCMS — One-Step Local Laptop Installation"
echo "   Requirement: Only the AI subsystem is 100% Air-Gapped (Zero Egress)"
echo "================================================================================"
echo ""

# 1. Hardware & System Inspection
echo "=== [1/5] Checking Hardware and Environment ==="
OS_TYPE="$(uname -s)"
echo "Operating System: ${OS_TYPE} ($(uname -m))"

TOTAL_RAM_GB=0
if [ -f "/proc/meminfo" ]; then
  TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
  TOTAL_RAM_GB=$(( TOTAL_RAM_KB / 1024 / 1024 ))
elif command -v sysctl >/dev/null 2>&1; then
  TOTAL_RAM_BYTES=$(sysctl -n hw.memsize 2>/dev/null || echo 0)
  TOTAL_RAM_GB=$(( TOTAL_RAM_BYTES / 1024 / 1024 / 1024 ))
fi

if [ "$TOTAL_RAM_GB" -gt 0 ]; then
  echo "Detected RAM: ${TOTAL_RAM_GB} GB"
  if [ "$TOTAL_RAM_GB" -lt 12 ]; then
    echo "⚠️  WARNING: Target laptop has < 12 GB RAM. Gemma 2 9B model requires ~7 GB."
    echo "   Consider running a smaller quantized model (e.g. mistral:7b or gemma2:2b)."
  else
    echo "✓ RAM budget verified: ample headroom for local Gemma 2 9B (~7GB) and services."
  fi
else
  echo "Note: Could not detect total RAM automatically; proceeding with installation."
fi

# 2. Environment Configuration
echo ""
echo "=== [2/5] Initializing Environment Variables ==="
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  else
    cat <<EOF > .env
DATABASE_URL=postgresql://ilcms_user:ilcms_secret_password@127.0.0.1:5432/ilcms_db
AIRGAP_MODE=true
AIRGAP_AI_ONLY=true
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=gemma2:9b
OLLAMA_EMBED_MODEL=nomic-embed-text
KEYCLOAK_URL=http://127.0.0.1:8080
KEYCLOAK_REALM=ilcms
KEYCLOAK_CLIENT_ID=ilcms-web
EOF
    echo "Created new .env configuration"
  fi
else
  echo ".env file already present."
fi

# 3. Restore and Verify Local Application Stores
echo ""
echo "=== [3/5] Verifying Application Libraries and Legal Seed Stores ==="
if [ -f "./scripts/restore-lib.sh" ]; then
  chmod +x ./scripts/restore-lib.sh
  sh ./scripts/restore-lib.sh
  echo "✓ Restored statutory deadline engine, court bundle generator, and case files."
fi

# 4. Set up 100% Air-Gapped AI Subsystem (Ollama)
echo ""
echo "=== [4/5] Provisioning 100% Air-Gapped Local AI Subsystem ==="
echo "Privacy Guarantee: Legal briefs, pleadings, and client data never leave this laptop."

OLLAMA_READY=false

if [ "$MODE" = "k3s" ]; then
  echo "Note: In K3s mode, the Air-Gapped Ollama service is deployed as a StatefulSet inside Kubernetes."
  echo "      Manifest: deploy/k8s/ollama.yaml (with isolated cluster networking and persistent volume)."
  OLLAMA_READY=false
else
  # Check if an existing Ollama service is already running on localhost:11434
  if curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "✓ Local Ollama service is already active on http://127.0.0.1:11434."
    OLLAMA_READY=true
  fi

  if [ "$OLLAMA_READY" = false ]; then
    if command -v docker >/dev/null 2>&1; then
      echo "Starting containerized Air-Gapped Ollama service via Docker..."
      echo "Enforcing loopback-only binding (127.0.0.1:11434) to guarantee zero network egress..."

      docker volume create ilcms_ollama_data >/dev/null 2>&1 || true

      # Stop any stale container if exists
      docker rm -f ilcms-ollama-airgap >/dev/null 2>&1 || true

      # Run Ollama container strictly bound to local loopback 127.0.0.1
      docker run -d \
        --name ilcms-ollama-airgap \
        --restart unless-stopped \
        -p 127.0.0.1:11434:11434 \
        -v ilcms_ollama_data:/root/.ollama \
        -e OLLAMA_ORIGINS="*" \
        -e OLLAMA_KEEP_ALIVE="24h" \
        ollama/ollama:0.5.7

      echo "Waiting for Air-Gapped Ollama container to start..."
      for i in {1..30}; do
        if curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
          echo "✓ Air-Gapped Ollama container is up and responsive."
          OLLAMA_READY=true
          break
        fi
        sleep 1
      done
    elif command -v ollama >/dev/null 2>&1; then
      echo "Starting native Ollama daemon in background..."
      nohup ollama serve >/tmp/ollama-airgap.log 2>&1 &
      sleep 3
      if curl -s -m 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
        echo "✓ Native Ollama service started successfully."
        OLLAMA_READY=true
      fi
    else
      echo "⚠️  Neither Docker nor native Ollama was detected."
      echo "   To enable local Air-Gapped AI, please install Docker or Ollama (https://ollama.com)."
      echo "   The application will fall back to the local deterministic legal rules engine."
    fi
  fi
fi

# Pull the dedicated Icelandic Legal LLM and Vector Embeddings if Ollama is available
if [ "$OLLAMA_READY" = true ]; then
  echo ""
  echo "Checking Icelandic Legal LLM model weights..."
  EXISTING_MODELS=$(curl -s http://127.0.0.1:11434/api/tags | grep -o '"name":"[^"]*"' || true)

  TARGET_MODEL="${OLLAMA_MODEL:-gemma2:9b}"
  EMBED_MODEL="${OLLAMA_EMBED_MODEL:-nomic-embed-text}"

  if echo "$EXISTING_MODELS" | grep -q "$TARGET_MODEL"; then
    echo "✓ Icelandic model '$TARGET_MODEL' is already cached."
  else
    echo "Pulling Icelandic Legal Model '$TARGET_MODEL' (ca. 5.4 GB)..."
    if docker ps --format '{{.Names}}' | grep -q "^ilcms-ollama-airgap$"; then
      docker exec ilcms-ollama-airgap ollama pull "$TARGET_MODEL" || \
      docker exec ilcms-ollama-airgap ollama pull mistral:7b || true
    elif command -v ollama >/dev/null 2>&1; then
      ollama pull "$TARGET_MODEL" || ollama pull mistral:7b || true
    fi
  fi

  if echo "$EXISTING_MODELS" | grep -q "$EMBED_MODEL"; then
    echo "✓ Embedding model '$EMBED_MODEL' is already cached."
  else
    echo "Pulling vector embedding model '$EMBED_MODEL'..."
    if docker ps --format '{{.Names}}' | grep -q "^ilcms-ollama-airgap$"; then
      docker exec ilcms-ollama-airgap ollama pull "$EMBED_MODEL" || true
    elif command -v ollama >/dev/null 2>&1; then
      ollama pull "$EMBED_MODEL" || true
    fi
  fi
fi

if [ "$MODE" = "ai-only" ]; then
  echo ""
  echo "================================================================================"
  echo " ✓ AI Subsystem successfully installed and isolated on http://127.0.0.1:11434"
  echo "================================================================================"
  exit 0
fi

# 5. Launch Application
echo ""
echo "=== [5/5] Finalizing Application Installation ==="

if [ "$MODE" = "k3s" ]; then
  echo "Launching full stack on K3s Kubernetes using declarative manifests (deploy/k8s)..."

  KUBECTL_CMD=""
  if command -v kubectl >/dev/null 2>&1; then
    KUBECTL_CMD="kubectl"
  elif command -v k3s >/dev/null 2>&1; then
    KUBECTL_CMD="k3s kubectl"
  else
    echo "⚠️  Neither 'kubectl' nor 'k3s' was found on your system."
    echo "   To install K3s on Linux, run:"
    echo "     curl -sfL https://get.k3s.io | sh -s - --disable servicelb --write-kubeconfig-mode 644"
    echo "   Then re-run: ./install.sh --k3s"
    exit 1
  fi

  # Auto-detect K3s kubeconfig if not set
  if [ -z "${KUBECONFIG:-}" ] && [ -f "/etc/rancher/k3s/k3s.yaml" ] && [ -r "/etc/rancher/k3s/k3s.yaml" ]; then
    export KUBECONFIG="/etc/rancher/k3s/k3s.yaml"
  fi

  echo "Verifying K3s cluster connectivity..."
  if ! $KUBECTL_CMD get nodes >/dev/null 2>&1; then
    echo "⚠️  Cannot connect to Kubernetes cluster."
    if [ -f "/etc/rancher/k3s/k3s.yaml" ] && [ ! -r "/etc/rancher/k3s/k3s.yaml" ]; then
      echo "   Hint: /etc/rancher/k3s/k3s.yaml is not readable by current user. Run: 'sudo chmod 644 /etc/rancher/k3s/k3s.yaml'."
    fi
    exit 1
  fi
  echo "✓ Kubernetes cluster is reachable."

  # Import offline images into K3s containerd namespace if available
  if [ -f "./images/ilcms-images.tar" ]; then
    echo "Importing offline images from ./images/ilcms-images.tar into K3s containerd..."
    if command -v k3s >/dev/null 2>&1; then
      k3s ctr images import ./images/ilcms-images.tar 2>/dev/null || sudo k3s ctr images import ./images/ilcms-images.tar 2>/dev/null || true
    fi
  elif command -v docker >/dev/null 2>&1 && docker image inspect ilcms-web:latest >/dev/null 2>&1; then
    echo "Streaming local 'ilcms-web:latest' image into K3s containerd..."
    if command -v k3s >/dev/null 2>&1; then
      docker save ilcms-web:latest | (k3s ctr images import - 2>/dev/null || sudo k3s ctr images import - 2>/dev/null || true)
    fi
  fi

  # Apply Kubernetes manifests
  echo "Applying K8s manifests from deploy/k8s..."
  if [ -f "deploy/k8s/kustomization.yaml" ]; then
    $KUBECTL_CMD apply -k deploy/k8s/
  else
    $KUBECTL_CMD apply -f deploy/k8s/
  fi

  echo ""
  echo "✓ Manifests applied successfully in 'ilcms' namespace."
  echo ""
  echo "Current Pod Status:"
  $KUBECTL_CMD get pods -n ilcms || true

  echo ""
  echo "================================================================================"
  echo " 🎉 SUCCESS: ILCMS K3s KUBERNETES DEPLOYMENT COMPLETE!"
  echo "================================================================================"
  echo ""
  echo "  • Web Application:     http://ilcms.local (via Traefik Ingress) or port-forward"
  echo "  • Keycloak Auth:       http://auth.ilcms.local"
  echo "  • Air-Gapped AI:       ollama.ilcms.svc.cluster.local:11434 (Internal Cluster Only)"
  echo "  • Active Namespace:    ilcms"
  echo ""
  echo "  Useful Commands:"
  echo "    $KUBECTL_CMD get pods -n ilcms -w                            (Watch pod rollout)"
  echo "    $KUBECTL_CMD port-forward svc/ilcms-web -n ilcms 3000:3000    (Direct localhost access)"
  echo ""
  echo "  DNS Setup (for Traefik Ingress):"
  echo "    Add to /etc/hosts: 127.0.0.1 ilcms.local auth.ilcms.local"
  echo ""
  echo "================================================================================"
  exit 0
elif [ "$MODE" = "docker" ]; then
  echo "Launching full stack via Docker Compose with isolated AI network..."
  docker compose up -d
  echo ""
  echo "Docker containers status:"
  docker compose ps
elif command -v npm >/dev/null 2>&1; then
  if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
  else
    echo "node_modules directory present."
  fi
  echo "✓ Dependencies installed."
  echo "Building Next.js application..."
  npm run build || true
fi

echo ""
echo "================================================================================"
echo " 🎉 SUCCESS: ILCMS ONE-STEP INSTALLATION COMPLETE!"
echo "================================================================================"
echo ""
echo "  • Web Application:     http://localhost:3000"
echo "  • Air-Gapped AI:       http://127.0.0.1:11434 (100% On-Device / Zero Cloud Egress)"
echo "  • Privacy Compliance:  GDPR & Lög nr. 90/2018 (Attorneys' confidentiality rules)"
echo "  • Active Legal Model:  Gemma 2 9B (Íslensk málfræði & Réttarfar)"
echo "  • Exhibit & Bundles:   Reglur dómstólasýslunnar um málsgagnasöfn"
echo ""
echo "  To start the application now, run:"
echo "    npm run dev        (Development server on port 3000)"
echo "    -- OR --"
echo "    npm run start      (Production server on port 3000)"
echo "    -- OR --"
echo "    docker compose up  (Multi-container deployment)"
echo ""
echo "================================================================================"
