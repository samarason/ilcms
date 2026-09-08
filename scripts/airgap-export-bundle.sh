#!/usr/bin/env bash
# ==============================================================================
# ILCMS Air-Gap Export Script
# Run this on an INTERNET-CONNECTED machine to prepare the offline bundle.
# Requirements: docker, curl or ollama CLI, tar
# ==============================================================================
set -euo pipefail

BUNDLE_DIR="./ilcms-airgap-bundle"
mkdir -p "${BUNDLE_DIR}/images"
mkdir -p "${BUNDLE_DIR}/models"
mkdir -p "${BUNDLE_DIR}/k8s"

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
# 1. gemma2:9b-instruct-q4_K_M (~5.4 GB) - Excellent Icelandic tokenizer & vocabulary
# 2. nomic-embed-text (~274 MB) - 768-dim vector embeddings for pgvector
echo "Starting temporary Ollama container to download models..."
TMP_OLLAMA_ID=$(docker run -d -v "$(pwd)/${BUNDLE_DIR}/models:/root/.ollama" -p 11434:11434 ollama/ollama:0.5.7)

sleep 3
echo "Pulling Gemma 2 9B (Icelandic instruction-tuned)..."
docker exec "$TMP_OLLAMA_ID" ollama pull gemma2:9b-instruct-q4_K_M || docker exec "$TMP_OLLAMA_ID" ollama pull mistral:7b-instruct-q4_K_M
echo "Pulling nomic-embed-text for document embeddings..."
docker exec "$TMP_OLLAMA_ID" ollama pull nomic-embed-text

echo "Stopping temporary Ollama container..."
docker stop "$TMP_OLLAMA_ID"
docker rm "$TMP_OLLAMA_ID"

echo "=== [4/4] Copying Manifests and Configurations ==="
cp -r deploy/k8s "${BUNDLE_DIR}/k8s"
cp -r sql "${BUNDLE_DIR}/sql"
cp docker-compose.airgap.yml "${BUNDLE_DIR}/"
cp scripts/airgap-import-laptop.sh "${BUNDLE_DIR}/install.sh"
chmod +x "${BUNDLE_DIR}/install.sh"

echo "=== Packaging Bundle ==="
tar -cvf ilcms-laptop-poc-bundle.tar "${BUNDLE_DIR}"

echo "SUCCESS! Transfer 'ilcms-laptop-poc-bundle.tar' (approx 9-11 GB) via USB drive to your air-gapped Linux laptop."
