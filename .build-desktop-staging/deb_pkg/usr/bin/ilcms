#!/bin/bash
# ==============================================================================
# ILCMS Desktop Launcher for Linux (Ubuntu, Debian, Fedora, RHEL, CentOS, SUSE)
# ==============================================================================
set -u

APP_DIR="${APP_DIR:-/opt/ilcms}"
PORT="${PORT:-3000}"
PID_FILE="${HOME}/.ilcms.pid"
LOG_FILE="${HOME}/.ilcms.log"

# CRITICAL FIX FOR RED HAT / FEDORA / SUSE:
# By default on Red Hat family distributions, $HOSTNAME is exported by the shell
# (e.g. HOSTNAME=fedora or HOSTNAME=fedora.localdomain).
# Next.js standalone server uses `process.env.HOSTNAME || '0.0.0.0'`.
# If HOSTNAME is set to an unresolvable hostname, Node.js crashes on startup with:
#   "Error: getaddrinfo EAI_AGAIN <hostname>" or "ENOTFOUND"
# We must explicitly force HOSTNAME and HOST to 127.0.0.1 for local standalone air-gapped execution.
export HOSTNAME="127.0.0.1"
export HOST="127.0.0.1"
export NODE_ENV="production"
export AIRGAP_MODE="true"
export AIRGAP_AI_ONLY="true"

# Helper: check if server responds via HTTP
check_server_http() {
  local p="${1:-3000}"
  if command -v curl >/dev/null 2>&1; then
    curl -s -m 1 "http://127.0.0.1:${p}/api/v1/healthz" >/dev/null 2>&1 || \
    curl -s -m 1 "http://127.0.0.1:${p}" >/dev/null 2>&1
    return $?
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O /dev/null -T 1 "http://127.0.0.1:${p}" >/dev/null 2>&1
    return $?
  else
    # Fallback to bash TCP socket if neither curl nor wget is available
    (exec 3<>/dev/tcp/127.0.0.1/"${p}") 2>/dev/null && { exec 3>&-; return 0; } || return 1
  fi
}

# Helper: check if process ID is alive
is_pid_alive() {
  local pid="$1"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

# Check if ILCMS is currently running
is_running() {
  if [ -f "$PID_FILE" ]; then
    local p
    p=$(cat "$PID_FILE" 2>/dev/null || echo "")
    if is_pid_alive "$p" && check_server_http "$PORT"; then
      return 0
    fi
  fi
  if check_server_http "$PORT"; then
    return 0
  fi
  return 1
}

# Helper: find node binary across common locations
find_node() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi
  for cand in /usr/bin/node /usr/local/bin/node /opt/node/bin/node; do
    if [ -x "$cand" ]; then
      echo "$cand"
      return 0
    fi
  done
  # User version managers (nvm, asdf, fnm, volta)
  if [ -d "${HOME}/.nvm/versions/node" ]; then
    local nvm_node
    nvm_node=$(find "${HOME}/.nvm/versions/node" -maxdepth 3 -name node -type f -executable 2>/dev/null | sort -V | tail -n 1)
    if [ -n "$nvm_node" ] && [ -x "$nvm_node" ]; then
      echo "$nvm_node"
      return 0
    fi
  fi
  if [ -x "${HOME}/.asdf/shims/node" ]; then
    echo "${HOME}/.asdf/shims/node"
    return 0
  fi
  if [ -x "${HOME}/.local/share/fnm/current/bin/node" ]; then
    echo "${HOME}/.local/share/fnm/current/bin/node"
    return 0
  fi
  if [ -x "${HOME}/.volta/bin/node" ]; then
    echo "${HOME}/.volta/bin/node"
    return 0
  fi
  return 1
}

