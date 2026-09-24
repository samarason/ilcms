#!/usr/bin/env bash
# Convenient root wrapper for scripts/build-desktop-packages.sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export PATH="${SCRIPT_DIR}/node_modules/.bin:${PATH}"
# Ensure dependencies are installed before building
if [ ! -d "${SCRIPT_DIR}/node_modules/next" ] || [ ! -e "${SCRIPT_DIR}/node_modules/.bin/next" ]; then
  echo "================================================================================"
  echo "   📦 Dependencies not found in node_modules. Installing via npm..."
  echo "================================================================================"
  if command -v npm >/dev/null 2>&1; then
    npm install --include=dev --legacy-peer-deps || npm install --include=dev
  elif command -v bun >/dev/null 2>&1; then
    bun install
  elif command -v pnpm >/dev/null 2>&1; then
    pnpm install
  elif command -v yarn >/dev/null 2>&1; then
    yarn install
  else
    echo "Error: Next.js dependencies are missing and neither npm, bun, pnpm, nor yarn was found."
    echo "Please run 'npm install' manually and try again."
    exit 1
  fi
fi

export NODE_ENV="production"
export NEXT_IGNORE_INCORRECT_LOCKFILE="1"

# Ensure next binary is executable and symlinked if missing
if [ -f "${SCRIPT_DIR}/node_modules/next/dist/bin/next" ]; then
  mkdir -p "${SCRIPT_DIR}/node_modules/.bin"
  if [ ! -e "${SCRIPT_DIR}/node_modules/.bin/next" ]; then
    ln -sf "../next/dist/bin/next" "${SCRIPT_DIR}/node_modules/.bin/next"
  fi
  chmod +x "${SCRIPT_DIR}/node_modules/next/dist/bin/next" "${SCRIPT_DIR}/node_modules/.bin/next" 2>/dev/null || true
fi

# Ensure global PATH has a fallback if /usr/local/bin is writable
if [ -w "/usr/local/bin" ] && [ ! -e "/usr/local/bin/next" ] && [ -f "${SCRIPT_DIR}/node_modules/next/dist/bin/next" ]; then
  ln -sf "${SCRIPT_DIR}/node_modules/.bin/next" /usr/local/bin/next 2>/dev/null || true
fi

exec bash "${SCRIPT_DIR}/scripts/build-desktop-packages.sh" "$@"
