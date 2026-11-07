#!/bin/bash
# Pulls the latest Lumen from git (if this folder is a git clone).
cd "$(dirname "$0")" || exit 1
if [ -d .git ]; then
  OWNER=$(stat -c %U .)
  if timeout 25 runuser -u "$OWNER" -- git fetch -q && runuser -u "$OWNER" -- git reset -q --hard "@{u}"; then echo "Lumen is up to date."; else echo "Update check failed (offline?)."; fi
else
  echo "No git repo: copy the new Lumen folder over and run install.sh again."
fi
