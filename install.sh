#!/usr/bin/env sh
# Lull one-click installer (macOS / Linux). Run:  sh install.sh
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js not found. Lull needs Node (get it at https://nodejs.org). Install it, then run again."
  exit 1
fi
node "$(dirname "$0")/install.js"
