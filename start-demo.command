#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Install Node.js 24 LTS from https://nodejs.org/en/download, then reopen this file."
  read -r -p "Press Enter to close... "
  exit 1
fi
node scripts/start-demo.mjs
studio_exit_code=$?
if [ "$studio_exit_code" -ne 0 ]; then
  read -r -p "Press Enter to close... "
fi
exit "$studio_exit_code"
