#!/usr/bin/env bash
# ==============================================================================
# ILCMS Air-Gap Laptop Installer Script
# Run this ON THE AIR-GAPPED LINUX LAPTOP (20GB RAM, 300GB Disk).
# Compatible with both K3s (Kubernetes) and Docker Compose.
# ==============================================================================
set -euo pipefail

DEPLOY_MODE="${1:-k3s}" # Options: 'k3s' or 'compose'

echo "======================================================"
echo "   ILCMS Air-Gapped Setup on Linux Laptop (POC)"
echo "   Mode: $DEPLOY_MODE"
echo "======================================================"

# Check RAM and Disk
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$(( TOTAL_RAM_KB / 1024 / 1024 ))
echo "Detected RAM: ${TOTAL_RAM_GB} GB (Minimum recommended: 16 GB, optimal: 20 GB)"

if [ "$DEPLOY_MODE" == "k3s" ]; then
    echo "=== [1/3] Loading Images into K3s containerd ==="
    if command -v k3s &> /dev/null; then
        sudo k3s ctr images import ./images/ilcms-images.tar
    else
        echo "K3s not found. If using Docker, run: ./install.sh compose"
        exit 1
    fi

    echo "=== [2/3] Preparing Persistent Volume for Ollama Models ==="
    # Ensure local directory or PVC backing exists
    sudo mkdir -p /var/lib/ilcms/ollama-models
    sudo cp -rn ./models/* /var/lib/ilcms/ollama-models/ || true
    sudo chmod -R 777 /var/lib/ilcms/ollama-models

    echo "=== [3/3] Deploying ILCMS Stack into 'ilcms' Namespace ==="
    kubectl apply -f ./k8s/namespace.yaml
    kubectl apply -f ./k8s/postgres-pgvector.yaml
    kubectl apply -f ./k8s/keycloak.yaml
    kubectl apply -f ./k8s/ollama.yaml
    kubectl apply -f ./k8s/app.yaml

    echo "Waiting for pods in 'ilcms' namespace..."
    kubectl wait --namespace ilcms --for=condition=ready pod --selector=app=postgres --timeout=90s || true
    kubectl wait --namespace ilcms --for=condition=ready pod --selector=app=keycloak --timeout=120s || true
    kubectl get pods -n ilcms

    echo ""
    echo "======================================================"
    echo "   ILCMS K3s Deployment Succeeded!"
    echo "======================================================"
    echo "Web Application:   http://ilcms.local (or http://localhost:3000)"
    echo "Keycloak OIDC:     http://ilcms.local/admin (or http://localhost:8080)"
    echo "                   Admin: admin / admin_secret_ilcms"
    echo "                   Demo Lawyer: lawyer@ilcms.is / ilcms_password_2026"
    echo "Ollama AI Server:  http://localhost:11434"
    echo "Active Model:      Gemma 2 9B (Icelandic Legal Fine-Tune)"
    echo "======================================================"

elif [ "$DEPLOY_MODE" == "compose" ]; then
    echo "=== [1/3] Loading Images into Docker Engine ==="
    docker load -i ./images/ilcms-images.tar

    echo "=== [2/3] Seeding Ollama Model Cache Volume ==="
    docker volume create ilcms_ollama_data || true
    # Copy models into named volume via helper container
    docker run --rm -v ilcms_ollama_data:/root/.ollama -v "$(pwd)/models:/source_models:ro" alpine sh -c "cp -rn /source_models/* /root/.ollama/"

    echo "=== [3/3] Launching ILCMS Stack via Docker Compose ==="
    docker compose -f docker-compose.airgap.yml up -d

    echo "Services started! Verify status:"
    docker compose -f docker-compose.airgap.yml ps
    echo ""
    echo "======================================================"
    echo "Access ILCMS at:   http://localhost:3000"
    echo "Keycloak OIDC at:  http://localhost:8080 (Admin: admin / admin_secret_ilcms)"
    echo "Access Ollama at:  http://localhost:11434"
    echo "Active Model:      Gemma 2 9B (Icelandic Legal Fine-Tune)"
    echo "======================================================"
fi
