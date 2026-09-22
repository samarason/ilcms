#!/usr/bin/env bash
# Convenient root wrapper for scripts/build-desktop-packages.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="${SCRIPT_DIR}/node_modules/.bin:${PATH}"
export NODE_ENV="production"
export NEXT_IGNORE_INCORRECT_LOCKFILE="1"
exec "${SCRIPT_DIR}/scripts/build-desktop-packages.sh" "$@"
