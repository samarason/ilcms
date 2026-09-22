#!/usr/bin/env bash
# Convenient root wrapper for scripts/build-desktop-packages.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="${SCRIPT_DIR}/node_modules/.bin:${PATH}"
exec "${SCRIPT_DIR}/scripts/build-desktop-packages.sh" "$@"
