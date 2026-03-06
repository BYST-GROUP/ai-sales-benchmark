#!/usr/bin/env bash
# sync-logs.sh — load env vars from .env.local and run the Google Sheets sync script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT/.env.local"

if [ -f "$ENV_FILE" ]; then
  # Export key=value pairs, ignoring comments and blank lines
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^[A-Z_]+=.+' "$ENV_FILE")
  set +a
fi

node "$SCRIPT_DIR/sync-logs-to-sheets.mjs"
