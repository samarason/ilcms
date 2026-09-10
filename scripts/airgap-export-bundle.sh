#!/usr/bin/env bash
# ==============================================================================
# ILCMS Air-Gap Export Script
# Run this on an INTERNET-CONNECTED machine to prepare the offline bundle.
# Requirements: docker, tar
# ==============================================================================
set -euo pipefail

# Ensure execution always runs from the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo "Working directory: $(pwd)"

# 0. Check Docker daemon availability
if ! docker info >/dev/null 2>&1; then
    echo "ERROR: Docker is not accessible. Please ensure Docker daemon is running"
    echo "and that your user has permissions to run docker commands (e.g. sudo usermod -aG docker \$USER)."
    exit 1
fi

BUNDLE_DIR="./ilcms-airgap-bundle"
mkdir -p "${BUNDLE_DIR}/images"
mkdir -p "${BUNDLE_DIR}/models"

echo "=== [1/4] Pulling Container Images ==="
IMAGES=(
    "ollama/ollama:0.5.7"
    "pgvector/pgvector:pg16"
    "quay.io/keycloak/keycloak:24.0.5"
    "node:20-alpine"
)

for img in "${IMAGES[@]}"; do
    echo "Pulling $img..."
    docker pull "$img"
done

if [ ! -f "package-lock.json" ]; then
    echo "Ensuring package-lock.json exists..."
    npm i --package-lock-only 2>/dev/null || true
fi

echo "Verifying application source files..."
if [ -f "./scripts/restore-lib.sh" ]; then
    chmod +x ./scripts/restore-lib.sh
    ./scripts/restore-lib.sh
fi

REQUIRED_LIBS=(
    "src/lib/store.ts"
    "src/lib/auth.tsx"
    "src/lib/ollama.ts"
    "src/lib/legal-knowledge.ts"
    "src/lib/court-bundle.ts"
    "src/lib/statutory-deadlines.ts"
    "src/lib/deadline-urgency.ts"
)
for lib in "${REQUIRED_LIBS[@]}"; do
    if [ ! -f "$lib" ]; then
        echo "ERROR: Missing required source file: $lib"
        echo "Please ensure all files from src/lib/ are present."
        exit 1
    fi
done

echo "Building ILCMS Web Application Image..."
docker build -t ilcms-web:latest .

echo "=== [2/4] Exporting Images to Tarball ==="
docker save \
    ollama/ollama:0.5.7 \
    pgvector/pgvector:pg16 \
    quay.io/keycloak/keycloak:24.0.5 \
    ilcms-web:latest \
    -o "${BUNDLE_DIR}/images/ilcms-images.tar"

echo "=== [3/4] Pulling and Caching Dedicated Icelandic Legal LLM ==="
# Pull recommended Icelandic models for 20GB RAM laptop:
# 1. gemma2:9b (~5.4 GB) - Excellent Icelandic tokenizer & vocabulary
# 2. nomic-embed-text (~274 MB) - 768-dim vector embeddings for pgvector
echo "Starting temporary Ollama container to download models..."
# Note: We intentionally avoid host port binding (-p 11434:11434) to prevent collisions with local services
TMP_OLLAMA_ID=$(docker run -d -v "${PROJECT_ROOT}/${BUNDLE_DIR}/models:/root/.ollama" ollama/ollama:0.5.7)

cleanup_ollama() {
    echo "Cleaning up temporary Ollama container (${TMP_OLLAMA_ID})..."
    docker stop "${TMP_OLLAMA_ID}" >/dev/null 2>&1 || true
    docker rm "${TMP_OLLAMA_ID}" >/dev/null 2>&1 || true
}
trap cleanup_ollama EXIT

echo "Waiting for Ollama service inside container to initialize..."
for i in {1..30}; do
    if docker exec "$TMP_OLLAMA_ID" ollama list >/dev/null 2>&1; then
        echo "Ollama is ready."
        break
    fi
    sleep 1
done

echo "Pulling Gemma 2 9B (Icelandic instruction-tuned)..."
docker exec "$TMP_OLLAMA_ID" ollama pull gemma2:9b || \
docker exec "$TMP_OLLAMA_ID" ollama pull gemma2:9b-instruct-q4_K_M || \
docker exec "$TMP_OLLAMA_ID" ollama pull mistral:7b || true

echo "Pulling nomic-embed-text for legal document embeddings..."
docker exec "$TMP_OLLAMA_ID" ollama pull nomic-embed-text

echo "Adjusting file permissions on downloaded model artifacts..."
HOST_UID="$(id -u)"
HOST_GID="$(id -g)"
docker exec "$TMP_OLLAMA_ID" chmod -R a+rwX /root/.ollama 2>/dev/null || true
docker exec "$TMP_OLLAMA_ID" chown -R "${HOST_UID}:${HOST_GID}" /root/.ollama 2>/dev/null || true

cleanup_ollama
trap - EXIT

# Fallback permission normalization via helper container in case any file remains root-locked
docker run --rm -v "${PROJECT_ROOT}/${BUNDLE_DIR}:/target" alpine sh -c "chmod -R a+rwX /target && chown -R ${HOST_UID}:${HOST_GID} /target" 2>/dev/null || true

echo "=== [4/4] Copying Manifests and Configurations ==="
rm -rf "${BUNDLE_DIR}/k8s"
cp -r deploy/k8s "${BUNDLE_DIR}/"
rm -rf "${BUNDLE_DIR}/sql"
cp -r sql "${BUNDLE_DIR}/"
cp docker-compose.airgap.yml "${BUNDLE_DIR}/"
cp scripts/airgap-import-laptop.sh "${BUNDLE_DIR}/install.sh"
chmod +x "${BUNDLE_DIR}/install.sh"

echo "=== Packaging Bundle ==="
tar -cvf ilcms-laptop-poc-bundle.tar "${BUNDLE_DIR}"

echo ""
echo "=========================================================================="
echo " SUCCESS! Bundle 'ilcms-laptop-poc-bundle.tar' created successfully."
echo " Size: $(du -sh ilcms-laptop-poc-bundle.tar 2>/dev/null | awk '{print $1}')"
echo " Transfer via encrypted USB drive to the air-gapped Linux laptop."
echo "=========================================================================="