case "${1:-}" in
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE" 2>/dev/null || echo "")
      if [ -n "$PID" ]; then
        kill "$PID" 2>/dev/null || true
        # Wait up to 3 seconds for graceful shutdown
        for _ in {1..15}; do
          if ! is_pid_alive "$PID"; then break; fi
          sleep 0.2
        done
        if is_pid_alive "$PID"; then
          kill -9 "$PID" 2>/dev/null || true
        fi
      fi
      rm -f "$PID_FILE"
      echo "ILCMS stopped."
    else
      echo "ILCMS is not running."
    fi
    exit 0
    ;;

  restart)
    "$0" stop
    sleep 1
    "$0" start
    exit $?
    ;;

  status)
    if is_running; then
      echo "ILCMS is active and running on http://127.0.0.1:${PORT}"
      exit 0
    else
      echo "ILCMS is not running."
      exit 3
    fi
    ;;

  *)
    if ! is_running; then
      if [ ! -d "$APP_DIR" ] || [ ! -f "$APP_DIR/server.js" ]; then
        echo "Error: Application files not found in $APP_DIR"
        exit 1
      fi

      NODE_BIN=$(find_node || true)
      if [ -z "$NODE_BIN" ]; then
        echo "Error: Node.js (18+ LTS) is required to run ILCMS."
        echo "Please install Node.js:"
        echo "  - Fedora / RHEL / CentOS: sudo dnf install -y nodejs"
        echo "  - Ubuntu / Debian:        sudo apt install -y nodejs"
        echo "  - Or download from:       https://nodejs.org"
        if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; then
          if command -v zenity >/dev/null 2>&1; then
            zenity --error --title="ILCMS" --text="Node.js 18+ LTS is required.\nPlease install Node.js via 'sudo dnf install nodejs' or 'sudo apt install nodejs'." 2>/dev/null || true
          elif command -v notify-send >/dev/null 2>&1; then
            notify-send "ILCMS" "Node.js (18+) is required to run the local server." 2>/dev/null || true
          fi
        fi
        exit 1
      fi

      echo "Starting ILCMS server in background (http://127.0.0.1:${PORT})..."
      cd "$APP_DIR"

      # Launch server with explicit loopback binding
      HOSTNAME="127.0.0.1" HOST="127.0.0.1" PORT="${PORT}" NODE_ENV="production" AIRGAP_MODE="true" \
        nohup "$NODE_BIN" server.js > "$LOG_FILE" 2>&1 &
      SERVER_PID=$!
      echo "$SERVER_PID" > "$PID_FILE"

      # Wait for server to bind or catch startup crash
      SERVER_OK=false
      for i in {1..35}; do
        # If the background process terminated, capture error immediately
        if ! is_pid_alive "$SERVER_PID"; then
          echo "Error: ILCMS server exited unexpectedly during startup."
          echo "Recent log output from $LOG_FILE:"
          echo "------------------------------------------------------------"
          tail -n 30 "$LOG_FILE" 2>/dev/null || true
          echo "------------------------------------------------------------"
          rm -f "$PID_FILE"

          if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; then
            if command -v zenity >/dev/null 2>&1; then
              LOG_ERR=$(tail -n 12 "$LOG_FILE" 2>/dev/null || echo "Process exited")
              zenity --error --title="ILCMS Startup Error" --text="ILCMS failed to start:\n\n${LOG_ERR}\n\nCheck logs at: ${LOG_FILE}" 2>/dev/null || true
            fi
          fi
          exit 1
        fi

        if check_server_http "$PORT"; then
          SERVER_OK=true
          break
        fi
        sleep 0.3
      done

      if [ "$SERVER_OK" = false ]; then
        echo "Warning: ILCMS server started (PID: $SERVER_PID) but HTTP response took longer than expected."
      else
        echo "ILCMS is ready at http://127.0.0.1:${PORT}"
      fi
    fi

    # Open system browser
    TARGET_URL="http://127.0.0.1:${PORT}"
    if command -v xdg-open >/dev/null 2>&1; then
      xdg-open "$TARGET_URL" >/dev/null 2>&1 &
    elif command -v gio >/dev/null 2>&1; then
      gio open "$TARGET_URL" >/dev/null 2>&1 &
    fi
    ;;
esac
