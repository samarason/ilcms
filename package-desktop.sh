#!/usr/bin/env bash
# Convenient root wrapper for scripts/build-desktop-packages.sh
exec "$(dirname "$0")/scripts/build-desktop-packages.sh" "$@"
